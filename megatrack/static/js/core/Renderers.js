var mgtrk = mgtrk || {};

mgtrk.Renderers = (function() {

    const Renderers = {};
    
    /**
     * Initialise a Renderers object for rendering 2D slices of brain data in the three principle planes.
     *
     * @param {Object} _parent              The parent object.
     * @param {Function} viewInit           Returns a view object.
     */
    Renderers.init = (_parent, viewInit) => {
        const rootPath = _parent.rootPath;
        
        const renderers = {};
    
        renderers.volume = new X.volume();
        renderers.volume.lowerThreshold = 1000; // threshold to remove grey background of template
        renderers.volume.file = rootPath + '/get_template?.nii.gz'; // should these addresses be a bit more hidden for security? see neurosynth
        renderers.volume.labelmap = [];
    
        renderers.labelmapColors = [];
        renderers.labelmapTransparencies = [];
            
        let sagittalViewDim = [336,280];
        let coronalViewDim = [280,280];
        let axialViewDim = [280,336];
        
        const viewKeys = ['sagittal', 'coronal', 'axial'];
    
        renderers.initSetup = true;
        renderers.views = {};
        
        renderers.corticalOverlayMapping = {};
        
        /*
         * Return -1 if labelmap with given code not found.
         */
        renderers.findVolumeLabelmapIndex = function(code) {
            const labelmaps = renderers.volume.labelmap;
            for (let idx=0; idx<labelmaps.length; idx++) {
                if (labelmaps[idx].code === code) {
                    return idx;
                }
            }
            return -1;
        };
        
        /*
         * Resets volume slices when a new labelmap is added and the file needs loading
         */
        renderers.resetSlicesForDirtyFiles = function() {
            // reset slices for each orientation
            for (let i=0; i<3; i++) {
                renderers.volume.children[i].children = new Array(renderers.volume.dimensions[i]);
            }
            // since new labelmap file is dirty this single update loads new labelmap
            // and triggers update of other views
            renderers.views.sagittal.renderer.update(renderers.volume);
        };
    
        /*
         * Resets volume slices when colormap of a labelmap is changed and no new files need loading
         */
        renderers.resetSlicesForColormapChange = function() {
            // reset slices for each orientation
            for (let i=0; i<3; i++) {
                renderers.volume.children[i].children = new Array(renderers.volume.dimensions[i]);
            }
            // fire modified event on X.volume
            renderers.volume.modified();
            // update renderers explicitly to reset _slices to _volume._children
            renderers.views.sagittal.renderer.update(renderers.volume);
            renderers.views.coronal.renderer.update(renderers.volume);
            renderers.views.axial.renderer.update(renderers.volume);
        };
        
        /*
         * Removes volume slices of a certain labelmap that has been removed
         */
        renderers.removeLabelmapSlices = function(mapToRemoveIdx) {
            for (let i=0; i<3; i++) {
                for (let j=0; j<renderers.volume.children[i].children.length; j++) {
                    if (renderers.volume.children[i].children[j]) {
                        // remove labelmap from slice
                        renderers.volume.children[i].children[j].labelmap.splice(mapToRemoveIdx, 1);
                    }
                }
            }
            renderers.views.sagittal.renderer.update(renderers.volume);
            renderers.views.coronal.renderer.update(renderers.volume);
            renderers.views.axial.renderer.update(renderers.volume);
        };
        
        renderers.centreInMNISpace = function() {
            let idx = viewKeys.length;
            while (idx--) {
                const view = renderers.views[viewKeys[idx]];
                let centre = Math.round(renderers.volume.RASCenter[view.dimIdx] / 2);
                renderers.volume[view.idx] -= centre;
            }
        };
        
        renderers.removeLabelmapFromVolume = function(tractCode) {            
            for (let i=renderers.volume.labelmap.length; i--;) {
                const idx = i; //i - 1; 
                const map = renderers.volume.labelmap[idx];
                if (map.tractCode == tractCode) {
                    renderers.volume.labelmap.splice(idx, 1);
                    renderers.labelmapColors.splice(idx, 1);
                    renderers.removeLabelmapSlices(idx);
                    break;
                }
            }
        };
        
        /*
            idx: index of labelmap in X.volume.labelmap to remove
        */
        renderers.removeLabelmapFromVolumeNew = function(idx) {
            renderers.volume.labelmap.splice(idx, 1);
            for (let i=0; i<3; i++) {
                for (let j=0; j<renderers.volume.children[i].children.length; j++) {
                    if (renderers.volume.children[i].children[j]) {
                        // remove labelmap from slice
                        renderers.volume.children[i].children[j].labelmap.splice(idx, 1);
                    }
                }
            }
            renderers.views.sagittal.renderer.update(renderers.volume);
            renderers.views.coronal.renderer.update(renderers.volume);
            renderers.views.axial.renderer.update(renderers.volume);
        };
        
        renderers.removeAllLabelmaps = function() {
            const numLabelmaps = renderers.volume.labelmap.length;
            for (let k=0; k < numLabelmaps; k++) {
                renderers.removeLabelmapFromVolumeNew(0);
            }  
        };
        
        renderers.removeAllTracts = function() {
            // this is assuming there is only 1 cortical map visible and which is
            // first in the labelmap array
            if (renderers.volume.labelmap[0].code != 'cortical') {
                renderers.removeAllLabelmaps();
            } else {
                const numLabelmaps = renderers.volume.labelmap.length;
                for (let k = 1; k < numLabelmaps; k++) {
                    renderers.removeLabelmapFromVolumeNew(1);
                }
            }
        };
        
        renderers.addLabelmapToVolume = function(tractCode, newQuery) {
            renderers.addingNewTract = true;
            $(document).trigger('view:disable');
            var map = new X.labelmap(renderers.volume);
            map.tractCode = tractCode; // store tractCode on labelmap for access later. Need cleaner solution
            if (newQuery) {
                map.file = rootPath + '/tract/'+tractCode+'?'+$.param(newQuery)+'&file_type=.nii.gz';
            } else {
                map.file = rootPath + '/tract/'+tractCode+'?file_type=.nii.gz';
            }
            var color = Object.keys(_parent.colormaps.colormaps)[Math.floor(Math.random()*_parent.colormaps.numColormaps)];
            var tractSettings = {
                    "colormapMax": _parent.colormaps.initColormapMax,
                    "colormapMin": _parent.colormaps.initColormapMin,
                    "opacity": _parent.colormaps.initColormapOpacity,
                    "color": color,
                    "colormapMinUpdate": 0
                };
            map.colormap = _parent.colormaps.generateXTKColormap(_parent.colormaps.colormaps[color]);
            renderers.volume.labelmap.push(map);
            renderers.labelmapColors.push(color);
            
            return tractSettings;
        };
        
        /*
            mapType: 'tract' or 'lesion' defines the type of map to get from the server
            code: the tract code or lesion code
            idx: the index at which to put the new labelmap in the X.volume.labelmaps array
            params: optional params object which will be converted to a string and included in the query params of the url
        */
        renderers.addLabelmapToVolumeNew = function(mapType, code, idx, settings, params) {
            renderers.addingNewTract = true;
            $(document).trigger('view:disable');
            var map = new X.labelmap(renderers.volume);
            map.code = code; // store tractCode on labelmap for access later. Need cleaner solution
            if (params) {
                map.file = rootPath + '/'+mapType+'/'+code+'?'+$.param(params)+'&file_type=.nii.gz';
            } else {
                map.file = rootPath + '/'+mapType+'/'+code+'?file_type=.nii.gz';
            }
            map.colormap = _parent.colormaps.generateXTKColormap(settings.colormap);
            const labelmaps = renderers.volume.labelmap;
            // add labelmap at position idx or at end of array
            labelmaps.splice(idx !== null ? idx : labelmaps.length, 0, map);
            return true;
        };
        
        renderers.displayCorticalAtlas = function(atlasName, replaceCurrent) {
            
            $.ajax({
                url: `${rootPath}/get_cortical_labels/${atlasName}`,
                dataType: 'json',
                success: function(data) {
                    renderers.addingNewTract = true;
                    $(document).trigger('view:disable');
                    // construct object
                    const mapping = {};
                    mapping[0] = {color: [0, 0, 0, 0], label: ''};
                    for (let i = 0; i < data.length; i++) {
                        let region = data[i];
                        mapping[parseInt(region[1])] = {
                                                        color: [
                                                                    parseInt(region[2].slice(2,4), 16),
                                                                    parseInt(region[2].slice(4,6), 16),
                                                                    parseInt(region[2].slice(6,8), 16),
                                                                    120
                                                                ],
                                                        label: region[0]
                                                        };
                    }
                    for (let i = data.length+1; i <= 255; i++) {
                        mapping[i] = {color: [0, 0, 0, 0], label: ''};
                    }
                    renderers.corticalOverlayMapping = mapping;
                    
                    var map = new X.labelmap(renderers.volume);
                    map.code = 'cortical'; // can't remember what we need this for now!
                    map.file = `${rootPath}/get_cortical_map/${atlasName}?file_type=.nii.gz`;
                    map.colormap = function(normpixval) {
                        // the labelmap voxel values are scaled to between 0 and 255 in X.parser.reslice2
                        // then scaled to between 0 and 1 in X.renderer2D.render_ to get normpixval
                        // undo that here by scaling to between 0 and number of cortical regions
                        let idx = Math.ceil(normpixval*data.length);
                        return renderers.corticalOverlayMapping[idx].color;
                    };
                    // add the cortical map first in labelmap array or replace the current one
                    renderers.volume.labelmap.splice(0, replaceCurrent ? 1 : 0, map);
                    renderers.resetSlicesForDirtyFiles();
                }
            });
            return true;
        };
        
        renderers.updateLabelmapFile = function(tractCode, newQuery) {
            renderers.addingNewTract = false;
            for (let i=0; i<renderers.volume.labelmap.length; i++) {
                var map = renderers.volume.labelmap[i];
                if (map.tractCode == tractCode) {
                    map.file = rootPath + '/tract/'+tractCode+'?'+$.param(newQuery)+'&file_type=.nii.gz';
                    //this.resetSlicesForDirtyFiles();
                    break;
                }
            }
        };
        
        /*
            mapType: 'tract' or 'lesion' defines the type of map to get from the server
            code: the tract code or lesion code
            idx: the index at which to put the new labelmap in the X.volume.labelmaps array
            params: optional params object which will be converted to a string and included in the query params of the url
        */
        renderers.updateLabelmapFileNew = function(mapType, code, idx, params) {
            renderers.addingNewTract = false;
            if (params) {
                renderers.volume.labelmap[idx].file = rootPath + '/' + mapType + '/' + code + '?' + $.param(params)+'&file_type=.nii.gz';
            } else {
                renderers.volume.labelmap[idx].file = rootPath + '/' + mapType + '/' + code + '?file_type=.nii.gz';
            }
             
        };
        
        renderers.parsingListener = function(event) {
            if (!event.data.instance.addingNewTract) {
                if (renderers.parsingEventCount || renderers.parsingEventCount === 0) {
                    renderers.parsingEventCount++;
                } else {
                    renderers.parsingEventCount = 1;
                }
                
                // count the number of tract labelmaps we need to wait for updating
                let numTracts = 0;
                for (let k = 0; k < renderers.volume.labelmap.length; k++) {
                    if (!['lesion', 'cortical'].includes(renderers.volume.labelmap[k].code)) {
                        numTracts++;
                    }
                }
                if (renderers.parsingEventCount == numTracts) {
                    $(document).trigger('view:enable');
                    renderers.parsingEventCount = 0;
                }
            }
            else {
                $(document).trigger('view:enable');
            }
        };
        
        $(document).on('parsingComplete', {instance: renderers}, renderers.parsingListener);
        renderers.addingNewTract = true;
        
        // init stuff
        renderers.views.sagittal = viewInit({
                                                _parent: renderers,
                                                plane: viewKeys[0],
                                                volume: renderers.volume,
                                                container: $('#sagittal-panel'),
                                                dim: sagittalViewDim,
                                                orientation: 'X',
                                                reverse: true,
                                                vSlice: 'Y',
                                                vReverse: true,
                                                hSlice: 'Z',
                                                hReverse: true
                                            });
        renderers.views.sagittal.renderer.render();
        renderers.views.sagittal.renderer.onShowtime = function() {
            if (renderers.initSetup) {

                renderers.views.coronal = viewInit({
                                                        _parent: renderers,
                                                        plane: viewKeys[1],
                                                        volume: renderers.volume,
                                                        container: $('#coronal-panel'),
                                                        dim: coronalViewDim,
                                                        orientation: 'Y',
                                                        reverse: true,
                                                        vSlice: 'X',
                                                        vReverse: true,
                                                        hSlice: 'Z',
                                                        hReverse: true
                                                    });                            
                renderers.views.coronal.renderer.render();

                renderers.views.axial = viewInit({
                                                    _parent: renderers,
                                                    plane: viewKeys[2],
                                                    volume: renderers.volume,
                                                    container: $('#axial-panel'),
                                                    dim: axialViewDim,
                                                    orientation: 'Z',
                                                    reverse: false,
                                                    vSlice: 'X',
                                                    vReverse: true,
                                                    hSlice: 'Y',
                                                    hReverse: true
                                                });          
                renderers.views.axial.renderer.render();
                
                renderers.centreInMNISpace();
                
                // initialize sliders and crosshairs
                let i = viewKeys.length;
                while (i--) {
                    const view = renderers.views[viewKeys[i]];
                    view.addSlider('horizontal');
                    view.initSlicingOverlay();
                    view.drawLabels();
                }
    
                renderers.initSetup = false;
                
            } else {
                // reset renderers after reloading labelmap
                renderers.views.coronal.renderer.update(renderers.volume);
                renderers.views.axial.renderer.update(renderers.volume);
            }
        };
        
        $('#viewer').on('view:slide', function(event, plane, sliderVal) {
            //update volume for activated View
            renderers.volume[renderers.views[plane].idx] = sliderVal;
            // update slice lines on other Views
            let i = viewKeys.length;
            while (i--) {
                renderers.views[viewKeys[i]].drawCrosshairs();
                renderers.views[viewKeys[i]].drawLabels();
            }
        });
        
        $('#viewer').on('view:click', function(event, plane, x, y, canvasWidth, canvasHeight) {
            // update volume for other Views, need to reverse the volume idx for some views
            var view = renderers.views[plane];
            if (!view.disabled) {
                x = view.vReverse ? canvasWidth - x : x;
                y = view.hReverse ? canvasHeight - y : y;
                renderers.volume[view.vIdx] = Math.round(renderers.volume.dimensions[view.vDimIdx] * (x / canvasWidth));
                renderers.volume[view.hIdx] = Math.round(renderers.volume.dimensions[view.hDimIdx] * (y / canvasHeight));
                // update slice lines on all Views and slider positions
                for (let key in renderers.views) {
                    view = renderers.views[key];
                    view.drawCrosshairs();
                    view.setSliderValue(renderers.volume[view.idx]);
                    view.drawLabels();
                }
            }
        });
        
        $(document).on("colormap:change", function(event, settings) {
            const tractCode = settings.code;
            const color = settings.color;
            const colormapMin = settings.colormapMin;
            const colormapMax = settings.colormapMax;
            const opacity = settings.opacity;
            for (let i=0; i<renderers.volume.labelmap.length; i++) {
                const map = renderers.volume.labelmap[i];
                if (map.file.indexOf(tractCode) != -1) {
                    map.colormap = _parent.colormaps.generateXTKColormap(_parent.colormaps.colormapFunctions[color](
                                                                                                                colormapMin,
                                                                                                                colormapMax,
                                                                                                                opacity
                                                                                                                )
                                                                    );
                    renderers.labelmapColors[i] = color;
                    renderers.resetSlicesForColormapChange();
                    break;
                }
            }
            return false;
        });
        
        $(document).on('tract:remove', function(event, tractCode) {
            renderers.removeLabelmapFromVolume(tractCode);
        });
        
        return {
            renderers: renderers
        };
    };
    
    return Renderers;
})();