/**
 * Create a X.renderer2D to display slice in single plane
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
function View(plane, volume, container, dim, orientation, reverse, vSlice, vReverse, hSlice, hReverse) {
	
	this._plane = plane;
	this._volume = volume;
	this._container = container;
	this._orientation = orientation;
	this._reverse = reverse;
	this._vSlice = vSlice;
	this._hSlice = hSlice;
	this._vReverse = vReverse;
	this._hReverse = hReverse;
	this._renderWidth = dim[0];
	this._renderHeight = dim[1];
	this._viewWidth = this._renderWidth + 80;
	this._viewHeight = this._renderHeight + 80;
	this._mniCoord = 0;
	
	this._disabled = false;
	
	var instance = this;
	
	$(document).on('view:disable', function(event) {
	    instance._disabled = true;
	    instance.disableSlider();
	    instance.showLoadingOverlay();
	});
	$(document).on('view:enable', function(event) {
	    instance._disabled = false;
	    instance.enableSlider();
	    instance.hideLoadingOverlay();
	});
	
	this._container.append('<div id="'+this._plane+'-view-border" class="view-border"></div>');
	$('#'+this._plane+'-view-border').css('width', this._viewWidth);
	$('#'+this._plane+'-view-border').css('height', this._viewHeight);
	$('#'+this._plane+'-view-border').append('<div id="'+this._plane+'-view" class="view"></div>');
	$('#'+this._plane+'-view').css('width', this._renderWidth);
	$('#'+this._plane+'-view').css('height', this._renderHeight);
	this._container.append('<div id="'+this._plane+'-slider"></div>');
	
	this._view = new X.renderer2D();
	this._view.container = this._plane+'-view';
	this._view.orientation = this._orientation;
	this._view.config.PROGRESSBAR_ENABLED = false;
	this._view.init();
	this._view.interactor.config.KEYBOARD_ENABLED = false;
	this._view.interactor.config.MOUSECLICKS_ENABLED = false;
	this._view.interactor.config.MOUSEWHEEL_ENABLED = false;
	this._view.interactor.init();
	this._view.add(this._volume);
	
	this._idx = 'index' + this._orientation;
	this._dimIdx = 'XYZ'.indexOf(this._orientation);
	this._vIdx = 'index' + this._vSlice;
	this._vDimIdx = 'XYZ'.indexOf(this._vSlice);
	this._hIdx = 'index' + this._hSlice;
	this._hDimIdx = 'XYZ'.indexOf(this._hSlice);
	
//	// initialize canvas for labels
//	$('#'+this._plane+'-view').append('<canvas id="'+this._plane+'-labels" class="overlay"></canvas>');
//	// initialize canvas for crosshairs overlay
//	$('#'+this._plane+'-view').append('<canvas id="'+this._plane+'-crosshairs" class="overlay"></canvas>');
	
	this._container.append('<canvas id="'+this._plane+'-labels" class="overlay"></canvas>');
	$('#'+this._plane+'-view').append('<canvas id="'+this._plane+'-crosshairs" class="overlay"></canvas>');
	$('#'+this._plane+'-view').append('<canvas id="'+this._plane+'-loading" class="overlay"></canvas>');
	$('#'+this._plane+'-view').append('<div id="'+this._plane+'-loading-gif" class="view-loading-gif"></canvas>');
	$('#'+this._plane+'-loading-gif').css('left', this._renderWidth/2);
	$('#'+this._plane+'-loading-gif').css('top', this._renderHeight/2);
	this.drawLoadingOverlay();
	this.hideLoadingOverlay();
	
}
View.prototype.constructor = View;

/**
 * @param {string} orientation Either horizontal or vertical
 */
View.prototype.addSlider = function(orientation) {
	var view = this;
	$('#'+this._plane+'-slider').slider({
		value: (view._reverse ? -1 : 1) * Math.floor(view._volume[view._idx]),
		max: view._reverse ? 0 : view._volume.dimensions[view._dimIdx]-1,
		min: view._reverse ? -view._volume.dimensions[view._dimIdx]-1 : 0,
		step: 1,
		orientation: orientation,
		slide: function(event, ui) {
			$('#viewer').trigger('view:slide', [view._plane, Math.abs(ui.value)]);
		}
	});
};

View.prototype.setSliderValue = function(newValue) {
	$('#'+this._plane+'-slider').slider('value', this._reverse ? -newValue : newValue);
};

