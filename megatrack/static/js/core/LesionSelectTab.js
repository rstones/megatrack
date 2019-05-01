var mgtrk = mgtrk || {};

mgtrk.LesionSelectTab = (function() {
    
    const LesionSelectTab = {};
    
    LesionSelectTab.init = () => {
    
        const lesionSelectTab = {};
        
        lesionSelectTab.templates = (removeIcons) => {
            
            const contentTemplate = function(state, wrapperId, contentsEl) {
                contentsEl.append(`<div id="${wrapperId}">Lesion testing...</div>`);
            };
              
            
            const headerTemplate = function(state, wrapperId) {
                $(`#${wrapperId}`).append('Lesion');
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