var mgtrk = mgtrk || {};

// extend a Tabs object with the custom header
// for tract display, ie. colour swatch, title, remove/toggle 
mgtrk.TractTabs = (function() {
    const TractTabs = {};
    
    TractTabs.init = (_parent, contentTemplate, initState, tabSelectHandler) => {
        //var tractTabs = {};
        
        const templates = {
            header: function(state, wrapperId) {
                // eventually the state object might define whether to use remove icon or toggle
                $(`#${wrapperId}`).append(`<div class="tab-header-color-swatch"></div>
                                                        <div class="tab-header-tract-name" title="${state.name}">${state.name}</div>
                                                        <div class="tab-header-remove-icon clickable"></div>`);
                // add init color to header color swatch
                 $(`#${state.code}-tab-header > .tab-header-color-swatch`).addClass(`${state.color}-colormap`);
            },
            content: contentTemplate
        };
        
        _parent.tabsContainerId = _parent.tractTabsContainerId;
        const tractTabs = mgtrk.Tabs.init(_parent, templates, initState, tabSelectHandler);
        
        return tractTabs;
    };
    
    return TractTabs; 
})();