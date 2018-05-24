var mgtrk = mgtrk || {};

mgtrk.Popup = (function() {
    const Popup = {};
    
    // insert popup background screen once for page
    $(document).ready(function() {
        $('body').append('<div id="popup-background-screen"></div>');
        $('#popup-background-screen').hide();
    });
    
    Popup.showScreen = () => {
        const backgroundScreen = $('#popup-background-screen');
        backgroundScreen.show();
        backgroundScreen.css('width', $(window).width());
        backgroundScreen.css('height', $(window).height());
    };
    
    Popup.hideScreen = () => {
        $('#popup-background-screen').hide();
    };
    
    /**
     * Initialise a popup instance.
     * @param {Object} _parent          The parent object.
     * @param {String} containerId      The id of the element to insert the popup div into.
     * @param {String} popupId          The id of the popup.
     * @param {Function} insertContent  Function taking argument contentContainerId which inserts
     *                                  content elements and sets up event listeners etc. 
     **/
    Popup.init = (_parent, containerId, popupId, insertContent) => {
    
        // need something to control popup height/width. Or this can be done with css obvs.
    
        const popup = {};
        
        $(`#${containerId}`).append(`<div id="${popupId}">
                                        <div id="${popupId}-close" class="popup-remove-icon clickable"></div>
                                        <div id="${popupId}-content"></div>
                                    </div>`);
                                    
        insertContent(`${popupId}-content`);
        
        $(`#${popupId}`).hide();
        
        popup.open = () => {
            Popup.showScreen();
            const popup = $(`#${popupId}`);
            popup.show();
            popup.css('left', ($(window).width()/2) - (popup.width()/2));
        };
        
        popup.close = () => {
            $(`#${popupId}`).hide();
            Popup.hideScreen();
        };
        
        $(`#${popupId}-close`).on('click', function(event) {
            popup.close(); 
        });
        
        return popup;
    };
    
    return Popup;
})();