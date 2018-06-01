var mgtrk = mgtrk || {};

// extend a Tabs object with the custom header
// for tract display, ie. colour swatch, title, remove/toggle 
mgtrk.TractTabs = (function() {
    const TractTabs = {};
    
    TractTabs.init = (_parent, contentTemplate, initState, tabSelectHandler) => {
        var tractTabs = {};
        
        const templates = {
            header: function(state, wrapperId) {
                // eventually the state object might define whether to use remove icon or toggle
                $(`#${wrapperId}`).append(`<div class="tab-header-color-swatch"></div>
                                                        <div class="tab-header-tract-name" title="${state.name}">${state.name}</div>
                                                        <div id="${state.code}-tab-remove" class="clickable tab-header-remove-icon"></div>`);
                // add init color to header color swatch
                 $(`#${state.code}-tab-header > .tab-header-color-swatch`).addClass(`${state.color}-colormap`);
                 
                 $(`#${state.code}-tab-remove`).on('click', function(event) {
                    // remove tract from renderer
                    // fire remove-tract event
                                        
                    var tractIds = Object.keys(tractTabs.cache);
                    if (state.code === tractTabs.selectedTabId && tractIds.length > 1) {
                        var idxOfTractToRemove = tractIds.indexOf(state.code);
                        var idxToSelect = idxOfTractToRemove < tractIds.length - 1 ? idxOfTractToRemove+1 : idxOfTractToRemove - 1;
                        tractTabs.selectTab(tractIds[idxToSelect]);
                    }
                    tractTabs.removeTab(state.code);
                 });
            },
            content: contentTemplate
        };
        
        _parent.tabsContainerId = _parent.tractTabsContainerId;
        tractTabs = mgtrk.Tabs.init(_parent, templates, initState, tabSelectHandler);
        
        return tractTabs;
    };
    
    return TractTabs; 
})();