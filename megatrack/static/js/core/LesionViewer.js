var mgtrk = mgtrk || {};

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
mgtrk.initLesionView = (options) => {
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
    //mgtrk.View.addROIOverlay(view);
    
    return view;
};

mgtrk.LesionViewer = (function() {

    const LesionViewer = {};
    
    LesionViewer.init = (options) => {

        let lesionViewer = {
            containerId: options.containerId,
            rootPath: options.rootPath,
            queryBuilderId: options.queryBuilderId,
            lesionAnalysisId: options.lesionAnalysisId,
            // use labelmaps object to store array of {tractCode: "AFLONG", color: "red"} objects and lesion info
            // when manipulating X.volume.labelmaps need to refer to this object
            // we want to group the labelmaps so tracts are always below (rendered before) lesion
            // when adding tract, push onto tracts array and work out the index to insert into X.volume.labelmaps
            // when changing labelmap colormap, find idx of labelmap in X.volume.labelmaps (and update tract.color if needed)
            // when removing labelmap, find idx of labelmap to remove from X.volume.labelmaps and remove from labelmaps object
            // could maybe use this object to store the tractSettings from TractSelect?
            labelmaps: {
                tracts: [],
                lesion: []
            }
        };
        
        lesionViewer.findVolumeLabelmapIndex = function(code) {
            const labelmaps = lesionViewer.labelmaps;
            const labelmapsArray = labelmaps.tracts.concat(labelmaps.lesion);
            let idx = 0;
            for (let i=0; i<labelmapsArray.length; i++) {
                if (labelmapsArray[i].code === code) {
                    idx = i;
                    break;
                }
            }
            return idx;
        };
        
        lesionViewer.clearTracts = function() {
//             for (let i=lesionViewer.labelmaps.tracts.length; i--;) {
//                 const idx = lesionViewer.findVolumeLabelmapIndex(lesionViewer.labelmaps.tracts[i].code);
//                 lesionViewer.renderers.removeLabelmapFromVolumeNew(idx);
//             }
            lesionViewer.labelmaps.tracts = [];
        };
        
        // insert DOM elements
        const container = $('#'+lesionViewer.containerId);
        container.append('<div id="view-container"></div>');
        const viewContainer = $('#view-container');
        viewContainer.append('<div id="coronal-panel" class="viewer-panel"></div>');
        viewContainer.append('<div id="sagittal-panel" class="viewer-panel"></div>');
        viewContainer.append('<div id="axial-panel" class="viewer-panel"></div>');
        viewContainer.append('<div id="lesion-viewer-title">MegaTrack Lesion Analysis</div>');
        viewContainer.append('<div id="cortical-label-tooltip" style="display: none;"></div>');
        //$('#view-container div').addClass('viewer-panel');
        container.append('<div class="clear"></div>');
        container.append('<div id="'+lesionViewer.queryBuilderId+'"></div>');
        container.append('<div id="'+lesionViewer.lesionAnalysisId+'"></div>');
        
        // add colormap functionality and XTK renderers for views
        lesionViewer = Object.assign(lesionViewer,
                                    mgtrk.Colormaps.init(),
                                    mgtrk.Renderers.init(lesionViewer, mgtrk.initLesionView));
        
        // now add tract select, query builder and remaining listeners which depend on viewer to be set up first
        return Object.assign(lesionViewer, mgtrk.QueryBuilder.init(lesionViewer), mgtrk.LesionMapping.init(lesionViewer));
    };
    
    return LesionViewer;
})();
    
    
    
    
    
    
    