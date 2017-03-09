/*
 * Constructor for Panel class
 */
function Panel() {
	// insert div with certain dimensions to hold either an image or a form
};

Panel.prototype = {
		constructor: Panel
}

/*
 * Constructor for ViewPanel class inheriting from Panel
 */
function ViewPanel(name, volume, container, orientation, vSlice, hSlice) {
	Panel.call(this);
	// insert a canvas tag to render slices of voxel data in a certain plane
	// have a slider to go through slices
	// drag cross hair to go through slices on other canvases
	this._name = name;
	this._volume = volume;
	this._container = container;
	this._orientation = orientation;
	this._vSlice = vSlice;
	this._hSlice = hSlice;
	
	this._container.append('<div id="'+this._name+'-view" class="view-panel"></div>');
	this._container.append('<div id="'+this._name+'-slider"></div>');
	
	this._slice = new X.renderer2D();
	this._slice.container = this._name+'-view';
	this._slice.orientation = this._orientation;
	this._slice.init();
	this._slice.interactor.config.KEYBOARD_ENABLED = false;
	this._slice.interactor.config.MOUSECLICKS_ENABLED = false;
	this._slice.interactor.config.MOUSEWHEEL_ENABLED = false;
	this._slice.interactor.init();
	
	this._idx = 'index' + this._orientation;
	this._dimIdx = 'XYZ'.indexOf(this._orientation);
	this._vIdx = 'index' + this._vSlice;
	this._vDimIdx = 'XYZ'.indexOf(this._vSlice);
	this._hIdx = 'index' + this._hSlice;
	this._hDimIdx = 'XYZ'.indexOf(this._hSlice);
	
	this._slice.add(this._volume);
	
	// initialize canvas for crosshairs overlay
	$('#'+this._name+'-view').append('<canvas id="'+this._name+'-crosshairs" class="crosshairs"></canvas>')
	
}
ViewPanel.prototype = Object.create(Panel.prototype);
ViewPanel.prototype.constructor = ViewPanel;

ViewPanel.prototype.render = function() {
	
};

ViewPanel.prototype.addSlider = function() {
	var panel = this;
	$('#'+this._name+'-slider').slider({
		value: Math.floor(panel._volume[panel._idx]),
		min: 0,
		max: panel._volume.dimensions[panel._dimIdx]-1,
		step: 1,
		slide: function(event, ui) { // make this the onSlide function when its sorted
			panel._volume[panel._idx] = ui.value;
			// also update crosshair positions on other views
		}
	});
};

// actions to take on slide event, ie. move crosshairs in other views
ViewPanel.prototype.onSlide = function() {
	
}

ViewPanel.prototype.drawCrosshairs = function() {
	var canvas = $('#'+this._name+'-crosshairs').get(0);
	var canvasWidth = canvas.width;
	var canvasHeight = canvas.height;
	var ctx = canvas.getContext('2d');
	ctx.lineWidth = 1;
	ctx.strokeStyle = "rgba(0,255,0,0.7)";
	// vertical slice
	var vSlicePos = canvasWidth * (this._volume[this._vIdx] / this._volume.dimensions[this._vDimIdx]);
	ctx.moveTo(vSlicePos, 0);
	ctx.lineTo(vSlicePos, canvasHeight);
	// horizontal slice
	var hSlicePos = canvasHeight * (this._volume[this._hIdx] / this._volume.dimensions[this._hDimIdx]);
	ctx.moveTo(0, hSlicePos);
	ctx.lineTo(canvasWidth, hSlicePos);
	ctx.stroke();
}

/*
 * Constructor for QueryPanel class inheriting from Panel
 */
function QueryPanel() {
	Panel.call(this);
	// insert widgets from JQuery UI to submit to server via a form
}
QueryPanel.prototype = Object.create(Panel.prototype);
QueryPanel.prototype.constructor = QueryPanel;

/*
 * Constructor for Viewer class
 */
function Viewer(elementId) {
	
	this.elementId = elementId;
	var container = $('#'+this.elementId);
	container.append('<div id="coronal-panel"></div>');
	container.append('<div id="sagittal-panel"></div>');
	container.append('<div id="axial-panel"></div>');
	container.append('<div id="query-panel"></div>');
	$('#'+this.elementId+' div').addClass('viewer-panel');

	volume = new X.volume();
	volume.file = '/get_template?.nii.gz';
	volume.labelmap.file = '/get_test_map?.nii.gz'
	var cmapShades = 100;
	var cmap = Colormaps({
		colormap: [{"index":0, "rgb":[0,0,0,0]}, {"index":0.01, "rgb":[100,0,0,0.6]}, {"index":0.25, "rgb":[100,0,0,0.8]}, {"index":0.55, "rgb":[150,0,0,0.8]}, {"index":0.65, "rgb":[200,0,0,0.9]}, {"index":0.75, "rgb":[250,0,0,1]}, {"index":0.85, "rgb":[255,0,0,1]}, {"index":1, "rgb":[255,255,0,1]}],
		alpha: [0,1],
		nshades: cmapShades,
		format: 'rgbaString'
	});
	volume.labelmap.colormap = function(normpixval) {
		var rgbaString = cmap[Math.floor((cmapShades-1)*normpixval)];
		rgbaString = rgbaString.replace(/[^\d,.]/g, '').split(',');
		var rgba = [];
		for (var i = 0; i<3; i++) rgba.push(parseInt(rgbaString[i], 10));
		rgba.push(255*parseFloat(rgbaString[3]));
		return rgba
	};	
	
	this._viewPanels = {};
	this._viewPanels['sagittal'] = new ViewPanel('sagittal', volume, $('#sagittal-panel'), 'X', 'Y', 'Z');
	this._viewPanels['sagittal']._slice.render();
	
	this._viewPanels['sagittal']._slice.onShowtime = function() {
		
		viewer._viewPanels['coronal'] = new ViewPanel('coronal', volume, $('#coronal-panel'), 'Y', 'X', 'Z');
		viewer._viewPanels['coronal']._slice.render();
		viewer._viewPanels['axial'] = new ViewPanel('axial', volume, $('#axial-panel'), 'Z', 'X', 'Y');
		viewer._viewPanels['axial']._slice.render();
		
		viewer._viewPanels['sagittal'].addSlider();
		viewer._viewPanels['coronal'].addSlider();
		viewer._viewPanels['axial'].addSlider();
		viewer._viewPanels['sagittal'].drawCrosshairs();
		viewer._viewPanels['coronal'].drawCrosshairs();
		viewer._viewPanels['axial'].drawCrosshairs();
	}
	
};

Viewer.prototype = {
		constructor: Viewer,
		onSlide: function() {
			
		}
}

$(document).ready(function() {
	// insert Viewer into div with id="viewer"
	viewer = new Viewer("viewer");
});