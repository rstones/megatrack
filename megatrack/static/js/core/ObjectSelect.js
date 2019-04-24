var mgtrk = mgtrk || {};

mgtrk.ObjectSelect = (function() {
    
    const ObjectSelect = {};
    
    ObjectSelect.init = (_parent) => {
        
        // have separate objects for Tract, Lesion, Cortical
        const tractTab = mgtrk.TractSelectTab.init(_parent);
        const tractTemplates = tractTab.templates(false);
        
        const lesionTab = mgtrk.LesionSelectTab.init();
        const lesionTemplates = lesionTab.templates(false);
        
        const corticalTab = mgtrk.CorticalSelectTab.init();
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
        
        const options = {
            headerClass: 'object-select-tab-header'
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
        
        const objectSelect = mgtrk.Tabs.init(_parent, templates, initState, options);
        
        return objectSelect;
    };
    
    return ObjectSelect;
    
})();