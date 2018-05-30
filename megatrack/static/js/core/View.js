var mgtrk = mgtrk || {};

mgtrk.View = (function() {
    
    const View = {};
    
    /**
     * Initiates basic features of a View object.
     *
     * @param {Object} view     Contains properties required to instantiate a View object.
     */
    View.initBasicView = (view) => {
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
            const canvas = $('#'+view.plane+'-crosshairs').get(0);
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
