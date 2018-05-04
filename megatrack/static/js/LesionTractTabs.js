var mgtrk = mgtrk || {};

// extend a TractTabs object with a html
// template for the Lesion Mapping tab
// contents and relevant event handlers
// for that contents
mgtrk.LesionTractTabs = (function() {
    const LesionTractTabs = {};
    
    LesionTractTabs.init = (_parent, initState, tabSelectHandler) => {
        //var lesionTractTabs = {};
        
        // define the tab contents template of the LesionTractTabs then add the TractTabs object
        const contentTemplate = function(state) {
            var template = `<div class="tab-content-renderer-controls">
                                <div id="prob-range-slider"></div>
                                <div id="opacity-slider"></div>
                                <div id="color-select"></div>
                                <div id="misc-controls">
                                    <div id="download-button"></div>
                                </div>
                            </div>
                            <div class="tab-content-tract-info">
                                <div id=""overlap-score></div>
                            </div>
                            <div class="tab-content-tract-disconnection">
                                
                            </div>`;
            
            // add sliders to appropriate divs with init settings
            
            return template;
        };
        
        const lesionTractTabs = mgtrk.TractTabs.init(_parent, contentTemplate, initState, tabSelectHandler);
        
        return lesionTractTabs;
    };
    
    return LesionTractTabs;
})();