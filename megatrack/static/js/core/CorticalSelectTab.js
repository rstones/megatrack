var mgtrk = mgtrk || {};

mgtrk.CorticalSelectTab = (function() {
    
    const CorticalSelectTab = {};
    
    CorticalSelectTab.init = () => {
    
        const corticalSelectTab = {};
        
        corticalSelectTab.templates = (removeIcons) => {
            
            const contentTemplate = function(state, wrapperId, contentsId) {
                
            };
              
            
            const headerTemplate = function(state, wrapperId) {
                
            };
            
            return {
                header: headerTemplate,
                content: contentTemplate
            };
        };
        
        return corticalSelectTab;
        
    };
    
    return CorticalSelectTab;
    
})();