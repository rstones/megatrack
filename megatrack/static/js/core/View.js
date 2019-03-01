var mgtrk = mgtrk || {};

mgtrk.View = (function() {
    
    const View = {};
    
    /**
     * Initiates basic features of a View object.
     *
     * @param {Object} view     Contains properties required to instantiate a View object.
     */
    View.initBasicView = (view) => {
        view._parent = view._parent || {};
        view.renderWidth = view.dim[0];
        view.renderHeight = view.dim[1];
        view.viewWidth = view.renderWidth + 80;
        view.viewHeight = view.renderHeight + 80;
        view.mniCoord = 0;
        view.disabled = false;
        
        view.container.append('<div id="'+view.plane+'-view-border" class="view-border"></div>');
        $('#'+view.plane+'-view-border').css('width', view.viewWidth);
        $('#'+view.plane+'-view-border').css('height', view.viewHeight);
        $('#'+view.plane+'-view-border').append('<div id="'+view.plane+'-view" class="view"></div>');
        $('#'+view.plane+'-view').css('width', view.renderWidth);
        $('#'+view.plane+'-view').css('height', view.renderHeight);
        
        view.renderer = new X.renderer2D();
        view.renderer.container =view.plane+'-view';
        view.renderer.orientation = view.orientation;
        view.renderer.config.PROGRESSBAR_ENABLED = false;
        view.renderer.init();
        view.renderer.interactor.config.KEYBOARD_ENABLED = false;
        view.renderer.interactor.config.MOUSECLICKS_ENABLED = false;
        view.renderer.interactor.config.MOUSEWHEEL_ENABLED = false;
        view.renderer.interactor.init();
        view.renderer.add(view.volume);
        
        view.idx = 'index' + view.orientation;
        view.dimIdx = 'XYZ'.indexOf(view.orientation);
        view.vIdx = 'index' + view.vSlice;
        view.vDimIdx = 'XYZ'.indexOf(view.vSlice);
        view.hIdx = 'index' + view.hSlice;
        view.hDimIdx = 'XYZ'.indexOf(view.hSlice);
        
        $(document).on('view:disable', function(event) {
            view.disabled = true;
        });
        
        $(document).on('view:enable', function(event) {
            view.disabled = false;
        });
    };
    
    /**
     * Adds slider to a View object.
     *
     * @param {Object} view     The object to add a slider to.
     */
    View.addSlider = (view) => {
        view.container.append('<div id="'+view.plane+'-slider"></div>');
        
        view.addSlider = function(orientation) {
            $('#'+view.plane+'-slider').slider({
                value: (view.reverse ? -1 : 1) * Math.floor(view.volume[view.idx]),
                max: view.reverse ? 0 : view.volume.dimensions[view.dimIdx]-1,
                min: view.reverse ? -view.volume.dimensions[view.dimIdx]-1 : 0,
                step: 1,
                orientation: orientation,
                slide: function(event, ui) {
                    $('#viewer').trigger('view:slide', [view.plane, Math.abs(ui.value)]);
                }
            });
        };
        
        view.setSliderValue = function(newValue) {
            $('#'+view.plane+'-slider').slider('value', view.reverse ? -newValue : newValue);
        };
        
        view.getSliderValue = function() {
            return $('#'+view.plane+'-slider').slider('option', 'value');
        };
        
        view.disableSlider = function() {
            $('#'+view.plane+'-slider').slider('disable');
        };
        
        view.enableSlider = function() {
            $('#'+view.plane+'-slider').slider('enable');
        };
        
        $(document).on('view:disable', function(event) {
            //view.disabled = true;
            view.disableSlider();
        });
        
        $(document).on('view:enable', function(event) {
            //view.disabled = false;
            view.enableSlider();
        });
        
    };
    
    /**
     * Add a label overlay canvas to View object.
     *
     * @param {Object} view     The view object to add a label overlay on.
     */
    View.addLabelOverlay = (view) => {
        view.container.append('<canvas id="'+view.plane+'-labels" class="overlay"></canvas>');
        
        view.drawLabels = function() {
            const canvas = $('#'+view.plane+'-labels').get(0);
            canvas.width = view.viewWidth;
            canvas.height = view.viewHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.font = 'normal 17px Helvetica';
            const mniCoord = Math.round(view.volume[view.idx] - (view.volume.dimensions[view.dimIdx] - view.volume.RASCenter[view.dimIdx])/2);
            switch (view.plane) {
                case 'sagittal':
                    ctx.fillText("S", view.viewWidth/2, 25);
                    ctx.fillText("I", view.viewWidth/2, view.viewHeight-15);
                    ctx.fillText("A", 10, view.viewHeight/2);
                    ctx.fillText("P", view.viewWidth-15, view.viewHeight/2);
                    ctx.fillText("x = "+mniCoord, view.viewWidth-60, view.viewHeight-10);
                    break;
                case 'coronal':
                    ctx.fillText("R", 10, view.viewHeight/2);
                    ctx.fillText("L", view.viewWidth-20, view.viewHeight/2);
                    ctx.fillText("S", view.viewWidth/2, 25);
                    ctx.fillText("I", view.viewWidth/2, view.viewHeight-15);
                    ctx.fillText("y = "+mniCoord, view.viewWidth-60, view.viewHeight-10);
                    break;
                case 'axial':
                    ctx.fillText("A", view.viewWidth/2, 20);
                    ctx.fillText("P", view.viewWidth/2, view.viewHeight-10);
                    ctx.fillText("R", 10, view.viewHeight/2);
                    ctx.fillText("L", view.viewWidth-20, view.viewHeight/2);
                    ctx.fillText("z = "+mniCoord, view.viewWidth-60, view.viewHeight-10);
            }
        };
        
    };
    
    /**
     * Add a slicing overlay to a View.
     *
     * @param {Object} view     The View object to add a slicing overlay to.
     */
    View.addSlicingOverlay = (view) => {
        $('#'+view.plane+'-view').append('<canvas id="'+view.plane+'-crosshairs" class="overlay"></canvas>');
            
        view.initSlicingOverlay = function() {
            const $canvas = $('#'+view.plane+'-crosshairs');
            const canvas = $canvas.get(0); // the DOM node underlying the canvas jQuery object
            //var viewContainer = $('#'+view.plane+'-crosshairs').parent().get(0);
            canvas.width = view.renderWidth;
            canvas.height = view.renderHeight;
            canvas.onclick = function(event) {
                const x = event.pageX - $('#'+view.plane+'-crosshairs').offset().left;
                const y = event.pageY - $('#'+view.plane+'-crosshairs').offset().top;
                $('#viewer').trigger('view:click', [view.plane, x, y, canvas.width, canvas.height]);
            };
            view.drawCrosshairs();
        };
        
        /*
         * Only bind mousemove events on the slicing overlay canvas the mouse
         * is currently over
         * And reset the overlay in case a mousemove state is still active 
         * after mouseleave
         */
        view.bindSlicingOverlayMouseEvents = function() {
        
              $('#'+view.plane+'-crosshairs').mouseenter(function(event) {
                    view.bindSlicingOverlayMouseMove();
              });
              
              $('#'+view.plane+'-crosshairs').mouseleave(function(event) {
                    view.unbindSlicingOverlayMouseMove();
                    $('#cortical-label-tooltip').hide();
                    const renderers = view._parent;
                    renderers.corticalOverlayMapping[view.prevRegion].color[3] = 0;
                    renderers.resetSlicesForColormapChange();
                    view.prevRegion = 0;
              });
        };
        
        /*
         * Unbind mouse[enter/leave] events from slicing overlay canvas
         */
        view.unbindSlicingOverlayMouseEvents = function() {
              $('#'+view.plane+'-crosshairs').off('mouseenter');
              $('#'+view.plane+'-crosshairs').off('mouseleave');
        };
        
        view.unbindSlicingOverlayMouseMove = function() {
            $('#'+view.plane+'-crosshairs').off('mousemove');
        };
        
        view.bindSlicingOverlayMouseMove = function() {
            const $canvas = $('#'+view.plane+'-crosshairs');
            const canvas = $canvas.get(0); // the DOM node underlying the canvas jQuery object
            
            view.prevRegion = 0;
            const $corticalLabelTooltip = $('#cortical-label-tooltip');
            $canvas.mousemove(function(event) {
                let x = event.pageX - $('#'+view.plane+'-crosshairs').offset().left;
                let y = event.pageY - $('#'+view.plane+'-crosshairs').offset().top;
                
                x = view.vReverse ? canvas.width - x : x;
                y = view.hReverse ? canvas.height - y : y;
                
                // x and y are coords between zero and data array dimension
                x = Math.round(view.volume.dimensions[view.vDimIdx] * (x / canvas.width));
                y = Math.round(view.volume.dimensions[view.hDimIdx] * (y / canvas.height));
                
                /*
                    To get IJK coords:
                    - convert screen coords to RAS coords
                    - transform RAS coords to IJK space 
                
                    RAS coords are in a (180mm, 216mm ,180mm) dimensional space
                    we are using 2mm voxel size so our data array dimensions are (90,108,90)
                    RAS coords should increase from L -> R, P -> A, I -> S
                    so the origin (-90,-126,-72) is the bottom left corner of the volume
                    this should correspond with the origin (0,0,0) in IJK space?
                */
                const RASOrigin = view.volume._RASOrigin;
                let RASCoords = 0;
                switch (view.idx) {
                    case 'indexX':
                        // multiply x/y by 2 to move to RAS and offset by the RAS origin
                        RASCoords = goog.vec.Vec4.createFloat32FromValues(
                                                            2*view.volume[view.idx] + RASOrigin[0],
                                                            2*x + RASOrigin[1],
                                                            2*y + RASOrigin[2],
                                                            1);
                        break;
                    case 'indexY':
                        RASCoords = goog.vec.Vec4.createFloat32FromValues(
                                                            2*x + RASOrigin[0],
                                                            2*view.volume[view.idx] + RASOrigin[1],
                                                            2*y + RASOrigin[2],
                                                            1);
                        break;
                    case 'indexZ':
                        RASCoords = goog.vec.Vec4.createFloat32FromValues(
                                                            2*x + RASOrigin[0],
                                                            2*y + RASOrigin[1],
                                                            2*view.volume[view.idx] + RASOrigin[2],
                                                            1);
                        break;
                }
                
                // transform RAS coords to IJK volume indices
                // we see the RAS origin maps to IJK (0,0,0) as expected
                let IJKCoords = goog.vec.Vec4.createFloat32();
                goog.vec.Mat4.multVec4(view.volume._RASToIJK, RASCoords, IJKCoords);
                const regionLabel = view.volume.labelmap[1]
                                            ._IJKVolume[Math.round(IJKCoords[2])]
                                                       [Math.round(IJKCoords[1])]
                                                       [Math.round(IJKCoords[0])];
                
                if (regionLabel !== 0 && regionLabel != view.prevRegion) {
                    if (view._parent && view._parent.corticalOverlayMapping) {
                        const renderers = view._parent;
                        renderers.corticalOverlayMapping[regionLabel].color[3] = 255;
                        // also need to reset the previous highlighted region 
                        renderers.corticalOverlayMapping[view.prevRegion].color[3] = 0;
                        renderers.resetSlicesForColormapChange();
                        view.prevRegion = regionLabel;
                        
                        // show tooltip, alter contents and position
                        $corticalLabelTooltip.html(renderers.corticalOverlayMapping[regionLabel].label);
                        $corticalLabelTooltip.css('left', `${event.pageX + 20}px`);
                        $corticalLabelTooltip.css('top', `${event.pageY - 20}px`);
                        $corticalLabelTooltip.show();
                    }
                } else if (regionLabel === 0 && view.prevRegion !== 0) {
                    const renderers = view._parent;
                    renderers.corticalOverlayMapping[view.prevRegion].color[3] = 0;
                    renderers.resetSlicesForColormapChange();
                    view.prevRegion = regionLabel;
                    $corticalLabelTooltip.hide();
                }
                
            });
        };
        
        view.drawCrosshairs = function() {
            const vDim = view.volume.dimensions[view.vDimIdx];
            const hDim = view.volume.dimensions[view.hDimIdx];
            let vSlicePos = (view.vReverse ? vDim - view.volume[view.vIdx] - 1 : view.volume[view.vIdx]) / vDim;
            let hSlicePos = (view.hReverse ? hDim - view.volume[view.hIdx] - 1 : view.volume[view.hIdx]) / hDim;
            const canvas = $('#'+view.plane+'-crosshairs').get(0);
            vSlicePos *= canvas.width;
            hSlicePos *= canvas.height;
            const ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(0,220,0,0.5)";
            // vertical slice
            ctx.moveTo(vSlicePos, 0);
            ctx.lineTo(vSlicePos, canvas.height);
            // horizontal slice
            ctx.moveTo(0, hSlicePos);
            ctx.lineTo(canvas.width, hSlicePos);
            ctx.stroke();
        };
        
    };
    
    /**
     * Add loading overlay to a View object.
     *
     * @param {Object}      The View object to add a loading overlay to.
     */
    View.addLoadingOverlay = (view) => {
        $('#'+view.plane+'-view').append('<canvas id="'+view.plane+'-loading" class="overlay"></canvas>');
        $('#'+view.plane+'-view').append('<div id="'+view.plane+'-loading-gif" class="view-loading-gif"></canvas>');
        $('#'+view.plane+'-loading-gif').css('left', view.renderWidth/2);
        $('#'+view.plane+'-loading-gif').css('top', view.renderHeight/2);
        
        view.drawLoadingOverlay = function() {
            const canvas = $('#'+view.plane+'-loading').get(0);
            canvas.width = view.renderWidth;
            canvas.height = view.renderHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, view.renderWidth, view.renderHeight);
        };
        
        view.hideLoadingOverlay = function() {
            const canvas = $('#'+view.plane+'-loading').css('z-index', '-1');
            $('#'+view.plane+'-loading-gif').css('z-index', '-1');
        };
        
        view.showLoadingOverlay = function() {
            const canvas = $('#'+view.plane+'-loading').css('z-index', '1');
            $('#'+view.plane+'-loading-gif').css('z-index', '2');
        };
        
        view.drawLoadingOverlay();
        view.hideLoadingOverlay();
        
        $(document).on('view:disable', function(event) {
            //view.disabled = true;
            view.showLoadingOverlay();
        });
        $(document).on('view:enable', function(event) {
            //view.disabled = false;
            view.hideLoadingOverlay();
        });
        
    };
    
    /**
     * Add overlay to draw a ROI on a View object.
     *
     * @param {Object}      The View object to add a loading overlay to.
     */
    View.addROIOverlay = (view) => {
        $('#'+view.plane+'-view').append('<canvas id="'+view.plane+'-ROI" class="overlay"></canvas>');
    };
    
    return View;
})();
