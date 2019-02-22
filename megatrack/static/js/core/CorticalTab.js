var mgtrk = mgtrk || {};

mgtrk.CorticalTab = (function() {
    const CorticalTab = {};
    
    CorticalTab.init = (_parent, tabsObject) => {
        const corticalTab = {};
        
        // can initialise any popups required here
        
        corticalTab.templates = (removeIcons) => {
            
            const contentTemplate = function(state, wrapperId, contentsId) {
                let template = `<div id="${wrapperId}">
                                    <div class="cortical-map-selection">
                                        <fieldset id="cortical-map-fields">
                                            <legend>Select a cortical map:</legend>
                                            <label for="none">None</label>
                                            <input type="radio" name="none" id="none">
                                            <label for="HCP">HCP</label>
                                            <input type="radio" name="none" id="HCP">
                                            <label for="HOA">HOA</label>
                                            <input type="radio" name="none" id="HOA">
                                            <label for="Brodmann">Brodmann</label>
                                            <input type="radio" name="none" id="Brodmann">
                                            <label for="Julich">Julich</label>
                                            <input type="radio" name="none" id="Julich">
                                            <label for="Freesurfer">Freesurfer</label>
                                            <input type="radio" name="none" id="Freesurfer">
                                        </fieldset>
                                    </div>
                                    <div class="cortical-map-info">
                                        The cortical map info goes here.
                                    </div>
                                </div>`;
                $(`#${contentsId}`).append(template);
                $('#cortical-map-fields > input').checkboxradio();
                
                $('.cortical-map-selection > fieldset > input').on('change', function(event) {
                    // load the new cortical map
                    const atlasName = event.target.id;
                    if (atlasName != 'none') {
                        const renderers = _parent._parent.renderers;
                        renderers.displayCorticalAtlas(event.target.id, _parent.corticalMapVisible);
                        if (!_parent.corticalMapVisible) {
                            for (let view in renderers.views) {
                                if (renderers.views.hasOwnProperty(view)) {
                                    renderers.views[view].bindSlicingOverlayMouseMove();
                                } 
                            }
                        }
                        _parent.corticalMapVisible = true;
                    } else if (_parent.corticalMapVisible) {
                        const renderers = _parent._parent.renderers;
                        renderers.removeLabelmapFromVolumeNew(0);
                        for (let view in renderers.views) {
                            if (renderers.views.hasOwnProperty(view)) {
                                renderers.views[view].unbindSlicingOverlayMouseMove();
                            } 
                        }
                        _parent.corticalMapVisible = false;
                    } else {
                        // do nothing
                    }
                    
                });
                
            };
            
            const headerTemplate = function(state, wrapperId) {
                $(`#${wrapperId}`).append(`<div class="tab-header-name" title="${state.name}">${state.name}</div>`);
                                                        
                if (removeIcons) {
                    tabsObject.addRemoveIconToTabHeader(state, wrapperId);
                }
            };
            
            return {
                    header: headerTemplate,
                    content: contentTemplate
                    };
        };
        
        return corticalTab;
    };
    
    CorticalTab.templates = () => {
        return {header: function() {}, content: function() {}};
    };
    
    return CorticalTab;
})();