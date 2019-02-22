var mgtrk = mgtrk || {};

mgtrk.AtlasTabs = (function() {
    const AtlasTabs = {};
    
    AtlasTabs.init = (_parent, initState) => {
        let atlasTabs = {};
        
        // maybe the Tabs object can just be generalised to take any number of
        // different tab templates
        // then the addTab function can just be called from Tabs and given a
        // the template type key?
        // TractTab and CorticalTab (note: no s!) would contain the templates for those tab
        // types and AtlasTabs would just wrap the Tabs object and assign the
        // different tab types to the templates property of Tabs
        // still need to figure out how the templates access the Tabs object properties?
        
        const tractTab = mgtrk.TractTab.init(_parent, atlasTabs);
        const tractTemplates = tractTab.templates(true);
        
        const corticalTab = mgtrk.CorticalTab.init(_parent, atlasTabs);
        const corticalTemplates = corticalTab.templates(false);
        
        const templates = {
            'tract': {
                header: tractTemplates.header,
                content: tractTemplates.content
            },
            'cortical': {
                header: corticalTemplates.header,
                content: corticalTemplates.content
            }
        };
        
        atlasTabs = Object.assign(atlasTabs, mgtrk.Tabs.init(_parent, templates, initState));
        
        atlasTabs.disable = () => {
            // loop through each tab
            // disable various elements on each tab
            // loop through headers, make them all grey and unclickable
            const tabIds = Object.keys(atlasTabs.cache);
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
                $colormapIndicator.removeClass(`${atlasTabs.cache[code].color}-colormap`);
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
                $colorSwatch.removeClass(`${atlasTabs.cache[code].color}-colormap`);
                $colorSwatch.addClass('tab-header-color-swatch-disabled');
                const $tabRemove = $(`#${code}-tab-remove`);
                $tabRemove.attr('disabled', true);
                $tabRemove.removeClass('clickable');
            }
            
        };
        
        atlasTabs.enable = () => {
            // reverse disable
            const tabIds = Object.keys(atlasTabs.cache);
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
                $colormapIndicator.addClass(`${atlasTabs.cache[code].color}-colormap`);
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
                $colorSwatch.addClass(`${atlasTabs.cache[code].color}-colormap`);
                $colorSwatch.removeClass('tab-header-color-swatch-disabled');
                const $tabRemove = $(`#${code}-tab-remove`);
                $tabRemove.attr('disabled', false);
                $tabRemove.addClass('clickable');
            }
        };
        
        return atlasTabs;  
    };
    
    return AtlasTabs;
})();