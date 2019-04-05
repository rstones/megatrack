var mgtrk = mgtrk || {};

/**
 * Create an X.renderer2D object to display slice in single plane.
 
 * @param {String} plane                The neurological name of slicing plane eg. sagittal, coronal or axial.
 * @param {X.volume} volume             Reference to the object containing neurological data.
 * @param {JQuery DOM object} container The container for the View.
 * @param {Array} dim                   2D array containing width and height for View.
 * @param {String} orientation          The label for the slice orientation eg. X,Y,Z.
 * @param {Boolean} reverse             Flip indexing of slice orientation.
 * @param {String} vSlice               The orientation for slices vertical relative to orientation of View.
 * @param {Boolean} vReverse            Flip indexing of vertical slice.
 * @param {String} hSlice               The orientation for slices horizontal relative to orientation of View.
 * @param {Boolean} hReverse            Flip indexing of horizontal slice.
 */
mgtrk.initAtlasView = (options) => {
    const view = {
        _parent: options._parent,
        plane: options.plane,
        volume: options.volume,
        container: options.container,
        dim: options.dim,
        orientation: options.orientation,
        reverse: options.reverse,
        vSlice: options.vSlice,
        vReverse: options.vReverse,
        hSlice: options.hSlice,
        hReverse: options.hReverse,
    };
    
    mgtrk.View.initBasicView(view);
    mgtrk.View.addSlider(view);
    mgtrk.View.addLabelOverlay(view);
    mgtrk.View.addSlicingOverlay(view);
    mgtrk.View.addLoadingOverlay(view);
    
    return view;
};

mgtrk.AtlasViewer = (function() {

    const AtlasViewer = {};
    
    /**
    * Initialise an AtlasViewer object using object composition to copy properties
    * from source objects to target atlasViewer object.
    *
    * @param {Object} options   Has properties with container id's for various components of the viewer.
    */
    AtlasViewer.init = (options) => {

        let atlasViewer = {
            containerId: options.containerId,
            rootPath: options.rootPath,
            objectSelectId: options.objectSelectId,
            tractSelectId: options.tractSelectId
        };
        
        // insert DOM elements
        const container = $('#'+atlasViewer.containerId);
        container.append('<div id="view-container"></div>');
        const viewContainer = $('#view-container');
        viewContainer.append('<div id="coronal-panel" class="viewer-panel"></div>');
        viewContainer.append('<div id="sagittal-panel" class="viewer-panel"></div>');
        viewContainer.append('<div id="axial-panel" class="viewer-panel"></div>');
        viewContainer.append('<div id="atlas-viewer-title">MegaTrack Atlas</div>');
        viewContainer.append('<div id="cortical-label-tooltip" style="display: none;"></div>');
        //$('#view-container div').addClass('viewer-panel');
        container.append('<div class="clear"></div>');
        container.append('<div id="'+atlasViewer.objectSelectId+'"></div>');
        container.append('<div id="'+atlasViewer.tractSelectId+'"></div>');
        
        // add colormap functionality and XTK renderers for views
        atlasViewer = Object.assign(atlasViewer, mgtrk.Colormaps.init(), mgtrk.Renderers.init(atlasViewer, mgtrk.initAtlasView));
        
        // now add tract select, query builder and remaining listeners which depend on viewer to be set up first
        return Object.assign(atlasViewer, mgtrk.ObjectSelect.init(atlasViewer), mgtrk.TractSelect.init(atlasViewer));
    };
    
    return AtlasViewer;
})();
    
    
    
    
    
    
    