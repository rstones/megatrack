var mgtrk = mgtrk || {};

mgtrk.Tabs = (function() {
    const Tabs = {};
    
    /**
     * Initialise the tabs object
     * @param {Object} _parent              The parent object.
     * @param {Object} contents             Contains inital tab headers and contents.
     * @param {Function} tabSelectHandler   Called when a tab is selected. Will be passed the tab id.
     */
    Tabs.init = (containerId, templates, initState, options) => {
        const tabs = {};
        
        /*
        initState will be an object of the form
            initState = {
                'AF_LONG': {various settings to be passed to the template strings},
                'FAT_L;: {various settings to be passed to the template strings},
            }
        */
        tabs.cache = initState || {};
        
        tabs.options = options || {};
        
        tabs.maxNumTabsVisible = 0;
        tabs.leftMostTab = 0;
        tabs.leftScrollDisabled = true;
        tabs.rightScrollDisabled = true;
        tabs.scrollingActive = false;
        
        tabs.selectedTabId = '';
        
        tabs.containerId = containerId;
        tabs.container = $(`#${tabs.containerId}`);
        tabs.templates = templates;
        
        tabs.removeTab = (id) => {
            $(`#${id}-tab-contents`).remove();
            $(`#${id}-tab-header`).remove();
            delete tabs.cache[id];
            $(document).trigger('tabs:remove', [id]);
            if (tabs.scrollingActive) {
                if (Object.keys(tabs.cache).length * tabs.container.find('.tab-header').outerWidth() + 2*tabs.container.find('.tabs-scroll').width() < tabs.container.find('.tab-headers-wrapper').width()) {
                    // disable scrolling
                    tabs.scrollingActive = false;
                    // hide all scrolling paraphenalia
                    tabs.container.find('.tabs-left-scroll').hide();
                    tabs.container.find('.tabs-right-scroll').hide();
                    tabs.container.find('.tabs-left-hint').hide();
                    tabs.container.find('.tabs-right-hint').hide();
                    // hide tabs and reshow them all
                    tabs.container.find('.tab-headers-wrapper > .tab-header').hide();
                    $.each(Object.keys(tabs.cache), function(idx, value) {
                        $(`#${Object.keys(tabs.cache)[idx]}-tab-header`).show();
                    });
                } else {
                    tabs.container.find('.tab-headers-wrapper > .tab-header').hide();
                    if (tabs.leftMostTab === 0) {
                        // tabs at far left
                        tabs.updateTabsDisplay();
                    } else if (tabs.leftMostTab === Object.keys(tabs.cache).length - tabs.maxNumTabsVisible + 1) {
                        // tabs at far right
                        tabs.leftMostTab--;
                        tabs.updateTabsDisplay();
                    } else {
                        // tabs in middle
                        tabs.updateTabsDisplay();
                        // disable right scroll if tabs now at far right
                        if (tabs.leftMostTab === Object.keys(tabs.cache).length - tabs.maxNumTabsVisible) {
                            tabs.tabsAtFarRight();
                        }
                    }
                }
            }
                    
        };
        
        tabs.removeAll = () => {
            if (tabs.cache) {
                const cacheKeys = Object.keys(tabs.cache);
                for (let i=0; i<cacheKeys.length; i++) {
                    tabs.removeTab(cacheKeys[i]);
                }
            }
            // reset scroll controls
            tabs.container.find('.tabs-left-scroll').hide();
            tabs.container.find('.tabs-right-scroll').hide();
            tabs.maxNumTabsVisible = 0;
            tabs.leftMostTab = 0;
            tabs.leftScrollDisabled = true;
            tabs.rightScrollDisabled = true;
        };
        
        tabs.removeTabType = (tabType) => {
            if (tabs.cache) {
                const cacheKeys = Object.keys(tabs.cache);
                for (let i=0; i<cacheKeys.length; i++) {
                    if (tabs.cache[cacheKeys[i]].tabType === tabType) {
                        tabs.removeTab(cacheKeys[i]);
                    }
                }
            }
        };
        
        tabs.selectTab = (id) => {
            const tabContents = tabs.cache[id];
            // display the tab contents, show required content view and hide
            $(`#${tabs.selectedTabId}-tab-contents`).hide();
            $(`#${id}-tab-contents`).show();
            tabs.selectedTabId = id; 
            // change the tab header style to selected
            tabs.container.find('.tab-header').removeClass('tab-header-selected');
            $(`#${id}-tab-header`).toggleClass('tab-header-selected');
            // add icons like remove or toggle to the header
            // do I only want them visible when tab is selected?
            
            // fire further event which can initiate other actions
            // ie. reordering the tract in the renderers
            $(document).trigger('tabs:select', [id]);
        };
        
        tabs._addTab = (id, insertHeader, insertContent, state) => {
        
            // add elements to DOM (tab header)
            const customHeaderClass = tabs.options.headerClass || '';
            tabs.container.find('.tab-headers-wrapper').append(
                `<div id="${id}-tab-header" class="${customHeaderClass} tab-header clickable"></div>`
            );
            insertHeader(state, `${id}-tab-header`);
            // have an event handler for clicks on the tab to display the contents
            $(`#${id}-tab-header`).on('click', function(event) {
                if ($(this).attr('disabled')) {
                    return;
                } 
                tabs.selectTab(id);
            });
            // add content template to cache
            insertContent(state, `${id}-tab-contents`, tabs.container.find('.tab-contents-wrapper'));
            $(`#${id}-tab-contents`).hide();
            
            tabs.cache[id] = state;
            
            if (tabs.scrollingActive) {
                tabs.disableScroll('left', false);
                tabs.tabsAtFarRight();
                tabs.leftMostTab = Object.keys(tabs.cache).length - tabs.maxNumTabsVisible;
                tabs.updateTabsDisplay();
            } else if (Object.keys(tabs.cache).length * tabs.container.find('.tab-header').outerWidth() + 2*tabs.container.find('.tabs-scroll').width() > tabs.container.find('.tab-headers-wrapper').width()) {
                tabs.scrollingActive = true;
                // display scroll buttons
                tabs.container.find('.tabs-left-scroll').show();
                tabs.disableScroll('left', false);
                tabs.container.find('.tabs-right-scroll').show();
                tabs.disableScroll('right', true);
                // calculate max number of tabs to show
                tabs.maxNumTabsVisible = Math.floor((tabs.container.find('.tab-headers-wrapper').width() - 2*tabs.container.find('.tabs-scroll').width()) / $(`#${id}-tab-header`).outerWidth());
                // calculate space left over to display hint tab header sections
                tabs.hintSpace = tabs.container.find('.tab-headers-wrapper').width() - tabs.maxNumTabsVisible*tabs.container.find('.tab-header').outerWidth() - 2*tabs.container.find('.tabs-scroll').width();
                tabs.tabsAtFarRight();
                tabs.leftMostTab = Object.keys(tabs.cache).length - tabs.maxNumTabsVisible;
                tabs.updateTabsDisplay();
            }
        };
        
        tabs.addTab = (id, tabType, state) => {
            state.tabType = tabType;
            tabs._addTab(id, tabs.templates[tabType].header, tabs.templates[tabType].content, state);
        };
        
        tabs.disableScroll = (direction, disable) => {
            tabs[`${direction}ScrollDisabled`] = disable;
            if (disable) {
                tabs.container.find(`.tabs-${direction}-scroll`).addClass('tabs-scroll-disabled');
                tabs.container.find(`.tabs-${direction}-scroll`).removeClass('clickable');
            } else {
                tabs.container.find(`.tabs-${direction}-scroll`).removeClass('tabs-scroll-disabled');
                tabs.container.find(`.tabs-${direction}-scroll`).addClass('clickable');
            }
        };
        
        /*
         * Display scrolling paraphenalia for tabs scrolled to far right
         */
        tabs.tabsAtFarRight = () => {
            tabs.disableScroll('right', true);
            tabs.container.find('.tabs-right-hint').hide();
            tabs.container.find('.tabs-left-hint').outerWidth(tabs.hintSpace);
            tabs.container.find('.tabs-left-hint').show();
        };
        
        /*
         * Display scrolling paraphenalia for tabs scrolled to far left
         */
        tabs.tabsAtFarLeft = () => {
            tabs.disableScroll('left', true);
            tabs.container.find('.tabs-left-hint').hide();
            tabs.container.find('.tabs-right-hint').outerWidth(tabs.hintSpace);
            tabs.container.find('.tabs-right-hint').show();
        };
        
        /*
         * Display scrolling paraphenalia for tabs somewhere in middle of scrolling range
         */
        tabs.tabsInMiddle = () => {
            tabs.container.find('.tabs-left-hint').outerWidth(tabs.hintSpace / 2);
            tabs.container.find('.tabs-left-hint').show();
            tabs.container.find('.tabs-right-hint').outerWidth(tabs.hintSpace / 2);
            tabs.container.find('.tabs-right-hint').show();
        };
        
        /*
         * Display newly visible tabs after scrolling has occured
         */
        tabs.updateTabsDisplay = () => {
            tabs.container.find('.tab-headers-wrapper > .tab-header').hide();
            $.each(Object.keys(tabs.cache).slice(tabs.leftMostTab, tabs.leftMostTab+tabs.maxNumTabsVisible), function(idx, value) {
                $(`#${value}-tab-header`).show();
            });
        };
        
        tabs.addRemoveIconToTabHeader = (state, wrapperId) => {
            $(`#${wrapperId}`).append(`<div id="${state.code}-tab-remove" class="clickable tab-header-remove-icon"></div>`);
            $(`#${state.code}-tab-remove`).on('click', function(event) {
                // remove tract from renderer
                // fire remove-tract event
                
                if ($(this).attr('disabled')) {
                    return;
                }
                                    
                var tabKeys = Object.keys(tabs.cache);
                if (state.code === tabs.selectedTabId && tabKeys.length > 1) {
                    var idxOfTractToRemove = tabKeys.indexOf(state.code);
                    var idxToSelect = idxOfTractToRemove < tabKeys.length - 1 ? idxOfTractToRemove+1 : idxOfTractToRemove - 1;
                    tabs.selectTab(tabKeys[idxToSelect]);
                }
                tabs.removeTab(state.code);
             });
        };
        
        // insert DOM elements for general header and contents section
        tabs.container.append(`<div id="${tabs.containerId}-tabs" class="tabs-wrapper">
                                <div class="tab-headers-wrapper">
                                    <div class="tabs-left-scroll tabs-scroll clickable"> < </div>
                                    <div class="tabs-left-hint tabs-hint clickable"></div>
                                    <div class="tabs-right-scroll tabs-scroll clickable"> > </div>
                                    <div class="tabs-right-hint tabs-hint clickable"></div>
                                </div>
                                <div class="tab-contents-wrapper"></div>
                             </div>`);
        
        tabs.container.find('.tabs-left-scroll').hide();
        tabs.container.find('.tabs-right-scroll').hide();
        tabs.container.find('.tabs-left-hint').hide();
        tabs.container.find('.tabs-right-hint').hide();
        
        tabs.container.find('.tabs-left-scroll').on('click', function(event) {
            if (!tabs.leftScrollDisabled) {
                tabs.disableScroll('right', false);
                tabs.leftMostTab--;
                tabs.updateTabsDisplay();
                if (tabs.leftMostTab > 0 && Object.keys(tabs.cache).length > tabs.maxNumTabsVisible+1) {
                    tabs.tabsInMiddle();
                } else if (tabs.leftMostTab === 0) {
                    tabs.tabsAtFarLeft();
                }
            }
        });
        
        tabs.container.find('.tabs-left-hint').on('click', function(event) {
            tabs.selectTab(Object.keys(tabs.cache)[tabs.leftMostTab-1]);
            tabs.container.find('#tabs-left-scroll').trigger('click');
        });
        
        tabs.container.find('.tabs-right-scroll').on('click', function(event) {
            if (!tabs.rightScrollDisabled) {
                tabs.disableScroll('left', false);
                tabs.leftMostTab++;
                tabs.updateTabsDisplay();
                if (tabs.leftMostTab === Object.keys(tabs.cache).length - tabs.maxNumTabsVisible) {
                    tabs.tabsAtFarRight();
                } else if (tabs.leftMostTab > 0 && Object.keys(tabs.cache).length > tabs.maxNumTabsVisible+1) {
                    tabs.tabsInMiddle();
                }
            }
        });
        
        tabs.container.find('.tabs-right-hint').on('click', function(event) {
            tabs.selectTab(Object.keys(tabs.cache)[tabs.leftMostTab+3]);
            tabs.container.find('.tabs-right-scroll').trigger('click');
        });
        
        // insert the template for each header and corresponding contents in initState
        const tabsCacheKeys = Object.keys(tabs.cache);
        for (let i=0; i<tabsCacheKeys.length; i++) {
            const state = tabs.cache[tabsCacheKeys[i]];
            tabs.addTab(tabsCacheKeys[i], state.tabType, state);
        }
        
        // make first tab on the list visible
        $(`#${tabsCacheKeys[0]}-tab-contents`).show();
        $(`#${tabsCacheKeys[0]}-tab-header`).toggleClass('tab-header-selected');
        tabs.selectedTabId = tabsCacheKeys[0];
        
        return tabs;
    };
    
    return Tabs;
})();