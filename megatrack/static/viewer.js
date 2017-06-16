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
	this._viewWidth = dim[0];
	this._viewHeight = dim[1];
	this._mniCoord = 0;
	
	this._container.append('<div id="'+this._plane+'-view" class="view '+this._plane+'"></div>');
	$('#'+this._plane+'-view').css('width', this._viewWidth);
	$('#'+this._plane+'-view').css('height', this._viewHeight);
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
	
	// initialize canvas for labels
	$('#'+this._plane+'-view').append('<canvas id="'+this._plane+'-labels" class="overlay"></canvas>');
	// initialize canvas for crosshairs overlay
	$('#'+this._plane+'-view').append('<canvas id="'+this._plane+'-crosshairs" class="overlay"></canvas>');
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
}

View.prototype.getSliderValue = function() {
	return $('#'+this._plane+'-slider').slider('option', 'value');
}

View.prototype.initSlicingOverlay = function() {
	var canvas = $('#'+this._plane+'-crosshairs').get(0);
	var viewContainer = $('#'+this._plane+'-crosshairs').parent().get(0);
	canvas.width = this._viewWidth;
	canvas.height = this._viewHeight;
	var view = this;
	canvas.onclick = function(event) {
		var x = event.pageX - viewContainer.offsetLeft;
		var y = event.pageY - viewContainer.offsetTop;
		$('#viewer').trigger('view:click', [view._plane, x, y, canvas.width, canvas.height]);
	};
	this.drawCrosshairs();
}

View.prototype.drawLabels = function() {
	var canvas = $('#'+this._plane+'-labels').get(0);
	canvas.width = this._viewWidth;
	canvas.height = this._viewHeight;
	var ctx = canvas.getContext('2d');
	ctx.fillStyle = 'white';
	ctx.font = 'normal 17px Helvetica';
	var mniCoord = Math.round(this._volume[this._idx] - (this._volume.dimensions[this._dimIdx] - this._volume.RASCenter[this._dimIdx])/2);
	if (this._plane == 'sagittal') {
		ctx.fillText("S", 10, 20);
		ctx.fillText("I", 10, this._viewHeight-10);
		ctx.fillText("x = "+mniCoord, this._viewWidth-60, this._viewHeight-10);
	} else if (this._plane == 'coronal') {
		ctx.fillText("R", 10, 20);
		ctx.fillText("L", this._viewWidth-20, 20);
		ctx.fillText("y = "+mniCoord, this._viewWidth-60, this._viewHeight-10);
	} else if (this._plane == 'axial') {
		ctx.fillText("A", 10, 20);
		ctx.fillText("P", 10, this._viewHeight-10);
		ctx.fillText("z = "+mniCoord, this._viewWidth-60, this._viewHeight-10);
	}
}

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
}

/**
 * Create object to contain multiple X.renderer2D objects to display different slices of MRI data
 * @constructor
 * @param {string} elementId ID of container for Viewer
 */
