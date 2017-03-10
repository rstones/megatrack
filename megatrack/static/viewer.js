/**
 * Create a X.renderer2D to display slice in single plane
 * @constructor
 * @param {string} plane The neurological name of slicing plane eg. sagittal, coronal or axial.
 * @param {X.volume} volume
 * @param {JQuery DOM object} container The container for the View.
 * @param {string} orientation The label for the slice orientation eg. X,Y,Z.
 * @param {string} vSlice The orientation for slices vertical relative to orientation of View.
 * @param {string} hSlice The orientation for slices horizontal relative to orientation of View.
 */
function View(plane, volume, container, orientation, vSlice, hSlice) {
	
	this._plane = plane;
	this._volume = volume;
	this._container = container;
	this._orientation = orientation;
	this._vSlice = vSlice;
	this._hSlice = hSlice;
	
	this._container.append('<div id="'+this._plane+'-view" class="view"></div>');
	this._container.append('<div id="'+this._plane+'-slider"></div>');
	
	this._view = new X.renderer2D();
	this._view.radiological = false;
	this._view.container = this._plane+'-view';
	this._view.orientation = this._orientation;
	this._view.init();
	this._view.interactor.config.KEYBOARD_ENABLED = false;
	this._view.interactor.config.MOUSECLICKS_ENABLED = false;
	this._view.interactor.config.MOUSEWHEEL_ENABLED = false;
	this._view.interactor.init();
	
	this._idx = 'index' + this._orientation;
	this._dimIdx = 'XYZ'.indexOf(this._orientation); // just get dim here and use it where its needed
	this._vIdx = 'index' + this._vSlice;
	this._vDimIdx = 'XYZ'.indexOf(this._vSlice); // same here
	this._hIdx = 'index' + this._hSlice;
	this._hDimIdx = 'XYZ'.indexOf(this._hSlice); // same here
	
	this._view.add(this._volume);
	
	// initialize canvas for crosshairs overlay
	$('#'+this._plane+'-view').append('<canvas id="'+this._plane+'-crosshairs" class="crosshairs"></canvas>')
}
View.prototype.constructor = View;

View.prototype.addSlider = function() {
	var view = this;
	$('#'+this._plane+'-slider').slider({
		value: Math.floor(view._volume[view._idx]),
		min: 0,
		max: view._volume.dimensions[view._dimIdx]-1,
		step: 1,
		slide: function(event, ui) {
			$('#viewer').trigger('view:slide', [view._plane, ui.value]);
		}
	});
};

View.prototype.initSlicingOverlay = function() {
	var canvas = $('#'+this._plane+'-crosshairs').get(0);
	var viewContainer = $('#'+this._plane+'-crosshairs').parent().get(0);
	canvas.width = 250; // bad to hard code width/height here
	canvas.height = 250;
	var view = this;
	canvas.onclick = function(event) {
		var x = event.pageX - viewContainer.offsetLeft;
		var y = event.pageY - viewContainer.offsetTop;
		//view._volume[view._vIdx] = Math.round(view._volume.dimensions[view._vDimIdx] * (x / canvas.width));
		//view._volume[view._hIdx] = Math.round(view._volume.dimensions[view._hDimIdx] * (y / canvas.height));
		//view.drawCrosshairs();
		$('#viewer').trigger('view:click', [view._plane, x, y, canvas.width, canvas.height]);
	};
	this.drawCrosshairs();
}

/*
 * Horizontal line is stretched because canvas shape is altered by css which scales it
 */
View.prototype.drawCrosshairs = function() {
	var canvas = $('#'+this._plane+'-crosshairs').get(0);
	var vSlicePos = canvas.width * (this._volume[this._vIdx] / this._volume.dimensions[this._vDimIdx]);
	var hSlicePos = canvas.height * (this._volume[this._hIdx] / this._volume.dimensions[this._hDimIdx]);
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
	
	//ctx.rect(x - 6, y - 6, 10, 10);
	//ctx.stroke();
}

