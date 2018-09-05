var mgtrk = mgtrk || {};

mgtrk.TractInfoPopup = (function() {
    const TractInfoPopup = {};
    
    TractInfoPopup.contentTemplate = function(popupContentId) {
        $(`#${popupContentId}`).append(`<div id="tract-info-popup-title"></div>
                                            <div id="tract-info-popup-trk-display">
                                                <div id="tract-info-popup-renderer"></div>
                                                <div id="tract-info-popup-trk-instructions">
                                                    Drag or scroll to control display
                                                </div>
                                            </div>
                                            <div id="tract-info-popup-description"></div>
                                            <div id="tract-info-popup-citations"></div>`);
    };
    
    TractInfoPopup.updateContent = function(tractInfoPopup, tractInfo) {
    
        const temp = function() {
            if (tractInfo.name) {
                $('#tract-info-popup-title').html(tractInfo.name);
                $('#tract-info-popup-description').html(tractInfo.description);
                $('#tract-info-popup-citations').html(tractInfo.citations);
                
                var renderer = tractInfoPopup.renderer;
                renderer.remove(tractInfoPopup.trk);
                renderer.resize(); // call the resize function to ensure the canvas gets the dimensions of the visible container
                
                tractInfoPopup.trk.file = `${tractInfoPopup._parent.rootPath}/get_trk/${tractInfo.code}?.trk`;
                tractInfoPopup.trk.opacity = 1.0;
                
                renderer.add(tractInfoPopup.trk);
                renderer.render();
                
                tractInfoPopup.cameraMotion = setInterval(function() {
                    renderer.camera.rotate([3,0]);
                }, 50);
            }
        };
        return temp;
    };
    
    TractInfoPopup.cleanRenderer = function(tractInfoPopup) {
        const temp = function() {
            clearInterval(tractInfoPopup.cameraMotion);
            tractInfoPopup.renderer.pauseRendering();
        };
        return temp;
    };
    
    TractInfoPopup.init = (_parent, containerId, popupId, popupCls) => {
        const tractInfoPopup = {};
        tractInfoPopup._parent = _parent;
        
        tractInfoPopup.popup = mgtrk.Popup.init(tractInfoPopup,
                                                containerId,
                                                popupId,
                                                TractInfoPopup.contentTemplate,
                                                popupCls);
        
        // setup trk renderer within the popup
        tractInfoPopup.renderer = new X.renderer3D();
        tractInfoPopup.renderer.container = 'tract-info-popup-renderer';
        tractInfoPopup.renderer.config.PICKING_ENABLED = false;
        tractInfoPopup.renderer.init();
        var viewMatrix = tractInfoPopup.renderer.camera.view;
        viewMatrix[14] = -200; 
        
        tractInfoPopup.trk = new X.fibers();
        
        tractInfoPopup.mesh = new X.mesh();
        tractInfoPopup.mesh.file = `${_parent.rootPath}/get_cortex?.stl`;
        tractInfoPopup.mesh.magicmode = false;
        tractInfoPopup.mesh.color = [0.3, 0.3, 0.3];
        tractInfoPopup.mesh.opacity = 0.4;
        
        tractInfoPopup.renderer.add(tractInfoPopup.mesh);
                        
        tractInfoPopup.open = function(tractInfo) {
            tractInfoPopup.popup.open(TractInfoPopup.updateContent(tractInfoPopup, tractInfo),
                                      TractInfoPopup.cleanRenderer(tractInfoPopup));
        };
                                                
        return tractInfoPopup;
    };
    
    return TractInfoPopup;
    
})();