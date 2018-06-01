var mgtrk = mgtrk || {};

mgtrk.Tabs = (function() {
    const Tabs = {};
    
    /**
     * Initialise the tabs object
     * @param {Object} _parent              The parent object.
     * @param {Object} contents             Contains inital tab headers and contents.
     * @param {Function} tabSelectHandler   Called when a tab is selected. Will be passed the tab id.
     */
    Tabs.init = (_parent, templates, initState, tabSelectHandler, tabRemoveHandler) => {
        const tabs = {};
        
        /*
        initState will be an object of the form
            initState = {
                'AF_LONG': {various settings to be passed to the template strings},
                'FAT_L;: {various settings to be passed to the template strings},
            }
        */
        tabs.cache = initState || {};
        
        tabs.maxNumTabsVisible = 0;
        tabs.leftMostTab = 0;
        tabs.leftScrollDisabled = true;
        tabs.rightScrollDisabled = true;
        
        tabs.tabSelectHandler = tabSelectHandler;
        
        tabs.selectedTabId = '';
        
        tabs.templates = templates;
        
        tabs.removeTab = (id) => {
            // remove relevant elements from DOM
            // remove contents from cache
            $(`#${id}-tab-contents`).remove();
            $(`#${id}-tab-header`).remove();
            delete tabs.cache[id];
            $(document).trigger('tabs:remove', [id]);
        };
        
        tabs.removeAll = () => {
            if (tabs.cache) {
                const cacheKeys = Object.keys(tabs.cache);
                for (let i=0; i<cacheKeys.length; i++) {
                    tabs.removeTab(tabs.cache[cacheKeys[i]].id);
                }
            }
            // reset scroll controls
            $('#tabs-left-scroll').hide();
            $('#tabs-right-scroll').hide();
            tabs.maxNumTabsVisible = 0;
            tabs.leftMostTab = 0;
            tabs.leftScrollDisabled = true;
            tabs.rightScrollDisabled = true;
        };
        
        tabs.selectTab = (id) => {
            const tabContents = tabs.cache[id];
            // display the tab contents, show required content view and hide
            $(`#${tabs.selectedTabId}-tab-contents`).hide();
            $(`#${id}-tab-contents`).show();
            tabs.selectedTabId = id; 
            // change the tab header style to selected
            $('.tab-header').removeClass('tab-header-selected');
            $(`#${id}-tab-header`).toggleClass('tab-header-selected');
            // add icons like remove or toggle to the header
            // do I only want them visible when tab is selected?
            
            // fire further event which can initiate other actions
            // ie. reordering the tract in the renderers
            tabs.tabSelectHandler(id);
        };
        
        tabs._addTab = (id, insertHeader, insertContent, state) => {
            // add elements to DOM (tab header)
            $('#tabs-header').append(`<div id="${id}-tab-header" class="tab-header clickable"></div>`);
            insertHeader(state, `${id}-tab-header`);
            // have an event handler for clicks on the tab to display the contents
            $(`#${id}-tab-header`).on('click', function(event) {
                tabs.selectTab(id);
            });
            // add content template to cache
            insertContent(state, `${id}-tab-contents`, 'tabs-contents');
            $(`#${id}-tab-contents`).hide();
            
            tabs.cache[id] = state;
            
            // need some logic to decide on when to start scrolling the tab header if there are lots of tabs open
            // if sum of open tab-header widths is greater than tabs-header div width then enter scrolling mode
            // add left and right arrow to side scroll through tab headers
            
            if (Object.keys(tabs.cache).length * $('.tab-header').width() > $('#tabs-header').width()) {
                // display scroll buttons
                $('#tabs-left-scroll').show();
                tabs.disableScroll('left', false);
                $('#tabs-right-scroll').show();
                tabs.disableScroll('right', true);
                // hide all tabs
                $('#tabs-header > .tab-header').hide();
                // show the last number of tabs that can fit in the tabs object
                tabs.maxNumTabsVisible = Math.floor($('#tabs-header').width() / $(`#${id}-tab-header`).width());
                tabs.leftMostTab = Object.keys(tabs.cache).length - tabs.maxNumTabsVisible;
                var tabsToDisplay = Object.keys(tabs.cache).slice(tabs.leftMostTab, Object.keys(tabs.cache).length);
                $.each(tabsToDisplay, function(idx, value) {
                    $(`#${tabsToDisplay[idx]}-tab-header`).show();
                });
            }
        };
        
        tabs.disableScroll = (direction, disable) => {
            tabs[`${direction}ScrollDisabled`] = disable;
            if (disable) {
                $(`#tabs-${direction}-scroll`).addClass('tabs-scroll-disabled');
                $(`#tabs-${direction}-scroll`).removeClass('clickable');
            } else {
                $(`#tabs-${direction}-scroll`).removeClass('tabs-scroll-disabled');
                $(`#tabs-${direction}-scroll`).addClass('clickable');
            }
        };
        
        // insert DOM elements for general header and contents section
        $(`#${_parent.tabsContainerId}`).append(`<div id="tabs-wrapper">
                                                    <div id="tabs-header">
                                                        <div id="tabs-left-scroll" class="tabs-scroll clickable"> < </div>
                                                        <div id="tabs-right-scroll" class="tabs-scroll clickable"> > </div>
                                                    </div>
                                                    <div id="tabs-contents"></div>
                                                 </div>`);
        
        $('#tabs-left-scroll').hide();
        $('#tabs-right-scroll').hide();
        
        $('#tabs-left-scroll').on('click', function(event) {
            if (!tabs.leftScrollDisabled) {
                tabs.disableScroll('right', false);
                $('#tabs-header > .tab-header').hide();
                tabs.leftMostTab--;
                var tabsToDisplay = Object.keys(tabs.cache).slice(tabs.leftMostTab, tabs.leftMostTab+tabs.maxNumTabsVisible);
                $.each(tabsToDisplay, function(idx, value) {
                    $(`#${tabsToDisplay[idx]}-tab-header`).show();      
                });
                if (tabs.leftMostTab === 0) {
                    tabs.disableScroll('left', true);
                }
            }
        });
        
        $('#tabs-right-scroll').on('click', function(event) {
            if (!tabs.rightScrollDisabled) {
                tabs.disableScroll('left', false);
                $('#tabs-header > .tab-header').hide();
                tabs.leftMostTab++;
                var tabsToDisplay = Object.keys(tabs.cache).slice(tabs.leftMostTab, tabs.leftMostTab+tabs.maxNumTabsVisible);
                $.each(tabsToDisplay, function(idx, value) {
                    $(`#${tabsToDisplay[idx]}-tab-header`).show();
                });
                if (tabs.leftMostTab === Object.keys(tabs.cache).length - tabs.maxNumTabsVisible) {
                    tabs.disableScroll('right', true);
                }
            }
        });
        
        // insert the template for each header and corresponding contents
        const tabsCacheKeys = Object.keys(tabs.cache);
        for (let i=0; i<tabsCacheKeys.length; i++) {
            const state = tabs.cache[tabsCacheKeys[i]];
            tabs._addTab(tabsCacheKeys[i], templates.header, templates.content, state);
        }
        
        // make first tab on the list visible
        $(`#${tabsCacheKeys[0]}-tab-contents`).show();
        $(`#${tabsCacheKeys[0]}-tab-header`).toggleClass('tab-header-selected');
        tabs.selectedTabId = tabsCacheKeys[0];
        
        return tabs;
    };
    
    return Tabs;
})();