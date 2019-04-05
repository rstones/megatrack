var mgtrk = mgtrk || {};

mgtrk.TractSelectTab = (function() {
    
    const TractSelectTab = {};
    
    TractSelectTab.init = () => {
    
        const tractSelectTab = {};
        
        tractSelectTab.templates = (removeIcons) => {
            
            const contentTemplate = function(state, wrapperId, contentsId) {
                
            };
              
            
            const headerTemplate = function(state, wrapperId) {
                
            };
            
            return {
                header: headerTemplate,
                content: contentTemplate
            };
        };
        
        return tractSelectTab;
        
    };
    
    return TractSelectTab;
    
})();