var mgtrk = mgtrk || {};

mgtrk.TractTable = (function() {
   
    const TractTable = {};
    
    TractTable.init = (_parent, rowComponents) => {
        
        const tractTable = {};
        
        tractTable.tractSettings = {};
        
        tractTable._parent = _parent;
        tractTable.currentQuery = _parent._parent.currentQuery;
        
        const containerId = _parent.tractTableContainerId;
        
        tractTable.rowComponents = rowComponents;
        
        $('#'+containerId).append('<table id="tract-table">'
                                    +'<tbody>'
                                    +'</tbody>'
                                    +'</table>');
        
        $('#'+containerId).after('<div id="tract-settings-menu"></div>'
                                    +'<ul id="colormap-select"></ul>'
                                    +'<div id="tract-info-overlay"></div>');
                                    
        $('#tract-info-overlay').append('<div id="tract-info-overlay-title"></div>'
                +'<div id="tract-info-overlay-close" class="clickable remove-icon"></div>'
                +'<div id="tract-info-overlay-trk"></div>'
                +'<div id="tract-info-overlay-description"></div>'
                +'<div id="tract-info-overlay-citations"></div>');
        $('#tract-info-overlay').hide();
        
        tractTable.trkRenderer = new X.renderer3D();
        tractTable.trkRenderer.container = 'tract-info-overlay-trk';
        tractTable.trkRenderer.config.PICKING_ENABLED = false;
        tractTable.trkRenderer.init();
        
        $('#tract-info-overlay-close').on('click', function(event) {
            clearInterval(tractTable.cameraMotion);
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
                        +'<div id="tract-prob-range-min-handle" class="ui-slider-handle tract-prob-range-slider-handle"></div>'
                        +'<div id="tract-prob-range-max-handle" class="ui-slider-handle tract-prob-range-slider-handle"></div>'
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
                var opacity = tractTable.tractSettings[tractCode].opacity;
                var color = tractTable.tractSettings[tractCode].color;
                tractTable.tractSettings[tractCode].colormapMin = min;
                tractTable.tractSettings[tractCode].colormapMax = max;
                /*
                Fire 'colormap-change' event here so the following loop can move to AtlasViewer factory function
                */
                $(document).trigger('colormap:change', [tractTable.tractSettings[tractCode]]);
//                 for (let i=0; i<_parent.renderers.volume.labelmap.length; i++) {
//                     var map = _parent.renderers.volume.labelmap[i];
//                     if (map.file.indexOf(tractCode) != -1) {
//                         map.colormap = _parent.colormaps.generateXTKColormap(_parent.colormaps.colormapFunctions[color](min, max, opacity));
//                         _parent.renderers.resetSlicesForColormapChange();
//                         break;
//                     }
//                 }
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
                var min = tractTable.tractSettings[tractCode].colormapMin;
                var max = tractTable.tractSettings[tractCode].colormapMax;
                var color = tractTable.tractSettings[tractCode].color;
                tractTable.tractSettings[tractCode].opacity = opacity;
                /*
                Fire 'colormap-change' event here so the following loop can move to AtlasViewer factory function
                */
                $(document).trigger('colormap:change', [tractTable.tractSettings[tractCode]]);
//                 for (var i=0; i<_parent.renderers.volume.labelmap.length; i++) {
//                     var map = _parent.renderers.volume.labelmap[i];
//                     if (map.file.indexOf(tractCode) != -1) {
//                         map.colormap = _parent.colormaps.generateXTKColormap(_parent.colormaps.colormapFunctions[color](min, max, opacity));
//                         _parent.renderers.resetSlicesForColormapChange();
//                         break;
//                     }
//                 }
            }
            
        });
        $('#tract-settings-menu').hide();
        tractTable.tractSettingsVisible = false;
        
        const closeTractSettings = function() {
            if (tractTable.tractSettingsVisible) {
                var settingsMenu = $('#tract-settings-menu');
                //updateDynamicTractInfo(settingsMenu.data('tractCode'));
                settingsMenu.hide();
                tractTable.tractSettingsVisible = false;
            }
        };
        
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
        
        /*
        Fire 'populate-colormap-select' event here so the following loop can move to AtlasViewer factory function?
        */
        for (let key in _parent._parent.colormaps.colormaps) {
            $('#colormap-select').append('<div id="'+key+'-colormap-select-item" class="colormap-select-item clickable '+key+'-colormap">&nbsp&nbsp&nbsp</div>');
            $('#'+key+'-colormap-select-item').on('click', {color: key}, function(event) {
                // fetch selected tract code from colormap select
                const tractCode = $('#colormap-select').data('tractCode');
                const colormapMax = tractTable.tractSettings[tractCode].colormapMax;
                const colormapMin = tractTable.tractSettings[tractCode].colormapMin;
                const opacity = tractTable.tractSettings[tractCode].opacity;
                const color = event.data.color;
                
                /*
                Fire 'colormap-change' event here so the following loop can move to AtlasViewer factory function
                */
                const oldColor = tractTable.tractSettings[tractCode].color;
                if (oldColor != color) {
                    tractTable.tractSettings[tractCode].color = color;
                    $(document).trigger('colormap:change', [tractTable.tractSettings[tractCode]]);
                    $('#'+tractCode+'-colormap-indicator').removeClass(oldColor+'-colormap');
                    $('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap'); 
                }
                
                
//                 for (let i=0; i<_parent.renderers.volume.labelmap.length; i++) {
//                     const map = _parent.renderers.volume.labelmap[i];
//                     if (map.file.indexOf(tractCode) != -1 && _parent.tractSettings[tractCode].color != color) {
//                         tractTable.tractSettings[tractCode].color = color;
//                         map.colormap = _parent.colormaps.generateXTKColormap(_parent.colormaps.colormapFunctions[color](colormapMin, colormapMax, opacity));
//                         $('#'+tractCode+'-colormap-indicator').removeClass(_parent.renderers.labelmapColors[i]+'-colormap');
//                         $('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
//                         _parent.renderers.labelmapColors[i] = color;
//                         _parent.renderers.resetSlicesForColormapChange();
//                         break;
//                     }
//                 }
            });
        }
        $('#colormap-select').hide();
        
        /**
         * Function to add a row to the tractTable.
         *
         * @param {object} tractSettings    Contains properties needed to construct correct functionality for row buttons.
                                            Eg. callbacks property can define custom onclick callback for a certain button.
         */
        tractTable.addRow = (tractSettings) => {
            const tractCode = tractSettings.code;
            tractTable.tractSettings[tractCode] = tractSettings;
            $('#tract-table > tbody').append('<tr id="'+tractCode+'" class="tract-row">');
            const numRowComponents = tractTable.rowComponents.length;
            for (let i=0; i<numRowComponents; i++) {
                var rowComponent = tractTable.rowComponents[i];
                const clickCallback = tractSettings.callbacks[rowComponent.label];
                rowComponent.insert(tractCode, tractTable, i===0, i===numRowComponents-1, clickCallback);
            }
            $('#tract-table > tbody').append('</tr>');
            $('#tract-table > tbody').append('<tr id="'+tractCode+'-spacer" class="tract-spacer-row"><td></td><td></td><td></td><td></td></tr>');
        };
                                    
        return tractTable;
    };
    
    /**
     * Adds a css class to the table cell if it is the left or right cell.
     *
     * @param {boolean} leftCell    Whether the cell is the left-most cell in the row.
     * @param {boolean} rightCell   Whether the cel is the right-most cell in the row.
     * @param {string} tractCode    Code identifying the tract the current row refers to.
     * @param {string} cellId       ID for the cell that may be styled left and/or right.
     */
    TractTable.styleRowEnds = (leftCell, rightCell, tractCode, cellId) => {
        if (leftCell) {
            $('#'+tractCode+' > #'+cellId).addClass('tract-table-row-left-cell');
        }
        if (rightCell) {
            $('#'+tractCode+' > #'+cellId).addClass('tract-table-row-right-cell');
        }
    };
    
    TractTable.RowTitle = {
        label: 'title',
        insert: function(tractCode, tractTable, leftCell, rightCell) {
            $('#tract-table > tbody > tr#'+tractCode).append(
                '<td id="tract-name" class="tract-table-cell">'+tractTable.tractSettings[tractCode].name+'</td>'
            );
            TractTable.styleRowEnds(leftCell, rightCell, tractCode, 'tract-name');
        }
    };
    
    TractTable.RowColormapSelect = {
        label: 'colormapSelect',
        insert: function(tractCode, tractTable, leftCell, rightCell, clickCallback) {
            const tractSettings = tractTable.tractSettings[tractCode];
            $('#tract-table > tbody > tr#'+tractCode).append(
                '<td id="tract-colormap" class="tract-table-cell"><div id="'+tractCode+'-colormap-indicator" class="clickable colormap-indicator"><div class="colormap-indicator-caret"></div></div></td>'
            );
            $('#'+tractCode+'-colormap-indicator').addClass(tractSettings.color+'-colormap');
            TractTable.styleRowEnds(leftCell, rightCell, tractCode, 'tract-colormap');
            
            $('#'+tractCode+'-colormap-indicator').on('click', {tractCode:tractCode}, function(event) {
                //if (!tractSelect.selectedTracts[tractCode].disabled) {
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
                //}
            });
        }
    };
    
    TractTable.RowSettings = {
        label: 'settings',
        insert: function(tractCode, tractTable, leftCell, rightCell, clickCallback) {
            const tractSettings = tractTable.tractSettings[tractCode];
            $('#tract-table > tbody > tr#'+tractCode).append('<td id="tract-settings" class="tract-table-cell">'
                                                                        +'<div class="tract-icon clickable settings-icon" title="Tract settings"></div>'
                                                                        +'</td>');
            TractTable.styleRowEnds(leftCell, rightCell, tractCode, 'tract-settings');
                                                                        
            $('#'+tractCode+' > #tract-settings').on('click', function(event) {
                const tractCode = event.currentTarget.parentElement.id;
                //if (!tractSelect.selectedTracts[tractCode].disabled) {
                var settingsMenu = $('#tract-settings-menu');
                settingsMenu.data('tractCode', tractCode);
                $('#tract-settings-title').html('Settings:<br>'+tractSettings.name);
                var min = 100*tractSettings.colormapMin;
                var max = 100*tractSettings.colormapMax;
                var opacity = 100*tractSettings.opacity;
                $('#tract-prob-range-slider').slider('values', [min, max]);
                $('#tract-prob-range-min-handle').text(Math.floor(min));
                $('#tract-prob-range-max-handle').text(Math.floor(max));
                $('#tract-opacity-slider').slider('value', opacity);
                $('#tract-opacity-slider-handle').text(Math.floor(opacity));
                
                // position menu at settings button or mouse click?
                var buttonOffset = $('#'+tractCode+' > #tract-settings').offset();
                settingsMenu.show(); // show before setting offset as can't set offset of hidden elements
                settingsMenu.offset({top: buttonOffset.top - settingsMenu.height(), left: buttonOffset.left - 30});
                
                tractTable.tractSettingsVisible = true;
                //}
            });
        }
    };
    
    TractTable.RowDownload = {
        label: 'download',
        insert: function(tractCode, tractTable, leftCell, rightCell, clickCallback) {
            const tractSettings = tractTable.tractSettings[tractCode];
            $('#tract-table > tbody > tr#'+tractCode).append('<td id="tract-download" class="tract-table-cell"><div class="tract-icon clickable download-icon" title="Download density map"></td>');
            TractTable.styleRowEnds(leftCell, rightCell, tractCode, 'tract-download');
            
            $('#'+tractCode+' > #tract-download').on('click', function(event) {
                var tractCode = event.currentTarget.parentElement.id;
                //if (!tractSelect.selectedTracts[tractCode].disabled) {
                event.preventDefault();
                window.location.href = 'tract/'+tractCode+'?'+$.param(tractSettings.currentQuery)+'&file_type=.nii.gz';
                //}
            });
        }
    };
    
    TractTable.RowRemove = {
        label: 'remove',
        insert: function(tractCode, tractTable, leftCell, rightCell, clickCallback) {
                    const tractSettings = tractTable.tractSettings[tractCode];
                    $('#tract-table > tbody > tr#'+tractCode).append('<td id="tract-remove" class="tract-table-cell"><div class="tract-icon clickable remove-icon" title="Remove tract"></div></td>');
                    TractTable.styleRowEnds(leftCell, rightCell, tractCode, 'tract-remove');
                    
                    if (clickCallback) {
                        $('#'+tractCode+' > #tract-remove').on('click',  clickCallback);
                    } else {
                        $('#'+tractCode+' > #tract-remove').on('click', function(event) {
                            $('#tract-table > tbody > tr#'+tractCode).remove();
                        });
                    }
                    

        }
    };
    
    TractTable.RowMetrics = {
        label: 'metrics',
        insert: function(tractCode, tractTable, leftCell, rightCell, clickCallback) {
            const tractSettings = tractTable.tractSettings[tractCode];
            $('#tract-table > tbody > tr#'+tractCode).append('<td id="tract-metrics" class="tract-table-cell"><div class="tract-icon clickable metrics-icon" title="Tract metrics"></div></td>');
            TractTable.styleRowEnds(leftCell, rightCell, tractCode, 'tract-metrics');
            
            if (clickCallback) {
                $('#'+tractCode+' > #tract-metrics').on('click', clickCallback);
            } else {
                $('#'+tractCode+' > #tract-metrics').on('click', function(event) {
                    console.log('No callback attached to tract metrics button.');
                });
            }
            
        }
    };
    
    TractTable.Row3DAtlas = {
        label: 'atlas',
        insert: function(tractCode, tractTable, leftCell, rightCell, clickCallback) {
            const tractSettings = tractTable.tractSettings[tractCode];
            $('#tract-table > tbody > tr#'+tractCode).append('<td id="tract-atlas" class="tract-table-cell"><div class="tract-icon clickable atlas-icon" title="3D tract atlas"></div></td>');
            TractTable.styleRowEnds(leftCell, rightCell, tractCode, 'tract-atlas');
            
            $('#'+tractCode+' > #tract-atlas').on('click', function(event) {
//                 var tractCode = event.currentTarget.parentElement.id; 
//                 //if (!tractSelect.selectedTracts[tractCode].disabled) {
//                 
//                 $('#tract-info-overlay-title').html(tractSelect.selectedTracts[tractCode].name);
//                 $('#tract-info-overlay-description').html(tractSelect.selectedTracts[tractCode].description);
//                 $('#tract-info-overlay').show('slow');
//                 
//                 var renderer = tractSelect.trkRenderer;
//                 renderer.remove(tractSelect.trk);
//                 renderer.resize(); // call the resize function to ensure the canvas gets the dimensions of the visible container
//                 
//                 tractSelect.trk.file = _parent.rootPath + '/get_trk/'+tractCode+'?.trk';
//                 tractSelect.trk.opacity = 1.0;
//                 
//                 renderer.add(tractSelect.trk);
//                 renderer.render();
//                 
//                 tractSelect.cameraMotion = setInterval(function() {
//                     renderer.camera.rotate([3,0]);
//                 }, 50);
//                 //}
            });
        }
    };
    
    TractTable.RowValue = {
        label: 'value',
        insert: function(tractCode, tractTable, leftCell, rightCell) {
            const tractSettings = tractTable.tractSettings[tractCode];
            $('#tract-table > tbody > tr#'+tractCode).append('<td id="tract-value" class="tract-table-cell"><div class="tract-icon"><span title="Overlap score">OS: '+tractSettings.overlapScore.toFixed(2)+'</span></div></td>')
            TractTable.styleRowEnds(leftCell, rightCell, tractCode, 'tract-value');
        }
    };
    
    return TractTable;
    
})();
