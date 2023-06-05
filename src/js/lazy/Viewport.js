Ext.define('Tualo.usereditor.lazy.Viewport', {
    extend: 'Ext.panel.Panel',
    requires: [
        'Tualo.usereditor.lazy.controller.Viewport',
        'Tualo.usereditor.lazy.model.Viewport',
    ],
    alias: 'widget.usereditorviewport',

    tools: [{
        xtype: 'glyphtool',
        //glyphPrefix: 'entypo et-',
        glyph: 'circle-plus',
        tooltip: 'Hinzufügen',
        handler: function (me) {
            var grid = this.up('panel').down('gridpanel');
            var store = grid.getStore();
            store.add({ login: 'Neuer nutzer' });
            setTimeout(() => { store.load() }, 1000);

        }
    },
    {
        xtype: 'glyphtool',
        //glyphPrefix: 'entypo et-',
        glyph: 'circle-minus',
        tooltip: 'Entfernen',
        handler: function (me) {
            var grid = this.up('panel').down('gridpanel');
            var store = grid.getStore();
            var selection = grid.getSelection()[0];
            if (!selection) return;



            Ext.MessageBox.confirm('Löschen', 'Soll der Eintrag "' + selection.get('name') + '" wirklich gelöscht werden?', function (btn) {
                if (btn == 'yes') {

                    Tualo.Fetch.post('usereditor/delete', {
                        id: selection.get('name'),
                    }).then(function (result) {
                        store.load();
                    }).catch(function (e) {
                        Ext.Msg.alert('Fehler', e);
                    });
                }
            });
        }


    },
    {
        xtype: 'glyphtool',
        //glyphPrefix: 'typcn typcn-arrow-',
        glyph: 'sync',
        tooltip: 'neu Laden',
        handler: function (me) {
            var grid = this.up('panel').down('gridpanel');
            var store = grid.getStore();
            store.load();
        }

    },{
        xtype: 'glyphtool',
        //glyphPrefix: 'typcn typcn-arrow-',
        glyph: 'lock',
        tooltip: 'Passwort zurücksetzen',
        handler: function(){
            var grid = this.up('panel').down('gridpanel');
            var store = grid.getStore();
            var selection = grid.getSelection()[0];
            if (!selection) return;

            
            var wnd = Ext.create('Ext.Window',{
              title: 'Kennwort festlegen',
              layout: 'fit',
              percent: 0.5,
              bodyPadding: 25,
              items: [
                {
                  xtype: 'form',
                  items: [
                    {
                      xtype: 'textfield',
                      name: 'pw1',
                      inputType: 'password',
                      fieldLabel: 'neues Kennwort',
                      anchor: '100%',
                      readOnly: false
                    },
                    {
                      xtype: 'textfield',
                      name: 'pw2',
                      inputType: 'password',
                      fieldLabel: 'Kennwort wdh.',
                      anchor: '100%',
                      readOnly: false
                    }
        
                  ],
                  buttons:[
                    {
                      text: 'Kennwort festlegen',
                      handler: function(btn){
                        var vals = btn.up('form').getValues();
                        if (vals.pw1!=vals.pw2){
                          Ext.MessageBox.alert('Achtung','Die Passwörter stimmen nicht überein');
                          return;
                        }
                        Ext.Ajax.request({
                          url: './usereditor/passwd',
                          params: {
                            login: selection.get('login'),
                            passwd: vals.pw1,
                            passwd2: vals.pw2
                          },
        
                          success: function(response, opts) {
                              var obj = Ext.decode(response.responseText);
                              if (obj.success){
                                btn.up('window').close();
                              }else{
                                Ext.MessageBox.alert('Fehler',obj.msg);
                              }
                          },
        
                          failure: function(response, opts) {
                              console.log('server-side failure with status code ' + response.status);
                          }
                      });
                      }
                    }
                  ]
                }
              ]
            });
            wnd.show();
          }
    }],
    layout: 'card',
    items: [
        {
            xtype: 'gridpanel',
            selModel: 'cellmodel',
            plugins: {
                cellediting: {
                    clicksToEdit: 1
                }
            },
            features: [{
                ftype: 'grouping',
                startCollapsed: false,
                groupHeaderTpl: '{columnName}: {name} ({rows.length} {[values.rows.length > 1 ? "Einträge" : "Eintrag"]})'
            }],
            store: {
                type: 'json',
                autoSync: true,
                autoLoad: true,
                groupField: 'clients',
                proxy: {
                    type: 'ajax',
                    api: {
                        create: './usereditor/create',
                        read: './usereditor/read',
                        update: './usereditor/update',
                        destroy: './usereditor/delete'
                    },
                    reader: {
                        type: 'json',
                        rootProperty: 'data',
                        idProperty: 'name'
                    }
                }
            },

            listeners: {
                itemdblclick: function (me, record, item, index, e, eOpts) {
                    this.up('panel').getLayout().setActiveItem(1);
                    var form = this.up('panel').down('form');
                    form.loadRecord(record);
                }
            },
            columns: [{
                text: 'Login',
                editor: 'textfield',
                dataIndex: 'login',
                flex: 2,
                sortable: true
            }, {
                text: 'Gruppen',
                dataIndex: 'groups',
                flex: 1,
                sortable: true,
            }, {
                text: 'Name',
                dataIndex: 'vorname',
                flex: 1,
                renderer: function (value, metaData, record, rowIndex, colIndex, store, view) {
                    return value + ' ' + record.get('nachname');
                },
                sortable: true,
            }, {
                text: 'Systeme',
                dataIndex: 'clients',
                flex: 1,
                sortable: true,
            }]
        }, {
            xtype: 'form',
            bodyPadding: 10,
            defaults: {
                anchor: '100%',
                labelWidth: 120
            },

            buttons: [
                {
                    text: 'Abbrechen',
                    handler: function (me) {
                        var form = me.up('form');
                        form.up('panel').getLayout().setActiveItem(0);
                    },
                }, '->',
                {
                    text: 'Speichern',
                    handler: function (me) {
                        var form = me.up('form');
                        var grid = form.up('panel').down('gridpanel');
                        var store = grid.getStore();
                        var selection = grid.getSelection()[0];

                        let vals = form.getValues();

                        for (const key in vals) {
                            if (Object.hasOwnProperty.call(vals, key)) {
                                selection.set(key, vals[key]);
                            }
                        }
                        /*
                        if (Ext.isEmpty(vals.users)) vals.users = [];
                        selection.set('text', vals.text);
                        selection.set('title', vals.text);
                        // selection.set('iconCls',vals.iconCls);
                        selection.set('iconcls', vals.iconcls);
                        selection.set('route_to', vals.route_to);
                        selection.set('users', vals.users);
                        selection.commit();
                        */

                        form.up('panel').getLayout().setActiveItem(0);

                    }
                }
            ],
            items: [
                {
                    xtype: 'textfield',
                    fieldLabel: 'Login',
                    name: 'login',
                    allowBlank: false
                },
                {
                    xtype: 'textfield',
                    fieldLabel: 'Vorname',
                    name: 'vorname',
                    allowBlank: true
                },
                {
                    xtype: 'textfield',
                    fieldLabel: 'Nachname',
                    name: 'nachname',
                    allowBlank: true
                },
                {
                    xtype: 'textfield',
                    fieldLabel: 'E-Mail',
                    name: 'email',
                    allowBlank: true
                },
                {
                    fieldLabel: 'Gruppen',
                    name: 'groups',
                    xtype: 'tagfield',
                    anchor: '100%',
                    valueField: 'view_session_groups__group',
                    displayField: 'view_session_groups__group',
                    allowBlank: true,
                    queryMode: 'local',
                    grow: true,
                    store:{
                        type:'ds_view_session_groups',
                        autoLoad: true
                    }
                    /*
                    bind:{
                        
                    }*/
                },
                {
                    fieldLabel: 'Systeme',
                    name: 'clients',
                    xtype: 'tagfield',
                    anchor: '100%',
                    valueField: 'id',
                    displayField: 'id',
                    allowBlank: true,
                    queryMode: 'local',
                    grow: true,
                    store:{
                        type:'json',
                        autoLoad: true,

                        proxy: {
                            type: 'ajax',
                            url: './usereditor/clients/read',
                            reader: {
                                type: 'json',
                                rootProperty: 'data',
                                idProperty: 'id'
                            }
                        }
                    }
                    /*
                    bind:{
                        
                    }*/
                }
            ]
        }
    ]
});