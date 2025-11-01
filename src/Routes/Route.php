<?php

namespace Tualo\Office\UserEditor\Routes;

use Tualo\Office\Basic\TualoApplication as App;
use Tualo\Office\Basic\Route as BasicRoute;
use Tualo\Office\Basic\IRoute;

class Route extends \Tualo\Office\Basic\RouteWrapper
{
    public static function scope(): string
    {
        return 'usereditor.main';
    }

    public static function register()
    {
        BasicRoute::add('/usereditor/read', function ($matches) {


            App::contenttype('application/json');
            App::result('success', false);
            try {
                if (isset($_SESSION['tualoapplication']) && isset($_SESSION['tualoapplication']['typ']) && ($_SESSION['tualoapplication']['typ'] == 'master')) {
                    $list =  App::get('session')->db->direct('
                        select
                            macc_users.login id,
                            macc_users.login,

                            loginnamen.vorname,
                            loginnamen.nachname,
                            loginnamen.email,
                            loginnamen.telefon,
                            loginnamen.mobile,
                            loginnamen.zeichen,

                            ifnull(json_arrayagg(distinct macc_users_groups.group  order by macc_users_groups.group),json_array()) groups,
                            ifnull(json_arrayagg(distinct macc_users_clients.client order by macc_users_clients.client),json_array()) clients

                        from 
                            macc_users
                            left join loginnamen
                                on loginnamen.login = macc_users.login
                            left join macc_users_groups
                                on macc_users_groups.id = macc_users.login
                            left join macc_users_clients
                                on macc_users_clients.login = macc_users.login
                        group by macc_users.login
                    ', []);

                    foreach ($list as &$element) {
                        //$element['iconCls'] = /*str_replace('fa ','x-fa ',*/$element['iconcls']/*)*/;
                        $element['groups'] = json_decode($element['groups'], true);
                        $element['clients'] = json_decode($element['clients'], true);
                        //unset($element['iconcls']);
                    }

                    App::result('data', $list);
                    App::result('total', count($list));
                    App::result('success', true);
                }
            } catch (\Exception $e) {
                App::result('msg', $e->getMessage());
            }
        }, ['get', 'post'], true, [], self::scope());


        BasicRoute::add('/usereditor/update', function ($matches) {
            App::contenttype('application/json');
            try {
                if (isset($_SESSION['tualoapplication']) && isset($_SESSION['tualoapplication']['typ']) && ($_SESSION['tualoapplication']['typ'] == 'master')) {
                    $input = json_decode(file_get_contents('php://input'), true);
                    if (is_null($input)) throw new \Exception("Error Processing Request", 1);
                    if ($input !== array_values($input)) {
                        $input = [$input];
                    }

                    $result = [];
                    foreach ($input as $row) {

                        $sql = 'insert ignore into loginnamen (login) values ({id})';
                        App::get('session')->db->direct($sql, array('id' => $row['id']));


                        $row['__clientid'] =  $row['id'];
                        if (!isset($row['login'])) $row['login'] = $row['id'];
                        foreach ($row as $key => $value) {
                            if (in_array($key, ['login'])) {
                                $sql = 'update macc_users set `' . $key . '`={value} where login={id}';
                                if (($key == 'aktiv') && ($value == false)) {
                                    $row[$key] = 0;
                                }
                                App::get('session')->db->direct($sql, array('id' => $row['id'], 'value' => $row[$key]));
                            }

                            if (in_array($key, ['vorname', 'nachname', 'email', 'telefon', 'mobile', 'zeichen'])) {
                                $sql = 'update loginnamen set `' . $key . '`={value} where login={id}';
                                App::get('session')->db->direct($sql, array('id' => $row['login'], 'value' => $row[$key]));
                            }

                            if (in_array($key, ['groups'])) {
                                App::get('session')->db->direct(
                                    'delete from macc_users_groups where id={id}',
                                    [
                                        'id' => $row['login']
                                    ]
                                );
                                foreach ($value as $group) {
                                    App::get('session')->db->direct(
                                        'insert into macc_users_groups (id,`group`) values ({id},{group}) on duplicate key update `group`=values(`group`)',
                                        [
                                            'id' => $row['id'],
                                            'group' => $group
                                        ]
                                    );
                                }
                            }
                            if (in_array($key, ['clients'])) {
                                App::get('session')->db->direct(
                                    'delete from macc_users_clients where login={id}',
                                    [
                                        'id' => $row['login']
                                    ]
                                );
                                foreach ($value as $client) {
                                    App::get('session')->db->direct(
                                        'insert into macc_users_clients (login,`client`) values ({id},{client}) on duplicate key update `client`=values(`client`)',
                                        [
                                            'id' => $row['login'],
                                            'client' => $client
                                        ]
                                    );
                                }
                            }
                        }
                        $row['id'] =  $row['login'];
                        $result[] = $row;
                    }

                    App::result('data', $result);
                    App::result('success', true);
                }
            } catch (\Exception $e) {
                App::result('msg', $e->getMessage());
                App::result('xy', App::get('session')->db->last_sql);
            }
        }, ['get', 'post'], true,   [], self::scope());

        BasicRoute::add('/usereditor/create', function ($matches) {
            App::contenttype('application/json');
            try {
                if (isset($_SESSION['tualoapplication']) && isset($_SESSION['tualoapplication']['typ']) && ($_SESSION['tualoapplication']['typ'] == 'master')) {
                    $input = json_decode(file_get_contents('php://input'), true);
                    if (is_null($input)) throw new \Exception("Error Processing Request", 1);
                    if ($input !== array_values($input)) {
                        $input = [$input];
                    }
                    foreach ($input as  $row) {
                        if (isset($row['login']) && ($row['login'] != '')) {
                            $sql = 'insert ignore into macc_users (login ) values ( {login})';
                            App::get('session')->db->direct($sql, $row);
                        }
                    }
                    App::result('success', true);
                }
            } catch (\Exception $e) {
                App::result('msg', $e->getMessage());
            }
        }, ['get', 'post'], true,   [], self::scope());


        BasicRoute::add('/usereditor/delete', function ($matches) {
            App::contenttype('application/json');
            try {
                if (isset($_SESSION['tualoapplication']) && isset($_SESSION['tualoapplication']['typ']) && ($_SESSION['tualoapplication']['typ'] == 'master')) {
                    if (isset($_REQUEST['id'])) {
                        App::get('session')->db->direct(
                            'delete from macc_users where login={id}',
                            [
                                'id' => $_REQUEST['id']
                            ]
                        );
                        App::result('success', true);
                    }
                }
            } catch (\Exception $e) {
                App::result('msg', $e->getMessage());
            }
        }, ['get', 'post'], true,   [], self::scope());


        BasicRoute::add('/usereditor/passwd', function ($matches) {


            App::contenttype('application/json');
            App::result('success', false);
            try {
                if (isset($_SESSION['tualoapplication']) && isset($_SESSION['tualoapplication']['typ']) && ($_SESSION['tualoapplication']['typ'] == 'master')) {
                    $list =  App::get('session')->db->direct('select set_login_sha2({login},{passwd})', $_REQUEST);
                    App::result('success', true);
                }
            } catch (\Exception $e) {
                App::result('msg', $e->getMessage());
            }
        }, ['get', 'post'], true, [], self::scope());

        BasicRoute::add('/usereditor/clients/read', function ($matches) {


            App::contenttype('application/json');
            App::result('success', false);
            try {
                if (isset($_SESSION['tualoapplication']) && isset($_SESSION['tualoapplication']['typ']) && ($_SESSION['tualoapplication']['typ'] == 'master')) {
                    $list =  App::get('session')->db->direct('select id from macc_clients', $_REQUEST);
                    App::result('data', $list);
                    App::result('success', true);
                } else {
                    App::result('msg', 'no permission');
                }
            } catch (\Exception $e) {
                App::result('msg', $e->getMessage());
            }
        }, ['get', 'post'], true, [], self::scope());
    }
}
