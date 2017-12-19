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
	container.append('<div id="query-panel"></div>');
	container.append('<div id="tract-panel"></div>');
	
	this._initColormapMax = 1.0;
	this._initColormapMin = 0.25;
	this._initColormapOpacity = 1.0;
//	this._colormapMin = 0.25;
//	this._colormapMax = 1.0;
	
	this._colormaps = {};
	for (var key in this.colormapFunctions) {
		this._colormaps[key] = this.colormapFunctions[key](this._initColormapMin, this._initColormapMax, 1);
		// insert colormap css classes
		var rgbaColors = [];
		var n = 8;
		for (var i=3; i<n-1; i++) {
			var color = this._colormaps[key][i].rgb;
			rgbaColors.push('rgba('+color[0]+','+color[1]+','+color[2]+','+color[3]+')');
		}
		$('head').append('<style>'
							+'.'+key+'-colormap {'
							+'background:-moz-linear-gradient(left, '+rgbaColors[0]+','+rgbaColors[1]+','+rgbaColors[2]+','+rgbaColors[3]+');'
							+'background:-webkit-linear-gradient(left, '+rgbaColors[0]+','+rgbaColors[1]+','+rgbaColors[2]+','+rgbaColors[3]+');'
							+'}'
							+'</style>');
	}
	this._numColormaps = Object.keys(this._colormaps).length;

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
    	if (!view._disabled) {
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
        }
		
	});
	
	var queryBuilder = new QueryBuilder('query-panel', this._rootPath);
	
	var tractSelect = new TractSelect('tract-panel', this);
	
	this._currentQuery = null;
}
Viewer.prototype.constructor = Viewer;

Viewer.prototype.checkColormapMinMax = function(min, max) {
	if (min < 0.01) { // cutoff for nifti density maps
		min = 0.01;
	} else if (min < 0 || min > 1 || max < 0 || max > 1 || min > max) {
		throw TypeError("Invalid min/max values passed to colormap function");
	}
	return {"min":min, "max":max};
}

/*
 * @param min Minimum probability cutoff for density map
 * @param max Value above which probability saturates
 * @param alpha opacity of the colormap
 */
Viewer.prototype.redColormap = function(min, max, alpha) {
	var minMax = Viewer.prototype.checkColormapMinMax(min, max);
	min = minMax["min"], max = minMax["max"];
	var numSegments = 5;
	var segmentLength = (max - min) / numSegments;
	var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
	for (var i=0; i<numSegments+1; i++) {
		var r = 160+(i*95/numSegments);
		var g = (i*100/numSegments);
		var b = 0;
		//var a = 1.0; //0.6+(i*0.4/numSegments);
		colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
	}
	colormap.push({"index": 1, "rgb": [255,180,0,alpha]});
	return colormap;
}

Viewer.prototype.blueColormap = function(min, max, alpha) {
	var minMax = Viewer.prototype.checkColormapMinMax(min, max);
	min = minMax["min"], max = minMax["max"];
	var numSegments = 5;
	var segmentLength = (max - min) / numSegments;
	var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
	for (var i=0; i<numSegments+1; i++) {
		var r = 0;
		var g = (i*200/numSegments);
		var b = 160+(i*95/numSegments);
		//var a = 1.0; //0.6+(i*0.4/numSegments);
		colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
	}
	colormap.push({"index": 1, "rgb": [0,200,255,alpha]});
	return colormap;
}

Viewer.prototype.greenColormap = function(min, max, alpha) {
	var minMax = Viewer.prototype.checkColormapMinMax(min, max);
	min = minMax["min"], max = minMax["max"];
	var numSegments = 5;
	var segmentLength = (max - min) / numSegments;
	var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
	for (var i=0; i<numSegments+1; i++) {
		var r = 0;
		var g = 120+(i*135/numSegments);
		var b = (i*180/numSegments);
		//var a = 1.0; //0.6+(i*0.4/numSegments);
		colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
	}
	colormap.push({"index": 1, "rgb": [180,255,180,alpha]});
	return colormap;
}

