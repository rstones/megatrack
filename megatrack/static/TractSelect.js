var mgtrk = mgtrk || {};

mgtrk.TractSelect = (function() {

    const TractSelect = {};

    TractSelect.init = (_this) => {
    
        const tractSelect = {};
    
        const containerId = _this.tractSelectId;
        
        tractSelect.tractSettings = {};
        tractSelect.tractSettingsVisible = false;
        
        tractSelect.currentInfoTractCode = '';
        tractSelect.tractMetrics = {};
        
        tractSelect.availableTracts = {};
        tractSelect.selectedTracts = {};
        
        const probabilisticMetricsDescription = 'Metrics for the averaged density map as displayed in the viewer';
        const populationMetricsDescription = 'Averaged metrics of the individual subjects';
        
        const populateDynamicTractInfo = function(data) {
            $('#tract-info-name').html(data ? data.tractName : '');
            $('#prob-atlas-metrics').html((data ? ('Volume: ' + data.volume.toFixed(1)  + ' ml<br>'
                                            +'Mean MD: ' + data.meanMD.toFixed(3) + '&nbsp&nbsp&nbsp'
                                            +'Std MD: ' + data.stdMD.toFixed(3) + '<br>'
                                            +'Mean FA: ' + data.meanFA.toFixed(3) + '&nbsp&nbsp&nbsp'
                                            +'Std FA: ' + data.stdFA.toFixed(3) + '<br>') : ''));
        };
        
        const populateStaticTractInfo = function(data) {
            $('#pop-metrics').html((data ? ('Volume: ' + data.volume.toFixed(1)  + ' ml<br>'
                                    +'Mean MD: ' + data.meanMD.toFixed(3) + '&nbsp&nbsp&nbsp'
                                    +'Std MD: ' + data.stdMD.toFixed(3) + '<br>'
                                    +'Mean FA: ' + data.meanFA.toFixed(3) + '&nbsp&nbsp&nbsp'
                                    +'Std FA: ' + data.stdFA.toFixed(3) + '<br>') : ''));
        };
        
        const updateDynamicTractInfo = function(tractCode) {
            var settings = tractSelect.tractSettings[tractCode];
            if (settings && settings.colormapMin != settings.colormapMinUpdate) {
                var threshold = parseInt(100*settings.colormapMin);
                if (tractCode == tractSelect.currentInfoTractCode) {
                    $('#prob-atlas-metrics').html('<div class="tract-metrics-loading-gif"></div>');
                }
                $.ajax({
                    dataType: 'json',
                    url: _this.rootPath + '/get_tract_info/' + tractCode + '/'+threshold+'?'+$.param(_this.currentQuery),
                    success: function(data) {
                        tractSelect.tractMetrics[data.tractCode].dynamic = data;
                        if (tractCode == tractSelect.currentInfoTractCode) {
                            populateDynamicTractInfo(data);
                        }
                        tractSelect.tractSettings[data.tractCode].colormapMinUpdate = tractSelect.tractSettings[data.tractCode].colormapMin;
                    }
                });
            }
        };
        
        const updateStaticTractInfo = function() {
            var tractCode = tractSelect.currentInfoTractCode;
            //var tractSettings = tractSelect.tractSettings[tractCode];
            $('#pop-metrics').html('<div class="tract-metrics-loading-gif"></div>');
            $.ajax({
                dataType: 'json',
                url: _this.rootPath + '/get_tract_info/' + tractCode + '?' + $.param(_this.currentQuery),
                success: function(data) {
                    tractSelect.currentInfoTractCode = data.tractCode;
                    populateStaticTractInfo(data);
                }
            });
        };
        
        const closeTractSettings = function() {
            if (tractSelect.tractSettingsVisible) {
                var settingsMenu = $('#tract-settings-menu');
                updateDynamicTractInfo(settingsMenu.data('tractCode'));
                settingsMenu.hide();
                tractSelect.tractSettingsVisible = false;
            }
        };
        
        $('#'+containerId).append('<div id="tract-select-wrapper">'
                +'<div class="tract-select-container"><select id="add-tract-select" disabled><option value="default" disabled selected>Add tract...</option></select></div>'
                +'<div id="tract-disabled-msg-container"><span id="tract-disabled-msg-text">Query a dataset before selecting a tract</span></div>'
                +'<div class="clear"></div>'
                +'<hr>'
                +'<div id="tract-table-wrapper">'
                +'<table id="tract-table">'
                +'<tbody>'
                +'</tbody>'
                +'</table>'
                +'</div>'
                +'<div id="tract-settings-menu"></div>'
                +'<ul id="colormap-select"></ul>'
                +'</div>'
                +'<div id="tract-info-container">'
                    +'<div id="tract-info-heading">Tract metrics:</div>'
                    +'<div id="tract-info-name"></div>'
                    +'<hr>'
                    +'<div id="tract-info-dynamic-metrics" class="tract-info-metrics">'
                        +'<div>Probabilistic atlas metrics: <div class="metric-info clickable" title="'+probabilisticMetricsDescription+'"><div class="info-icon"></div></div></div>'
                        +'<div id="prob-atlas-metrics" class="metrics-display"></div>'
                    +'</div>'
                    +'<div id="tract-info-static-metrics" class="tract-info-metrics">'
                        +'<div>Population metrics: <div class="metric-info clickable" title="'+populationMetricsDescription+'"><div class="info-icon"></div></div></div>'
                        +'<div id="pop-metrics" class="metrics-display"></div>'
                    +'</div>'
                +'</div>'
                +'<div id="tract-info-overlay"></div>');
        
        $('#tract-info-overlay').append('<div id="tract-info-overlay-title"></div>'
                +'<div id="tract-info-overlay-close" class="clickable remove-icon"></div>'
                +'<div id="tract-info-overlay-trk"></div>'
                +'<div id="tract-info-overlay-description"></div>'
                +'<div id="tract-info-overlay-citations"></div>');
        $('#tract-info-overlay').hide();
        
        tractSelect.trkRenderer = new X.renderer3D();
        tractSelect.trkRenderer.container = 'tract-info-overlay-trk';
        tractSelect.trkRenderer.config.PICKING_ENABLED = false;
        tractSelect.trkRenderer.init();
        tractSelect.trk = new X.fibers();
        
        $('#tract-info-overlay-close').on('click', function(event) {
            clearInterval(tractSelect.cameraMotion);
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
                var opacity = tractSelect.tractSettings[tractCode].opacity;
                var color = tractSelect.tractSettings[tractCode].color;
                tractSelect.tractSettings[tractCode]['colormapMin'] = min;
                tractSelect.tractSettings[tractCode]['colormapMax'] = max;
                /*
                Fire 'colormap-change' event here so the following loop can move to AtlasViewer factory function
                */
                for (let i=0; i<_this.renderers.volume.labelmap.length; i++) {
                    var map = _this.renderers.volume.labelmap[i];
                    if (map.file.indexOf(tractCode) != -1) {
                        map.colormap = _this.colormaps.generateXTKColormap(_this.colormaps.colormapFunctions[color](min, max, opacity));
                        _this.renderers.resetSlicesForColormapChange();
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
                var min = tractSelect.tractSettings[tractCode].colormapMin;
                var max = tractSelect.tractSettings[tractCode].colormapMax;
                var color = tractSelect.tractSettings[tractCode].color;
                tractSelect.tractSettings[tractCode]['opacity'] = opacity;
                /*
                Fire 'colormap-change' event here so the following loop can move to AtlasViewer factory function
                */
                for (var i=0; i<_this.renderers.volume.labelmap.length; i++) {
                    var map = _this.renderers.volume.labelmap[i];
                    if (map.file.indexOf(tractCode) != -1) {
                        map.colormap = _this.colormaps.generateXTKColormap(_this.colormaps.colormapFunctions[color](min, max, opacity));
                        _this.renderers.resetSlicesForColormapChange();
                        break;
                    }
                }
            }
            
        });
        $('#tract-settings-menu').hide();
        
        /*
        Fire 'populate-colormap-select' event here so the following loop can move to AtlasViewer factory function?
        */
        for (let key in _this.colormaps.colormaps) {
            $('#colormap-select').append('<div id="'+key+'-colormap-select-item" class="colormap-select-item clickable '+key+'-colormap">&nbsp&nbsp&nbsp</div>');
            $('#'+key+'-colormap-select-item').on('click', {color: key}, function(event) {
                // fetch selected tract code from colormap select
                const tractCode = $('#colormap-select').data('tractCode');
                const colormapMax = tractSelect.tractSettings[tractCode].colormapMax;
                const colormapMin = tractSelect.tractSettings[tractCode].colormapMin;
                const opacity = tractSelect.tractSettings[tractCode].opacity;
                const color = event.data.color;
                
                /*
                Fire 'colormap-change' event here so the following loop can move to AtlasViewer factory function
                */
                for (let i=0; i<_this.renderers.volume.labelmap.length; i++) {
                    const map = _this.renderers.volume.labelmap[i];
                    if (map.file.indexOf(tractCode) != -1 && tractSelect.tractSettings[tractCode].color != color) {
                        tractSelect.tractSettings[tractCode]["color"] = color;
                        map.colormap = _this.colormaps.generateXTKColormap(_this.colormaps.colormapFunctions[color](colormapMin, colormapMax, opacity));
                        $('#'+tractCode+'-colormap-indicator').removeClass(_this.renderers.labelmapColors[i]+'-colormap');
                        $('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
                        _this.renderers.labelmapColors[i] = color;
                        _this.renderers.resetSlicesForColormapChange();
                        break;
                    }
                }
            });
        }
        $('#colormap-select').hide();
        
        $.ajax({
            dataType: 'json',
            url: _this.rootPath + '/tract_select',
            success: function(data) {
                for (let tractCode in data) {
                    $('#add-tract-select').append('<option id="'+tractCode+'" value="'+tractCode+'">'+data[tractCode].name+'</option>');
                    data[tractCode]['disabled'] = false;
                    tractSelect.availableTracts[tractCode] = data[tractCode];
                    
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
                closeTractSettings();
            }
        });
        $(window).resize(function() {
            closeTractSettings();
            $('#colormap-select').hide();
        });
        $('#tract-settings-close').click(function() {
            closeTractSettings();
        });
        
        $('#add-tract-select').change(function(event) {
            var tractCode = event.currentTarget.value;
            $('#add-tract-select option[value='+tractCode+']').prop('disabled', true);
            $('#add-tract-select option[value=default]').prop('selected', true);
            
            tractSelect.tractMetrics[tractCode] = {};
            
            tractSelect.selectedTracts[tractCode] = tractSelect.availableTracts[tractCode];
            
            // check if this is the first tract to be added, if so we want to show tract info immediately
            var showTractInfo = Object.keys(tractSelect.selectedTracts).length == 1;
            if (showTractInfo) {
                tractSelect.currentInfoTractCode = tractCode;
            }
            
            /*
            Fire 'add-tract' event here so the following code can move to AtlasViewer factory function
            */
            // add the tract to the viewer
            tractSelect.tractSettings[tractCode] = _this.renderers.addLabelmapToVolume(tractCode, _this.currentQuery);
            _this.renderers.resetSlicesForDirtyFiles();
            var color = tractSelect.tractSettings[tractCode].color;
            
            // add row to table
            $('#tract-table > tbody').append('<tr id="'+tractCode+'" class="tract-row">'
                    +'<td id="tract-name" class="tract-table-cell">'+tractSelect.availableTracts[tractCode].name+'</td>'
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
                if (!tractSelect.selectedTracts[tractCode].disabled) {
                    event.preventDefault();
                    window.location.href = 'tract/'+tractCode+'?'+$.param(_this.currentQuery)+'&file_type=.nii.gz';
                }
            });
            
            // add event listener on remove icon
            $('#'+tractCode+' > #tract-remove').on('click', function(event) {
                var tractCode = event.currentTarget.parentElement.id;
                
                // change tract info if this tracts metrics are being displayed
                var selectedTractCodes = Object.keys(tractSelect.selectedTracts);
                if (selectedTractCodes.length == 1) {
                    // no more tracts displayed so clear tract info
                    $('#tract-info-name').html('');
                    $('#prob-atlas-metrics').html('');
                    $('#pop-metrics').html('');
                } else if (tractSelect.currentInfoTractCode == tractCode) {
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
                delete tractSelect.selectedTracts[tractCode];
                delete tractSelect.tractMetrics[tractCode];
                /*
                Fire 'remove-tract' event here so the following code can move to AtlasViewer factory function
                */
                // remove labelmap from the viewer
                _this.renderers.removeLabelmapFromVolume(tractCode);
            });
            
            // add event listener on settings icon
            $('#'+tractCode+' > #tract-settings').on('click', function(event) {
                var tractCode = event.currentTarget.parentElement.id;
                if (!tractSelect.selectedTracts[tractCode].disabled) {
                    var settingsMenu = $('#tract-settings-menu');
                    settingsMenu.data('tractCode', tractCode);
                    $('#tract-settings-title').html('Settings:<br>'+tractSelect.availableTracts[tractCode].name);
                    var min = 100*tractSelect.tractSettings[tractCode]["colormapMin"];
                    var max = 100*tractSelect.tractSettings[tractCode]["colormapMax"];
                    var opacity = 100*tractSelect.tractSettings[tractCode]["opacity"];
                    $('#tract-prob-range-slider').slider('values', [min, max]);
                    $('#tract-prob-range-min-handle').text(Math.floor(min));
                    $('#tract-prob-range-max-handle').text(Math.floor(max));
                    $('#tract-opacity-slider').slider('value', opacity);
                    $('#tract-opacity-slider-handle').text(Math.floor(opacity));
                    
                    // position menu at settings button or mouse click?
                    var buttonOffset = $('#'+tractCode+' > #tract-settings').offset();
                    settingsMenu.show(); // show before setting offset as can't set offset of hidden elements
                    settingsMenu.offset({top: buttonOffset.top - settingsMenu.height(), left: buttonOffset.left - 30});
                    
                    tractSelect.tractSettingsVisible = true;
                }
            });
            
            $('#'+tractCode+' > #tract-info').on('click', function(event) {
                var tractCode = event.currentTarget.parentElement.id; 
                if (!tractSelect.selectedTracts[tractCode].disabled) {
                    
                    // change metrics icon to selected style
                    if (tractSelect.currentInfoTractCode && tractSelect.currentInfoTractCode != tractCode) {
                        $('#'+tractSelect.currentInfoTractCode+' > #tract-info > .tract-icon').removeClass('metrics-icon-selected');
                        $('#'+tractSelect.currentInfoTractCode+' > #tract-info > .tract-icon').addClass('metrics-icon');
                    }
                    $('#'+tractCode+' > #tract-info > .tract-icon').removeClass('metrics-icon');
                    $('#'+tractCode+' > #tract-info > .tract-icon').addClass('metrics-icon-selected');
                    
                    var metrics = tractSelect.tractMetrics[tractCode];
                    tractSelect.currentInfoTractCode = tractCode;
                    if (metrics && metrics['dynamic'] && metrics['static']) {
                        populateDynamicTractInfo(metrics['dynamic']);
                        populateStaticTractInfo(metrics['static']);
                    } else {
                        // get the metric data
                        var threshold = parseInt(100*tractSelect.tractSettings[tractCode]["colormapMin"]);
                        $('#prob-atlas-metrics').html('<div class="tract-metrics-loading-gif"></div>');
                        $.ajax({
                            dataType: 'json',
                            url: _this.rootPath + '/get_tract_info/' + tractCode + '/'+threshold+'?'+$.param(_this.currentQuery),
                            success: function(data) {
                                tractSelect.tractMetrics[data.tractCode]['dynamic'] = data;
                                populateDynamicTractInfo(data);
                            }
                        });
                        $('#pop-metrics').html('<div class="tract-metrics-loading-gif"></div>');
                        $.ajax({
                            dataType: 'json',
                            url: _this.rootPath + '/get_tract_info/' + tractCode + '?'+$.param(_this.currentQuery),
                            success: function(data) {
                                tractSelect.tractMetrics[data.tractCode]['static'] = data;
                                populateStaticTractInfo(data);
                            }
                        });
                    }
                }
                
            });
            
            $('#'+tractCode+' > #tract-atlas').on('click', function(event) {
                var tractCode = event.currentTarget.parentElement.id; 
                if (!tractSelect.selectedTracts[tractCode].disabled) {
                
                    $('#tract-info-overlay-title').html(tractSelect.selectedTracts[tractCode].name);
                    $('#tract-info-overlay-description').html(tractSelect.selectedTracts[tractCode].description);
                    $('#tract-info-overlay').show('slow');
                    
                    var renderer = tractSelect.trkRenderer;
                    renderer.remove(tractSelect.trk);
                    renderer.resize(); // call the resize function to ensure the canvas gets the dimensions of the visible container
                    
                    tractSelect.trk.file = _this.rootPath + '/get_trk/'+tractCode+'?.trk';
                    tractSelect.trk.opacity = 1.0;
                    
                    renderer.add(tractSelect.trk);
                    renderer.render();
                    
                    tractSelect.cameraMotion = setInterval(function() {
                        renderer.camera.rotate([3,0]);
                    }, 50);
                }
                
            });
            
            $('#'+tractCode+'-colormap-indicator').on('click', {tractCode:tractCode}, function(event) {
                if (!tractSelect.selectedTracts[tractCode].disabled) {
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
            var initThreshold = parseInt(_this.colormaps.initColormapMin * 100);
            if (showTractInfo) {
                $('#prob-atlas-metrics').html('<div class="tract-metrics-loading-gif"></div>');
                $('#pop-metrics').html('<div class="tract-metrics-loading-gif"></div>');
            }
            // wait to allow request for density map to be sent before fetching tract metrics 
            setTimeout(function() {
                $.ajax({
                    dataType: 'json',
                    url: _this.rootPath + '/get_tract_info/' + tractCode + '/'+initThreshold+'?'+$.param(_this.currentQuery),
                    success: function(data) {
                        tractSelect.tractMetrics[data.tractCode]['dynamic'] = data;
                        if (showTractInfo) {
                            populateDynamicTractInfo(data);
                        }
                    }
                });
                $.ajax({
                    dataType: 'json',
                    url: _this.rootPath + '/get_tract_info/' + tractCode + '?'+$.param(_this.currentQuery),
                    success: function(data) {
                        tractSelect.tractMetrics[data.tractCode]['static'] = data;
                        if (showTractInfo) {
                            populateStaticTractInfo(data);
                        }
                    }
                });
            }, 500);
            
        });
        
        $(document).on('query-update', function(event, newQuery) {
        
           _this.currentQuery = newQuery;
            
            // remove the disabled tract select message
            if ($('#add-tract-select').prop('disabled')) {
                $('#add-tract-select').prop('disabled', false);
                $('#tract-disabled-msg-text').hide();
            }
            
            var datasets = Object.keys(newQuery);
            //var currentInfoTractCode = currentInfoTractCode;
            
            // fire event to disable the views while tracts are updated
            if (Object.keys(tractSelect.selectedTracts).length) {
                $(document).trigger('view:disable');
            }
            
            for (var tractCode in tractSelect.selectedTracts) {
                // check to see if we want to disable the tract
                var disable = false;
                for (var i=0; i<datasets.length; i++) {
                    if (tractSelect.availableTracts[tractCode]['datasets'].indexOf(datasets[i]) < 0) {
                        disable = true;
                        break;
                    }
                }
                
                if (disable) {
                    /*
                    Fire 'remove-tract' event here so the following code can move to AtlasViewer factory function
                    */
                    _this.renderers.removeLabelmapFromVolume(tractCode);
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
                    var color = tractSelect.tractSettings[tractCode]["color"];
                    $('#'+tractCode+'-colormap-indicator').removeClass(color+'-colormap');
                    $('#'+tractCode+'-colormap-indicator').removeClass('colormap-indicator');
                    $('#'+tractCode+'-colormap-indicator').removeClass('clickable');
                    $('#'+tractCode+'-colormap-indicator').addClass('colormap-indicator-disabled');
                    $('#'+tractCode+'-colormap-indicator').children().removeClass('colormap-indicator-caret');
                    $('#'+tractCode+'-colormap-indicator').children().addClass('colormap-indicator-caret-disabled');
                } else {
                    if (tractSelect.availableTracts[tractCode].disabled) { // if previously disabled, add new labelmap
                        tractSelect.tractSettings[tractCode] = _this.renderers.addLabelmapToVolume(tractCode, newQuery);
                        
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
                        var color = tractSelect.tractSettings[tractCode]["color"];
                        $('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
                        $('#'+tractCode+'-colormap-indicator').addClass('colormap-indicator');
                        $('#'+tractCode+'-colormap-indicator').addClass('clickable');
                        $('#'+tractCode+'-colormap-indicator').children().removeClass('colormap-indicator-caret-disabled');
                        $('#'+tractCode+'-colormap-indicator').children().addClass('colormap-indicator-caret');
                        
                    } else { // if previously active, update labelmap
                        /*
                        Fire 'add-tract' event here so the following code can move to AtlasViewer factory function
                        */
                        _this.renderers.updateLabelmapFile(tractCode, newQuery);
                    }
                    
                    // update metrics
                    var threshold = parseInt(100*tractSelect.tractSettings[tractSelect.currentInfoTractCode]["colormapMin"]);
                    if (tractCode == tractSelect.currentInfoTractCode) {
                        $('#prob-atlas-metrics').html('<div class="tract-metrics-loading-gif"></div>');
                        $('#pop-metrics').html('<div class="tract-metrics-loading-gif"></div>');
                    }
                    
                    $.ajax({
                        dataType: 'json',
                        url: _this.rootPath + '/get_tract_info/'+tractCode+'/'+threshold+'?'+$.param(newQuery),
                        success: function(data) {
                            tractSelect.tractMetrics[data.tractCode]['dynamic'] = data;
                            if (data.tractCode == tractSelect.currentInfoTractCode) {
                                populateDynamicTractInfo(data);
                            }
                        }
                    });
                    $.ajax({
                        dataType: 'json',
                        url: _this.rootPath + '/get_tract_info/'+tractCode+'?'+$.param(newQuery),
                        success: function(data) {
                            tractSelect.tractMetrics[data.tractCode]['static'] = data;
                            if (data.tractCode == tractSelect.currentInfoTractCode) {
                                populateStaticTractInfo(data);
                            }
                        }
                    });
                    
                }
                tractSelect.availableTracts[tractCode].disabled = disable;
            }
            /*
            Fire an event here so the following code can move to AtlasViewer factory function
            */
            if (Object.keys(tractSelect.selectedTracts).length) {
                _this.renderers.resetSlicesForDirtyFiles();
            }
            
            // also loop through all the options in the tract select and disable the the required tracts 
            $('#add-tract-select option[value!=default]').each(function(idx) {
                var tractCode = $(this).val();
                if (!tractSelect.selectedTracts[tractCode]) {
                    var disable = false;
                    for (var i=0; i<datasets.length; i++) {
                    if (tractSelect.availableTracts[tractCode]['datasets'].indexOf(datasets[i]) < 0) {
                        disable = true;
                        break;
                    }
                }
                $(this).prop('disabled', disable);
                }
            });
        });
        
        return {tractSelect: tractSelect};
//         {
//             tractSelect: {
//                 tractSettings: tractSettings,
//                 tractSettingsVisible: tractSettingsVisible,
//                 currentInfoTractCode: currentInfoTractCode,
//                 tractMetrics: tractMetrics,
//                 availableTracts: availableTracts,
//                 selectedTracts: selectedTracts,
//                 
//                 trkRenderer: trkRenderer,
//                 trk: trk,
//             
//                 populateDynamicTractInfo: populateDynamicTractInfo,
//                 populateStaticTractInfo: populateStaticTractInfo,
//                 updateDynamicTractInfo: updateDynamicTractInfo,
//                 updateStaticTractInfo: updateStaticTractInfo,
//                 closeTractSettings: closeTractSettings   
//             }
//         };
    };
    
    return TractSelect;
})();



