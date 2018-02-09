var mgtrk = mgtrk || {};

mgtrk.Renderers = (function() {

    const Renderers = {};

    Renderers.init = (_this, viewInit) => {
        const rootPath = _this.rootPath;
        
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
                        renderers.volume.children[i].children[j]._labelmap.splice(mapToRemoveIdx, 1);
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
            for (let i=renderers.voluime.labelmap.length; i--;) {
                const idx = i - 1; 
                const map = renderers.volume.labelmap[idx];
                if (map.tractCode == tractCode) {
                    renderers.volume.labelmap.splice(idx, 1);
                    renderers.labelmapColors.splice(idx, 1);
                    renderers.removeLabelmapSlices(idx);
                    break;
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
            var color = Object.keys(_this.colormaps.colormaps)[Math.floor(Math.random()*_this.colormaps.numColormaps)];
            var tractSettings = {
                    "colormapMax": _this.colormaps.initColormapMax,
                    "colormapMin": _this.colormaps.initColormapMin,
                    "opacity": _this.colormaps.initColormapOpacity,
                    "color": color,
                    "colormapMinUpdate": 0
                };
            map.colormap = _this.colormaps.generateXTKColormap(_this.colormaps.colormaps[color]);
            renderers.volume.labelmap.push(map);
            renderers.labelmapColors.push(color);
            
            return tractSettings;
        };
        
        renderers.addLesionMapToVolume = function(lesionCode) {
            renderers.addingNewTract = true;
            $(document).trigger('view:disable');
            var map = new X.labelmap(renderers.volume);
            map.lesionCode = lesionCode; // store tractCode on labelmap for access later. Need cleaner solution
            map.file = rootPath + '/lesion/'+lesionCode+'?file_type=.nii.gz';
            var color = 'lesion';
//             var tractSettings = {
//                     "colormapMax": 1,
//                     "colormapMin": 0,
//                     "opacity": 0.5,
//                     "color": color,
//                     "colormapMinUpdate": 0
//                 };
            map.colormap = _this.colormaps.generateXTKColormap(_this.colormaps.colormaps[color]);
            renderers.volume.labelmap.push(map);
            renderers.labelmapColors.push(color);
//             return tractSettings;
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
        
        renderers.parsingListener = function(event) {
            if (!event.data.instance.addingNewTract) {
                if (renderers.parsingEventCount || renderers.parsingEventCount === 0) {
                    renderers.parsingEventCount++;
                } else {
                    renderers.parsingEventCount = 1;
                }
                if (renderers.parsingEventCount == renderers.volume.labelmap.length) {
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
        
        return {
            renderers: renderers
        };
    };
    
    return Renderers
})();