var mgtrk = mgtrk || {};

mgtrk.LesionTabs = (function() {
    const LesionTabs = {};
    
    LesionTabs.init = (_parent, initState) => {
        const lesionTabs = {};
        
        const tractTab = mgtrk.LesionTractTab.init(_parent, lesionTabs);
        const tractTemplates = tractTab.templates(false);
        
        const corticalTab = mgtrk.CorticalTab.init(_parent, lesionTabs);
        const corticalTemplates = corticalTab.templates(false);
        
        const templates = {
            'tract': {
                header: tractTemplates.header,
                content: tractTemplates.content
            },
            'cortical': {
                header: corticalTemplates.header,
                content: corticalTemplates.content   
            }
        };
        
        Object.assign(lesionTabs, mgtrk.Tabs.init(_parent, templates, initState));
        
        return lesionTabs;
    };
    
    return LesionTabs;
})();