var mgtrk = mgtrk || {};

mgtrk.TractInfoTabs = (function() {
    const TractInfoTabs = {};
    
    TractInfoTabs.init = (_parent, initState, removeIcons) => {
        let tractInfoTabs = {};
        
        const templates = {
            tract: {
                header: function(state, wrapperId) {
                    // eventually the state object might define whether to use remove icon or toggle
                    
                    // use getElementById here to avoid trouble escaping { } with jQuery
                    const $tabHeader = $(document.getElementById(wrapperId));
                    
                    $tabHeader.append(`<div class="tab-header-color-swatch"></div>
                                                            <div class="tab-header-tract-name" title="${state.name}">${state.name}</div>`);
                                                            
                    if (removeIcons) {
                        $tabHeader.append(`<div id="${state.tractQueryId}-tab-remove" class="clickable tab-header-remove-icon"></div>`);
                        $(document.getElementById(`#${state.tractQueryId}-tab-remove`)).on('click', function(event) {
                            // remove tract from renderer
                            // fire remove-tract event
                            
                            if ($(this).attr('disabled')) {
                                return;
                            }
                                                
                            var tractIds = Object.keys(tractInfoTabs.cache);
                            if (state.code === tractInfoTabs.selectedTabId && tractIds.length > 1) {
                                var idxOfTractToRemove = tractIds.indexOf(state.code);
                                var idxToSelect = idxOfTractToRemove < tractIds.length - 1 ? idxOfTractToRemove+1 : idxOfTractToRemove - 1;
                                tractInfoTabs.selectTab(tractIds[idxToSelect]);
                            }
                            tractInfoTabs.removeTab(state.code);
                         });
                    }
                    
                    // add init color to header color swatch
                     $tabHeader.find(`.tab-header-color-swatch`).addClass(`${state.color}-colormap`);
                },
                content: function(state, wrapperId, contentsEl) {
                    contentsEl.append(`<div id="${wrapperId}" class="tract-info-tab">
                        <div class="info-col tract-info-tab-col">
                            <div class="info-col-query"></div>
                            <div class="info-col-buttons">
                                <div id="${state.tractQueryId}-download-button" class="download-button button clickable">Download</div>
                                <div id="${state.tractQueryId}-info-button" class="info-button button clickable">Tract info</div>
                            </div>
                        </div>
                        <div class="control-col tract-info-tab-col">
                            <div class="tract-control-wrapper">
                                <div class="tract-control-label">Probability range (%):</div>
                                    <div id="${state.tractQueryId}-prob-range-slider" class="tract-slider">
                                        <div id="${state.tractQueryId}-prob-range-min-handle" class="ui-slider-handle tract-slider-handle"></div>
                                        <div id="${state.tractQueryId}-prob-range-max-handle" class="ui-slider-handle tract-slider-handle"></div>
                                    </div>
                                </div>
                                <div class="clear"></div>
                                <div class="tract-control-wrapper">
                                    <div class="tract-control-label">Opacity (%):</div>
                                    <div id="${state.tractQueryId}-opacity-slider" class="tract-slider">
                                        <div id="${state.tractQueryId}-opacity-slider-handle" class="ui-slider-handle tract-slider-handle"></div>
                                    </div>
                                </div>
                                <div class="tract-control-wrapper">
                                    <div class="tract-control-label">Color:</div>
                                    <div id="${state.tractQueryId}-color-select">
                                        <div id="${state.tractQueryId}-colormap-indicator" class="clickable colormap-indicator"><div class="colormap-indicator-caret"></div></div>
                                    </div>
                                </div>
                        </div>
                        <div class="metrics-col tract-info-tab-col">
                            <div id="${state.tractQueryId}-prob-metrics-wrapper" class="tab-content-metrics-section">
                                <span class="metrics-label">Probability map<br>analysis</span><div class="prob-metrics-help metrics-help help-icon clickable"></div>
                                <div id="${state.tractQueryId}-prob-metrics"></div>
                            </div>
                            <div id="${state.tractQueryId}-pop-metrics-wrapper" class="tab-content-metrics-section">
                                <span class="metrics-label">Demographic<br>analysis</span><div class="pop-metrics-help metrics-help help-icon clickable"></div>
                                <div id="${state.tractQueryId}-pop-metrics"></div>
                            </div>
                        </div>
                        <ul id="${state.tractQueryId}-colormap-select" class="colormap-select"></ul>`
                    );
                    
                    // add event handlers and stuff here
                    
                    // add query to the info column
                    const datasetCode = Object.keys(state.currentQuery)[0]; // assuming only one dataset per query
                    const methodCode = state.currentQuery[datasetCode].method;
                    const constraints = state.currentQuery[datasetCode].constraints;
                    const $tabContents = $(document.getElementById(wrapperId));
                    const $infoCol = $tabContents.find(`.info-col > .info-col-query`);
                    $infoCol.append(
                        `<div class="dataset">${datasetCode}</div> <div class="method">${methodCode}</div>
                        <div class="constraints">
                            
                        </div>`
                    );
                    
                    $.each(constraints, function(key, val) {
                        switch (val.type) {
                            case 'radio':
                                $infoCol.find('.constraints').append(
                                    `<div>${key}: ${val.value}</div>`
                                );
                                break;
                                
                            case 'checkbox':
                                $infoCol.find('.constraints').append(
                                    `<div>${key}: ${val.values}</div>`
                                );
                                break;
                                
                            case 'range':
                                $infoCol.find('.constraints').append(
                                    `<div>${key}: ${val.min} - ${val.max}</div>`
                                );
                                break;
                                
                        }
                        
                    });
                    
                    
                    // add sliders to appropriate divs with init settings
                    var probRangeMinHandle = $(document.getElementById(`${state.tractQueryId}-prob-range-min-handle`));
                    var probRangeMaxHandle = $(document.getElementById(`${state.tractQueryId}-prob-range-max-handle`));
                    const $probRangeSlider = $(document.getElementById(`${state.tractQueryId}-prob-range-slider`));
                    $probRangeSlider.slider({
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
                    
                    var opacitySliderHandle = $(document.getElementById(`${state.tractQueryId}-opacity-slider-handle`));
                    const $opacitySlider = $(document.getElementById(`${state.tractQueryId}-opacity-slider`));
                    $opacitySlider.slider({
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
                    
                    // show init color in colormap select
                    $(document.getElementById(`${state.tractQueryId}-colormap-indicator`)).addClass(`${state.color}-colormap`);
                    
                    /*
                    Fire 'populate-colormap-select' event here so the following loop can move to AtlasViewer factory function?
                    */
                    for (let key in _parent.colormaps.colormaps) {
                        $(document.getElementById(`${state.tractQueryId}-colormap-select`)).append(`<div id="${state.tractQueryId}-${key}-colormap-select-item" class="colormap-select-item clickable ${key}-colormap">&nbsp&nbsp&nbsp</div>`);
                        $(document.getElementById(`${state.tractQueryId}-${key}-colormap-select-item`)).on('click', {color: key}, function(event) {
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
                                $(document.getElementById(`${state.tractQueryId}-colormap-indicator`)).removeClass(oldColor+'-colormap');
                                $(document.getElementById(`${state.tractQueryId}-colormap-indicator`)).addClass(color+'-colormap');
                                
                                $(document.getElementById(`${state.tractQueryId}-tab-header`)).find('.tab-header-color-swatch').removeClass(oldColor+'-colormap');
                                $(document.getElementById(`${state.tractQueryId}-tab-header`)).find('.tab-header-color-swatch').addClass(color+'-colormap');
                            }
                        });
                    }
                    $(document.getElementById(`${state.tractQueryId}-colormap-select`)).hide();
                    
                    $(document.getElementById(`${state.tractQueryId}-colormap-indicator`)).on('click', {tractQueryId: state.tractQueryId}, function(event) {
                        if ($(this).attr('disabled')) {
                            return;
                        }
                        const tractQueryId = event.data.tractQueryId;
                        // work out position of colormap indicator for current tract
                        const indicatorPos = $(document.getElementById(`${tractQueryId}-colormap-indicator`)).position();
                        const indicatorOffset = $(document.getElementById(`${tractQueryId}-colormap-indicator`)).offset();
                        const colormapSelect = $(document.getElementById(`${tractQueryId}-colormap-select`));
                        
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
                        if (event.target.id.indexOf(`#${state.tractQueryId}-colormap-indicator`) == -1 
                                && event.target.parentElement.id.indexOf(`#${state.tractQueryId}-colormap-indicator`) == -1) {
                            $(document.getElementById(`${state.tractQueryId}-colormap-select`)).hide();
                        }
                    });
                    $(window).resize(function() {
                        $(document.getElementById(`${state.tractQueryId}-colormap-select`)).hide();
                    });
                    
                }
            }
        };
        
        tractInfoTabs = mgtrk.Tabs.init(_parent.tractSelectId, templates);
        
        return {
            tractInfoTabs: tractInfoTabs
        };
    };
    
    return TractInfoTabs;
})();