Viewer.prototype.purpleColormap = function(min, max, alpha) {
	var minMax = Viewer.prototype.checkColormapMinMax(min, max);
	min = minMax["min"], max = minMax["max"];
	var numSegments = 5;
	var segmentLength = (max - min) / numSegments;
	var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
	for (var i=0; i<numSegments+1; i++) {
		var r = 120+(i*135/numSegments);
		var g = 0;
		var b = 120+(i*135/numSegments);
		//var a = 1.0; //0.6+(i*0.4/numSegments);
		colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
	}
	colormap.push({"index": 1, "rgb": [255,180,255,alpha]});
	return colormap;
}

Viewer.prototype.yellowColormap = function(min, max, alpha) {
	var minMax = Viewer.prototype.checkColormapMinMax(min, max);
	min = minMax["min"], max = minMax["max"];
	var numSegments = 5;
	var segmentLength = (max - min) / numSegments;
	var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
	for (var i=0; i<numSegments+1; i++) {
		var r = 150+(i*105/numSegments);
		var g = 150+(i*105/numSegments);
		var b = 0;
		//var a = 1.0; //0.6+(i*0.4/numSegments);
		colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,alpha]});
	}
	colormap.push({"index": 1, "rgb": [255,255,180,alpha]});
	return colormap;
}

Viewer.prototype.colormapFunctions = {"red": Viewer.prototype.redColormap,
									  "blue": Viewer.prototype.blueColormap,
									  "green": Viewer.prototype.greenColormap,
									  "purple": Viewer.prototype.purpleColormap,
									  "yellow": Viewer.prototype.yellowColormap} // object of colormap functions

Viewer.prototype.generateXTKColormap = function(colormap) {
	var cmapShades = 100;
	var cmap = Colormaps({
		colormap: colormap,
		alpha: [0,1],
		nshades: cmapShades,
		format: 'rgbaString'
	});
	return function(normpixval) {
		var rgbaString = cmap[Math.floor((cmap.length-1)*normpixval)];
		rgbaString = rgbaString.replace(/[^\d,.]/g, '').split(',');
		var rgba = [];
		for (var i = 0; i<3; i++) rgba.push(parseInt(rgbaString[i], 10));
		rgba.push(255*parseFloat(rgbaString[3]));
		return rgba;
	};
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

Viewer.prototype.removeLabelmapFromVolume = function(tractCode) {
	for (var i=0; i<this._volume.labelmap.length; i++) {
		var map = this._volume.labelmap[i];
		if (map.tractCode == tractCode) {
			this._volume.labelmap.splice(i, 1);
			this._labelmapColors.splice(i, 1);
			this.removeLabelmapSlices(i);
			break;
		}
	}
}

Viewer.prototype.addLabelmapToVolume = function(tractCode, newQuery) {
    $(document).trigger('view:disable');
	var map = new X.labelmap(this._volume);
	map.tractCode = tractCode; // store tractCode on labelmap for access later. Need cleaner solution
    if (newQuery) {
		map.file = this._rootPath + '/tract/'+tractCode+'?'+$.param(newQuery)+'&file_type=.nii.gz';
	} else {
		map.file = this._rootPath + '/tract/'+tractCode+'?file_type=.nii.gz';
	}
	var color = Object.keys(this._colormaps)[Math.floor(Math.random()*this._numColormaps)];
	var tractSettings = {
			"colormapMax": this._initColormapMax,
			"colormapMin": this._initColormapMin,
			"opacity": this._initColormapOpacity,
			"color": color,
			"colormapMinUpdate": 0
		};
	map.colormap = this.generateXTKColormap(this._colormaps[color]);
	this._volume.labelmap.push(map);
	this._labelmapColors.push(color);
	
	// re-render
	this.resetSlicesForDirtyFiles();
	
	setTimeout(function() {$(document).trigger('view:enable');}, 1000);
	
	return tractSettings;
}

Viewer.prototype.updateLabelmapFile = function(tractCode, newQuery) {
	for (var i=0; i<this._volume.labelmap.length; i++) {
		var map = this._volume.labelmap[i];
		if (map.tractCode == tractCode) {
			map.file = this._rootPath + '/tract/'+tractCode+'?'+$.param(newQuery)+'&file_type=.nii.gz';
			//this.resetSlicesForDirtyFiles();
			break;
		}
	}
}

$(document).ready(function() {
	viewer = new Viewer('viewer', '/megatrack');
	// is it a good idea for viewer to be global? it is needed for onShowtime function though
	// may want to wrap it in a namespace eventually
});