View.prototype.getSliderValue = function() {
	return $('#'+this._plane+'-slider').slider('option', 'value');
};

View.prototype.disableSlider = function() {
    $('#'+this._plane+'-slider').slider('disable');
};

View.prototype.enableSlider = function() {
    $('#'+this._plane+'-slider').slider('enable');
};

View.prototype.initSlicingOverlay = function() {
	var canvas = $('#'+this._plane+'-crosshairs').get(0);
	var viewContainer = $('#'+this._plane+'-crosshairs').parent().get(0);
	canvas.width = this._renderWidth;
	canvas.height = this._renderHeight;
	var view = this;
	canvas.onclick = function(event) {
		var x = event.pageX - $('#'+view._plane+'-crosshairs').offset().left;
		var y = event.pageY - $('#'+view._plane+'-crosshairs').offset().top;
		$('#viewer').trigger('view:click', [view._plane, x, y, canvas.width, canvas.height]);
	};
	this.drawCrosshairs();
};

View.prototype.drawLabels = function() {
	var canvas = $('#'+this._plane+'-labels').get(0);
	canvas.width = this._viewWidth;
	canvas.height = this._viewHeight;
	var ctx = canvas.getContext('2d');
	ctx.fillStyle = 'white';
	ctx.font = 'normal 17px Helvetica';
	var mniCoord = Math.round(this._volume[this._idx] - (this._volume.dimensions[this._dimIdx] - this._volume.RASCenter[this._dimIdx])/2);
	if (this._plane == 'sagittal') {
		ctx.fillText("S", this._viewWidth/2, 25);
		ctx.fillText("I", this._viewWidth/2, this._viewHeight-15);
		ctx.fillText("A", 10, this._viewHeight/2);
		ctx.fillText("P", this._viewWidth-15, this._viewHeight/2);
		ctx.fillText("x = "+mniCoord, this._viewWidth-60, this._viewHeight-10);
	} else if (this._plane == 'coronal') {
		ctx.fillText("R", 10, this._viewHeight/2);
		ctx.fillText("L", this._viewWidth-20, this._viewHeight/2);
		ctx.fillText("S", this._viewWidth/2, 25);
		ctx.fillText("I", this._viewWidth/2, this._viewHeight-15);
		ctx.fillText("y = "+mniCoord, this._viewWidth-60, this._viewHeight-10);
	} else if (this._plane == 'axial') {
		ctx.fillText("A", this._viewWidth/2, 20);
		ctx.fillText("P", this._viewWidth/2, this._viewHeight-10);
		ctx.fillText("R", 10, this._viewHeight/2);
		ctx.fillText("L", this._viewWidth-20, this._viewHeight/2);
		ctx.fillText("z = "+mniCoord, this._viewWidth-60, this._viewHeight-10);
	}
};

View.prototype.drawCrosshairs = function() {
	var vDim = this._volume.dimensions[this._vDimIdx];
	var hDim = this._volume.dimensions[this._hDimIdx];
	var vSlicePos = (this._vReverse ? vDim - this._volume[this._vIdx] - 1 : this._volume[this._vIdx]) / vDim;
	var hSlicePos = (this._hReverse ? hDim - this._volume[this._hIdx] - 1 : this._volume[this._hIdx]) / hDim;
	var canvas = $('#'+this._plane+'-crosshairs').get(0);
	vSlicePos *= canvas.width;
	hSlicePos *= canvas.height;
	var ctx = canvas.getContext('2d');
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

View.prototype.drawLoadingOverlay = function() {
    var canvas = $('#'+this._plane+'-loading').get(0);
    canvas.width = this._renderWidth;
    canvas.height = this._renderHeight;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, this._renderWidth, this._renderHeight);
    //ctx.fillStyle = 'white';
    //ctx.font = 'normal 17px Helvetica';
    //ctx.fillText("Loading...", this._renderWidth/2 - 35, this._renderHeight/2 - 10);
};

View.prototype.hideLoadingOverlay = function() {
    var canvas = $('#'+this._plane+'-loading').css('z-index', '-1');
    $('#'+this._plane+'-loading-gif').css('z-index', '-1');
};

View.prototype.showLoadingOverlay = function() {
    var canvas = $('#'+this._plane+'-loading').css('z-index', '1');
    $('#'+this._plane+'-loading-gif').css('z-index', '2');
};