function Viewer(elementId) {
	
	this._elementId = elementId;
	var container = $('#'+this._elementId);
	$('#'+this._elementId).append('<div id="view-container"></div>');
	var viewContainer = $('#view-container');
	viewContainer.append('<div id="coronal-panel"></div>');
	viewContainer.append('<div id="sagittal-panel"></div>');
	viewContainer.append('<div id="axial-panel"></div>');
	$('#view-container div').addClass('viewer-panel');
	container.append('<div class="clear"></div>');
	container.append('<div id="query-report"></div>');
	container.append('<div class="clear"></div>');
	container.append('<div id="query-panel"></div>');
	container.append('<div id="tract-panel"></div>');
	
	this._currentQueryData = {};
	
	this._colormapMin = 0.25;
	this._colormapMax = 1.0;
	
	this._colormaps = {};
	for (var key in this.colormapFunctions) {
		this._colormaps[key] = this.colormapFunctions[key](this._colormapMin, this._colormapMax);
		// insert colormap css classes
		var rgbaColors = [];
		var n = 8;
		for (var i=5; i<n+1; i++) {
			var color = this._colormaps[key][i].rgb;
			rgbaColors.push('rgba('+color[0]+','+color[1]+','+color[2]+','+color[3]+')');
		}
		$('head').append('<style>'
							+'.'+key+'-colormap {'
							+'background:-moz-linear-gradient(left, '+rgbaColors[0]+','+rgbaColors[1]+','+rgbaColors[2]+','+rgbaColors[3]+');'
							+'}'
							+'</style>');
	}
	this._numColormaps = Object.keys(this._colormaps).length;

	this._volume = new X.volume();
	this._volume.lowerThreshold = 1000; // threshold to remove grey background of template
	this._volume.file = '/get_template?.nii.gz'; // should these addresses be a bit more hidden for security? see neurosynth
	this._volume.labelmap = []; //[cingMap, fatMap];
	this._labelmapColors = [];
	
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
	
	var queryBuilder = new QueryBuilder('query-panel');
	
	this._currentQuery = null;
	$(document).on('query-update', function(event, newQuery) {
		viewer._currentQuery = newQuery;
	});

	$('#tract-panel').append('<div id="table-div">'
						+'<table id="tract-table">'
						+'<tbody>'
						+'</tbody>'
						+'</table>'
						+'<div id="tract-select-container"><span class="ui-icon ui-icon-plusthick"></span>Add tract</div>'
						+'<ul id="tract-select"></ul>'
						+'<ul id="colormap-select"></ul>'
						+'</div>');
	
	for (var key in this._colormaps) {
		$('#colormap-select').append('<div id="'+key+'-colormap-select-item" class="colormap-select-item clickable '+key+'-colormap">&nbsp&nbsp&nbsp</div>');
		$('#'+key+'-colormap-select-item').on('click', {color: key}, function(event) {
			// fetch selected tract code from colormap select
			var tractCode = $('#colormap-select').data("tractCode");
			var color = event.data.color;
			for (var i=0; i<viewer._volume.labelmap.length; i++) {
				var map = viewer._volume.labelmap[i];
				if (map.file.indexOf(tractCode) != -1 && viewer._labelmapColors[i] != color) {
					map.colormap = viewer.generateXTKColormap(viewer._colormaps[color]);
					$('#'+tractCode+'-colormap-indicator').removeClass(viewer._labelmapColors[i]+'-colormap');
					$('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
					viewer._labelmapColors[i] = color;
					viewer.resetSlicesForColormapChange();
					break;
				}
			}
		});
	}
	$('#colormap-select').hide();
	
	this._availableTracts = {};
	this._selectedTracts = {};
	
	$.ajax({
		dataType: 'json',
		url: '/tract_select',
		success: function(data) {
			for (var i in data) {
				$('#tract-select').append('<li id="'+data[i].code+'"><div>'+data[i].name+'</div></li>');
				viewer._availableTracts[data[i.code]] = {"code": data[i].code, "name": data[i].name};
			}
			$("#tract-select").menu({
				select: function(event, ui) {
					$('#tract-select').hide();
					ui.item.addClass('ui-state-disabled');
					var tractCode = ui.item[0].id;
					viewer._selectedTracts[tractCode] = viewer._availableTracts[tractCode];
					var map = new X.labelmap(viewer._volume);
					map.tractCode = tractCode; // store tractCode on labelmap for access later. Need cleaner solution
					if (viewer._currentQuery) {
						map.file = '/tract/'+tractCode+'?'+$.param(viewer._currentQuery)+'&file_type=.nii.gz';
					} else {
						console.log('sending request for ' + tractCode);
						map.file = '/tract/'+tractCode+'?file_type=.nii.gz';
					}
					var color = Object.keys(viewer._colormaps)[Math.floor(Math.random()*viewer._numColormaps)];
					map.colormap = viewer.generateXTKColormap(viewer._colormaps[color]);
					viewer._volume.labelmap.push(map);
					viewer._labelmapColors.push(color);
					// re-render
					viewer.resetSlicesForDirtyFiles();
					
					// add row to table
					$('#tract-table > tbody').append('<tr id="'+tractCode+'" class="tract-row">'
							+'<td id="tract-name" class="tract-table-cell">'+tractCode+'</td>'
							+'<td id="tract-colormap" class="tract-table-cell"><div id="'+tractCode+'-colormap-indicator" class="clickable colormap-indicator">&nbsp&nbsp&nbsp<div class="colormap-indicator-caret ui-icon ui-icon-caret-1-s"></div></div></td>'
							//+'<td class="tract-table-cell tract-spacer-col">&nbsp</td>'
							+'<td id="tract-download" class="tract-table-cell"><span class="clickable ui-icon ui-icon-arrowthickstop-1-s" title="Download density map"></td>'
							+'<td id="tract-remove" class="tract-table-cell"><span class="clickable ui-icon ui-icon-close" title="Remove tract"></span></td>'
							+'</tr>'
							+'<tr id="'+ui.item[0].id+'-spacer" class="tract-spacer-row"><td></td><td></td><td></td><td></td></tr>');
					
					$('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
					
					// add event listener on remove icon
					$('#'+tractCode+' > #tract-remove').on('click', function(event) {
						var tractCode = event.currentTarget.parentElement.id;
						$('#tract-select > #'+tractCode).removeClass('ui-state-disabled');
						event.currentTarget.parentElement.remove();
						$('#'+tractCode+'-spacer').remove();
						delete viewer._selectedTracts[tractCode];
						// remove labelmap from X.volume.labelmap
						for (var i=0; i<viewer._volume.labelmap.length; i++) {
							var map = viewer._volume.labelmap[i];
							var filepath = map.file;
							if (filepath.indexOf(tractCode) !== -1) {
								viewer._volume.labelmap.splice(i, 1);
								viewer._labelmapColors.splice(i, 1);
								viewer.removeLabelmapSlices(i);
								break;
							}
						}
					});
					
					// add click event listener on colormap select
					$('#'+tractCode+'-colormap-indicator').on('click', {tractCode:tractCode}, function(event) {
						// hide first in case colormap-select is already open for another tract
						$('#colormap-select').hide();
						
						// work out position of colormap indicator for current tract
						var indicatorPos = $('#'+event.data.tractCode+'-colormap-indicator').position();
						$('#colormap-select').css('top', indicatorPos.top);
						$('#colormap-select').css('left', indicatorPos.left - 6);
						
						// attach selected tract code to colormap select
						$('#colormap-select').data('tractCode', event.data.tractCode);
						// show colormap select
						$('#colormap-select').show('blind');
					});
					
				}
			});
			$('#tract-select').css('display', 'none');
			// add click event listener to display tract select menu
			$('#tract-select-container').on('click', function(event) {
				var tractSelect = $('#tract-select');
				var clickPosX = event.originalEvent.pageX;
				var clickPosY = event.originalEvent.pageY;
				var menuWidth = tractSelect.width() + 5;
				var menuHeight = tractSelect.height() + 5;
				var windowWidth = $(window).width();
				var windowHeight = $(window).height();
				if (windowWidth - clickPosX < menuWidth) {
					tractSelect.css('left', clickPosX-menuWidth);
				} else {
					tractSelect.css('left', clickPosX);
				}
				if (windowHeight - clickPosY < menuHeight) {
					tractSelect.css('top', clickPosY-menuHeight);
				} else {
					tractSelect.css('top', clickPosY);
				}
				tractSelect.show('fade');
			});
			
			// events to close tract select menu (other than actually selecting a tract)
			// add in closing of colormap select here too
			$(document).on('click', function(event) {
				if (event.target.id != 'tract-select-container') {
					$('#tract-select').hide();
				}
				if (event.target.id.indexOf('colormap-indicator') == -1 
						&& event.target.parentElement.id.indexOf('colormap-indicator') == -1) {
					$('#colormap-select').hide();
				}
			});
			$(window).resize(function() {
				$('#tract-select').hide();
				$('#colormap-select').hide();
			});
			
		}
	});
	
	/*
	 * Loop through all the currently selected tracts and update the associated labelmaps
	 */
	$(document).on('query-update', function(event, newQuery) {
		for (var i=0; i<viewer._volume.labelmap.length; i++) {
			var map = viewer._volume.labelmap[i];
			var tractCode = map.tractCode;
			map.file = '/tract/'+tractCode+'?'+$.param(newQuery)+'&file_type=.nii.gz';
			// may need to set file to dirty to initiate reloading
			viewer.resetSlicesForDirtyFiles();
		}
	});
	
	$('#tract-panel').append('<div id="query-report-container"></div>');
	
	this._queryReport = new QueryReport('query-report-container');
	
	// example range slider for probability map
	$('#tract-panel').append('<div id="probability-range">'
					+ '<p><label for="prob-range">Probability range:</label>'
					+'<input type="text" id="prob-range-text" class="range-label" readonly></p>'
					+'<div id="prob-range-slider"></div>'
					+'</div>');
	
	$('#prob-range-slider').slider({
		range: true,
		min: 0,
		max: 100,
		values: [25, 100],
		slide: function(event, ui) {
			$('#prob-range-text').val(ui.values[0]+'% - ' + ui.values[1]+'%');
			// update labelmap.colormap function
			viewer._colormapMin = ui.values[0]/100;
			viewer._colormapMax = ui.values[1]/100;
			for (var key in viewer.colormapFunctions) {
				viewer._colormaps[key] = viewer.colormapFunctions[key](viewer._colormapMin, viewer._colormapMax);
			}
			for (var i=0; i<viewer._volume.labelmap.length; i++) {
				viewer._volume.labelmap[i].colormap = viewer.generateXTKColormap(viewer._colormaps[viewer._labelmapColors[i]]);//viewer.generateRedColormap(viewer._colormapMin, viewer._colormapMax);
			}
			viewer.resetSlicesForColormapChange();
		}
	});
	$('#prob-range-text').val($('#prob-range-slider').slider('values', 0)+'% - ' + $('#prob-range-slider').slider('values', 1)+'%');
	
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

Viewer.prototype.checkColormapMinMax = function(min, max) {
	if (min < 0.01) { // cutoff for nifti density maps
		min = 0.01;
	} else if (min < 0 || min > 1 || max < 0 || max > 1 || min > max) {
		throw TypeError("Invalid min/max values passed to colormap function");
	}
	return {"min":min, "max":max};
}

Viewer.prototype.redColormap = function(min, max) {
	var minMax = Viewer.prototype.checkColormapMinMax(min, max);
	min = minMax["min"], max = minMax["max"];
	var numSegments = 5;
	var segmentLength = (max - min) / numSegments;
	var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
	for (var i=0; i<numSegments+1; i++) {
		var r = 120+(i*135/numSegments);
		var g = 0;
		var b = 0;
		var a = 0.6+(i*0.4/numSegments);
		colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,a]});
	}
	colormap.push({"index": 1, "rgb": [255,150,0,1]});
	return colormap;
}

