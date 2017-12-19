
function TractSelect(containerId, parent) {
	this._containerId = containerId;
	this._parent = parent;
	var instance = this;
	
	this._tractSettings = {};
	this._tractSettingsVisible = false;
	
	this._currentInfoTractCode = '';
	this._tractMetrics = {};
	
	this._availableTracts = {};
	this._selectedTracts = {};
	
	$('#'+this._containerId).append('<div id="table-div">'
			+'<div class="tract-select-container"><select id="add-tract-select" disabled><option value="default" disabled selected>Add tract...</option></select></div>'
			+'<div id="tract-disabled-msg-container"><span id="tract-disabled-msg-text">Query a dataset before selecting a tract</span></div>'
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
				+'<hr>'
				+'<div id="tract-info-dynamic-metrics" class="tract-info-metrics">'
					+'<div>Probabilistic atlas metrics:</div>'
					+'<div id="prob-atlas-metrics" class="metrics-display"></div>'
				+'</div>'
				+'<div id="tract-info-static-metrics" class="tract-info-metrics">'
					+'<div>Population metrics:</div>'
					+'<div id="pop-metrics" class="metrics-display"></div>'
				+'</div>'
				//+'<div id="tract-info-button" class="clickable">View 3D tract</div>'
				//+'<div id="tract-info-description"></div>'
			+'</div>'
			+'<div id="tract-info-overlay"></div>');
	
	//$('#tract-info-container').hide();
	
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
					map.colormap = instance._parent.generateXTKColormap(instance._parent.colormapFunctions[color](min, max, opacity));
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
					map.colormap = instance._parent.generateXTKColormap(instance._parent.colormapFunctions[color](min, max, opacity));
					instance._parent.resetSlicesForColormapChange();
					break;
				}
			}
		}
		
	});
	$('#tract-settings-menu').hide();
	
	for (var key in this._parent._colormaps) {
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
					map.colormap = instance._parent.generateXTKColormap(instance._parent.colormapFunctions[color](colormapMin, colormapMax, opacity));
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
			for (var tractCode in data) {
				$('#add-tract-select').append('<option id="'+tractCode+'" value="'+tractCode+'">'+data[tractCode].name+'</option>');
				data[tractCode]['disabled'] = false;
				instance._availableTracts[tractCode] = data[tractCode];
				
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
		
		// check if this is the first tract to be added, if so we want to show tract info immediately
		var showTractInfo = Object.keys(instance._selectedTracts).length == 1;
		if (showTractInfo) {
			instance._currentInfoTractCode = tractCode;
		}
		
		// add the tract to the viewer
		instance._tractSettings[tractCode] = instance._parent.addLabelmapToVolume(tractCode, instance._parent._currentQuery);
		var color = instance._tractSettings[tractCode].color;
		
		// add row to table
		$('#tract-table > tbody').append('<tr id="'+tractCode+'" class="tract-row">'
				+'<td id="tract-name" class="tract-table-cell">'+instance._availableTracts[tractCode].name+'</td>'
				+'<td id="tract-colormap" class="tract-table-cell"><div id="'+tractCode+'-colormap-indicator" class="clickable colormap-indicator"><div class="colormap-indicator-caret"></div></div></td>'
				+'<td id="tract-settings" class="tract-table-cell"><div class="tract-icon clickable settings-icon" title="Tract settings"></div></td>'
				+'<td id="tract-info" class="tract-table-cell"><div class="tract-icon clickable '+(showTractInfo ? 'metrics-icon-selected' : 'metrics-icon')+'" title="Tract metrics"></div></td>'
				+'<td id="tract-atlas" class="tract-table-cell"><div class="tract-icon clickable atlas-icon" title="3D tract atlas"></div></td>'
				+'<td id="tract-download" class="tract-table-cell"><div class="tract-icon clickable download-icon" title="Download density map"></td>'
				+'<td id="tract-remove" class="tract-table-cell"><div class="tract-icon clickable remove-icon" title="Remove tract"></div></td>'
				+'</tr>'
				+'<tr id="'+tractCode+'-spacer" class="tract-spacer-row"><td></td><td></td><td></td><td></td></tr>');
		
		$('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
		
		$('#'+tractCode+' > #tract-download').on('click', function(event) {
		    var tractCode = event.currentTarget.parentElement.id;
		    if (!instance._selectedTracts[tractCode].disabled) {
    		    event.preventDefault();
                window.location.href = 'tract/'+tractCode+'?'+$.param(instance._parent._currentQuery)+'&file_type=.nii.gz';
		    }
		});
		
		// add event listener on remove icon
		$('#'+tractCode+' > #tract-remove').on('click', function(event) {
			var tractCode = event.currentTarget.parentElement.id;
			
			// change tract info if this tracts metrics are being displayed
			var selectedTractCodes = Object.keys(instance._selectedTracts);
			if (selectedTractCodes.length == 1) {
				// no more tracts displayed so clear tract info
				$('#tract-info-name').html('');
				$('#prob-atlas-metrics').html('');
				$('#pop-metrics').html('');
			} else if (instance._currentInfoTractCode == tractCode) {
				// show metrics for tract below or above in table
				// simulate a click on the tract-info button of tract we want to select
				var tractCodeIdx = selectedTractCodes.indexOf(tractCode);
				var newTractInfoCode = tractCodeIdx == 0 ? selectedTractCodes[1] : selectedTractCodes[tractCodeIdx-1];
				$('#'+newTractInfoCode+' > #tract-info').trigger('click');
			}
			
			// remove stuff
			$('#add-tract-select option[value='+tractCode+']').prop('disabled', false);
			event.currentTarget.parentElement.remove();
			$('#'+tractCode+'-spacer').remove();
			delete instance._selectedTracts[tractCode];
			delete instance._tractMetrics[tractCode];
			// remove labelmap from the viewer
			instance._parent.removeLabelmapFromVolume(tractCode);
		});
		
		// add event listener on settings icon
		$('#'+tractCode+' > #tract-settings').on('click', function(event) {
		    var tractCode = event.currentTarget.parentElement.id;
		    if (!instance._selectedTracts[tractCode].disabled) {
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
		    }
		});
		
		$('#'+tractCode+' > #tract-info').on('click', function(event) {
		    var tractCode = event.currentTarget.parentElement.id; 
		    if (!instance._selectedTracts[tractCode].disabled) {
		        
                // change metrics icon to selected style
                if (instance._currentInfoTractCode && instance._currentInfoTractCode != tractCode) {
                    $('#'+instance._currentInfoTractCode+' > #tract-info > .tract-icon').removeClass('metrics-icon-selected');
                    $('#'+instance._currentInfoTractCode+' > #tract-info > .tract-icon').addClass('metrics-icon');
                }
                $('#'+tractCode+' > #tract-info > .tract-icon').removeClass('metrics-icon');
                $('#'+tractCode+' > #tract-info > .tract-icon').addClass('metrics-icon-selected');
                
                var metrics = instance._tractMetrics[tractCode];
                instance._currentInfoTractCode = tractCode;
                if (metrics && metrics['dynamic'] && metrics['static']) {
                    instance.populateDynamicTractInfo(metrics['dynamic']);
                    instance.populateStaticTractInfo(metrics['static']);
                } else {
                    // get the metric data
                    var threshold = parseInt(100*instance._tractSettings[tractCode]["colormapMin"]);
                    $('#prob-atlas-metrics').html('<div class="tract-metrics-loading-gif"></div>');
                    $.ajax({
                        dataType: 'json',
                        url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '/'+threshold+'?'+$.param(instance._parent._currentQuery),
                        success: function(data) {
                            instance._tractMetrics[data.tractCode]['dynamic'] = data;
                            instance.populateDynamicTractInfo(data);
                        }
                    });
                    $('#pop-metrics').html('<div class="tract-metrics-loading-gif"></div>');
                    $.ajax({
                        dataType: 'json',
                        url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '?'+$.param(instance._parent._currentQuery),
                        success: function(data) {
                            instance._tractMetrics[data.tractCode]['static'] = data;
                            instance.populateStaticTractInfo(data);
                        }
                    });
                }
		    }
			
		});
		
		$('#'+tractCode+' > #tract-atlas').on('click', function(event) {
		    var tractCode = event.currentTarget.parentElement.id; 
		    if (!instance._selectedTracts[tractCode].disabled) {
            
                $('#tract-info-overlay-title').html(instance._selectedTracts[tractCode].name);
                $('#tract-info-overlay-description').html(instance._selectedTracts[tractCode].description);
                $('#tract-info-overlay').show('slow');
                
                var renderer = instance._trkRenderer;
                renderer.remove(instance._trk);
                renderer.resize(); // call the resize function to ensure the canvas gets the dimensions of the visible container
                
                instance._trk.file = instance._parent._rootPath + '/get_trk/'+tractCode+'?.trk';
                instance._trk.opacity = 1.0;
                
                renderer.add(instance._trk);
                renderer.render();
                
                instance.cameraMotion = setInterval(function() {
                    renderer.camera.rotate([3,0]);
                }, 50);
            }
			
		});
		
		$('#'+tractCode+'-colormap-indicator').on('click', {tractCode:tractCode}, function(event) {
		    if (!instance._selectedTracts[tractCode].disabled) {
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
			}
		});
		
		// pre-fetch the tract metrics and put in cache
		var initThreshold = parseInt(instance._parent._initColormapMin * 100);
		if (showTractInfo) {
			$('#prob-atlas-metrics').html('<div class="tract-metrics-loading-gif"></div>');
			$('#pop-metrics').html('<div class="tract-metrics-loading-gif"></div>');
		}
		$.ajax({
			dataType: 'json',
			url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '/'+initThreshold+'?'+$.param(instance._parent._currentQuery),
			success: function(data) {
				instance._tractMetrics[data.tractCode]['dynamic'] = data;
				if (showTractInfo) {
					instance.populateDynamicTractInfo(data);
				}
			}
		});
		$.ajax({
			dataType: 'json',
			url: instance._parent._rootPath + '/get_tract_info/' + tractCode + '?'+$.param(instance._parent._currentQuery),
			success: function(data) {
				instance._tractMetrics[data.tractCode]['static'] = data;
				if (showTractInfo) {
					instance.populateStaticTractInfo(data);
				}
			}
		});
	});
	
	$(document).on('query-update', function(event, newQuery) {
	
	   instance._parent._currentQuery = newQuery;
		
		// remove the disabled tract select message
		if ($('#add-tract-select').prop('disabled')) {
			$('#add-tract-select').prop('disabled', false);
			$('#tract-disabled-msg-text').hide();
		}
		
		var datasets = Object.keys(newQuery);
		var currentInfoTractCode = instance._currentInfoTractCode;
        
        $(document).trigger('view:disable');
		for (var tractCode in instance._selectedTracts) {
			// check to see if we want to disable the tract
			var disable = false;
			for (var i=0; i<datasets.length; i++) {
				if (instance._availableTracts[tractCode]['datasets'].indexOf(datasets[i]) < 0) {
					disable = true;
					break;
				}
			}
			
			if (disable) {
				instance._parent.removeLabelmapFromVolume(tractCode);
				// disable tract row
				$('#'+tractCode+' > #tract-name').addClass('tract-disabled');
				$('#'+tractCode+' > #tract-settings').children().removeClass('settings-icon clickable');
				$('#'+tractCode+' > #tract-settings').children().addClass('settings-icon-disabled');
				$('#'+tractCode+' > #tract-info').children().removeClass('metrics-icon clickable');
                $('#'+tractCode+' > #tract-info').children().addClass('metrics-icon-disabled');
                $('#'+tractCode+' > #tract-atlas').children().removeClass('atlas-icon clickable');
                $('#'+tractCode+' > #tract-atlas').children().addClass('atlas-icon-disabled');
                $('#'+tractCode+' > #tract-download').children().removeClass('download-icon clickable');
                $('#'+tractCode+' > #tract-download').children().addClass('download-icon-disabled');
                var color = instance._tractSettings[tractCode]["color"];
                $('#'+tractCode+'-colormap-indicator').removeClass(color+'-colormap');
                $('#'+tractCode+'-colormap-indicator').removeClass('colormap-indicator');
                $('#'+tractCode+'-colormap-indicator').removeClass('clickable');
                $('#'+tractCode+'-colormap-indicator').addClass('colormap-indicator-disabled');
                $('#'+tractCode+'-colormap-indicator').children().removeClass('colormap-indicator-caret');
                $('#'+tractCode+'-colormap-indicator').children().addClass('colormap-indicator-caret-disabled');
			} else {
				if (instance._availableTracts[tractCode].disabled) { // if previously disabled, add new labelmap
					instance._tractSettings[tractCode] = instance._parent.addLabelmapToVolume(tractCode, newQuery);
					
					// reenable the tract row
					$('#'+tractCode+' > #tract-name').removeClass('tract-disabled');
					$('#'+tractCode+' > #tract-settings').children().removeClass('settings-icon-disabled');
					$('#'+tractCode+' > #tract-settings').children().addClass('settings-icon clickable');
                    $('#'+tractCode+' > #tract-info').children().removeClass('metrics-icon-disabled');
                    $('#'+tractCode+' > #tract-info').children().addClass('metrics-icon clickable');
                    $('#'+tractCode+' > #tract-atlas').children().removeClass('atlas-icon-disabled');
                    $('#'+tractCode+' > #tract-atlas').children().addClass('atlas-icon clickable');
                    $('#'+tractCode+' > #tract-download').children().removeClass('download-icon-disabled');
                    $('#'+tractCode+' > #tract-download').children().addClass('download-icon clickable');
                    $('#'+tractCode+' > #tract-colormap').children().removeClass('colormap-indicator-disabled');
                    var color = instance._tractSettings[tractCode]["color"];
                    $('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
                    $('#'+tractCode+'-colormap-indicator').addClass('colormap-indicator');
                    $('#'+tractCode+'-colormap-indicator').addClass('clickable');
                    $('#'+tractCode+'-colormap-indicator').children().removeClass('colormap-indicator-caret-disabled');
                    $('#'+tractCode+'-colormap-indicator').children().addClass('colormap-indicator-caret');
                    
				} else { // if previously active, update labelmap
					instance._parent.updateLabelmapFile(tractCode, newQuery);
				}
				
				// update metrics
				var threshold = parseInt(100*instance._tractSettings[currentInfoTractCode]["colormapMin"]);
				if (tractCode == currentInfoTractCode) {
					$('#prob-atlas-metrics').html('<div class="tract-metrics-loading-gif"></div>');
					$('#pop-metrics').html('<div class="tract-metrics-loading-gif"></div>');
				}
				$.ajax({
					dataType: 'json',
					url: instance._parent._rootPath + '/get_tract_info/'+tractCode+'/'+threshold+'?'+$.param(newQuery),
					success: function(data) {
						instance._tractMetrics[data.tractCode]['dynamic'] = data;
						if (data.tractCode == currentInfoTractCode) {
							instance.populateDynamicTractInfo(data);
						}
					}
				});
				$.ajax({
					dataType: 'json',
					url: instance._parent._rootPath + '/get_tract_info/'+tractCode+'?'+$.param(newQuery),
					success: function(data) {
						instance._tractMetrics[data.tractCode]['static'] = data;
						if (data.tractCode == currentInfoTractCode) {
							instance.populateStaticTractInfo(data);
						}
					}
				});
			}
			instance._availableTracts[tractCode].disabled = disable;
		}
		if (Object.keys(instance._selectedTracts).length) {
		    instance._parent.resetSlicesForDirtyFiles();
		}
		setTimeout(function() {$(document).trigger('view:enable');}, 1000);
		
		// also loop through all the options in the tract select and disable the the required tracts 
		$('#add-tract-select option[value!=default]').each(function(idx) {
			var tractCode = $(this).val();
			if (!instance._selectedTracts[tractCode]) {
			    var disable = false;
			    for (var i=0; i<datasets.length; i++) {
                if (instance._availableTracts[tractCode]['datasets'].indexOf(datasets[i]) < 0) {
                    disable = true;
                    break;
                }
            }
            $(this).prop('disabled', disable);
			}
		});
	});
	
}
TractSelect.prototype.constructor = TractSelect;

TractSelect.prototype.populateDynamicTractInfo = function(data) {
	$('#tract-info-name').html(data ? data.tractName : '');
	$('#prob-atlas-metrics').html((data ? ('Volume: ' + data.volume.toFixed(1)  + ' ml<br>'
									+'Mean MD: ' + data.meanMD.toFixed(3) + '&nbsp&nbsp&nbsp'
									+'Std MD: ' + data.stdMD.toFixed(3) + '<br>'
									+'Mean FA: ' + data.meanFA.toFixed(3) + '&nbsp&nbsp&nbsp'
									+'Std FA: ' + data.stdFA.toFixed(3) + '<br>') : ''));
	//$('#tract-info-description').html(data ? data.description : '');
}

TractSelect.prototype.populateStaticTractInfo = function(data) {
	$('#pop-metrics').html((data ? ('Volume: ' + data.volume.toFixed(1)  + ' ml<br>'
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
		if (tractCode == instance._currentInfoTractCode) {
			$('#prob-atlas-metrics').html('<div class="tract-metrics-loading-gif"></div>');
		}
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
	$('#pop-metrics').html('<div class="tract-metrics-loading-gif"></div>');
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



