var mgtrk = mgtrk || {};

mgtrk.TractSelectTab = (function() {
    
    const TractSelectTab = {};
    
    TractSelectTab.init = () => {
    
        const tractSelectTab = {};
        
        tractSelectTab.templates = (removeIcons) => {
            
            const contentTemplate = function(state, wrapperId, contentsId) {
                $(`#${contentsId}`).append(`<div id="${wrapperId}" class="tract-select-tab">
                                                <div class="dataset-query-builder-container">
                                                    <div class="dataset-select-container">
                                                        
                                                    </div>
                                                    <div class="constraints-table-container">
                                                        
                                                    </div>
                                                </div>
                                                <div class="tract-select-container">
                                                    
                                                </div>
                                            </div>`);
            };
              
            
            const headerTemplate = function(state, wrapperId) {
                $(`#${wrapperId}`).append('Tract');
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