Viewer.prototype.blueColormap = function(min, max) {
	var minMax = Viewer.prototype.checkColormapMinMax(min, max);
	min = minMax["min"], max = minMax["max"];
	var numSegments = 5;
	var segmentLength = (max - min) / numSegments;
	var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
	for (var i=0; i<numSegments+1; i++) {
		var r = 0;
		var g = 0;
		var b = 120+(i*135/numSegments);
		var a = 0.6+(i*0.4/numSegments);
		colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,a]});
	}
	colormap.push({"index": 1, "rgb": [0,200,255,1]});
	return colormap;
}

Viewer.prototype.purpleColormap = function(min, max) {
	var minMax = Viewer.prototype.checkColormapMinMax(min, max);
	min = minMax["min"], max = minMax["max"];
	var numSegments = 5;
	var segmentLength = (max - min) / numSegments;
	var colormap = [{"index":0, "rgb":[0,0,0,0]}, {"index":min-0.0001, "rgb":[0,0,0,0]}];
	for (var i=0; i<numSegments+1; i++) {
		var r = 90+(i*165/numSegments);
		var g = 0;
		var b = 90+(i*165/numSegments);
		var a = 0.6+(i*0.4/numSegments);
		colormap.push({"index": min+(i*segmentLength), "rgb":[r,g,b,a]});
	}
	colormap.push({"index": 1, "rgb": [255,150,255,1]});
	return colormap;
}

Viewer.prototype.colormapFunctions = {"red": Viewer.prototype.redColormap,
									  "blue": Viewer.prototype.blueColormap,
									  "purple": Viewer.prototype.purpleColormap} // object of colormap functions

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
	viewer = new Viewer("viewer");
	// is it a good idea for viewer to be global? it is needed for onShowtime function though
	// may want to wrap it in a namespace eventually
});