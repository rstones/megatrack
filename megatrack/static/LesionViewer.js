var mgtrk = mgtrk || {};

/*
Probably want to pass the target div ids as args as well as the container id
so they can defined independently of this factory function. This will decouple
modules like the views, queryBuilder and tractSelect from this function. Currently
the target div ids are coded into the factory functions for those modules.
*/
mgtrk.initDOMElements = (_this) => {

    const containerId = _this.containerId;

    const container = $('#'+containerId);
    container.append('<div id="view-container"></div>');
    const viewContainer = $('#view-container');
    viewContainer.append('<div id="coronal-panel"></div>');
    viewContainer.append('<div id="sagittal-panel"></div>');
    viewContainer.append('<div id="axial-panel"></div>');
    $('#view-container div').addClass('viewer-panel');
    container.append('<div class="clear"></div>');
    container.append('<div id="query-panel"></div>');
    container.append('<div id="tract-panel"></div>');

    return {
                DOMElements: {container: container}  
            };
};

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
    mgtrk.View.addROIOverlay(view);
    
    return view;
};

mgtrk.LesionViewer = (function() {

    const LesionViewer = {};
    
    LesionViewer.init = (options) => {

        let lesionViewer = {
            containerId: options.containerId,
            rootPath: options.rootPath,
            queryBuilderId: options.queryBuilderId,
            tractSelectId: options.tractSelectId,
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
        
        lesionViewer.findVolumeLabelmapIndex = function(labelmap) {
            const labelmaps = lesionViewer.labelmaps;
            const labelmapsArray = labelmaps.tracts.concat(labelmaps.lesion);
            const idx = labelmapsArray.indexOf(labelmap);  
        };
        
        // insert DOM elements
        const container = $('#'+lesionViewer.containerId);
        container.append('<div id="view-container"></div>');
        const viewContainer = $('#view-container');
        viewContainer.append('<div id="coronal-panel" class="viewer-panel"></div>');
        viewContainer.append('<div id="sagittal-panel" class="viewer-panel"></div>');
        viewContainer.append('<div id="axial-panel" class="viewer-panel"></div>');
        viewContainer.append('<div id="lesion-select"></div>');
        //$('#view-container div').addClass('viewer-panel');
        container.append('<div class="clear"></div>');
        container.append('<div id="'+lesionViewer.queryBuilderId+'"></div>');
        container.append('<div id="'+lesionViewer.tractSelectId+'"></div>');
        
        // add colormap functionality and XTK renderers for views
        lesionViewer = Object.assign(lesionViewer,
                                    mgtrk.Colormaps.init(),
                                    mgtrk.Renderers.init(lesionViewer, mgtrk.initLesionView),
                                    LesionViewer.addLesionSelect(lesionViewer));
        
        // now add tract select, query builder and remaining listeners which depend on viewer to be set up first
        return Object.assign(lesionViewer, mgtrk.QueryBuilder.init(lesionViewer), mgtrk.TractSelect.init(lesionViewer));
    };
    
    LesionViewer.addLesionSelect = (lesionViewer) => {
        $('#lesion-select').append('<span>Upload lesion map</span>'
                                    +'<form id="lesion-upload-form" action="/megatrack/lesion_upload" method="POST" enctype="multipart/form-data">'
                                        +'<input id="lesion-file" type="file" name="lesionmap"/>'
                                        +'<input type="submit", value="Update"/>'
                                    +'</form>');
                                    
        $('#lesion-upload-form').submit(function(event) {
             event.preventDefault();
             const formData = new FormData();
             const file = $('#lesion-file')[0].files[0];
             formData.append('lesionmap', file);
             $.ajax({
                 url: '/megatrack/lesion_upload',
                 method: 'POST',
                 dataType: 'json',
                 processData: false,
                 contentType: false,
                 data: formData,
                 success: function(data) {
                     // update volume with file path to lesion
                     console.log('Successfully uploaded lesion map with code ' + data.lesionCode);
                     lesionViewer.renderers.addLesionMapToVolume(data.lesionCode);
                     lesionViewer.renderers.resetSlicesForDirtyFiles();
                 },
                 error: function(xhr) {
                     // invalid nifti etc...
                 }
             });
        });
    };
    
    return LesionViewer;
})();
    
    
    
    
    
    
    