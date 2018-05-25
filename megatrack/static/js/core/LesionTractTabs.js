var mgtrk = mgtrk || {};

// extend a TractTabs object with a html
// template for the Lesion Mapping tab
// contents and relevant event handlers
// for that contents
mgtrk.LesionTractTabs = (function() {
    const LesionTractTabs = {};
    
    LesionTractTabs.init = (_parent, initState, tabSelectHandler) => {
        
        // define the tab contents template of the LesionTractTabs then add the TractTabs object
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
                                <!--<div class="tab-content-tract-info">
                                    <div id=""overlap-score>Overlap score:</div>
                                </div>-->
                                <div class="tab-content-tract-disconnection">
                                    <div id="${state.code}-disconnect-results" class="disconnect-results">
                                        <span style="font-size: 110%">Overlap score: </span> ${state.overlapScore.toFixed(2)}<br><br>
                                    </div>
                                    <div id="${state.code}-disconnect-histogram-wrapper" class="disconnect-histogram-wrapper">
                                        <div id="${state.code}-run-disconnect-button" class="run-disconnect-button button clickable">Calculate tract disconnection</div>    
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
                
                console.log(indicatorOffset);
                console.log(colormapSelect.height());
                console.log(indicatorPos);
                
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
            
            var infoPopupContent = function(popupContentId) {
                $(`#${popupContentId}`).append(`<div id="tract-info-overlay-title"></div>
                                                <div id="tract-info-overlay-trk"></div>
                                                <div id="tract-info-overlay-description"></div>
                                                <div id="tract-info-overlay-citations"></div>`);
                                                
//                 tractSelect.trkRenderer = new X.renderer3D();
//                 tractSelect.trkRenderer.container = 'tract-info-overlay-trk';
//                 tractSelect.trkRenderer.config.PICKING_ENABLED = false;
//                 tractSelect.trkRenderer.init();
//                 tractSelect.trk = new X.fibers();
//                 
//                 $('#tract-info-overlay-close').on('click', function(event) {
//                     clearInterval(tractSelect.cameraMotion);
//                     $('#tract-info-overlay').hide();
//                 });
            };
            
            var infoPopup = mgtrk.Popup.init(lesionTractTabs, 'contentsId', `${state.code}-info-popup`, infoPopupContent, 'info-popup');
            
            $(`#${state.code}-info-button`).on('click', function(event) {
                event.preventDefault();
                infoPopup.open();
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
                        $(`#${state.code}-disconnect-results`).append(
                            `<span style="font-size: 110%">Disconnection results</span><br>
                            Average num. streamlines: ${Math.round(data.averageNumStreamlines)}<br>
                            Av. disconnected streamlines: ${Math.round(data.averageDisconnectedStreamlines)}<br>
                            Av. % disconnection: ${data.averageDisconnect.toFixed(2)}%`
                        );
                    
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
                        Plotly.newPlot(`${state.code}-disconnect-histogram-wrapper`, [trace], layout, {staticPlot: true});
                        
                        // add data to cache
//                             disconnectDataCache[tractCode] = {
//                                 lesionCode: lesionMapping.currentLesionCode,
//                                 query: currentQuery,
//                                 data: data,
//                                 name: tractName
//                             }
                    }
                });
            });
        };
        
        const lesionTractTabs = mgtrk.TractTabs.init(_parent, contentTemplate, initState, tabSelectHandler);
        
        lesionTractTabs.addTab = (state) => {
            lesionTractTabs._addTab(state.code, lesionTractTabs.templates.header, lesionTractTabs.templates.content, state);
        };
        
        return lesionTractTabs;
    };
    
    LesionTractTabs.newTab = (state) => {
        LesionTractTabs.addTab(state.tractCode, LesionTractTabs.templates.header, LesionTractTabs.templates.content, state);
    };
    
    return LesionTractTabs;
})();