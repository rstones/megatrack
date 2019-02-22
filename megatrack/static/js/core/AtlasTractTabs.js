var mgtrk = mgtrk || {};

// extend a TractTabs object with a html
// template for the MegaTrack Atlas tab
// contents and relevant event handlers
// for that contents
mgtrk.AtlasTractTabs = (function() {
    const AtlasTractTabs = {};
    
    AtlasTractTabs.init = (_parent, initState, tabSelectHandler) => {
    
        var atlasTractTabs = {};
        atlasTractTabs.rootPath = _parent.rootPath;
    
        var infoPopup = mgtrk.TractInfoPopup.init(atlasTractTabs, `${_parent.tractTabsContainerId}`, 'tract-info-popup', 'info-popup');
        
        var metricsHelpContent = function(popupContentId) {
            $(`#${popupContentId}`).append(`<div id="metrics-help-popup-title"></div>
                                            <div id="metrics-help-popup-description"></div>`);
        };
        
        var metricsHelpPopup = mgtrk.Popup.init(_parent, `${_parent.tractTabsContainerId}`, 'metrics-help-popup', metricsHelpContent, 'info-popup');
        
        const contentTemplate = function(state, wrapperId, contentsId) {
            var template = `<div id="${wrapperId}" class="tract-contents">
                                <div class="tab-content-renderer-controls">
                                    <div class="tract-control-wrapper">
                                        <div class="tract-control-label">Probability range (%):</div>
                                        <div id="${state.code}-prob-range-slider" class="tract-slider">
                                            <div id="${state.code}-prob-range-min-handle" class="ui-slider-handle tract-slider-handle"></div>
                                            <div id="${state.code}-prob-range-max-handle" class="ui-slider-handle tract-slider-handle"></div>
                                        </div>
                                    </div>
                                    <div class="clear"></div>
                                    <div class="tract-control-wrapper">
                                        <div class="tract-control-label">Opacity (%):</div>
                                        <div id="${state.code}-opacity-slider" class="tract-slider">
                                            <div id="${state.code}-opacity-slider-handle" class="ui-slider-handle tract-slider-handle"></div>
                                        </div>
                                    </div>
                                    <div class="tract-control-wrapper">
                                        <div class="tract-control-label">Color:</div>
                                        <div id="${state.code}-color-select">
                                            <div id="${state.code}-colormap-indicator" class="clickable colormap-indicator"><div class="colormap-indicator-caret"></div></div>
                                        </div>
                                    </div>
                                    <div id="misc-controls">
                                        <div id="${state.code}-download-button" class="download-button button clickable">Download</div>
                                        <div id="${state.code}-info-button" class="info-button button clickable">Tract info</div>
                                    </div>
                                </div>
                                <div class="tab-content-tract-metrics">
                                    <div id="${state.code}-prob-metrics-wrapper" class="tab-content-metrics-section">
                                        <span class="metrics-label">Probability map<br>analysis</span><div class="prob-metrics-help metrics-help help-icon clickable"></div>
                                        <div id="${state.code}-prob-metrics"></div>
                                    </div>
                                    <div id="${state.code}-pop-metrics-wrapper" class="tab-content-metrics-section">
                                        <span class="metrics-label">Demographic<br>analysis</span><div class="pop-metrics-help metrics-help help-icon clickable"></div>
                                        <div id="${state.code}-pop-metrics"></div>
                                    </div>
                                </div>
                                <ul id="${state.code}-colormap-select" class="colormap-select"></ul>
                            </div>`;
                            
            $(`#${contentsId}`).append(template);
            
            // show init color in colormap select
            $(`#${state.code}-colormap-indicator`).addClass(`${state.color}-colormap`);
            
            // add sliders to appropriate divs with init settings
            var probRangeMinHandle = $(`#${state.code}-prob-range-min-handle`);
            var probRangeMaxHandle = $(`#${state.code}-prob-range-max-handle`);
            $(`#${state.code}-prob-range-slider`).slider({
                range: true,
                min: 0,
                max: 100,
                //step: 0.02,
                values: [state.colormapMin*100,100],
                create: function() {
                    probRangeMinHandle.text($(this).slider("values",0));
                    probRangeMaxHandle.text($(this).slider("values",1));
                },
                slide: function(event, ui) {
                    var tractCode = $('#tract-settings-menu').data('tractCode');
                    probRangeMinHandle.text(ui.values[0]);
                    probRangeMaxHandle.text(ui.values[1]);
                    var min = ui.values[0] / 100;
                    var max = ui.values[1] / 100;
                    var opacity = state.opacity;
                    var color = state.color;
                    state.colormapMin = min;
                    state.colormapMax = max;
                    // Fire 'colormap:change' event to trigger renderer update
                    $(document).trigger('colormap:change', [state]);
                    $(document).trigger('prob-metrics:update', [_parent.currentQuery, parseInt(min*100)]);
                }
            });
            
            var opacitySliderHandle = $(`#${state.code}-opacity-slider-handle`);
            $(`#${state.code}-opacity-slider`).slider({
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
                    var min = state.colormapMin;
                    var max = state.colormapMax;
                    var color = state.color;
                    state.opacity = opacity;
                    // Fire 'colormap-change' event to trigger renderer update
                    $(document).trigger('colormap:change', [state]);
                }
            });
            
            /*
            Fire 'populate-colormap-select' event here so the following loop can move to AtlasViewer factory function?
            */
            for (let key in _parent._parent.colormaps.colormaps) {
                $(`#${state.code}-colormap-select`).append(`<div id="${state.code}-${key}-colormap-select-item" class="colormap-select-item clickable ${key}-colormap">&nbsp&nbsp&nbsp</div>`);
                $(`#${state.code}-${key}-colormap-select-item`).on('click', {color: key}, function(event) {
                    // fetch selected tract code from colormap select
                    const tractCode = state.code;
                    const colormapMax = state.colormapMax;
                    const colormapMin = state.colormapMin;
                    const opacity = state.opacity;
                    const color = event.data.color;
                    
                    // fire colormap:change event to trigger renderer update
                    const oldColor = state.color;
                    if (oldColor != color) {
                        state.color = color;
                        $(document).trigger('colormap:change', [state]);
                        $(`#${tractCode}-colormap-indicator`).removeClass(oldColor+'-colormap');
                        $(`#${tractCode}-colormap-indicator`).addClass(color+'-colormap');
                        
                        $(`#${tractCode}-tab-header > .tab-header-color-swatch`).removeClass(oldColor+'-colormap');
                        $(`#${tractCode}-tab-header > .tab-header-color-swatch`).addClass(color+'-colormap');
                    }
                });
            }
            $(`#${state.code}-colormap-select`).hide();
            
            $(`#${state.code}-colormap-indicator`).on('click', {tractCode: state.code}, function(event) {
                if ($(this).attr('disabled')) {
                    return;
                }
                const tractCode = event.data.tractCode;
                // work out position of colormap indicator for current tract
                const indicatorPos = $(`#${tractCode}-colormap-indicator`).position();
                const indicatorOffset = $(`#${tractCode}-colormap-indicator`).offset();
                const colormapSelect = $(`#${tractCode}-colormap-select`);
                
                if ((indicatorOffset.top - $(window).scrollTop()) + colormapSelect.height() + 20 > $(window).height()) {
                    colormapSelect.css('top', indicatorPos.top - colormapSelect.height());
                } else{
                    colormapSelect.css('top', indicatorPos.top);
                }
                colormapSelect.css('left', indicatorPos.left - 6);
                
                // show colormap select
                colormapSelect.show('blind');
                //$(`#${tractCode}-colormap-select`).css('display', 'block');
            });
            
            $(document).on('click', function(event) {
                if (event.target.id.indexOf(`#${state.code}-colormap-indicator`) == -1 
                        && event.target.parentElement.id.indexOf(`#${state.code}-colormap-indicator`) == -1) {
                    $(`#${state.code}-colormap-select`).hide();
                }
            });
            $(window).resize(function() {
                $(`#${state.code}-colormap-select`).hide();
            });
            
            $(`#${state.code}-download-button`).on('click', function(event) {
                if ($(this).attr('disabled')) {
                    return;
                }
                event.preventDefault();
                window.location.href = `tract/${state.code}?${$.param(_parent._parent.currentQuery)}&file_type=.nii.gz`;
            });
            
            $(`#${state.code}-info-button`).on('click', function(event) {
                if ($(this).attr('disabled')) {
                    return;
                }
                event.preventDefault();
                infoPopup.open(state);
            });
            
            $(`.prob-metrics-help`).on('click', function(event) {
                if ($(this).attr('disabled')) {
                    return;
                }
                const updatePopupContent = function() {
                    $('#metrics-help-popup-title').html('Probability map analysis');
                    $('#metrics-help-popup-description').html(`Results for the tract volume (vol), mean diffusivity (MD) and fractional
                                                                anisotropy (FA) are obtained from the tract probability map displayed in
                                                                the viewer. The probability map is an average of the binarised tract
                                                                density maps for each subject returned in the currently selected query.
                                                                <br><br>
                                                                Before calculating the results a threshold is applied to the probability
                                                                map to exclude voxels below the lower limit of the selected probability
                                                                range.
                                                                <br><br>
                                                                The tract volume is calculated by multiplying the number of voxels with
                                                                probability exceeding the threshold by the volume of each voxel
                                                                (2mm x 2mm x 2mm = 8mm<sup>3</sup>).
                                                                <br><br>
                                                                The tract MD and FA are weighted averages of the MD / FA values (from
                                                                averaged MD and FA maps of all subjects in the current query)
                                                                of each voxel with probability above the threshold. The weights are the
                                                                probabilities at each voxel.
                                                                `);
                };
                metricsHelpPopup.open(updatePopupContent);
            });
            
            $(`.pop-metrics-help`).on('click', function(event) {
                if ($(this).attr('disabled')) {
                    return;
                }
                const updatePopupContent = function() {
                    $('#metrics-help-popup-title').html('Demographic analysis');
                    $('#metrics-help-popup-description').html(`Results for the tract volume (vol), mean diffusivity (MD) and fractional 
                                                                anisotropy (FA) are obtained for individual subjects before being averaged
                                                                over the queried demographic.
                                                                <br><br>
                                                                The tract volume is calculated by multiplying the number of non-zero voxels
                                                                in a subjects density map by the volume of each voxel
                                                                (2mm x 2mm x 2mm = 8mm<sup>3</sup>).
                                                                <br><br>
                                                                The tract MD and FA are weighted averages of the MD / FA values of each voxel
                                                                occupied by the tract. The weights are the streamline densities at each voxel.`);
                };
                metricsHelpPopup.open(updatePopupContent);
            });
            
            var updateProbMetrics = function(query, threshold) {
                $.ajax({
                    url: `${_parent.rootPath}/get_tract_info/${state.code}/${threshold}?${$.param(query)}`,
                    dataType: 'json',
                    success: function(data) {
                        if (data) {
                            $(`#${state.code}-prob-metrics`).html(`<div class="tract-metrics-row">
                                                                        <div class="tract-metrics-row-label">Vol:</div> ${data.volume.toFixed(1)}ml
                                                                    </div>
                                                                    <div class="tract-metrics-row">
                                                                        <div class="tract-metrics-row-label">MD:</div> ${data.meanMD.toFixed(3)} (${data.stdMD.toFixed(3)})
                                                                    </div>
                                                                    <div class="tract-metrics-row">
                                                                        <div class="tract-metrics-row-label">FA:</div> ${data.meanFA.toFixed(3)} (${data.stdFA.toFixed(3)})
                                                                    </div>`);   
                        }
                    }
                });
            };
            
            $(`#${state.code}-prob-metrics`).html('<div class="tract-metrics-loading-gif"></div>');
            const initThreshold = parseInt(_parent._parent.colormaps.initColormapMin * 100);
            updateProbMetrics(_parent.currentQuery, initThreshold);
            
            var probMetricsUpdateTimeout = null;
            $(document).on('prob-metrics:update', function(event, query, threshold) {
                $(`#${state.code}-prob-metrics`).html('<div class="tract-metrics-loading-gif"></div>');
                clearTimeout(probMetricsUpdateTimeout);
                probMetricsUpdateTimeout = setTimeout(function() {
                    updateProbMetrics(query, threshold || $(`#${state.code}-prob-range-slider`).slider('values', 0));
                }, 1000);
            });
            
            var updatePopMetrics = function(query) {
                $.ajax({
                    url: `${_parent.rootPath}/get_tract_info/${state.code}?${$.param(query)}`,
                    dataType: 'json',
                    success: function(data) {
                        if (data) {
                            $(`#${state.code}-pop-metrics`).html(`<div class="tract-metrics-row">
                                                                        <div class="tract-metrics-row-label">Vol:</div> ${data.volume.toFixed(1)}ml
                                                                    </div>
                                                                    <div class="tract-metrics-row">
                                                                        <div class="tract-metrics-row-label">MD:</div> ${data.meanMD.toFixed(3)} (${data.stdMD.toFixed(3)})
                                                                    </div>
                                                                    <div class="tract-metrics-row">
                                                                        <div class="tract-metrics-row-label">FA:</div> ${data.meanFA.toFixed(3)} (${data.stdFA.toFixed(3)})
                                                                    </div>`);   
                        }
                    }
                });
            };
            
            $(`#${state.code}-pop-metrics`).html('<div class="tract-metrics-loading-gif"></div>');
            updatePopMetrics(_parent.currentQuery);
            
            $(document).on('pop-metrics:update', function(event, query) {
                 $(`#${state.code}-pop-metrics`).html('<div class="tract-metrics-loading-gif"></div>');
                 updatePopMetrics(query);
            });
        };
        
        atlasTractTabs = Object.assign(atlasTractTabs, mgtrk.TractTabs.init(_parent, contentTemplate, initState, true));
        
        atlasTractTabs.addTab = (state) => {
            atlasTractTabs._addTab(state.code, atlasTractTabs.templates.header, atlasTractTabs.templates.content, state);
        };
        
        atlasTractTabs.disable = () => {
            // loop through each tab
            // disable various elements on each tab
            // loop through headers, make them all grey and unclickable
            const tabIds = Object.keys(atlasTractTabs.cache);
            for (let i=0; i<tabIds.length; i++) {
                const code = tabIds[i];
                // prob range slider
                $(`#${code}-prob-range-slider`).slider('disable');
                // opacity slider
                $(`#${code}-opacity-slider`).slider('disable');
                // colour select (turn colour grey)
                const $colormapIndicator = $(`#${code}-colormap-indicator`);
                $colormapIndicator.removeClass('colormap-indicator');
                $colormapIndicator.addClass('colormap-indicator-disabled');
                $colormapIndicator.removeClass('clickable');
                $colormapIndicator.removeClass(`${atlasTractTabs.cache[code].color}-colormap`);
                $colormapIndicator.attr('disabled', true);
                
                // download and info button
                const $download = $(`#${code}-download-button`);
                $download.removeClass('button');
                $download.addClass('button-disabled');
                $download.removeClass('clickable');
                $download.attr('disabled', true);
                
                const $info = $(`#${code}-info-button`);
                $info.removeClass('button');
                $info.addClass('button-disabled');
                $info.removeClass('clickable');
                $info.attr('disabled', true);
                
                // metrics + metrics info popups
                $(`#${code}-prob-metrics`).html('');
                $(`#${code}-pop-metrics`).html('');
                
                const $probHelp = $(`#${code}-prob-metrics-wrapper > .prob-metrics-help`);
                $probHelp.removeClass('clickable');
                $probHelp.attr('disabled', true);
                
                const $popHelp = $(`#${code}-pop-metrics-wrapper > .pop-metrics-help`);
                $popHelp.removeClass('clickable');
                $popHelp.attr('disabled', true);
                
                // header (unclickable, turn background grey, turn colour swatch grey)
                const $tabHeader = $(`#${code}-tab-header`);
                $tabHeader.removeClass('clickable');
                $tabHeader.removeClass('tab-header');
                $tabHeader.addClass('tab-header-disabled');
                $tabHeader.attr('disabled', true);
                const $colorSwatch = $(`#${code}-tab-header > .tab-header-color-swatch`);
                $colorSwatch.removeClass(`${atlasTractTabs.cache[code].color}-colormap`);
                $colorSwatch.addClass('tab-header-color-swatch-disabled');
                const $tabRemove = $(`#${code}-tab-remove`);
                $tabRemove.attr('disabled', true);
                $tabRemove.removeClass('clickable');
            }
            
        };
        
        atlasTractTabs.enable = () => {
            // reverse disable
            const tabIds = Object.keys(atlasTractTabs.cache);
            for (let i=0; i<tabIds.length; i++) {
                const code = tabIds[i];
                // prob range slider
                $(`#${code}-prob-range-slider`).slider('enable');
                // opacity slider
                $(`#${code}-opacity-slider`).slider('enable');
                // colour select (turn colour grey)
                const $colormapIndicator = $(`#${code}-colormap-indicator`);
                $colormapIndicator.addClass('colormap-indicator');
                $colormapIndicator.removeClass('colormap-indicator-disabled');
                $colormapIndicator.addClass('clickable');
                $colormapIndicator.addClass(`${atlasTractTabs.cache[code].color}-colormap`);
                $colormapIndicator.attr('disabled', false);
                
                // download and info button
                const $download = $(`#${code}-download-button`);
                $download.removeClass('button-disabled');
                $download.addClass('button');
                $download.addClass('clickable');
                $download.attr('disabled', false);
                
                const $info = $(`#${code}-info-button`);
                $info.removeClass('button-disabled');
                $info.addClass('button');
                $info.addClass('clickable');
                $info.attr('disabled', false);
                
                // metrics + metrics info popups
                const $probHelp = $(`#${code}-prob-metrics-wrapper > .prob-metrics-help`);
                $probHelp.addClass('clickable');
                $probHelp.attr('disabled', false);
                
                const $popHelp = $(`#${code}-pop-metrics-wrapper > .pop-metrics-help`);
                $popHelp.addClass('clickable');
                $popHelp.attr('disabled', false);
                
                // header (unclickable, turn background grey, turn colour swatch grey)
                const $tabHeader = $(`#${code}-tab-header`);
                $tabHeader.addClass('clickable');
                $tabHeader.removeClass('tab-header-disabled');
                $tabHeader.addClass('tab-header');
                $tabHeader.attr('disabled', false);
                const $colorSwatch = $(`#${code}-tab-header > .tab-header-color-swatch`);
                $colorSwatch.addClass(`${atlasTractTabs.cache[code].color}-colormap`);
                $colorSwatch.removeClass('tab-header-color-swatch-disabled');
                const $tabRemove = $(`#${code}-tab-remove`);
                $tabRemove.attr('disabled', false);
                $tabRemove.addClass('clickable');
            }
        };
        
        return atlasTractTabs;
    };
    
    return AtlasTractTabs;
})();