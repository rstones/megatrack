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
        atlasViewer = Object.assign(atlasViewer, mgtrk.ObjectSelect.init(atlasViewer), mgtrk.TractInfoTabs.init(atlasViewer, {}, true));
        
        // set up event listeners here for linking between Renderers, ObjectSelect and TractInfoTabs
            
        // tract_query:add  add tract object to renderers and new tab to TractInfoTabs (should handle list of tracts)
        container.on('tract_query:add', function(event, tractQueries) {
            
            for (let i = 0; i < tractQueries.length; i++) {
                let tractQuery = tractQueries[i];
                
                const settings = tractQuery.settings;
                const color = Object.keys(atlasViewer.colormaps.colormaps)[Math.floor(Math.random()*atlasViewer.colormaps.numColormaps)];
                
                const tractQueryId = `${tractQuery.code}-${mgtrk.Query.stringify(tractQuery.query)}`;
                
                Object.assign(settings, {
                    color: color,
                    colormap: atlasViewer.colormaps.colormaps[color],
                    colormapMax: atlasViewer.colormaps.initColormapMax,
                    colormapMin: atlasViewer.colormaps.initColormapMin,
                    opacity: atlasViewer.colormaps.initColormapOpacity,
                    colormapMinUpdate: 0,
                    tractQueryId: tractQueryId 
                });
                
                // add TractInfoTab
                atlasViewer.tractInfoTabs.addTab(
                    tractQueryId,
                    'tract',
                    settings
                );
                atlasViewer.tractInfoTabs.selectTab(tractQueryId);
                
                // add tract to renderers
                atlasViewer.renderers.addLabelmapToVolumeNew('tract', tractQuery.code, null, settings, tractQuery.query, tractQueryId);
                atlasViewer.renderers.resetSlicesForDirtyFiles();
            }
        });
        
        // object:add       add lesion or cortical object to renderers (should handle list of objects)
        container.on('object:add', function(event, objects) {
            var generalObject = {
                type: '',
                code: '',
                name: '',
                settings: {}  
            };
        });
        
        // object:remove    remove object from renderers (should handle list of objects)
        container.on('object:remove', function(event, objects) {
            
        });
        
        // object:update    update object settings in renderers, eg. opacity/colour etc (should handle list of objects)
        container.on('object:update', function(event, objects) {
            
        });
        
        return atlasViewer;
    };
    
    return AtlasViewer;
})();
    
    
    
    
    
    
    