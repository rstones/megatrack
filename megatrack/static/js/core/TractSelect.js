var mgtrk = mgtrk || {};

mgtrk.TractSelect = (function() {

    const TractSelect = {};

    /**
     * Initialise a TractSelect object to choose and display tract info.
     *
     * @param {Object} _parent      The parent object.
     */
    TractSelect.init = (_parent) => {
    
        const tractSelect = {};
    
        const containerId = _parent.tractSelectId;
        
        tractSelect._parent = _parent;
        tractSelect.rootPath = _parent.rootPath;
        
        tractSelect.tractTabsContainerId = 'tract-tabs-container';
        
        tractSelect.availableTracts = {};
        tractSelect.selectedTracts = {};
        
        const probabilisticMetricsDescription = 'Metrics for the averaged density map as displayed in the viewer';
        const populationMetricsDescription = 'Averaged metrics of the individual subjects';
        
        $('#'+containerId).append(`<div id="tract-select-wrapper">
                                        <div class="tract-select-container">
                                            <select id="add-tract-select" disabled><option value="default" disabled selected>Add tract...</option></select>
                                        </div>
                                        <div id="tract-disabled-msg-container">
                                            <span id="tract-disabled-msg-text">Query a dataset before selecting a tract</span>
                                        </div>
                                        <div class="clear"></div>
                                        <hr>
                                        <div id="${tractSelect.tractTabsContainerId}"></div>
                                    </div>`);
        
        $.ajax({
            dataType: 'json',
            url: _parent.rootPath + '/tract_select',
            success: function(data) {
                for (let tractCode in data) {
                    $('#add-tract-select').append(`<option id="${tractCode}" value="${tractCode}">${data[tractCode].name}</option>`);
                    data[tractCode].disabled = false;
                    tractSelect.availableTracts[tractCode] = data[tractCode];
                }
            }
        });
          
        const tractTabs = mgtrk.AtlasTractTabs.init(tractSelect, {});
        
        $(document).on('tabs:remove', function(event, tractCode) {
             $('#add-tract-select option[value='+tractCode+']').prop('disabled', false);
             delete tractSelect.selectedTracts[tractCode];
             _parent.renderers.removeLabelmapFromVolumeNew(_parent.renderers.findVolumeLabelmapIndex(tractCode));
        });
        
        $('#add-tract-select').change(function(event) {
            var tractCode = event.currentTarget.value;
            $('#add-tract-select option[value='+tractCode+']').prop('disabled', true);
            $('#add-tract-select option[value=default]').prop('selected', true);
            
            tractSelect.selectedTracts[tractCode] = tractSelect.availableTracts[tractCode];
            
            /*
            Fire 'add-tract' event here so the following code can move to AtlasViewer factory function
            */
            // add the tract to the viewer
            const color = Object.keys(_parent.colormaps.colormaps)[Math.floor(Math.random()*_parent.colormaps.numColormaps)];
            const settings = {
                                name: tractSelect.availableTracts[tractCode].name,
                                code: tractCode,
                                color: color,
                                colormap: _parent.colormaps.colormaps[color],
                                colormapMax: _parent.colormaps.initColormapMax,
                                colormapMin: _parent.colormaps.initColormapMin,
                                opacity: _parent.colormaps.initColormapOpacity,
                                colormapMinUpdate: 0,
                                currentQuery: _parent.currentQuery,
                                description: tractSelect.availableTracts[tractCode].description
                            };
            _parent.renderers.addLabelmapToVolumeNew('tract', tractCode, 0, settings, _parent.currentQuery);
            _parent.renderers.resetSlicesForDirtyFiles();

            tractTabs.addTab(settings);
            tractTabs.selectTab(settings.code);           
        });
        
        $(document).on('dataset:change', function(event, datasetCode) {
            /*
             * Loop through tract select and disable tracts not available for new dataset
             * Remove tracts from renderers
             * Remove tabs from AtlasTractTabs
             * Disable tract select
             */
            for (let i=0; _parent.renderers.volume.labelmap.length; i++) {
                _parent.renderers.removeLabelmapFromVolumeNew(i);
            }
            
            tractSelect.selectedTracts = {};
            
            tractTabs.removeAll();
            
            $('#add-tract-select option[value!=default]').each(function(idx) {
                var tractCode = $(this).val();
                var disable = false;
                $(this).prop('disabled', Object.keys(tractSelect.availableTracts[tractCode].datasets).indexOf(datasetCode) < 0);
            });
            
            $('#add-tract-select').prop('disabled', true);
            $('#tract-disabled-msg-text').show();
        });
        
        $(document).on('query:update', function(event, newQuery) {
        
           _parent.currentQuery = tractSelect.currentQuery = newQuery;
            
            // remove the disabled tract select message
            if ($('#add-tract-select').prop('disabled')) {
                $('#add-tract-select').prop('disabled', false);
                $('#tract-disabled-msg-text').hide();
            }
            
            var datasets = Object.keys(newQuery.constraints);
            var method = newQuery.method;
                    
            // for all availableTracts
                // if not available for this dataset+method
                    // disable in tract select menu
                    // if currently in selected tracts
                        // remove from TractTabs
                        // remove from viewer
                        // remove from selectedTracts
                // else if in selectedTracts
                    // update in viewer
                    // trigger metrics update
                        
            if (Object.keys(tractSelect.selectedTracts).length) {
                // fire event to disable the views while tracts are updated
                $(document).trigger('view:disable');
                // update tracts
                for (var tractCode in tractSelect.selectedTracts) {
                    var idx = _parent.renderers.findVolumeLabelmapIndex(tractCode);
                    _parent.renderers.updateLabelmapFileNew('tract', tractCode, idx, newQuery);
                }
                _parent.renderers.resetSlicesForDirtyFiles();
                // trigger update of metrics
                $(document).trigger('pop-metrics:update', [newQuery]);
                $(document).trigger('prob-metrics:update', [newQuery]);
            }

//             for (var tractCode in tractSelect.selectedTracts) {
//                 // check to see if we want to disable the tract
//                 var disable = false;
//                 for (var i=0; i<datasets.length; i++) {
//                     if (tractSelect.availableTracts[tractCode]['datasets'].indexOf(datasets[i]) < 0) {
//                         disable = true;
//                         break;
//                     }
//                 }
//                 
//                 if (disable) {
//                     /*
//                     Fire 'remove-tract' event here so the following code can move to AtlasViewer factory function
//                     */
//                     _parent.renderers.removeLabelmapFromVolume(tractCode);
//                     // disable tract row
//                     $('#'+tractCode+' > #tract-name').addClass('tract-disabled');
//                     $('#'+tractCode+' > #tract-settings').children().removeClass('settings-icon clickable');
//                     $('#'+tractCode+' > #tract-settings').children().addClass('settings-icon-disabled');
//                     $('#'+tractCode+' > #tract-info').children().removeClass('metrics-icon clickable');
//                     $('#'+tractCode+' > #tract-info').children().addClass('metrics-icon-disabled');
//                     $('#'+tractCode+' > #tract-atlas').children().removeClass('atlas-icon clickable');
//                     $('#'+tractCode+' > #tract-atlas').children().addClass('atlas-icon-disabled');
//                     $('#'+tractCode+' > #tract-download').children().removeClass('download-icon clickable');
//                     $('#'+tractCode+' > #tract-download').children().addClass('download-icon-disabled');
//                     var color = tractSelect.tractSettings[tractCode]["color"];
//                     $('#'+tractCode+'-colormap-indicator').removeClass(color+'-colormap');
//                     $('#'+tractCode+'-colormap-indicator').removeClass('colormap-indicator');
//                     $('#'+tractCode+'-colormap-indicator').removeClass('clickable');
//                     $('#'+tractCode+'-colormap-indicator').addClass('colormap-indicator-disabled');
//                     $('#'+tractCode+'-colormap-indicator').children().removeClass('colormap-indicator-caret');
//                     $('#'+tractCode+'-colormap-indicator').children().addClass('colormap-indicator-caret-disabled');
//                 } else {
//                     if (tractSelect.availableTracts[tractCode].disabled) { // if previously disabled, add new labelmap
//                         tractSelect.tractSettings[tractCode] = _parent.renderers.addLabelmapToVolume(tractCode, newQuery);
//                         
//                         // reenable the tract row
//                         $('#'+tractCode+' > #tract-name').removeClass('tract-disabled');
//                         $('#'+tractCode+' > #tract-settings').children().removeClass('settings-icon-disabled');
//                         $('#'+tractCode+' > #tract-settings').children().addClass('settings-icon clickable');
//                         $('#'+tractCode+' > #tract-info').children().removeClass('metrics-icon-disabled');
//                         $('#'+tractCode+' > #tract-info').children().addClass('metrics-icon clickable');
//                         $('#'+tractCode+' > #tract-atlas').children().removeClass('atlas-icon-disabled');
//                         $('#'+tractCode+' > #tract-atlas').children().addClass('atlas-icon clickable');
//                         $('#'+tractCode+' > #tract-download').children().removeClass('download-icon-disabled');
//                         $('#'+tractCode+' > #tract-download').children().addClass('download-icon clickable');
//                         $('#'+tractCode+' > #tract-colormap').children().removeClass('colormap-indicator-disabled');
//                         var color = tractSelect.tractSettings[tractCode]["color"];
//                         $('#'+tractCode+'-colormap-indicator').addClass(color+'-colormap');
//                         $('#'+tractCode+'-colormap-indicator').addClass('colormap-indicator');
//                         $('#'+tractCode+'-colormap-indicator').addClass('clickable');
//                         $('#'+tractCode+'-colormap-indicator').children().removeClass('colormap-indicator-caret-disabled');
//                         $('#'+tractCode+'-colormap-indicator').children().addClass('colormap-indicator-caret');
//                         
//                     } else { // if previously active, update labelmap
//                         /*
//                         Fire 'add-tract' event here so the following code can move to AtlasViewer factory function
//                         */
//                         _parent.renderers.updateLabelmapFile(tractCode, newQuery);
//                     }
//                     
//                     // update metrics
//                     var threshold = parseInt(100*tractSelect.tractSettings[tractSelect.currentInfoTractCode]["colormapMin"]);
//                     if (tractCode == tractSelect.currentInfoTractCode) {
//                         $('#prob-atlas-metrics').html('<div class="tract-metrics-loading-gif"></div>');
//                         $('#pop-metrics').html('<div class="tract-metrics-loading-gif"></div>');
//                     }
//                     
//                     $.ajax({
//                         dataType: 'json',
//                         url: _parent.rootPath + '/get_tract_info/'+tractCode+'/'+threshold+'?'+$.param(newQuery),
//                         success: function(data) {
//                             tractSelect.tractMetrics[data.tractCode]['dynamic'] = data;
//                             if (data.tractCode == tractSelect.currentInfoTractCode) {
//                                 populateDynamicTractInfo(data);
//                             }
//                         }
//                     });
//                     $.ajax({
//                         dataType: 'json',
//                         url: _parent.rootPath + '/get_tract_info/'+tractCode+'?'+$.param(newQuery),
//                         success: function(data) {
//                             tractSelect.tractMetrics[data.tractCode]['static'] = data;
//                             if (data.tractCode == tractSelect.currentInfoTractCode) {
//                                 populateStaticTractInfo(data);
//                             }
//                         }
//                     });
//                     
//                 }
//                 tractSelect.availableTracts[tractCode].disabled = disable;
//             }
//             /*
//             Fire an event here so the following code can move to AtlasViewer factory function
//             */
//             if (Object.keys(tractSelect.selectedTracts).length) {
//                 _parent.renderers.resetSlicesForDirtyFiles();
//             }
            
            // also loop through all the options in the tract select and disable the the required tracts 
//             $('#add-tract-select option[value!=default]').each(function(idx) {
//                 var tractCode = $(this).val();
//                 if (!tractSelect.selectedTracts[tractCode]) {
//                     var disable = false;
//                     for (var i=0; i<datasets.length; i++) {
//                     if (tractSelect.availableTracts[tractCode]['datasets'].indexOf(datasets[i]) < 0) {
//                         disable = true;
//                         break;
//                     }
//                 }
//                 $(this).prop('disabled', disable);
//                 }
//             });
        });
        
        return {tractSelect: tractSelect};
    };
    
    return TractSelect;
})();



