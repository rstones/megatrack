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
        lesionMapping.rootPath = _parent.rootPath;
        
        const containerId = _parent.lesionAnalysisId;
        lesionMapping.tractTableContainerId = 'tract-table-wrapper';
        lesionMapping.tractTabsContainerId = 'tract-tabs-container';
        
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
                                        +'<div id="'+lesionMapping.tractTabsContainerId+'"></div>'
                                        +'<div id="disconnect-info-wrapper"></div>'
                                        +'<div id="lesion-analysis-running"><div class="loading-gif lesion-analysis-running-loading-gif"></div></div>'
                                    +'</div>');
        
        const tractTabs = mgtrk.LesionTractTabs.init(lesionMapping, {});
        $(`#${lesionMapping.tractTabsContainerId}`).hide();
        
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
        
        /*
            Init the lesion upload popup and set up event listener
        */
        
        var lesionUploadPopupContent = function(popupContentId, popup) {
            $(`#${popupContentId}`).append(`<div id="lesion-upload-title">Lesion Upload</div>
                                            <div class="clear"></div>
                                            <div id="pre-upload-info">
                                                Upload your lesion map as a gzipped nifti (nii.gz) file.<br><br>
                                                You must transform your map to MNI space using the following template:
                                                <div class="clear"></div>
                                                <div id="template-download-button" class="button"><span>Template download</span><div class="download-icon"></div></div>
                                                <div class="clear"></div>
                                                You must also use RAS coordinates.<br>
                                            </div>
                                            <div class="clear"></div>
                                            <div id="upload-form-wrapper">
                                                <form id="lesion-upload-form" action="/megatrack/lesion_upload" method="POST" enctype="multipart/form-data">
                                                    <input id="lesion-file" type="file" name="lesionmap"/>
                                                    <input type="submit" value="Upload"/>
                                                </form>
                                                <div id="lesion-upload-form-facade">
                                                    <div id="upload-form-browse" class="button">Browse...</div>
                                                    <div id="upload-form-filename"></div>
                                                    <div class="clear"></div>
                                                    <div id="upload-form-submit" class="button">Upload</div>
                                                </div>
                                            </div>
                                            <div id="post-upload-message"></div>
                                            <div id="lesion-upload-or">Or...</div>
                                            <div id="example-lesion-button" class="button">Use example lesion</div>`);
                                            
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
            
            lesionMapping.renderLesion = (lesionCode) => {
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
            };
            
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
                         
                        lesionMapping.renderLesion(lesionCode);
                         
                         $('#lesion-opacity-slider').slider('enable');
                         
                         $('#lesion-volume').html(data.volume.toFixed(2) + ' ml');
                         
                         setTimeout(function() {
                            popup.close();
                         }, 2000);
                         
                     },
                     error: function(xhr) {
                         // invalid nifti etc...
                         $('#post-upload-message').css('color', 'rgba(204,0,0)');
                         $('#post-upload-message').html(xhr.responseText);
                     }
                 });
            });
            
            $('#example-lesion-button').on('click', function(event) {
                // enable run analysis button
                $('#run-analysis-button').removeClass('button-disabled');
                $('#run-analysis-button').addClass('button');
                
                // reset upload form in case it was previously used
                $('#upload-form-filename').html('');
                $('#post-upload-message').html('');
                
                const lesionCode = 'example';
                lesionMapping.currentLesionCode = lesionCode;
                
                lesionMapping.renderLesion(lesionCode);
                
                $('#lesion-opacity-slider').slider('enable');
                
                $('#lesion-volume').html('3.38 ml');
                
                setTimeout(function() {
                    popup.close();
                }, 1000);
            }); 
        };
        
        var lesionUploadPopup = mgtrk.Popup.init(lesionMapping, 'lesion-mapping-wrapper', 'lesion-upload-popup', lesionUploadPopupContent);
                                    
        $('#lesion-upload-button').on('click', function(event) {
            lesionUploadPopup.open(); 
        });
    
        /*
            Init the run analysis popup and set up event listener
        */
        
        var runAnalysisPopupContent = function(popupContentId) {
            $(`#${popupContentId}`).append(`<div id="run-analysis-popup-text">
                                                Select the minimum probability threshold for calculating the overlap
                                                 score during lesion analysis.
                                            </div>
                                            <div class="clear"></div>
                                            <div id="run-analysis-popup-prob-threshold-slider-wrapper">
                                                <div id="run-analysis-popup-prob-threshold-slider">
                                                    <div id="run-analysis-popup-prob-threshold-slider-handle" class="ui-slider-handle run-analysis-popup-prob-threshold-slider-handle"></div>
                                                </div>
                                            </div>
                                            <div id="run-analysis-popup-ok-wrapper">
                                                <div id="run-analysis-popup-ok" class="clickable button">OK</div>
                                            </div>`);
                                            
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
            
            
            $('#run-analysis-popup-ok').on('click', function(event) {
                // get current query from queryBuilder
                const currentQuery = _parent.currentQuery;
                
                $('#run-analysis-popup').hide();
                $('#popup-background-screen').hide();
                //$('#lesion-analysis-running').show();
                
                $('#run-analysis-button').append('<div class="loading-gif"></div>');
                
                const threshold = $('#run-analysis-popup-prob-threshold-slider').slider('option', 'value');
                
                $.ajax({
                    url: '/megatrack/lesion_analysis/' + lesionMapping.currentLesionCode + '/'+threshold+'?' + $.param(currentQuery),
                    method: 'GET',
                    dataType: 'json',
                    //data: {lesionCode: lesionMapping.currentLesionCode},
                    success: function(data) {
                        $('#run-analysis-button > .loading-gif').remove();
                        tractTabs.removeAll();
                        if ($(`#${lesionMapping.tractTabsContainerId}`).is(':hidden')) {
                            $(`#${lesionMapping.tractTabsContainerId}`).show();
                        }
                        const dataLen = data.length;
                        for (let i=0; i<dataLen; i++) {
                            const tractCode = data[i].tractCode;
                            const tractName = data[i].tractName;
                            const color = Object.keys(_parent.colormaps.colormaps)[Math.floor(Math.random()*_parent.colormaps.numColormaps)];
                            const settings = {
                                                id: tractCode,
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
                                                description: data[i].description
                                            };
                            _parent.labelmaps.tracts.push(settings);
                            const idx = _parent.findVolumeLabelmapIndex(tractCode);
                             _parent.renderers.addLabelmapToVolumeNew('tract', tractCode, idx, settings, currentQuery);
                             
                             tractTabs.addTab(settings);
                        }
                        
                        tractTabs.selectTab(data[0].tractCode);
                        _parent.renderers.resetSlicesForDirtyFiles();
                    },
                    error: function(xhr) {
                        
                    }
                });
            });
        };

        var runAnalysisPopup = mgtrk.Popup.init(lesionMapping, 'lesion-mapping-wrapper', 'run-analysis-popup', runAnalysisPopupContent);          
        
        let runAnalysisButton = $('#run-analysis-button');
        runAnalysisButton.on('click', function(event) {
            if (runAnalysisButton.hasClass('button')) {
                runAnalysisPopup.open();
            }
        });
        
        $(document).on('dataset:change', function(event, datasetCode) {
            tractTabs.removeAll(); // Tabs.removeTab will fire a tabs:remove event which we use to clear renderer
            $(`#${lesionMapping.tractTabsContainerId}`).hide();
        });
        
        $(document).on('query:update', function(event, newQuery) {
            tractTabs.removeAll();
            $(`#${lesionMapping.tractTabsContainerId}`).hide();
        });
        
        $(document).on('tabs:remove', function(event, tractCode) {
             _parent.renderers.removeLabelmapFromVolumeNew(_parent.renderers.findVolumeLabelmapIndex(tractCode));
             const idx = _parent.findVolumeLabelmapIndex(tractCode);
             _parent.labelmaps.tracts.splice(idx, 1);
        });
       
        return {lesionMapping: lesionMapping};
    };
    
    return LesionMapping;
})();