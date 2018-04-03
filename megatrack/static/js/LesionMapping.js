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
        
        //let currentLesionCode = null;
        
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
                                        +'<div id="'+lesionMapping.tractTableContainerId+'">'
//                                             +'<table id="tract-table">'
//                                             +'<tbody>'
//                                             +'</tbody>'
//                                             +'</table>'
                                        +'</div>'
                                        +'<div id="lesion-upload-popup"></div>'
                                        +'<div id="lesion-upload-popup-background-screen"></div>'
                                    +'</div>');
                                    
        //lesionMapping.colormaps = _parent.colormaps;
        const TractTable = mgtrk.TractTable;
        const tractTableRowComponents = [TractTable.RowTitle, TractTable.RowColormapSelect, TractTable.RowSettings, TractTable.RowDownload, TractTable.RowValue];
        const tractTable = TractTable.init(lesionMapping, tractTableRowComponents);
        lesionMapping.tractTable = tractTable;
                                    
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
          
        $('#lesion-upload-popup').hide();
        $('#lesion-upload-popup-background-screen').hide();
        
        $('#lesion-upload-close').on('click', function(event) {
             $('#lesion-upload-popup').hide();
             $('#lesion-upload-popup-background-screen').hide();
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
             const currentQuery = _parent.currentQuery;
             
             $.ajax({
                url: '/megatrack/lesion_analysis/' + lesionMapping.currentLesionCode + '/25?' + $.param(currentQuery),
                method: 'GET',
                dataType: 'json',
                //data: {lesionCode: lesionMapping.currentLesionCode},
                success: function(data) {
                    console.log(data);
                    
                    const dataLen = data.length;
                    for (let i=0; i<dataLen; i++) {
                        const tractCode = data[i].tractCode;
                        const color = Object.keys(_parent.colormaps.colormaps)[Math.floor(Math.random()*_parent.colormaps.numColormaps)];
                        const settings = {
                                            name: data[i].tractName,
                                            code: tractCode,
                                            overlapScore: data[i].overlapScore,
                                            color: color,
                                            colormap: _parent.colormaps.colormaps[color],
                                            colormapMax: _parent.colormaps.initColormapMax,
                                            colormapMin: _parent.colormaps.initColormapMin,
                                            opacity: _parent.colormaps.initColormapOpacity,
                                            colormapMinUpdate: 0
                                        };
                        _parent.labelmaps.tracts.push(settings);
                        const idx = _parent.findVolumeLabelmapIndex(tractCode);
                         _parent.renderers.addLabelmapToVolumeNew('tract', tractCode, idx, settings, currentQuery);
                         
                         tractTable.addRow(settings);
                         
//                          // add row to tract table
//                          $('#tract-table > tbody').append('<tr id="'+tractCode+'" class="tract-row">'
//                                 +'<td id="tract-name" class="tract-table-cell">'+tractCode+'</td>'
//                                 +'<td id="tract-colormap" class="tract-table-cell"><div id="'+tractCode+'-colormap-indicator" class="clickable colormap-indicator"><div class="colormap-indicator-caret"></div></div></td>'
//                                 +'<td id="tract-settings" class="tract-table-cell"><div class="tract-icon clickable settings-icon" title="Tract settings"></div></td>'
//                                 //+'<td id="tract-info" class="tract-table-cell"><div class="tract-icon clickable '+(showTractInfo ? 'metrics-icon-selected' : 'metrics-icon')+'" title="Tract metrics"></div></td>'
//                                 +'<td id="tract-atlas" class="tract-table-cell"><div class="tract-icon clickable atlas-icon" title="3D tract atlas"></div></td>'
//                                 +'<td id="tract-download" class="tract-table-cell"><div class="tract-icon clickable download-icon" title="Download density map"></td>'
//                                 //+'<td id="tract-remove" class="tract-table-cell"><div class="tract-icon clickable remove-icon" title="Remove tract"></div></td>'
//                                 +'</tr>'
//                                 +'<tr id="'+tractCode+'-spacer" class="tract-spacer-row"><td></td><td></td><td></td><td></td></tr>');
//                         
//                         $('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
//                         
//                         // add event listener on settings icon
//                         $('#'+tractCode+' > #tract-settings').on('click', function(event) {
//                             var tractCode = event.currentTarget.parentElement.id;
//                             if (!tractSelect.selectedTracts[tractCode].disabled) {
//                                 var settingsMenu = $('#tract-settings-menu');
//                                 settingsMenu.data('tractCode', tractCode);
//                                 $('#tract-settings-title').html('Settings:<br>'+tractSelect.availableTracts[tractCode].name);
//                                 var min = 100*tractSelect.tractSettings[tractCode]["colormapMin"];
//                                 var max = 100*tractSelect.tractSettings[tractCode]["colormapMax"];
//                                 var opacity = 100*tractSelect.tractSettings[tractCode]["opacity"];
//                                 $('#tract-prob-range-slider').slider('values', [min, max]);
//                                 $('#tract-prob-range-min-handle').text(Math.floor(min));
//                                 $('#tract-prob-range-max-handle').text(Math.floor(max));
//                                 $('#tract-opacity-slider').slider('value', opacity);
//                                 $('#tract-opacity-slider-handle').text(Math.floor(opacity));
//                                 
//                                 // position menu at settings button or mouse click?
//                                 var buttonOffset = $('#'+tractCode+' > #tract-settings').offset();
//                                 settingsMenu.show(); // show before setting offset as can't set offset of hidden elements
//                                 settingsMenu.offset({top: buttonOffset.top - settingsMenu.height(), left: buttonOffset.left - 30});
//                                 
//                                 tractSelect.tractSettingsVisible = true;
//                             }
//                         });
//                         
//                         $('#'+tractCode+'-colormap-indicator').on('click', {tractCode:tractCode}, function(event) {
//                             if (!tractSelect.selectedTracts[tractCode].disabled) {
//                                 // hide first in case colormap-select is already open for another tract
//                                 $('#colormap-select').hide();
//                                 
//                                 // work out position of colormap indicator for current tract
//                                 var indicatorPos = $('#'+event.data.tractCode+'-colormap-indicator').position();
//                                 $('#colormap-select').css('top', indicatorPos.top);
//                                 $('#colormap-select').css('left', indicatorPos.left - 6);
//                                 
//                                 // attach selected tract code to colormap select
//                                 $('#colormap-select').data('tractCode', event.data.tractCode);
//                                 // show colormap select
//                                 $('#colormap-select').show('blind');
//                             }
//                         });
                        
                    }
                    _parent.renderers.resetSlicesForDirtyFiles();
                },
                error: function(xhr) {
                    
                }
             });
        });
       
        
        return {lesionMapping: lesionMapping};
    };
    
    return LesionMapping;
    
})();