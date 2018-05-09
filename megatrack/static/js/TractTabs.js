var mgtrk = mgtrk || {};

// extend a Tabs object with the custom header
// for tract display, ie. colour swatch, title, remove/toggle 
mgtrk.TractTabs = (function() {
    const TractTabs = {};
    
    TractTabs.init = (_parent, contentTemplate, initState, tabSelectHandler) => {
        //var tractTabs = {};
        
        const templates = {
            header: function(state) {
                // eventually the state object might define whether to use remove icon or toggle
                return `<div class="tab-header-color-swatch"></div>
                        <div class="tab-header-tract-name" title="${state.tractName}">${state.tractName}</div>
                        <div class="tab-header-remove-icon clickable"></div>`;
            },
            content: contentTemplate
        };
        
        _parent.tabsContainerId = _parent.tractTabsContainerId;
        const tractTabs = mgtrk.Tabs.init(_parent, templates, initState, tabSelectHandler);
        
        return tractTabs;
    };
    
    return TractTabs; 
})();