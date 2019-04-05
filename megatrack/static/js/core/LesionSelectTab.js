var mgtrk = mgtrk || {};

mgtrk.LesionSelectTab = (function() {
    
    const LesionSelectTab = {};
    
    LesionSelectTab.init = () => {
    
        const lesionSelectTab = {};
        
        lesionSelectTab.templates = (removeIcons) => {
            
            const contentTemplate = function(state, wrapperId, contentsId) {
                
            };
              
            
            const headerTemplate = function(state, wrapperId) {
                
            };
            
            return {
                header: headerTemplate,
                content: contentTemplate
            };
        };
        
        return lesionSelectTab;
        
    };
    
    return LesionSelectTab;
    
})();