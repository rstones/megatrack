var mgtrk = mgtrk || {};

mgtrk.Popup = (function() {
    const Popup = {};
    
    Popup.popupIds = [];
    
    // insert popup background screen once for page
    $(document).ready(function() {
        $('body').append('<div id="popup-background-screen"></div>');
        $('#popup-background-screen').hide();
        
        // hide popups and background screen on background click
        $('#popup-background-screen').on('click', function(event) {
            for (let i=0; i<Popup.popupIds.length; i++) {
                $(`#${Popup.popupIds[i]}`).hide();
            }
            Popup.hideScreen();
        });
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
    
    Popup.cleanUp = null;
    
    /**
     * Initialise a popup instance.
     * @param {Object} _parent          The parent object.
     * @param {String} containerId      The id of the element to insert the popup div into.
     * @param {String} popupId          The id of the popup.
     * @param {Function} insertContent  Function taking argument contentContainerId which inserts
     *                                  content elements and sets up event listeners etc.
     * @param {String} popupCls         CSS class for styling the popup.
     **/
    Popup.init = (_parent, containerId, popupId, insertContent, popupCls) => {
    
        // need something to control popup height/width. Or this can be done with css obvs.
    
        const popup = {};
        
        // keep track of all popups in app
        Popup.popupIds.push(popupId);
        
        /**
         * Open the popup.
         * @param {Function} updateContent      Update the content popup before opening.
         * @param {Function} cleanUp            Clean up resources like renderers on close
         */
        popup.open = (updateContent, cleanUp) => {
            Popup.showScreen();
            const popup = $(`#${popupId}`);
            popup.show();
            popup.css('left', ($(window).width()/2) - (popup.width()/2));
            
            if (updateContent) {
                updateContent();
            }
            
            if (cleanUp) {
                Popup.cleanUp = cleanUp;
            }
        };
        
        popup.close = () => {
            if (Popup.cleanUp) {
                Popup.cleanUp();
            }
            Popup.cleanUp = null; // reset cleanUp
            $(`#${popupId}`).hide();
            Popup.hideScreen();
        };
        
        $(`#${containerId}`).append(`<div id="${popupId}" class="${popupCls || ''} popup">
                                        <div id="${popupId}-close" class="popup-remove-icon clickable"></div>
                                        <div id="${popupId}-content"></div>
                                    </div>`);
        
        $(`#${popupId}-close`).on('click', function(event) {
            popup.close(); 
        });
        
        // pass popup object to insertContent so events inside that function can
        // access popup.close()
        insertContent(`${popupId}-content`, popup);
        
        $(`#${popupId}`).hide();
        
        return popup;
    };
    
    return Popup;
})();