var mgtrk = mgtrk || {};

mgtrk.ObjectSelect = (function() {
    
    const ObjectSelect = {};
    
    ObjectSelect.init = (_parent) => {
        
        // have separate objects for Tract, Lesion, Cortical
        const tractTab = mgtrk.TractSelectTab();
        const tractTemplates = tractTab.templates(false);
        
        const lesionTab = mgtrk.LesionSelectTab();
        const lesionTemplates = lesionTab.templates(false);
        
        const corticalTab = mgtrk.CorticalSelectTab();
        const corticalTemplates = corticalTab.templates(false);
        
        const templates = {
            tract: {
                header: tractTemplates.header,
                content: tractTemplates.content
            },
            lesion: {
                header: lesionTemplates.header,
                content: lesionTemplates.content
            },
            cortical: {
                header: corticalTemplates.header,
                content: corticalTemplates.content
            }
        };
        
        // insert Tabs object with Tract, Lesion, Cortical tabs
        _parent.tabsContainerId = _parent.objectSelectId;
        
        const initState = {
            tract: {
                tabType:'tract',
                name: 'Tract'
            },
            lesion: {
                tabType: 'lesion',
                name: 'Lesion'
            },
            cortical: {
                tabType: 'cortical',
                name: 'Cortical'
            }
        };
        
        const objectSelect = Object.assign(objectSelect, mgtrk.Tabs.init(_parent, templates, initState));
        
        return objectSelect;
    };
    
    return ObjectSelect;
    
})();