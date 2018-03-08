var mgtrk = mgtrk || {};

/*
    - insert button to open upload popup
    - insert 'Run Analysis' button
    - insert slider to change lesion opacity
    - insert upload popup
        - instructions:
            - "Upload your lesion map as a gzipped nifti (nii.gz) file transformed
                to MNI space using the template which can be downloaded here. Coords
                must be RAS. Information on how to apply the MNI transformation can be
                found here." etc... 
        - upload form
        - message box to display result of upload
            - success: message shows up and popup closes after ~5 secs
            - failure: message shows up with some information about the error
                        (eg. use RAS, MNI transformation not properly applied, wrong file type etc.)
    - insert table to display tracts
    
    
    - lesion map upload callback:
        - success:
            - display success message and start timeout to close popup
            - receive a lesion code and lesion info (eg. volume)
    
            - if no lesion map already uploaded...
                - add lesion map to labelmaps object
                - add lesion map labelmap to X.volume
            - else if a lesion map is already uploaded...
                - update lesion map in labelmaps object
                - update lesion map labelmap file in X.volume
            
            - if a query is selected and analysis has previously run...
                - change "Run Analysis" button to "Update Analysis" or automatically re-reun the analysis
        - error:
            - Display error message
            
    - "Run Analysis" callback:
        - receive a list of tract codes and associated data (eg. volume of lesion within the tract)
        - loop through the tract codes
            -  insert a row into the tract table with info/icons: tract name, color select, settings, data, hide
            - if tract code not already associated with a labelmap
                - add new tract to labelmaps object
                - add new labelmap with file pointing to tract code and query
            - if tract already loaded but query has changed
                - update the labelmap file with the new query
            
    - have message if no query selected: "Select a query before running lesion analysis"
    - Disable "Run Analysis" button before a query is selected, enable and remove the above message
        after the query is selected.
        
    - SERVER SIDE: file upload: every time a lesion map is uploaded:
        - Validate file exists, file ending, MNI transformation is correctly applied, RAS
        - generate a new lesion map code (increment a variable)
        - add an entry into a database table (code, uploaded file name, saved file name, upload datetime)
        - save the file with the lesion map code
        - return the lesion map code
        - or return an error message depending on the error
    
*/
mgtrk.LesionMapping = (function() {
    
    const LesionMapping = {};
    
    LesionMapping.init = (_this) => {
        
        const lesionMapping = {};
        
        const containerId = _this.lesionAnalysisId;
        
        let currentLesionCode = null;
        
        $('#'+containerId).append('<div id="lesion-mapping-wrapper">'
                                        +'<div id="lesion-upload-button" class="button"><span>Lesion Upload</span><div class="upload-icon"></div></div>'
                                        +'<div id="run-lesion-analysis-button" class="button">Run Analysis</div>'
                                        +'<div id="lesion-volume-wrapper">'
                                            +'<div id="lesion-volume-label">Lesion volume:</div>'
                                            +'<div id="lesion-volume">- ml</div>'
                                        +'</div>'
                                        +'<div id="lesion-opacity-slider-wrapper">'
                                            +'<div id="lesion-opacity-label">Lesion opacity (%):</div>'
                                            +'<div id="lesion-opacity-slider">'
                                                +'<div id="lesion-opacity-slider-handle" class="ui-slider-handle opacity-slider-handle"></div>'
                                            +'</div>'
                                        +'</div>'
                                        +'<div class="clear"></div>'
                                        +'<hr>'
                                        +'<div id="tract-table-wrapper">'
                                            +'<table id="tract-table">'
                                            +'<tbody>'
                                            +'</tbody>'
                                            +'</table>'
                                        +'</div>'
                                        +'<div id="lesion-upload-popup"></div>'
                                        +'<div id="lesion-upload-popup-background-screen"></div>'
                                    +'</div>');
                                    
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
                const idx = _this.findVolumeLabelmapIndex(lesionMapping.currentLesionCode);
                const map = _this.renderers.volume.labelmap[idx];
                const opacity = ui.value / 100;
                map.colormap = _this.colormaps.generateXTKColormap(_this.colormaps.lesionColormap(0, 1, opacity));
                _this.renderers.resetSlicesForColormapChange();
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
          
        $('#lesion-upload-popup').hide();
        $('#lesion-upload-popup-background-screen').hide();
        
        $('#lesion-upload-close').on('click', function(event) {
             $('#lesion-upload-popup').hide();
             $('#lesion-upload-popup-background-screen').hide()
        });
        
        $('#lesion-upload-button').on('click', function(event) {
            // dim the background
            const backgroundScreen = $('#lesion-upload-popup-background-screen');
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
                     
                     if (_this.labelmaps.lesion[0]) { // update lesion map
                         const settings = {
                                            code: lesionCode,
                                            colormap: _this.colormaps.lesionColormap(0, 1, 0.7)
                                        };
                         _this.labelmaps.lesion[0] = settings;
                         
                         const idx = _this.findVolumeLabelmapIndex(lesionCode);
                         _this.renderers.updateLabelmapFileNew('lesion', lesionCode, idx);
                     } else { // add the lesion map for the first time
                         const settings = {
                                            code: lesionCode,
                                            colormap: _this.colormaps.lesionColormap(0, 1, 0.7)
                                        };
                         _this.labelmaps.lesion[0] = settings;
                         
                         const idx = _this.findVolumeLabelmapIndex(lesionCode);
                         _this.renderers.addLabelmapToVolumeNew('lesion', lesionCode, idx, settings);
                     }
                     
                     _this.renderers.resetSlicesForDirtyFiles();
                     
                     $('#lesion-opacity-slider').slider('enable');
                     
                     $('#lesion-volume').html(data.volume.toFixed(2) + ' ml');
                     
                     setTimeout(function() {
                            $('#lesion-upload-close').trigger('click');
                     }, 4000);
                     
                 },
                 error: function(xhr) {
                     // invalid nifti etc...
                     $('#post-upload-message').css('color', 'rgba(204,0,0)');
                     $('#post-upload-message').html(xhr.responseText);
                 }
             });
        });
        
        $('#run-lesion-analysis-button').on('click', function(event) {
             
             // get current query from queryBuilder
             const currentQuery = _this.currentQuery;
             
             $.ajax({
                url: 'megatrack/lesion_analysis?' + $.param(currentQuery),
                method: 'GET',
                dataType: 'json',
                data: {lesionCode: lesionMapping.currentLesionCode},
                success: function(data) {
                    // receive list of objects containing tract code/name and volume of lesion within the tract
                    // loop through the tract codes
                        // add labelmaps to the volume for those codes and the current query
                        // add rows to tract-table displaying tract name, volume, icons etc
                },
                error: function(xhr) {
                    
                }
             });
        });
       
        
        return {lesionMapping: lesionMapping};
    };
    
    return LesionMapping;
    
})();