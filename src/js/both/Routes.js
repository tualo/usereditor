Ext.Loader.setPath('Tualo.usereditor.lazy', './jsusereditor');

Ext.define('Tualo.routes.UserEditor',{
    statics: {
        load: async function() {
            return [
                {
                    name: 'usereditor',
                    path: '#usereditor'
                }
            ]
        }
    },  
    url: 'usereditor',
    handler: {
        action: function( ){
            Ext.getApplication().addView('Tualo.usereditor.lazy.Viewport');
        },
        before: function (action) {
            action.resume();
        }
    }
});