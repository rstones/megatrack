var mgtrk = mgtrk || {};

mgtrk.LesionMapping = (function() {
    
    const LesionMapping = {};
    
    /**
     * Initialise a LesionMapping object to perform lesion upload and display lesion analysis results.
     *
     * @param {Object} _parent      The parent object.
     */
    LesionMapping.init = (_parent) => {
        
        const lesionMapping = {};
        lesionMapping._parent = _parent;
        
        const containerId = _parent.lesionAnalysisId;
        lesionMapping.tractTableContainerId = 'tract-table-wrapper';
        
        _parent.colormaps.createLesionColormapClass(true);
        
        $('#'+containerId).append('<div id="lesion-mapping-wrapper">'
                                        +'<div id="lesion-upload-button" class="button"><span>Lesion Upload</span><div class="upload-icon"></div></div>'
                                        +'<div id="run-analysis-button" class="button-disabled">Run Analysis</div>'
                                        +'<div id="lesion-volume-wrapper">'
                                            +'<div id="lesion-volume-label">Lesion volume:</div>'
                                            +'<div id="lesion-volume">- ml</div>'
                                        +'</div>'
                                        +'<div id="lesion-opacity-slider-wrapper">'
                                            +'<div id="lesion-opacity-label">Lesion opacity (%):</div>'
                                            +'<div id="lesion-opacity-slider" class="lesion-colormap">'
                                                +'<div id="lesion-opacity-slider-handle" class="ui-slider-handle opacity-slider-handle"></div>'
                                            +'</div>'
                                        +'</div>'
                                        +'<div class="clear"></div>'
                                        +'<hr>'
                                        +'<div id="'+lesionMapping.tractTableContainerId+'"></div>'
                                        +'<div id="disconnect-info-wrapper"></div>'
                                        +'<div id="lesion-analysis-running"><div class="loading-gif lesion-analysis-running-loading-gif"></div></div>'
                                        +'<div id="lesion-upload-popup"></div>'
                                        +'<div id="run-analysis-popup"></div>'
                                        +'<div id="popup-background-screen"></div>'
                                    +'</div>');
                                    
        //lesionMapping.colormaps = _parent.colormaps;
        const TractTable = mgtrk.TractTable;
        const tractTableRowComponents = [TractTable.RowTitle, TractTable.RowColormapSelect, TractTable.RowSettings, TractTable.RowDownload, TractTable.RowDisconnect, TractTable.RowValue];
        const tractTable = TractTable.init(lesionMapping, tractTableRowComponents);
        lesionMapping.tractTable = tractTable;
        
        // will store the disconnection data for each tract
        // needs emptying when query or lesion changes
        let disconnectDataCache = {};
                                    
        var opacitySliderHandle = $('#lesion-opacity-slider-handle');
        $('#lesion-opacity-slider').slider({
            min: 0,
            max: 100,
            value: 70,
            step: 1,
            create: function() {
                opacitySliderHandle.text($(this).slider("value"));
            },
            slide: function(event, ui) {
                opacitySliderHandle.text(ui.value);
                const idx = _parent.findVolumeLabelmapIndex(lesionMapping.currentLesionCode);
                const map = _parent.renderers.volume.labelmap[idx];
                const opacity = ui.value / 100;
                map.colormap = _parent.colormaps.generateXTKColormap(_parent.colormaps.lesionColormap(0, 1, opacity));
                _parent.renderers.resetSlicesForColormapChange();
            }
        });
        $('#lesion-opacity-slider').slider('disable');
                                    
        $('#lesion-upload-popup').append('<div id="lesion-upload-title">Lesion Upload</div>'
                                        +'<div id="lesion-upload-close" class="remove-icon clickable"></div>'
                                        +'<div class="clear"></div>'
                                        +'<div id="pre-upload-info">'
                                            +'Upload your lesion map as a gzipped nifti (nii.gz) file.<br><br>'
                                            +'You must transform your map to MNI space using the following template:'
                                            +'<div class="clear"></div>'
                                            +'<div id="template-download-button" class="button"><span>Template Download</span><div class="download-icon"></div></div>'
                                            +'<div class="clear"></div>'
                                            +'You must also use RAS coordinates.<br>'
                                        +'</div>'
                                        +'<div class="clear"></div>'
                                        +'<div id="upload-form-wrapper">'
                                            +'<form id="lesion-upload-form" action="/megatrack/lesion_upload" method="POST" enctype="multipart/form-data">'
                                                +'<input id="lesion-file" type="file" name="lesionmap"/>'
                                                +'<input type="submit" value="Upload"/>'
                                            +'</form>'
                                            +'<div id="lesion-upload-form-facade">'
                                                +'<div id="upload-form-browse" class="button">Browse...</div>'
                                                +'<div id="upload-form-filename"></div>'
                                                +'<div class="clear"></div>'
                                                +'<div id="upload-form-submit" class="button">Upload</div>'
                                            +'</div>'
                                        +'</div>'
                                        +'<div id="post-upload-message"></div>');
                                        
        $('#lesion-upload-close').on('click', function(event) {
            $('#lesion-upload-popup').hide();
            $('#popup-background-screen').hide();
        });
                                        
        $('#run-analysis-popup').append('<div id="run-analysis-popup-close" class="remove-icon clickable float-right"></div>'
                                        +'<div class="clear"></div>'
                                        +'<div id="run-analysis-popup-text">'
                                            +'Select the minimum probability threshold for calculating the overlap'
                                            +' score during lesion analysis.'
                                        +'</div>'
                                        +'<div class="clear"></div>'
                                        +'<div id="run-analysis-popup-prob-threshold-slider-wrapper">'
                                            +'<div id="run-analysis-popup-prob-threshold-slider">'
                                                +'<div id="run-analysis-popup-prob-threshold-slider-handle" class="ui-slider-handle run-analysis-popup-prob-threshold-slider-handle"></div>'
                                            +'</div>'
                                        +'</div>'
                                        +'<div id="run-analysis-popup-ok-wrapper">'
                                            +'<div id="run-analysis-popup-ok" class="clickable button">OK</div>'
                                        +'</div>');
        
        const runAnalysisProbThresholdHandle = $('#run-analysis-popup-prob-threshold-slider-handle');
        $('#run-analysis-popup-prob-threshold-slider').slider({
            min: 0,
            max: 100,
            value: 25,
            step: 1,
            create: function() {
                runAnalysisProbThresholdHandle.text($(this).slider("value"));
            },
            slide: function(event, ui) {
                runAnalysisProbThresholdHandle.text(ui.value);
            }
        });
                                        
        $('#run-analysis-popup-close').on('click', function(event) {
            $('#run-analysis-popup').hide();
            $('#popup-background-screen').hide();
        });
        
        $('#run-analysis-popup-ok').on('click', function(event) {
            // get current query from queryBuilder
            const currentQuery = _parent.currentQuery;
            
            $('#run-analysis-popup').hide();
            $('#popup-background-screen').hide();
            $('#lesion-analysis-running').show();
            
            const threshold = $('#run-analysis-popup-prob-threshold-slider').slider('option', 'value');
            
            $.ajax({
                url: '/megatrack/lesion_analysis/' + lesionMapping.currentLesionCode + '/'+threshold+'?' + $.param(currentQuery),
                method: 'GET',
                dataType: 'json',
                //data: {lesionCode: lesionMapping.currentLesionCode},
                success: function(data) {
                    // clear tract table and current tract labelmaps
                    tractTable.clear();
                    _parent.clearTracts();
                     
                    const dataLen = data.length;
                    for (let i=0; i<dataLen; i++) {
                        const tractCode = data[i].tractCode;
                        const tractName = data[i].tractName;
                        const color = Object.keys(_parent.colormaps.colormaps)[Math.floor(Math.random()*_parent.colormaps.numColormaps)];
                        const settings = {
                                            name: tractName,
                                            code: tractCode,
                                            overlapScore: data[i].overlapScore,
                                            color: color,
                                            colormap: _parent.colormaps.colormapFunctions[color](threshold / 100, _parent.colormaps.initColormapMax, _parent.colormaps.initColormapOpacity),
                                            colormapMax: _parent.colormaps.initColormapMax,
                                            colormapMin: threshold / 100,
                                            opacity: _parent.colormaps.initColormapOpacity,
                                            colormapMinUpdate: 0,
                                            currentQuery: currentQuery,
                                            callbacks: {
                                                'disconnect': function(event) {
                                                
                                                                var displayDisconnectData = function(tractName, data) {
                                                                    $('#disconnect-info-wrapper').html(
                                                                        '<div id="disconnect-title" class="disconnect-title">Streamline disconnection:</div>'
                                                                        +'<div id="disconnect-tract-name" class="disconnect-title">'+tractName+'</div>'
                                                                        +'<br>'
                                                                        +'<div id="disconnect-info">Average disconnection: '+Math.round(data.averageDisconnect)+' % of streamlines</div>'
                                                                        //+'<div>Std disconnection: '+data.stdDisconnect+' %</div>'
                                                                        +'<br>'
                                                                        +'<div id="disconnect-stats-button" class="button clickable">View statistics</div>'
                                                                        +'<div id="disconnect-stats-popup">'
                                                                            +'<div id="disconnect-stats-title">Streamline disconnection statistics</div>'
                                                                            +'<div id="disconnect-stats-close" class="remove-icon clickable"></div>'
                                                                            +'<div class="clear"></div>'
                                                                            +'<div>'+tractName+'</div><br>'
                                                                            +'<div id="disconnect-histogram-wrapper"></div>'
                                                                        +'</div>'
                                                                    );
                                                                    
                                                                        const trace = {
                                                                            x: data.percentDisconnect,
                                                                            marker: {
                                                                                color: "rgba(0, 0, 255, 1)",
                                                                                line: {
                                                                                    color: "rgba(100, 100, 100, 1)",
                                                                                    width: 1
                                                                                }
                                                                            },
                                                                            type: 'histogram',
                                                                            xbins: {
                                                                                start: 0.0,
                                                                                end: 100.0,
                                                                                size: 25.0
                                                                            }
                                                                        };
                                                                        const layout = {
                                                                            bargap: 0.05,
                                                                            xaxis: {title: "% disconnection", dtick: 25},
                                                                            yaxis: {title: "Num subjects"}
                                                                        };
                                                                        Plotly.newPlot('disconnect-histogram-wrapper', [trace], layout, {staticPlot: true});
                                                                    
                                                                    $('#disconnect-stats-popup').hide();
                                                                    $('#disconnect-stats-button').on('click', function(event) {
//                                                                         $('#popup-background-screen').show();
//                                                                         $('#disconnect-stats-popup').show();
                                                                        // dim the background
                                                                        const backgroundScreen = $('#popup-background-screen');
                                                                        backgroundScreen.show();
                                                                        backgroundScreen.css('width', $(window).width());
                                                                        backgroundScreen.css('height', $(window).height());
                                                                        
                                                                        const popup = $('#disconnect-stats-popup');
                                                                        popup.show();
                                                                        popup.css('left', ($(window).width()/2) - (popup.width()/2));
                                                                    });
                                                                    
                                                                    $('#disconnect-stats-close').on('click', function(event) {
                                                                        $('#disconnect-stats-popup').hide();
                                                                        $('#popup-background-screen').hide();
                                                                    });
                                                                }
                                                
                                                                // check if required data for given tract/query/lesion is already
                                                                // in cache before sending request 
                                                                if (disconnectDataCache[tractCode]
                                                                        && disconnectDataCache[tractCode].lesionCode === lesionMapping.currentLesionCode
                                                                        && disconnectDataCache[tractCode].query === currentQuery) {
                                                                    // update disconnect-info-wrapper
                                                                    displayDisconnectData(disconnectDataCache[tractCode].name, disconnectDataCache[tractCode].data);
                                                                } else{
                                                                    // display loading gif first
                                                                    $('#disconnect-info-wrapper').html('<div id="disconnect-info-loading">'
                                                                                                            +'<div class="loading-gif disconnect-info-loading-gif"></div>'
                                                                                                        +'</div>');
                                                                    
                                                                    $.ajax({
                                                                        url: '/megatrack/lesion_tract_disconnect/' + lesionMapping.currentLesionCode + '/'+tractCode+'?' + $.param(currentQuery),
                                                                        method: 'GET',
                                                                        dataType: 'json',
                                                                        //data: {lesionCode: lesionMapping.currentLesionCode},
                                                                        success: function(data) {
                                                                            console.log(data);
                                                                            
                                                                            // display info
                                                                            displayDisconnectData(tractName, data);
                                                                            
                                                                            // add data to cache
                                                                            disconnectDataCache[tractCode] = {
                                                                                lesionCode: lesionMapping.currentLesionCode,
                                                                                query: currentQuery,
                                                                                data: data,
                                                                                name: tractName
                                                                            }
                                                                        }
                                                                    });
                                                                }
                                                            }
                                            }
                                        };
                        _parent.labelmaps.tracts.push(settings);
                        const idx = _parent.findVolumeLabelmapIndex(tractCode);
                         _parent.renderers.addLabelmapToVolumeNew('tract', tractCode, idx, settings, currentQuery);
                         
                         tractTable.addRow(settings);
                         
                         $('#lesion-analysis-running').hide();
                        
                    }
                    _parent.renderers.resetSlicesForDirtyFiles();
                },
                error: function(xhr) {
                    
                }
            });
        });
          
        $('#lesion-upload-popup').hide();
        $('#run-analysis-popup').hide();
        $('#popup-background-screen').hide();
        
        $('#lesion-upload-button').on('click', function(event) {
            // dim the background
            const backgroundScreen = $('#popup-background-screen');
            backgroundScreen.show();
            backgroundScreen.css('width', $(window).width());
            backgroundScreen.css('height', $(window).height());
            
            const popup = $('#lesion-upload-popup');
            popup.show();
            popup.css('left', ($(window).width()/2) - (popup.width()/2));
            
        });
        
        $('#template-download-button').on('click', function(event) {
            event.preventDefault();
            window.location.href = 'get_template';
        });
        
        $('#upload-form-browse').on('click', function(event) {
            $('#lesion-file').trigger('click');
        });
        
        $('#lesion-file').on('change', function(event) {
            $('#upload-form-filename').html($('#lesion-file')[0].files[0].name); 
        });
        
        $('#upload-form-submit').on('click', function(event) {
             $('#lesion-upload-form > input[type=submit]').trigger('click');
        });
        
        $('#lesion-upload-form').submit(function(event) {
             event.preventDefault();
             const formData = new FormData();
             const file = $('#lesion-file')[0].files[0];
             formData.append('lesionmap', file);
             $.ajax({
                 url: '/megatrack/lesion_upload',
                 method: 'POST',
                 dataType: 'json',
                 processData: false,
                 contentType: false,
                 data: formData,
                 success: function(data) {
                    const lesionCode = data.lesionCode;
                    lesionMapping.currentLesionCode = lesionCode;
                    
                     // update volume with file path to lesion
                     $('#post-upload-message').css('color', 'rgba(0,204,0)');
                     $('#post-upload-message').html('Lesion map successfully uploaded!');
                     
                     $('#run-analysis-button').removeClass('button-disabled');
                     $('#run-analysis-button').addClass('button');
                     
                     if (_parent.labelmaps.lesion[0]) { // update lesion map
                         const settings = {
                                            code: lesionCode,
                                            colormap: _parent.colormaps.lesionColormap(0, 1, 0.7)
                                        };
                         _parent.labelmaps.lesion[0] = settings;
                         
                         const idx = _parent.findVolumeLabelmapIndex(lesionCode);
                         _parent.renderers.updateLabelmapFileNew('lesion', lesionCode, idx);
                     } else { // add the lesion map for the first time
                         const settings = {
                                            code: lesionCode,
                                            colormap: _parent.colormaps.lesionColormap(0, 1, 0.7)
                                        };
                         _parent.labelmaps.lesion[0] = settings;
                         
                         const idx = _parent.findVolumeLabelmapIndex(lesionCode);
                         _parent.renderers.addLabelmapToVolumeNew('lesion', lesionCode, idx, settings);
                     }
                     
                     _parent.renderers.resetSlicesForDirtyFiles();
                     
                     $('#lesion-opacity-slider').slider('enable');
                     
                     $('#lesion-volume').html(data.volume.toFixed(2) + ' ml');
                     
                     setTimeout(function() {
                            $('#lesion-upload-close').trigger('click');
                     }, 2000);
                     
                 },
                 error: function(xhr) {
                     // invalid nifti etc...
                     $('#post-upload-message').css('color', 'rgba(204,0,0)');
                     $('#post-upload-message').html(xhr.responseText);
                 }
             });
        });
        
        let runAnalysisButton = $('#run-analysis-button');
        runAnalysisButton.on('click', function(event) {
        
            if (runAnalysisButton.hasClass('button')) {
            
                // dim the background
                const backgroundScreen = $('#popup-background-screen');
                backgroundScreen.show();
                backgroundScreen.css('width', $(window).width());
                backgroundScreen.css('height', $(window).height());
                
                const popup = $('#run-analysis-popup');
                popup.show();
                popup.css('left', ($(window).width()/2) - (popup.width()/2));
                    
            }
        });
       
        
        return {lesionMapping: lesionMapping};
    };
    
    return LesionMapping;
    
})();