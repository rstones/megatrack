/**
 * Create object to contain multiple X.renderer2D objects to display different slices of MRI data
 * @constructor
 * @param {string} elementId ID of container for Viewer
 */
function Viewer(elementId, rootPath) {
	
	this._rootPath = rootPath;
	this._elementId = elementId;
	var container = $('#'+this._elementId);
	$('#'+this._elementId).append('<div id="view-container"></div>');
	var viewContainer = $('#view-container');
	viewContainer.append('<div id="coronal-panel"></div>');
	viewContainer.append('<div id="sagittal-panel"></div>');
	viewContainer.append('<div id="axial-panel"></div>');
	$('#view-container div').addClass('viewer-panel');
	container.append('<div class="clear"></div>');
	//container.append('<div id="query-report"></div>');
	container.append('<div class="clear"></div>');
	container.append('<div id="query-panel"></div>');
	container.append('<div id="tract-panel"></div>');
	
	this._currentQueryData = {};

	this._volume = new X.volume();
	this._volume.lowerThreshold = 1000; // threshold to remove grey background of template
	this._volume.file = this._rootPath + '/get_template?.nii.gz'; // should these addresses be a bit more hidden for security? see neurosynth
	this._volume.labelmap = [];
	this._labelmapColors = [];
	this._labelmapTransparencies = [];
	
	this._sagittalViewDim = [336,280];
	this._coronalViewDim = [280,280];
	this._axialViewDim = [280,336];
	
	this._initSetup = true;
	this._views = {};
	this._views['sagittal'] = new View('sagittal', this._volume, $('#sagittal-panel'), this._sagittalViewDim, 'X', true, 'Y', true, 'Z', true);
	this._views['sagittal']._view.render();
	// onShowtime executes after data has been fully loaded, before rendering
	this._views['sagittal']._view.onShowtime = function() {
		if (viewer._initSetup) {
			viewer._views['coronal'] = new View('coronal', viewer._volume, $('#coronal-panel'), viewer._coronalViewDim, 
												'Y', true, 'X', true, 'Z', true);
			viewer._views['coronal']._view.render();
			viewer._views['axial'] = new View('axial', viewer._volume, $('#axial-panel'), viewer._axialViewDim, 
												'Z', false, 'X', true, 'Y', true);
			viewer._views['axial']._view.render();
			
			viewer.centreInMNISpace();
			
			// initialize sliders and crosshairs
			for (var key in viewer._views) {
				var view = viewer._views[key];
				view.addSlider('horizontal');
				view.initSlicingOverlay();
				view.drawLabels();
			}
			viewer._initSetup = false;
		} else {
			// reset renderers after reloading labelmap
			viewer._views['coronal']._view.update(viewer._volume);
			viewer._views['axial']._view.update(viewer._volume);
		}
	};
	
	$('#viewer').on('view:slide', function(event, plane, sliderVal) {
		//update volume for activated View
		viewer._volume[viewer._views[plane]._idx] = sliderVal;
		// update slice lines on other Views
		for (var view in viewer._views) {
			viewer._views[view].drawCrosshairs();
			viewer._views[view].drawLabels();
		}
	});
	
	$('#viewer').on('view:click', function(event, plane, x, y, canvasWidth, canvasHeight) {
		// update volume for other Views, need to reverse the volume idx for some views
		var view = viewer._views[plane];
		x = view._vReverse ? canvasWidth - x : x;
		y = view._hReverse ? canvasHeight - y : y;
		viewer._volume[view._vIdx] = Math.round(viewer._volume.dimensions[view._vDimIdx] * (x / canvasWidth));
		viewer._volume[view._hIdx] = Math.round(viewer._volume.dimensions[view._hDimIdx] * (y / canvasHeight));
		// update slice lines on all Views and slider positions
		for (var key in viewer._views) {
			var view = viewer._views[key];
			view.drawCrosshairs();
			view.setSliderValue(viewer._volume[view._idx]);
			view.drawLabels();
		}
	});
	
	var queryBuilder = new QueryBuilder('query-panel', this._rootPath);
	
	var tractSelect = new TractSelect('tract-panel', this);
	
	/*
	 * Loop through all the currently selected tracts and update the associated labelmaps
	 * Also enable tract select if not already enabled
	 */
	this._currentQuery = null;
	$(document).on('query-update', function(event, newQuery) {
		viewer._currentQuery = newQuery;
		for (var i=0; i<viewer._volume.labelmap.length; i++) {
			var map = viewer._volume.labelmap[i];
			var tractCode = map.tractCode;
			map.file = viewer._rootPath + '/tract/'+tractCode+'?'+$.param(newQuery)+'&file_type=.nii.gz';
			// may need to set file to dirty to initiate reloading
			viewer.resetSlicesForDirtyFiles();
		}
		if ($('#add-tract-select').prop('disabled')) {
			$('#add-tract-select').prop('disabled', false);
			$('#add-tract-disabled-message').hide();
		}
	});
};
Viewer.prototype.constructor = Viewer;

Viewer.prototype.constructTractURL = function(tractCode) {
	return '/get_density_map?' + $.param(viewer._currentQueryData) + '&tract='+tractCode+'&.nii.gz';
}

/*
 * Resets volume slices when a new labelmap is added and the file needs loading
 */
Viewer.prototype.resetSlicesForDirtyFiles = function() {
	// reset slices for each orientation
	for (var i=0; i<3; i++) {
		this._volume.children[i].children = new Array(this._volume.dimensions[i]);
	}
	// since new labelmap file is dirty this single update loads new labelmap
	// and triggers update of other views
	this._views['sagittal']._view.update(this._volume);
}

/*
 * Resets volume slices when colormap of a labelmap is changed and no new files need loading
 */
Viewer.prototype.resetSlicesForColormapChange = function() {
	// reset slices for each orientation
	for (var i=0; i<3; i++) {
		this._volume.children[i].children = new Array(this._volume.dimensions[i]);
	}
	// fire modified event on X.volume
	this._volume.modified();
	// update renderers explicitly to reset _slices to _volume._children
	this._views['sagittal']._view.update(this._volume);
	this._views['coronal']._view.update(this._volume);
	this._views['axial']._view.update(this._volume);
}

/*
 * Removes volume slices of a certain labelmap that has been removed
 */
Viewer.prototype.removeLabelmapSlices = function(mapToRemoveIdx) {
	for (var i=0; i<3; i++) {
		for (var j=0; j<this._volume.children[i].children.length; j++) {
			if (this._volume.children[i].children[j]) {
				// remove labelmap from slice
				this._volume.children[i].children[j]._labelmap.splice(mapToRemoveIdx, 1);
			}
		}
	}
	this._views['sagittal']._view.update(this._volume);
	this._views['coronal']._view.update(this._volume);
	this._views['axial']._view.update(this._volume);
}

Viewer.prototype.centreInMNISpace = function() {
	var idx = 0;
	for (var key in viewer._views) {
		var view = this._views[key];
		// might need to add a getter method for _RASCenter when using compiled xtk.js
		var centre = Math.round(this._volume.RASCenter[view._dimIdx] / 2);
		this._volume[view._idx] -= centre;
		idx++;
	}
}

$(document).ready(function() {
	viewer = new Viewer('viewer', '/megatrack');
	// is it a good idea for viewer to be global? it is needed for onShowtime function though
	// may want to wrap it in a namespace eventually
});