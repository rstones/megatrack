
function TractSelect(containerId, parent) {
	this._containerId = containerId;
	this._parent = parent;
	var instance = this;
	
	this._tractSettings = {};
	this._tractSettingsVisible = false;
	
	this._colormapMin = 0.25;
	this._colormapMax = 1.0;
	
	this._initColormapMax = 1.0;
	this._initColormapMin = 0.25;
	this._initColormapopacity = 1.0;
	
	this._currentInfoTractCode = '';
	this._tractMetrics = {};
	
	this._availableTracts = {};
	this._selectedTracts = {};
	
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
	
	$('#'+this._containerId).append('<div id="table-div">'
			+'<div class="tract-select-container"><select id="add-tract-select" disabled><option value="default" disabled selected>Add tract...</option></select></div>'
			+'<div id="add-tract-disabled-message">Query a dataset before selecting a tract</div>'
			+'<div class="clear"></div>'
			+'<hr>'
			+'<table id="tract-table">'
			+'<tbody>'
			+'</tbody>'
			+'</table>'
			+'<div id="tract-settings-menu"></div>'
			+'<ul id="colormap-select"></ul>'
			+'</div>'
			+'<div id="tract-info-container">'
				+'<div id="tract-info-heading">Tract metrics:</div>'
				+'<div id="tract-info-name"></div>'
				+'<div id="tract-info-dynamic-metrics" class="tract-info-metrics"></div>'
				+'<div id="tract-info-static-metrics" class="tract-info-metrics"></div>'
				+'<div id="tract-info-button" class="clickable">View 3D tract</div>'
				//+'<div id="tract-info-description"></div>'
			+'</div>'
			+'<div id="tract-info-overlay"></div>');
	
	$('#tract-info-container').hide();
	
	$('#tract-info-overlay').append('<div id="tract-info-overlay-title"></div>'
			+'<div id="tract-info-overlay-close" class="clickable remove-icon"></div>'
			+'<div id="tract-info-overlay-trk"></div>'
			+'<div id="tract-info-overlay-description"></div>'
			+'<div id="tract-info-overlay-citations"></div>');
	$('#tract-info-overlay').hide();
	
	this._trkRenderer = new X.renderer3D();
	this._trkRenderer.container = 'tract-info-overlay-trk';
	this._trkRenderer.config.PICKING_ENABLED = false;
	this._trkRenderer.init();
	this._trk = new X.fibers();
	
	$('#tract-info-button').on('click', function(event) {
		
		var tractCode = instance._currentInfoTractCode;
		
		var renderer = instance._trkRenderer;
		renderer.remove(instance._trk);
		
		instance._trk.file = instance._parent._rootPath + '/get_trk/'+instance._currentInfoTractCode+'?.trk';
		instance._trk.opacity = 1.0;
		
		renderer.add(instance._trk);
		renderer.render();
		
		$('#tract-info-overlay-title').html(instance._tractMetrics[tractCode]['static'].name);
		$('#tract-info-overlay-description').html(instance._tractMetrics[tractCode]['static'].description);
	
		var c = 0
		instance.cameraMotion = setInterval(function() {
			//var y = 100 + 20*Math.sin(c*Math.PI);
			//renderer.camera.position = [0, y, 0];
			renderer.camera.rotate([3,0]);
			//console.log(renderer.camera.position);
			//c += 0.01;
		}, 50);
		
		$('#tract-info-overlay').show('slow');
	});
	
	$('#tract-info-overlay-close').on('click', function(event) {
		clearInterval(instance.cameraMotion);
		$('#tract-info-overlay').hide();
	});
	
	$('#tract-settings-menu').append('<div id="tract-settings-menu-header">'
			+'<div id="tract-settings-title"></div>'
			+'<div id="tract-settings-close" class="clickable remove-icon"></div>'
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
			var opacity = instance._tractSettings[tractCode].opacity;
			var color = instance._tractSettings[tractCode].color;
			instance._tractSettings[tractCode]['colormapMin'] = min;
			instance._tractSettings[tractCode]['colormapMax'] = max;
			for (var i=0; i<instance._parent._volume.labelmap.length; i++) {
				var map = instance._parent._volume.labelmap[i];
				if (map.file.indexOf(tractCode) != -1) {
					map.colormap = instance.generateXTKColormap(instance.colormapFunctions[color](min, max, opacity));
					instance._parent.resetSlicesForColormapChange();
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
			var min = instance._tractSettings[tractCode].colormapMin;
			var max = instance._tractSettings[tractCode].colormapMax;
			var color = instance._tractSettings[tractCode].color;
			instance._tractSettings[tractCode]['opacity'] = opacity;
			for (var i=0; i<instance._parent._volume.labelmap.length; i++) {
				var map = instance._parent._volume.labelmap[i];
				if (map.file.indexOf(tractCode) != -1) {
					map.colormap = instance.generateXTKColormap(instance.colormapFunctions[color](min, max, opacity));
					instance._parent.resetSlicesForColormapChange();
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
			var colormapMax = instance._tractSettings[tractCode].colormapMax;
			var colormapMin = instance._tractSettings[tractCode].colormapMin;
			var opacity = instance._tractSettings[tractCode].opacity;
			var color = event.data.color;
			
			for (var i=0; i<instance._parent._volume.labelmap.length; i++) {
				var map = instance._parent._volume.labelmap[i];
				if (map.file.indexOf(tractCode) != -1 && instance._tractSettings[tractCode].color != color) {
					instance._tractSettings[tractCode]["color"] = color;
					map.colormap = instance.generateXTKColormap(instance.colormapFunctions[color](colormapMin, colormapMax, opacity));
					$('#'+tractCode+'-colormap-indicator').removeClass(instance._parent._labelmapColors[i]+'-colormap');
					$('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
					instance._parent._labelmapColors[i] = color;
					instance._parent.resetSlicesForColormapChange();
					break;
				}
			}
		});
	}
	$('#colormap-select').hide();
	
	$.ajax({
		dataType: 'json',
		url: instance._parent._rootPath + '/tract_select',
		success: function(data) {
			for (var i in data) {
				$('#add-tract-select').append('<option id="'+data[i].code+'" value="'+data[i].code+'">'+data[i].name+'</option>');
				instance._availableTracts[data[i].code] = {"code": data[i].code, "name": data[i].name};
			}
		}
	});
	
	$(document).on('click', function(event) {
		if (event.target.id.indexOf('colormap-indicator') == -1 
				&& event.target.parentElement.id.indexOf('colormap-indicator') == -1) {
			$('#colormap-select').hide();
		}
		if (event.target.id.indexOf('tract-settings') == -1 
				&& event.target.parentElement.id.indexOf('tract-settings') == -1) {
			instance.closeTractSettings();
		}
	});
	$(window).resize(function() {
		instance.closeTractSettings();
		$('#colormap-select').hide();
	});
	$('#tract-settings-close').click(function() {
		instance.closeTractSettings();
	});
	
	$('#add-tract-select').change(function(event) {
		var tractCode = event.currentTarget.value;
		$('#add-tract-select option[value='+tractCode+']').prop('disabled', true);
		$('#add-tract-select option[value=default]').prop('selected', true);
		
		instance._tractMetrics[tractCode] = {};
		
		instance._selectedTracts[tractCode] = instance._availableTracts[tractCode];
		var map = new X.labelmap(instance._parent._volume);
		map.tractCode = tractCode; // store tractCode on labelmap for access later. Need cleaner solution
		if (instance._parent._currentQuery) {
			map.file = instance._parent._rootPath + '/tract/'+tractCode+'?'+$.param(instance._parent._currentQuery)+'&file_type=.nii.gz';
		} else {
			map.file = instance._parent._rootPath + '/tract/'+tractCode+'?file_type=.nii.gz';
		}
		var color = Object.keys(instance._colormaps)[Math.floor(Math.random()*instance._numColormaps)];
		instance._tractSettings[tractCode] = {
				"colormapMax": instance._initColormapMax,
				"colormapMin": instance._initColormapMin,
				"opacity": instance._initColormapopacity,
				"color": color,
				"colormapMinUpdate": 0
			}
		map.colormap = instance.generateXTKColormap(instance._colormaps[color]);
		instance._parent._volume.labelmap.push(map);
		instance._parent._labelmapColors.push(color);
		
		// re-render
		instance._parent.resetSlicesForDirtyFiles();
		
		// add row to table
		$('#tract-table > tbody').append('<tr id="'+tractCode+'" class="tract-row">'
				+'<td id="tract-name" class="tract-table-cell">'+instance._availableTracts[tractCode].name+'</td>'
				+'<td id="tract-colormap" class="tract-table-cell"><div id="'+tractCode+'-colormap-indicator" class="clickable colormap-indicator">&nbsp&nbsp&nbsp<div class="colormap-indicator-caret ui-icon ui-icon-caret-1-s"></div></div></td>'
				+'<td id="tract-settings" class="tract-table-cell"><div class="tract-icon clickable settings-icon" title="Tract settings"></div></td>'
				+'<td id="tract-info" class="tract-table-cell"><div class="tract-icon clickable metrics-icon" title="Tract metrics"></div></td>'
				+'<td id="tract-download" class="tract-table-cell"><div class="tract-icon clickable download-icon" title="Download density map"></td>'
				+'<td id="tract-remove" class="tract-table-cell"><div class="tract-icon clickable remove-icon" title="Remove tract"></div></td>'
				+'</tr>'
				+'<tr id="'+tractCode+'-spacer" class="tract-spacer-row"><td></td><td></td><td></td><td></td></tr>');
		
		$('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
		
		$('#'+tractCode+' > #tract-download').on('click', function(event) {
			event.preventDefault();
			var tractCode = event.currentTarget.parentElement.id;
			window.location.href = 'tract/'+tractCode+'?'+$.param(instance._parent._currentQuery)+'&file_type=.nii.gz';
		});
		
		// add event listener on remove icon
		$('#'+tractCode+' > #tract-remove').on('click', function(event) {
			var tractCode = event.currentTarget.parentElement.id;
			$('#add-tract-select option[value='+tractCode+']').prop('disabled', false);
			event.currentTarget.parentElement.remove();
			$('#'+tractCode+'-spacer').remove();
			delete instance._selectedTracts[tractCode];
			delete instance._tractMetrics[tractCode];
			// remove labelmap from X.volume.labelmap
			for (var i=0; i<instance._parent._volume.labelmap.length; i++) {
				var map = instance._parent._volume.labelmap[i];
				var filepath = map.file;
				if (filepath.indexOf(tractCode) !== -1) {
					instance._parent._volume.labelmap.splice(i, 1);
					instance._parent._labelmapColors.splice(i, 1);
					instance._parent.removeLabelmapSlices(i);
					break;
				}
			}
			if (instance._currentInfoTractCode == tractCode) {
				$('#tract-info-container').hide();
			}
		});
		
		// add event listener on settings icon
		$('#'+tractCode+' > #tract-settings').on('click', function(event) {
			var tractCode = event.currentTarget.parentElement.id;
			var settings_menu = $('#tract-settings-menu');
			settings_menu.data('tractCode', tractCode);
			$('#tract-settings-title').html('Settings:<br>'+instance._availableTracts[tractCode].name);
			var min = 100*instance._tractSettings[tractCode]["colormapMin"];
			var max = 100*instance._tractSettings[tractCode]["colormapMax"];
			var opacity = 100*instance._tractSettings[tractCode]["opacity"];
			$('#tract-prob-range-slider').slider('values', [min, max]);
			$('#tract-prob-range-min-handle').text(Math.floor(min));
			$('#tract-prob-range-max-handle').text(Math.floor(max));
			$('#tract-opacity-slider').slider('value', opacity);
			$('#tract-opacity-slider-handle').text(Math.floor(opacity));
			
			// position menu at settings button or mouse click?
			var button_offset = $('#'+tractCode+' > #tract-settings').offset();
			settings_menu.show(); // show before setting offset as can't set offset of hidden elements
			settings_menu.offset({top: button_offset.top - settings_menu.height(), left: button_offset.left - 30});
			
			instance._tractSettingsVisible = true;
		});
		
		$('#'+tractCode+' > #tract-info').on('click', function(event) {
			var tractCode = event.currentTarget.parentElement.id;
			var metrics = instance._tractMetrics[tractCode];
			instance._currentInfoTractCode = tractCode;
			if (metrics && metrics['dynamic'] && metrics['static']) {
				instance.populateDynamicTractInfo(metrics['dynamic']);
				instance.populateStaticTractInfo(metrics['static']);
			} else {
				// get the metric data
				var threshold = parseInt(100*instance._tractSettings[tractCode]["colormapMin"]);
				$.ajax({
					dataType: 'json',
					url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '/'+threshold+'?'+$.param(instance._parent._currentQuery),
					success: function(data) {
						instance._tractMetrics[data.tractCode]['dynamic'] = data;
						instance.populateDynamicTractInfo(data);
					}
				});
				$.ajax({
					dataType: 'json',
					url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '?'+$.param(instance._parent._currentQuery),
					success: function(data) {
						instance._tractMetrics[data.tractCode]['static'] = data;
						instance.populateStaticTractInfo(data);
					}
				});
			}
			$('#tract-info-container').show();
			

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
		
		// pre-fetch the tract metrics and put in cache
		var initThreshold = parseInt(instance._initColormapMin * 100);
		$.ajax({
			dataType: 'json',
			url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '/'+initThreshold+'?'+$.param(instance._parent._currentQuery),
			success: function(data) {
				instance._tractMetrics[data.tractCode]['dynamic'] = data;
				// trigger update of the tract info panel if it being displayed for this tract?
				// will it be possible to open tract info before the metric data has loaded?
				// maybe trigger an event to check whether tract info is visible and update display if so
			}
		});
		$.ajax({
			dataType: 'json',
			url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '?'+$.param(instance._parent._currentQuery),
			success: function(data) {
				instance._tractMetrics[data.tractCode]['static'] = data;
			}
		});
	});
	
	$(document).on('query-update', function(event, newQuery) {
		var currentInfoTractCode = instance._currentInfoTractCode;
		if (currentInfoTractCode && instance._tractSettings[currentInfoTractCode]) {
			var threshold = parseInt(100*instance._tractSettings[currentInfoTractCode]["colormapMin"]);
			$.ajax({
				dataType: 'json',
				url: instance._parent._rootPath + '/get_tract_info/'+currentInfoTractCode+'/'+threshold+'?'+$.param(newQuery),
				success: function(data) {
					instance._tractMetrics[data.tractCode]['dynamic'] = data;
					instance.populateDynamicTractInfo(data);
				}
			});
			$.ajax({
				dataType: 'json',
				url: instance._parent._rootPath + '/get_tract_info/'+currentInfoTractCode+'?'+$.param(newQuery),
				success: function(data) {
					instance._tractMetrics[data.tractCode]['static'] = data;
					instance.populateStaticTractInfo(data);
				}
			});
			for (var tractCode in instance._selectedTracts) {
				if (tractCode != instance._currentInfoTractCode) {
					var threshold = parseInt(100*instance._tractSettings[tractCode]["colormapMin"]);
					$.ajax({
						dataType: 'json',
						url: instance._parent._rootPath + '/get_tract_info/'+tractCode+'/'+threshold+'?'+$.param(newQuery),
						success: function(data) {
							instance._tractMetrics[data.tractCode]['dynamic'] = data;
						}
					});
					$.ajax({
						dataType: 'json',
						url: instance._parent._rootPath + '/get_tract_info/'+tractCode+'?'+$.param(newQuery),
						success: function(data) {
							instance._tractMetrics[data.tractCode]['static'] = data;
						}
					});
				}
			}
		}
	});
	
}
TractSelect.prototype.constructor = TractSelect;

TractSelect.prototype.checkColormapMinMax = function(min, max) {
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
TractSelect.prototype.redColormap = function(min, max, alpha) {
	var minMax = TractSelect.prototype.checkColormapMinMax(min, max);
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

TractSelect.prototype.blueColormap = function(min, max, alpha) {
	var minMax = TractSelect.prototype.checkColormapMinMax(min, max);
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

TractSelect.prototype.greenColormap = function(min, max, alpha) {
	var minMax = TractSelect.prototype.checkColormapMinMax(min, max);
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

TractSelect.prototype.purpleColormap = function(min, max, alpha) {
	var minMax = TractSelect.prototype.checkColormapMinMax(min, max);
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

TractSelect.prototype.yellowColormap = function(min, max, alpha) {
	var minMax = TractSelect.prototype.checkColormapMinMax(min, max);
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

TractSelect.prototype.colormapFunctions = {"red": TractSelect.prototype.redColormap,
									  "blue": TractSelect.prototype.blueColormap,
									  "green": TractSelect.prototype.greenColormap,
									  "purple": TractSelect.prototype.purpleColormap,
									  "yellow": TractSelect.prototype.yellowColormap} // object of colormap functions

TractSelect.prototype.generateXTKColormap = function(colormap) {
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

TractSelect.prototype.populateDynamicTractInfo = function(data) {
	$('#tract-info-name').html(data ? data.tractName : '');
	$('#tract-info-dynamic-metrics').html('Probabilistic atlas metrics:<br>'
									+(data ? ('Volume: ' + data.volume.toFixed(1)  + ' ml<br>'
									+'Mean MD: ' + data.meanMD.toFixed(3) + '&nbsp&nbsp&nbsp'
									+'Std MD: ' + data.stdMD.toFixed(3) + '<br>'
									+'Mean FA: ' + data.meanFA.toFixed(3) + '&nbsp&nbsp&nbsp'
									+'Std FA: ' + data.stdFA.toFixed(3) + '<br>') : ''));
	//$('#tract-info-description').html(data ? data.description : '');
}

TractSelect.prototype.populateStaticTractInfo = function(data) {
	$('#tract-info-static-metrics').html('Population metrics:<br>'
			+(data ? ('Volume: ' + data.volume.toFixed(1)  + ' ml<br>'
			+'Mean MD: ' + data.meanMD.toFixed(3) + '&nbsp&nbsp&nbsp'
			+'Std MD: ' + data.stdMD.toFixed(3) + '<br>'
			+'Mean FA: ' + data.meanFA.toFixed(3) + '&nbsp&nbsp&nbsp'
			+'Std FA: ' + data.stdFA.toFixed(3) + '<br>') : ''));
}

TractSelect.prototype.updateDynamicTractInfo = function(tractCode) {
	var instance = this;
	//var tractCode = instance._currentInfoTractCode;
	var tractSettings = instance._tractSettings[tractCode];
	if (tractSettings && tractSettings["colormapMin"] != tractSettings["colormapMinUpdate"]) {
		var threshold = parseInt(100*tractSettings["colormapMin"]);
		$.ajax({
			dataType: 'json',
			url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '/'+threshold+'?'+$.param(instance._parent._currentQuery),
			success: function(data) {
				//instance._currentInfoTractCode = data.tractCode;
				instance._tractMetrics[data.tractCode]['dynamic'] = data;
				if (tractCode == instance._currentInfoTractCode) {
					instance.populateDynamicTractInfo(data);
				}
				instance._tractSettings[data.tractCode]["colormapMinUpdate"] = instance._tractSettings[data.tractCode]["colormapMin"];
			}
		});
	}
}

TractSelect.prototype.updateStaticTractInfo = function() {
	var instance = this;
	var tractCode = instance._currentInfoTractCode;
	var tractSettings = instance._tractSettings[tractCode];
	$.ajax({
		dataType: 'json',
		url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '?' + $.param(instance._parent._currentQuery),
		success: function(data) {
			instance._currentInfoTractCode = data.tractCode;
			instance.populateStaticTractInfo(data);
		}
	});
}

TractSelect.prototype.closeTractSettings = function() {
	if (this._tractSettingsVisible) {
		var settings_menu = $('#tract-settings-menu');
		this.updateDynamicTractInfo(settings_menu.data('tractCode'));
		settings_menu.hide();
		this._tractSettingsVisible = false;
	}
}

