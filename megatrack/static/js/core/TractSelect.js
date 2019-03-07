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
        
        tractSelect.tabsContainerId = 'tabs-container';
        
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
                                            <span id="zero-query-msg-text">Zero subjects in current query - change query to select tracts</span>
                                        </div>
                                        <div class="clear"></div>
                                        <hr>
                                        <div id="${tractSelect.tabsContainerId}"></div>
                                    </div>`);
                                    
        $('#zero-query-msg-text').hide();
        
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
          
        const tabs = mgtrk.AtlasTabs.init(tractSelect, {'cortical': {tabType: 'cortical', name: 'Cortical Maps'}});
        //$(`#${tractSelect.tabsContainerId}`).hide();
        
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
            _parent.renderers.addLabelmapToVolumeNew('tract', tractCode, null, settings, _parent.currentQuery);
            _parent.renderers.resetSlicesForDirtyFiles();
            
            if ($(`#${tractSelect.tabsContainerId}`).is(':hidden')) {
                $(`#${tractSelect.tabsContainerId}`).show();
            }
            tabs.addTab(settings.code, 'tract', settings);
            tabs.selectTab(settings.code);           
        });
        
        $(document).on('dataset:change', function(event, datasetCode) {
            /*
             * Loop through tract select and disable tracts not available for new dataset
             * Remove tracts from renderers
             * Remove tabs from AtlasTractTabs
             * Disable tract select
             */
            _parent.renderers.removeAllTracts();
            
            tractSelect.selectedTracts = {};
            
            tabs.removeTabType('tract');
            
            $('#add-tract-select option[value!=default]').each(function(idx) {
                var tractCode = $(this).val();
                $(this).prop('disabled', Object.keys(tractSelect.availableTracts[tractCode].datasets).indexOf(datasetCode) < 0);
            });
            
            $('#add-tract-select').prop('disabled', true);
            $('#tract-disabled-msg-text').show();
            //$(`#${tractSelect.tabsContainerId}`).hide();
        });
        
        $(document).on('query:zero', function(event) {
            // set labelmap opacity to zero
            const tabsCacheKeys = Object.keys(tabs.cache);
            for (let i=0; i<tabsCacheKeys.length; i++) {
                const state = tabs.cache[tabsCacheKeys[i]];
                state.opacity = 0;
                $(document).trigger('colormap:change', [state]);
            }
            
            // disable tract tabs
            tabs.disable();
            
            // disable tract select
            $('#add-tract-select').prop('disabled', true);
            
            // show alert message next to tract select
            $('#tract-disabled-msg-text').hide();
            $('#zero-query-msg-text').show();
        });
        
        $(document).on('query:nonzero', function(event) {
            // check if stuff is disabled first
        
             // set labelmap opacity to 100%
            const tabsCacheKeys = Object.keys(tabs.cache);
            for (let i=0; i<tabsCacheKeys.length; i++) {
                const state = tabs.cache[tabsCacheKeys[i]];
                state.opacity = 1;
                $(document).trigger('colormap:change', [state]);
            }
            
            // enable tract tabs
            tabs.enable();
            
        });
        
        $(document).on('query:update', function(event, newQuery) {
        
           _parent.currentQuery = tractSelect.currentQuery = newQuery;
            
            // remove the disabled tract select message
            if ($('#add-tract-select').prop('disabled')) {
                $('#add-tract-select').prop('disabled', false);
                $('#tract-disabled-msg-container').children().hide();
            }
            
            // we are restricting the user to selecting only a single
            // dataset currently so the logic below will change once
            // multiple datasets can be selected at the same time
            var datasets = Object.keys(newQuery);
            if (datasets.length > 1) {
                console.warn('Multiple datasets selected! This shouldnt be possible.')
            }
            var dataset = datasets[0];
            var method = newQuery[dataset].method;
                    
            const tracts = tractSelect.availableTracts;        
            for (let i=0; i<Object.keys(tracts).length; i++) {
                const tractCode = Object.keys(tracts)[i];
                // check if dataset and method are available for this tract
                if (Object.keys(tracts[tractCode].datasets).indexOf(dataset) === -1 ||
                        tracts[tractCode].datasets[dataset].indexOf(method) === -1) {
                    // if the tract is selected remove from viewer and tabs
                    if (Object.keys(tractSelect.selectedTracts).indexOf(tractCode) >= 0) {
                        tabs.removeTab(tractCode);
                        _parent.renderers.removeLabelmapFromVolume(tractCode);
                        delete tractSelect.selectedTracts[tractCode];
                    }
                    // disable in tract select
                    $(`#add-tract-select option[value=${tractCode}]`).prop('disabled', true);
                } else if (Object.keys(tractSelect.selectedTracts).indexOf(tractCode) >= 0) {
                    // fire event to disable the views while tracts are updated
                    $(document).trigger('view:disable');
                    // update tracts
                    var idx = _parent.renderers.findVolumeLabelmapIndex(tractCode);
                    _parent.renderers.updateLabelmapFileNew('tract', tractCode, idx, newQuery);
                } else {
                    // enable in tract select if not selected but available
                    $(`#add-tract-select option[value=${tractCode}]`).prop('disabled', false);
                }
            }
            if (Object.keys(tractSelect.selectedTracts).length) {
                _parent.renderers.resetSlicesForDirtyFiles();
                // trigger update of metrics
                $(document).trigger('pop-metrics:update', [newQuery]);
                $(document).trigger('prob-metrics:update', [newQuery]);
            }
                   
//             if (Object.keys(tractSelect.selectedTracts).length) {
//                 // fire event to disable the views while tracts are updated
//                 $(document).trigger('view:disable');
//                 // update tracts
//                 for (var tractCode in tractSelect.selectedTracts) {
//                     var idx = _parent.renderers.findVolumeLabelmapIndex(tractCode);
//                     _parent.renderers.updateLabelmapFileNew('tract', tractCode, idx, newQuery);
//                 }
//                 _parent.renderers.resetSlicesForDirtyFiles();
//                 // trigger update of metrics
//                 $(document).trigger('pop-metrics:update', [newQuery]);
//                 $(document).trigger('prob-metrics:update', [newQuery]);
//             }

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



