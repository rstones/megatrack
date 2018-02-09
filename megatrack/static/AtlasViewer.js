var mgtrk = mgtrk || {};

/*
Probably want to pass the target div ids as args as well as the container id
so they can defined independently of this factory function. This will decouple
modules like the views, queryBuilder and tractSelect from this function. Currently
the target div ids are coded into the factory functions for those modules.
*/
// mgtrk.initDOMElements = (_this) => {
// 
//     const containerId = _this.containerId;
// 
//     const container = $('#'+containerId);
//     container.append('<div id="view-container"></div>');
//     const viewContainer = $('#view-container');
//     viewContainer.append('<div id="coronal-panel"></div>');
//     viewContainer.append('<div id="sagittal-panel"></div>');
//     viewContainer.append('<div id="axial-panel"></div>');
//     $('#view-container div').addClass('viewer-panel');
//     container.append('<div class="clear"></div>');
//     container.append('<div id="query-panel"></div>');
//     container.append('<div id="tract-panel"></div>');
// 
//     return {
//                 DOMElements: {container: container}  
//             };
// };

/**
 * Create an X.renderer2D object to display slice in single plane
 * @constructor
 * @param {string} plane The neurological name of slicing plane eg. sagittal, coronal or axial.
 * @param {X.volume} volume
 * @param {JQuery DOM object} container The container for the View.
 * @param {Array} dim 2D array containing width and height for View.
 * @param {string} orientation The label for the slice orientation eg. X,Y,Z.
 * @param {boolean} reverse Flip indexing of slice orientation.
 * @param {string} vSlice The orientation for slices vertical relative to orientation of View.
 * @param {boolean} vReverse Flip indexing of vertical slice.
 * @param {string} hSlice The orientation for slices horizontal relative to orientation of View.
 * @param {boolean} hReverse Flip indexing of horizontal slice.
 */
mgtrk.initAtlasView = (options) => {
    const view = {
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
    
    AtlasViewer.init = (options) => {

        let atlasViewer = {
            containerId: options.containerId,
            rootPath: options.rootPath,
            queryBuilderId: options.queryBuilderId,
            tractSelectId: options.tractSelectId
        };
        
        // insert DOM elements
        const container = $('#'+atlasViewer.containerId);
        container.append('<div id="view-container"></div>');
        const viewContainer = $('#view-container');
        viewContainer.append('<div id="coronal-panel"></div>');
        viewContainer.append('<div id="sagittal-panel"></div>');
        viewContainer.append('<div id="axial-panel"></div>');
        $('#view-container div').addClass('viewer-panel');
        container.append('<div class="clear"></div>');
        container.append('<div id="'+atlasViewer.queryBuilderId+'"></div>');
        container.append('<div id="'+atlasViewer.tractSelectId+'"></div>');
        
        // add colormap functionality and XTK renderers for views
        atlasViewer = Object.assign(atlasViewer, mgtrk.Colormaps.init(), mgtrk.Renderers.init(atlasViewer, mgtrk.initAtlasView));
        
        // now add tract select, query builder and remaining listeners which depend on viewer to be set up first
        return Object.assign(atlasViewer, mgtrk.QueryBuilder.init(atlasViewer), mgtrk.TractSelect.init(atlasViewer));
    };
    
    return AtlasViewer;
})();
    
    
    
    
    
    
    