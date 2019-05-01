var mgtrk = mgtrk || {};

mgtrk.TractInfoTabs = (function() {
    const TractInfoTabs = {};
    
    TractInfoTabs.init = (_parent, initState, removeIcons) => {
        let tractInfoTabs = {};
        
        const templates = {
            tract: {
                header: function(state, wrapperId) {
                    // eventually the state object might define whether to use remove icon or toggle
                    $(`#${wrapperId}`).append(`<div class="tab-header-color-swatch"></div>
                                                            <div class="tab-header-tract-name" title="${state.name}">${state.name}</div>`);
                                                            
                    if (removeIcons) {
                        $(`#${wrapperId}`).append(`<div id="${state.code}-tab-remove" class="clickable tab-header-remove-icon"></div>`);
                        $(`#${state.code}-tab-remove`).on('click', function(event) {
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
                     $(`#${state.code}-tab-header > .tab-header-color-swatch`).addClass(`${state.color}-colormap`);
                },
                content: function(state, wrapperId, contentsEl) {
                    contentsEl.append(`<div id="${wrapperId}" class="tract-info-tab">
                        <div class="info-col tract-info-tab-col">
                            <div class="info-col-query"></div>
                            <div class="info-col-buttons">
                                <div id="${state.code}-download-button" class="download-button button clickable">Download</div>
                                <div id="${state.code}-info-button" class="info-button button clickable">Tract info</div>
                            </div>
                        </div>
                        <div class="control-col tract-info-tab-col">
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
                        </div>
                        <div class="metrics-col tract-info-tab-col">
                            <div id="${state.code}-prob-metrics-wrapper" class="tab-content-metrics-section">
                                <span class="metrics-label">Probability map<br>analysis</span><div class="prob-metrics-help metrics-help help-icon clickable"></div>
                                <div id="${state.code}-prob-metrics"></div>
                            </div>
                            <div id="${state.code}-pop-metrics-wrapper" class="tab-content-metrics-section">
                                <span class="metrics-label">Demographic<br>analysis</span><div class="pop-metrics-help metrics-help help-icon clickable"></div>
                                <div id="${state.code}-pop-metrics"></div>
                            </div>
                        </div>
                        <ul id="${state.code}-colormap-select" class="colormap-select"></ul>`
                    );
                    
                    // add event handlers and stuff here
                    
                    // add query to the info column
                    const datasetCode = Object.keys(state.currentQuery)[0]; // assuming only one dataset per query
                    const methodCode = state.currentQuery[datasetCode].method;
                    const constraints = state.currentQuery[datasetCode].constraints;
                    const $infoCol = $(`#${wrapperId} > .info-col > .info-col-query`);
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
                    
                    // show init color in colormap select
                    $(`#${state.code}-colormap-indicator`).addClass(`${state.color}-colormap`);
                    
                    /*
                    Fire 'populate-colormap-select' event here so the following loop can move to AtlasViewer factory function?
                    */
                    for (let key in _parent.colormaps.colormaps) {
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