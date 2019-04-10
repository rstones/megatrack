var mgtrk = mgtrk || {};

mgtrk.CorticalSelectTab = (function() {
    
    const CorticalSelectTab = {};
    
    CorticalSelectTab.init = () => {
    
        const corticalSelectTab = {};
        
        corticalSelectTab.templates = (removeIcons) => {
            
            const contentTemplate = function(state, wrapperId, contentsId) {
                $(`#${contentsId}`).append(`<div id="${wrapperId}">Cortical testing...</div>`);
            };
              
            
            const headerTemplate = function(state, wrapperId) {
                $(`#${wrapperId}`).append('Cortical');
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