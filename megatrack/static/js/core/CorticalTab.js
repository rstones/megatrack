var mgtrk = mgtrk || {};

mgtrk.CorticalTab = (function() {
    const CorticalTab = {};
    
    CorticalTab.init = (_parent, tabsObject) => {
        const corticalTab = {};
        
        // can initialise any popups required here
        
        corticalTab.templates = (removeIcon) => {
        
            return {header: function() {}, content: function() {}};
        };
        
        return corticalTab;
    };
    
    CorticalTab.templates = () => {
        return {header: function() {}, content: function() {}};
    };
    
    return CorticalTab;
})();