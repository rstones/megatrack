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
	container.append('<div id="query-report"></div>');
	container.append('<div class="clear"></div>');
	container.append('<div id="query-panel"></div>');
	container.append('<div id="tract-panel"></div>');
	
	this._currentQueryData = {};
	
	this._colormapMin = 0.25;
	this._colormapMax = 1.0;
	
	this._initColormapMax = 1.0;
	this._initColormapMin = 0.25;
	this._initColormapopacity = 1.0;
	
	this._colormaps = {};
	for (var key in this.colormapFunctions) {
		this._colormaps[key] = this.colormapFunctions[key](this._colormapMin, this._colormapMax, 1);
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
	this._volume.file = viewer._rootPath + '/get_template?.nii.gz'; // should these addresses be a bit more hidden for security? see neurosynth
	this._volume.labelmap = [];
	this._labelmapColors = [];
	this._labelmapTransparencies = [];
	this._tractSettings = {};
	
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
	
	$('#tract-panel').append('<div id="table-div">'
						+'<div class="tract-select-container"><select id="add-tract-select" disabled><option value="default" disabled selected>Add tract...</option></select></div>'
						//+'<div id="prob-range-slider-wrapper"><div id="prob-range-label">Probability range (%):</div><div id="prob-range-slider"></div></div>'
						+'<div id="add-tract-disabled-message">Query a dataset before selecting a tract</div>'
						+'<div class="clear"></div>'
						+'<hr>'
						+'<table id="tract-table">'
						+'<tbody>'
						+'</tbody>'
						+'</table>'
						+'<div id="tract-settings-menu"></div>'
						+'<ul id="colormap-select"></ul>'
						+'</div>');
	
	//$('body').append('<div id="tract-settings-menu"></div>');
	
	$('#tract-settings-menu').append('<div id="tract-settings-menu-header">'
								+'<div id="tract-settings-title"></div>'
								+'<div id="tract-settings-close" class="clickable ui-icon ui-icon-close"></div>'
								+'</div>'
								+'<div class="clear"></div>'
								+'<div id="tract-prob-range-slider-wrapper">'
								+'<div id="tract-prob-range-label">Probability range (%):</div>'
								+'<div id="tract-prob-range-slider">'
								+'<div id="tract-prob-range-min-handle" class="ui-slider-handle prob-range-slider-handle"></div>'
								+'<div id="tract-prob-range-max-handle" class="ui-slider-handle prob-range-slider-handle"></div>'
								+'</div>'
								+'</div>'
								+'<div class="clear"></div>'
								+'<div id="tract-opacity-slider-wrapper">'
								+'<div id="tract-opacity-label">Opacity (%):</div>'
								+'<div id="tract-opacity-slider">'
								+'<div id="tract-opacity-slider-handle" class="ui-slider-handle opacity-slider-handle"></div>'
								+'</div>'
								+'</div>'
								+'<div class="clear"></div>'
								+'<div class="triangle"></div>');
	
	var probRangeMinHandle = $('#tract-prob-range-min-handle');
	var probRangeMaxHandle = $('#tract-prob-range-max-handle');
	$('#tract-prob-range-slider').slider({
		range: true,
		min: 0,
		max: 100,
		//step: 0.02,
		values: [25,100],
		create: function() {
			probRangeMinHandle.text($(this).slider("values",0));
			probRangeMaxHandle.text($(this).slider("values",1));
		},
		slide: function(event, ui) {
			var tractCode = $('#tract-settings-menu').data('tractCode');
			probRangeMinHandle.text(ui.values[0]);
			probRangeMaxHandle.text(ui.values[1])
			var min = ui.values[0] / 100;
			var max = ui.values[1] / 100;
			var opacity = viewer._tractSettings[tractCode].opacity;
			var color = viewer._tractSettings[tractCode].color;
			viewer._tractSettings[tractCode]['colormapMin'] = min;
			viewer._tractSettings[tractCode]['colormapMax'] = max;
			for (var i=0; i<viewer._volume.labelmap.length; i++) {
				var map = viewer._volume.labelmap[i];
				if (map.file.indexOf(tractCode) != -1) {
					map.colormap = viewer.generateXTKColormap(viewer.colormapFunctions[color](min, max, opacity));
					viewer.resetSlicesForColormapChange();
					break;
				}
			}
		}
	});
	
	var opacitySliderHandle = $('#tract-opacity-slider-handle');
	$('#tract-opacity-slider').slider({
		min: 0,
		max: 100,
		value: 100,
		step: 1,
		create: function() {
			opacitySliderHandle.text($(this).slider("value"));
		},
		slide: function(event, ui) {
			var tractCode = $('#tract-settings-menu').data('tractCode');
			opacitySliderHandle.text(ui.value);
			var opacity = ui.value / 100;
			var min = viewer._tractSettings[tractCode].colormapMin;
			var max = viewer._tractSettings[tractCode].colormapMax;
			var color = viewer._tractSettings[tractCode].color;
			viewer._tractSettings[tractCode]['opacity'] = opacity;
			for (var i=0; i<viewer._volume.labelmap.length; i++) {
				var map = viewer._volume.labelmap[i];
				if (map.file.indexOf(tractCode) != -1) {
					map.colormap = viewer.generateXTKColormap(viewer.colormapFunctions[color](min, max, opacity));
					viewer.resetSlicesForColormapChange();
					break;
				}
			}
		}
		
	});
	$('#tract-settings-menu').hide();
	
	for (var key in this._colormaps) {
		$('#colormap-select').append('<div id="'+key+'-colormap-select-item" class="colormap-select-item clickable '+key+'-colormap">&nbsp&nbsp&nbsp</div>');
		$('#'+key+'-colormap-select-item').on('click', {color: key}, function(event) {
			// fetch selected tract code from colormap select
			var tractCode = $('#colormap-select').data('tractCode');
			var colormapMax = viewer._tractSettings[tractCode].colormapMax;
			var colormapMin = viewer._tractSettings[tractCode].colormapMin;
			var opacity = viewer._tractSettings[tractCode].opacity;
			var color = event.data.color;
			
			for (var i=0; i<viewer._volume.labelmap.length; i++) {
				var map = viewer._volume.labelmap[i];
				if (map.file.indexOf(tractCode) != -1 && viewer._tractSettings[tractCode].color != color) { //viewer._labelmapColors[i]
					viewer._tractSettings[tractCode]["color"] = color;
					map.colormap = viewer.generateXTKColormap(viewer.colormapFunctions[color](colormapMin, colormapMax, opacity));
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
		url: viewer._rootPath + '/tract_select',
		success: function(data) {
			for (var i in data) {
				//$('#tract-select').append('<li id="'+data[i].code+'"><div>'+data[i].name+'</div></li>');
				$('#add-tract-select').append('<option id="'+data[i].code+'" value="'+data[i].code+'">'+data[i].name+'</option>');
				viewer._availableTracts[data[i].code] = {"code": data[i].code, "name": data[i].name};
			}
		}
	});
	
	// events to close tract select menu (other than actually selecting a tract)
	// add in closing of colormap select here too
	$(document).on('click', function(event) {
		if (event.target.id.indexOf('colormap-indicator') == -1 
				&& event.target.parentElement.id.indexOf('colormap-indicator') == -1) {
			$('#colormap-select').hide();
		}
		if (event.target.id.indexOf('tract-settings') == -1 
				&& event.target.parentElement.id.indexOf('tract-settings') == -1) {
			$('#tract-settings-menu').hide();
		}
	});
	$(window).resize(function() {
		$('#tract-settings-menu').hide();
		$('#colormap-select').hide();
	});
	$('#tract-settings-close').click(function() {
		$('#tract-settings-menu').hide();
	});
	
	$('#add-tract-select').change(function(event) {
		var tractCode = event.currentTarget.value;
		$('#add-tract-select option[value='+tractCode+']').prop('disabled', true);
		$('#add-tract-select option[value=default]').prop('selected', true);
		
		viewer._selectedTracts[tractCode] = viewer._availableTracts[tractCode];
		var map = new X.labelmap(viewer._volume);
		map.tractCode = tractCode; // store tractCode on labelmap for access later. Need cleaner solution
		if (viewer._currentQuery) {
			map.file = '/tract/'+tractCode+'?'+$.param(viewer._currentQuery)+'&file_type=.nii.gz';
		} else {
			map.file = '/tract/'+tractCode+'?file_type=.nii.gz';
		}
		var color = Object.keys(viewer._colormaps)[Math.floor(Math.random()*viewer._numColormaps)];
		viewer._tractSettings[tractCode] = {
				"colormapMax": viewer._initColormapMax,
				"colormapMin": viewer._initColormapMin,
				"opacity": viewer._initColormapopacity,
				"color": color
			}
		map.colormap = viewer.generateXTKColormap(viewer._colormaps[color]);
		viewer._volume.labelmap.push(map);
		viewer._labelmapColors.push(color);
		//viewer._labelmapTransparencies.push(1);
		
		// re-render
		viewer.resetSlicesForDirtyFiles();
		
		// add row to table
		$('#tract-table > tbody').append('<tr id="'+tractCode+'" class="tract-row">'
				+'<td id="tract-name" class="tract-table-cell">'+viewer._availableTracts[tractCode].name+'</td>'
				+'<td id="tract-colormap" class="tract-table-cell"><div id="'+tractCode+'-colormap-indicator" class="clickable colormap-indicator">&nbsp&nbsp&nbsp<div class="colormap-indicator-caret ui-icon ui-icon-caret-1-s"></div></div></td>'
				//+'<td class="tract-table-cell tract-spacer-col">&nbsp</td>'
				+'<td id="tract-settings" class="tract-table-cell"><span class="tract-icon clickable ui-icon ui-icon-gear" title="Tract settings"></td>'
				+'<td id="tract-download" class="tract-table-cell"><span class="tract-icon clickable ui-icon ui-icon-arrowthickstop-1-s" title="Download density map"></td>'
				+'<td id="tract-remove" class="tract-table-cell"><span class="tract-icon clickable ui-icon ui-icon-close" title="Remove tract"></span></td>'
				+'</tr>'
				+'<tr id="'+tractCode+'-spacer" class="tract-spacer-row"><td></td><td></td><td></td><td></td></tr>');
		
		$('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
		
		// add event listener on remove icon
		$('#'+tractCode+' > #tract-remove').on('click', function(event) {
			var tractCode = event.currentTarget.parentElement.id;
			$('#add-tract-select option[value='+tractCode+']').prop('disabled', false);
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
		
		// add event listener on settings icon
		$('#'+tractCode+' > #tract-settings').on('click', function(event) {
			var tractCode = event.currentTarget.parentElement.id;
			var settings_menu = $('#tract-settings-menu');
			settings_menu.data('tractCode', tractCode);
			$('#tract-settings-title').html('Settings:<br>'+viewer._availableTracts[tractCode].name);
			var min = 100*viewer._tractSettings[tractCode]["colormapMin"];
			var max = 100*viewer._tractSettings[tractCode]["colormapMax"];
			var opacity = 100*viewer._tractSettings[tractCode]["opacity"];
			$('#tract-prob-range-slider').slider('values', [min, max]);
			$('#tract-prob-range-min-handle').text(Math.floor(min));
			$('#tract-prob-range-max-handle').text(Math.floor(max));
			$('#tract-opacity-slider').slider('value', opacity);
			$('#tract-opacity-slider-handle').text(Math.floor(opacity));
			
			// position menu at settings button or mouse click?
			var button_offset = $('#'+tractCode+' > #tract-settings').offset();
			console.log(button_offset);
			settings_menu.offset({top: button_offset.top - settings_menu.height(), left: button_offset.left - 30});
			console.log(settings_menu.offset());
			
			settings_menu.show();
		});
		
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
	});
	
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
			map.file = '/tract/'+tractCode+'?'+$.param(newQuery)+'&file_type=.nii.gz';
			// may need to set file to dirty to initiate reloading
			viewer.resetSlicesForDirtyFiles();
		}
		if ($('#add-tract-select').prop('disabled')) {
			$('#add-tract-select').prop('disabled', false);
			$('#add-tract-disabled-message').hide();
		}
	});
	
	
	
	//$('#tract-panel').append('<div id="query-report-container"></div>');
	
	//this._queryReport = new QueryReport('query-report-container');
	
//	var sliderDiv = $('#prob-range-slider');
//	sliderDiv.append('<div id="prob-range-min-handle" class="ui-slider-handle prob-range-slider-handle" title="Cutoff probability"></div>');
//	sliderDiv.append('<div id="prob-range-max-handle" class="ui-slider-handle prob-range-slider-handle" title="Saturation probability"></div>');
//	var minHandle = $('#prob-range-slider > #prob-range-min-handle');
//	var maxHandle = $('#prob-range-slider > #prob-range-max-handle');
//	
//	$('#prob-range-slider').slider({
//		range: true,
//		min: 0,
//		max: 100,
//		values: [25, 100],
//		create: function() {
//			minHandle.text($(this).slider("values",0));
//			maxHandle.text($(this).slider("values",1));
//		},
//		slide: function(event, ui) {
//			//$('#prob-range-text').val(ui.values[0]+'% - ' + ui.values[1]+'%');
//			minHandle.text(ui.values[0]);
//			maxHandle.text(ui.values[1]);
//			// update labelmap.colormap function
//			viewer._colormapMin = ui.values[0]/100;
//			viewer._colormapMax = ui.values[1]/100;
//			for (var key in viewer.colormapFunctions) {
//				viewer._colormaps[key] = viewer.colormapFunctions[key](viewer._colormapMin, viewer._colormapMax, 1);
//			}
//			for (var i=0; i<viewer._volume.labelmap.length; i++) {
//				viewer._volume.labelmap[i].colormap = viewer.generateXTKColormap(viewer._colormaps[viewer._labelmapColors[i]]);//viewer.generateRedColormap(viewer._colormapMin, viewer._colormapMax);
//			}
//			viewer.resetSlicesForColormapChange();
//		}
//	});
	//$('#prob-range-text').val($('#prob-range-slider').slider('values', 0)+'% - ' + $('#prob-range-slider').slider('values', 1)+'%');
	
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