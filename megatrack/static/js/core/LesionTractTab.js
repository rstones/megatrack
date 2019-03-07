var mgtrk = mgtrk || {};

mgtrk.LesionTractTab = (function() {
    const LesionTractTab = {};
    
    LesionTractTab.init = (_parent, tabsObject) => {
        const lesionTractTab = {};
        
        lesionTractTab.rootPath = _parent.rootPath;
        
        const infoPopup = mgtrk.TractInfoPopup.init(lesionTractTab, 
                                                  _parent.tabsContainerId,
                                                  'tract-info-popup',
                                                  'info-popup');
                                                  
        const overlapScorePopup = mgtrk.Popup.init(lesionTractTab,
                                                 _parent.tabsContainerId,
                                                 'overlap-score-popup',
                                                 mgtrk.popupContent.overlapScore,
                                                 'overlap-score-popup');
                                                 
        const disconnectPopup = mgtrk.Popup.init(lesionTractTab,
                                               _parent.tabsContainerId,
                                               'disconnect-popup',
                                               mgtrk.popupContent.disconnect,
                                               'disconnect-popup');
        
        lesionTractTab.templates = (removeIcons) => {
            
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
                                <div class="tab-content-disconnect-metrics">
                                    <div id="${state.code}-disconnect-metrics-column" class="disconnect-metrics-column">
                                        <div id="overlap-score-row">
                                            <div class="overlap-score-label">Overlap score: </div> ${state.overlapScore.toFixed(2)} 
                                        </div>
                                        <div class="overlap-score-help help-icon clickable"></div>
                                        <div class="clear"></div>
                                        <div id="${state.code}-run-disconnect-button" class="run-disconnect-button button clickable">Calculate tract disconnection</div>
                                    </div>
                                    <div id="${state.code}-disconnect-histogram-column" class="disconnect-histogram-column">
                                    
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
                window.location.href = `download/tract/${state.code}?${$.param(_parent._parent.currentQuery)}`;
            });
            
            $(`#${state.code}-info-button`).on('click', function(event) {
                event.preventDefault();
                infoPopup.open(state);
            });
            
            $('.overlap-score-help').on('click', function(event) {
                overlapScorePopup.open();
            });
            
            $(`#${state.code}-run-disconnect-button`).on('click', function(event) {
                event.preventDefault();
                $(`#${state.code}-run-disconnect-button`).append('&nbsp<div class="loading-gif"></div>');
                $.ajax({
                    url: `/megatrack/lesion_tract_disconnect/${_parent.currentLesionCode}/${state.code}?${$.param(_parent._parent.currentQuery)}`,
                    method: 'GET',
                    dataType: 'json',
                    //data: {lesionCode: lesionMapping.currentLesionCode},
                    success: function(data) {
                        $(`#${state.code}-run-disconnect-button`).remove();
                        $(`#${state.code}-disconnect-metrics-column`).append(
                            `<div id="${state.code}-disconnect-results-wrapper" class="disconnect-results-wrapper">
                                <span class="disconnect-results-label">Disconnection results:</span>
                                <div id="${state.code}-disconnect-help" class="disconnect-help help-icon clickable"></div>
                                <div class="disconnect-results">
                                    <div class="disconnect-results-row">
                                        Average num. streamlines: <span style="float: right;">${Math.round(data.averageNumStreamlines)}</span>
                                    </div>
                                    <div class="disconnect-results-row">
                                        Av. disconnected streamlines: <span style="float: right;">${Math.round(data.averageDisconnectedStreamlines)}</span>
                                    </div>
                                    <div class="disconnect-results-row">
                                        Av. % disconnection: <span style="float: right;">${data.averageDisconnect.toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>`
                        );
                        
                        $('.disconnect-help').on('click', function(event) {
                            disconnectPopup.open();
                        });
                    
                        // display info
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
                                size: 5.0
                            }
                        };
                        const layout = {
                            bargap: 0.05,
                            xaxis: {title: "% disconnection", dtick: 25},
                            yaxis: {title: "Num subjects"},
                            margin: {
                                l: 30,
                                r: 10,
                                b: 30,
                                t: 0
                            }
                        };
                        Plotly.newPlot(`${state.code}-disconnect-histogram-column`, [trace], layout, {staticPlot: true});
                    }
                });
            });
            };
            
            const headerTemplate = function(state, wrapperId) {
                // eventually the state object might define whether to use remove icon or toggle
                $(`#${wrapperId}`).append(`<div class="tab-header-color-swatch"></div>
                                                        <div class="tab-header-tract-name" title="${state.name}">${state.name}</div>`);
                                                        
                if (removeIcons) {
                    tabsObject.addRemoveIconToTabHeader(state, wrapperId);
                }
                
                // add init color to header color swatch
                $(`#${state.code}-tab-header > .tab-header-color-swatch`).addClass(`${state.color}-colormap`);
            };
        
            return {
                header: headerTemplate,
                content: contentTemplate
            };
        };
        
        return lesionTractTab;  
    };
    
    return LesionTractTab;
})();