/**
 * Create object to contain multiple X.renderer2D objects to display different slices of MRI data
 * @constructor
 * @param {string} elementId ID of container for Viewer
 */
function Viewer(elementId) {
	
	this._elementId = elementId;
	var container = $('#'+this._elementId);
	container.append('<div id="coronal-panel"></div>');
	container.append('<div id="sagittal-panel"></div>');
	container.append('<div id="axial-panel"></div>');
	container.append('<div id="query-panel"></div>');
	$('#'+this._elementId+' div').addClass('viewer-panel');

	this._volume = new X.volume(); // is it a good idea for volume to be global?
	this._volume.file = '/get_template?.nii.gz'; // should these addresses be a bit more hidden for security? see neurosynth
	this._volume.labelmap.file = '/get_test_map?.nii.gz';
	this._volume.transform = new X.transform(); // switch to neurological convention
	this._volume.transform.flipY();
	var cmapShades = 100;
	var cmap = Colormaps({
		colormap: [{"index":0, "rgb":[0,0,0,0]}, {"index":0.01, "rgb":[100,0,0,0.7]}, {"index":0.25, "rgb":[100,0,0,0.8]},
			       {"index":0.55, "rgb":[150,0,0,0.9]}, {"index":0.65, "rgb":[200,0,0,1]}, {"index":0.75, "rgb":[250,0,0,1]},
			       {"index":0.85, "rgb":[255,0,0,1]}, {"index":1, "rgb":[255,255,0,1]}],
		alpha: [0,1],
		nshades: cmapShades,
		format: 'rgbaString'
	});
	this._volume.labelmap.colormap = function(normpixval) {
		var rgbaString = cmap[Math.floor((cmapShades-1)*normpixval)];
		rgbaString = rgbaString.replace(/[^\d,.]/g, '').split(',');
		var rgba = [];
		for (var i = 0; i<3; i++) rgba.push(parseInt(rgbaString[i], 10));
		rgba.push(255*parseFloat(rgbaString[3]));
		return rgba
	};	
	
	this._views = {};
	this._views['sagittal'] = new View('sagittal', this._volume, $('#sagittal-panel'), 'X', 'Y', 'Z');
	this._views['sagittal']._view.render();
	this._views['sagittal']._view.onShowtime = function() {
		
		viewer._views['coronal'] = new View('coronal', viewer._volume, $('#coronal-panel'), 'Y', 'X', 'Z');
		viewer._views['coronal']._view.render();
		viewer._views['axial'] = new View('axial', viewer._volume, $('#axial-panel'), 'Z', 'X', 'Y');
		viewer._views['axial']._view.render();
		
		// initialize sliders and crosshairs
		for (var view in viewer._views) {
			viewer._views[view].addSlider();
			viewer._views[view].initSlicingOverlay();
		}
	};
	
	$('#viewer').on('view:slide', function(event, plane, sliderVal) {
		//update volume for activated View
		viewer._volume[viewer._views[plane]._idx] = sliderVal;
		// update slice lines on other Views
		for (var view in viewer._views) {
			viewer._views[view].drawCrosshairs();
		}
	});
	
	$('#viewer').on('view:click', function(event, plane, x, y, canvasWidth, canvasHeight) {
		// update volume for other Views
		viewer._volume[viewer._views[plane]._vIdx] = Math.round(viewer._volume.dimensions[viewer._views[plane]._vDimIdx] * (x / canvasWidth));
		viewer._volume[viewer._views[plane]._hIdx] = Math.round(viewer._volume.dimensions[viewer._views[plane]._hDimIdx] * (y / canvasHeight));
		// update slice lines on all Views
		for (var view in viewer._views) {
			viewer._views[view].drawCrosshairs();
		}
	});
	
};

Viewer.prototype = {
		constructor: Viewer,
		onSlide: function() {
			
		}
}

$(document).ready(function() {
	viewer = new Viewer("viewer");
	// is it a good idea for viewer to be global? it is needed for onShowtime function
	// may want to wrap it in a namespace eventually
});