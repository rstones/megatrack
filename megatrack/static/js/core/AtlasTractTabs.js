var mgtrk = mgtrk || {};

// extend a TractTabs object with a html
// template for the MegaTrack Atlas tab
// contents and relevant event handlers
// for that contents
mgtrk.AtlasTractTabs = (function() {
    const AtlasTractTabs = {};
    
    AtlasTractTabs.init = (_parent, initState, tabSelectHandler) => {
    
        // insert a popup to show tract info
        var infoPopupContent = function(popupContentId) {
            $(`#${popupContentId}`).append(`<div id="tract-info-popup-title"></div>
                                            <div id="tract-info-popup-trk-display">
                                                <div id="tract-info-popup-renderer"></div>
                                                <div id="tract-info-popup-trk-instructions">
                                                    Drag or scroll to control display
                                                </div>
                                            </div>
                                            <div id="tract-info-popup-description"></div>
                                            <div id="tract-info-popup-citations"></div>`);
        };
        
        var infoPopup = mgtrk.Popup.init({}, `${_parent.tractTabsContainerId}`, 'tract-info-popup', infoPopupContent, 'info-popup');
        
        var metricsHelpContent = function(popupContentId) {
            $(`#${popupContentId}`).append(`<div id="metrics-help-popup-title"></div>
                                            <div id="metrics-help-popup-description"></div>`);
        };
        
        var metricsHelpPopup = mgtrk.Popup.init({}, `${_parent.tractTabsContainerId}`, 'metrics-help-popup', metricsHelpContent, 'info-popup');
        
        // setup trk renderer within the popup
        var atlasTractTabs = {};
        atlasTractTabs.tractInfoRenderer = new X.renderer3D();
        atlasTractTabs.tractInfoRenderer.container = 'tract-info-popup-renderer';
        atlasTractTabs.tractInfoRenderer.config.PICKING_ENABLED = false;
        atlasTractTabs.tractInfoRenderer.init();
        var viewMatrix = atlasTractTabs.tractInfoRenderer.camera.view;
        viewMatrix[14] = -200; 
        
        atlasTractTabs.trk = new X.fibers();
        
        atlasTractTabs.mesh = new X.mesh();
        atlasTractTabs.mesh = new X.mesh();
        atlasTractTabs.mesh.file = `${_parent.rootPath}/get_cortex?.stl`;
        atlasTractTabs.mesh.magicmode = false;
        atlasTractTabs.mesh.color = [0.3, 0.3, 0.3];
        atlasTractTabs.mesh.opacity = 0.4;
        
        atlasTractTabs.tractInfoRenderer.add(atlasTractTabs.mesh);
        
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
                                        <span class="metrics-label">Probabalistic metrics:</span><div class="prob-metrics-help metrics-help help-icon clickable"></div>
                                        <div id="${state.code}-prob-metrics"></div>
                                    </div>
                                    <div id="${state.code}-pop-metrics-wrapper" class="tab-content-metrics-section">
                                        <span class="metrics-label">Population metrics:</span><div class="pop-metrics-help metrics-help help-icon clickable"></div>
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
                event.preventDefault();
                window.location.href = `tract/${state.code}?${$.param(_parent._parent.currentQuery)}&file_type=.nii.gz`;
            });
            
            $(`#${state.code}-info-button`).on('click', function(event) {
                event.preventDefault();
                
                const updatePopupContent = function() {
                    if (state.name) {
                        $('#tract-info-popup-title').html(state.name);
                        $('#tract-info-popup-description').html(state.description);
                        $('#tract-info-popup-citations').html(state.citations);
                        
                        var renderer = atlasTractTabs.tractInfoRenderer;
                        renderer.remove(atlasTractTabs.trk);
                        renderer.resize(); // call the resize function to ensure the canvas gets the dimensions of the visible container
                        
                        atlasTractTabs.trk = new X.fibers();
                        atlasTractTabs.trk.file = `${_parent.rootPath}/get_trk/${state.code}?.trk`;
                        atlasTractTabs.trk.opacity = 1.0;
                        
                        renderer.add(atlasTractTabs.trk);
                        renderer.render();
                        
                        atlasTractTabs.cameraMotion = setInterval(function() {
                            renderer.camera.rotate([3,0]);
                        }, 50);
                    }
                };
                
                const cleanUpRenderer = function() {
                    clearInterval(atlasTractTabs.cameraMotion);
                    var renderer = atlasTractTabs.tractInfoRenderer;
                    renderer.pauseRendering();
                };
                
                infoPopup.open(updatePopupContent, cleanUpRenderer);
            });
            
            $(`.prob-metrics-help`).on('click', function(event) {
                const updatePopupContent = function() {
                    $('#metrics-help-popup-title').html('Probabilistic metrics');
                    $('#metrics-help-popup-description').html(`The volume (vol), mean diffusivity (MD) and fractional anisotropy (FA) are
                                                                are calculated as follows:
                                                                <ul>
                                                                    <li>We obtain a tract population map from binarised density maps
                                                                     of individual subject in a certain demographic.</li>
                                                                    <li>The individual MD and FA maps for the subjects in a demographic
                                                                     are averaged.</li>
                                                                    <li>We use the thresholded tract population map (taking only voxels above
                                                                     a given probability) as a mask for the averaged MD (FA) map.</li>
                                                                     <li>A weighted mean of the unmasked averaged MD (FA) map voxels is then 
                                                                     taken. The tract population voxels are used as the weights.</li>
                                                                     <li>The volume of the tract is calculated by counting the number of
                                                                     voxels in the thresholded tract population map.</li>
                                                                     <li>All maps are in MNI space.</li>
                                                                </ul>`);
                };
                metricsHelpPopup.open(updatePopupContent);
            });
            
            $(`.pop-metrics-help`).on('click', function(event) {
                const updatePopupContent = function() {
                    $('#metrics-help-popup-title').html('Population metrics');
                    $('#metrics-help-popup-description').html(`The volume (vol), mean diffusivity (MD) and fractional anisotropy (FA) are
                                                                are calculated as follows:
                                                                <ul>
                                                                    <li>The volumes of the individual subject tract density maps are averaged
                                                                     to get the mean volume.</li>
                                                                    <li>For individual subjects the tract density map is used as a mask for
                                                                     MD (FA) map.</li>
                                                                    <li>A weighted average of the unmasked MD (FA) voxels is carried out
                                                                     using tract voxel densities as weights.</li>
                                                                    <li>The individual subject MD (FA) results are then averaged among the 
                                                                    subjects in the query.</li>
                                                                    <li>All maps are in native space.</li>
                                                                </ul>`);
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
        
        return atlasTractTabs;
    };
    
    return AtlasTractTabs;
})();