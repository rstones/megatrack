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
                                            <div id="tract-info-popup-trk"></div>
                                            <div id="tract-info-popup-description"></div>
                                            <div id="tract-info-popup-citations"></div>`);
        };
        
        var infoPopup = mgtrk.Popup.init({}, `${_parent.tractTabsContainerId}`, 'tract-info-popup', infoPopupContent, 'info-popup');
        
        // setup trk renderer within the popup
        var atlasTractTabs = {};
        atlasTractTabs.trkRenderer = new X.renderer3D();
        atlasTractTabs.trkRenderer.container = 'tract-info-popup-trk';
        atlasTractTabs.trkRenderer.config.PICKING_ENABLED = false;
        atlasTractTabs.trkRenderer.init();
        atlasTractTabs.trk = new X.fibers();
        
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
                                        <div id="${state.code}-info-button" class="info-button button clickable">View info</div>
                                    </div>
                                </div>
                                <div class="tab-content-tract-metrics">
                                    <div id="${state.code}-prob-metrics-wrapper" class="tab-content-metrics-section">
                                        <span>Probabalistic atlas metrics:</span>
                                        <div id="${state.code}-prob-metrics"></div>
                                    </div>
                                    <div id="${state.code}-pop-metrics-wrapper" class="tab-content-metrics-section">
                                        <span>Population metrics:</span>
                                        <div id="${state.code}-pop-metrics"></div>
                                    </div>
                                </div>
                                <div id="${state.code}-tract-info" class="tab-content-tract-info">
                                    ${state.description}
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
                    $(document).trigger('prob-metrics:update', [parseInt(min*100)]);
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
                        
                        var renderer = atlasTractTabs.trkRenderer;
                        renderer.remove(atlasTractTabs.trk);
                        renderer.resize(); // call the resize function to ensure the canvas gets the dimensions of the visible container
                        
                        atlasTractTabs.trk.file = `${_parent.rootPath}/get_trk/${state.code}?.trk`;
                        atlasTractTabs.trk.opacity = 1.0;
                        
                        renderer.add(atlasTractTabs.trk);
                        renderer.render();
                        
                        atlasTractTabs.cameraMotion = setInterval(function() {
                            renderer.camera.rotate([3,0]);
                        }, 50);
                    }
                };
                
                infoPopup.open(updatePopupContent);
            });
            
            $(`#${state.code}-prob-metrics`).html('<div class="tract-metrics-loading-gif"></div>');
            const initThreshold = parseInt(_parent._parent.colormaps.initColormapMin * 100);
            $.ajax({
                url: `${_parent.rootPath}/get_tract_info/${state.code}/${initThreshold}?${$.param(state.currentQuery)}`,
                dataType: 'json',
                success: function(data) {
                    if (data) {
                        $(`#${state.code}-prob-metrics`).html(`Volume: ${data.volume.toFixed(1)}ml<br>
                                                            Mean MD: ${data.meanMD.toFixed(3)}&nbsp
                                                            Std MD: ${data.stdMD.toFixed(3)}<br>
                                                            Mean FA: ${data.meanFA.toFixed(3)}&nbsp
                                                            Std FA: ${data.stdFA.toFixed(3)}<br>`);   
                    }
                }
            });
            
            
            var probMetricsUpdateTimeout = null;
            $(document).on('prob-metrics:update', function(event, threshold) {
                $(`#${state.code}-prob-metrics`).html('<div class="tract-metrics-loading-gif"></div>');
                clearTimeout(probMetricsUpdateTimeout);
                probMetricsUpdateTimeout = setTimeout(function() {
                    $.ajax({
                        url: `${_parent.rootPath}/get_tract_info/${state.code}/${threshold}?${$.param(state.currentQuery)}`,
                        dataType: 'json',
                        success: function(data) {
                            if (data) {
                                $(`#${state.code}-prob-metrics`).html(`Volume: ${data.volume.toFixed(1)}ml<br>
                                                                    Mean MD: ${data.meanMD.toFixed(3)}&nbsp
                                                                    Std MD: ${data.stdMD.toFixed(3)}<br>
                                                                    Mean FA: ${data.meanFA.toFixed(3)}&nbsp
                                                                    Std FA: ${data.stdFA.toFixed(3)}<br>`);   
                            }
                        }
                    });
                }, 1000);
            });
            
            
            $(`#${state.code}-pop-metrics`).html('<div class="tract-metrics-loading-gif"></div>');
            $.ajax({
                url: `${_parent.rootPath}/get_tract_info/${state.code}?${$.param(state.currentQuery)}`,
                dataType: 'json',
                success: function(data) {
                    if (data) {
                        $(`#${state.code}-pop-metrics`).html(`Volume: ${data.volume.toFixed(1)}ml<br>
                                                            Mean MD: ${data.meanMD.toFixed(3)}&nbsp
                                                            Std MD: ${data.stdMD.toFixed(3)}<br>
                                                            Mean FA: ${data.meanFA.toFixed(3)}&nbsp
                                                            Std FA: ${data.stdFA.toFixed(3)}<br>`);   
                    }
                }
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