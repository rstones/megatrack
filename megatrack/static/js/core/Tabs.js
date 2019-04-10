var mgtrk = mgtrk || {};

mgtrk.Tabs = (function() {
    const Tabs = {};
    
    /**
     * Initialise the tabs object
     * @param {Object} _parent              The parent object.
     * @param {Object} contents             Contains inital tab headers and contents.
     * @param {Function} tabSelectHandler   Called when a tab is selected. Will be passed the tab id.
     */
    Tabs.init = (_parent, templates, initState, options) => {
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
        
        tabs.templates = templates;
        
        tabs.removeTab = (id) => {
            $(`#${id}-tab-contents`).remove();
            $(`#${id}-tab-header`).remove();
            delete tabs.cache[id];
            $(document).trigger('tabs:remove', [id]);
            if (tabs.scrollingActive) {
                if (Object.keys(tabs.cache).length * $('.tab-header').outerWidth() + 2*$('.tabs-scroll').width() < $('#tabs-header').width()) {
                    // disable scrolling
                    tabs.scrollingActive = false;
                    // hide all scrolling paraphenalia
                    $('#tabs-left-scroll').hide();
                    $('#tabs-right-scroll').hide();
                    $('#tabs-left-hint').hide();
                    $('#tabs-right-hint').hide();
                    // hide tabs and reshow them all
                    $('#tabs-header > .tab-header').hide();
                    $.each(Object.keys(tabs.cache), function(idx, value) {
                        $(`#${Object.keys(tabs.cache)[idx]}-tab-header`).show();
                    });
                } else {
                    $('#tabs-header > .tab-header').hide();
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
            $('#tabs-left-scroll').hide();
            $('#tabs-right-scroll').hide();
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
            $('.tab-header').removeClass('tab-header-selected');
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
            $('#tabs-header').append(`<div id="${id}-tab-header" class="${customHeaderClass} tab-header clickable"></div>`);
            insertHeader(state, `${id}-tab-header`);
            // have an event handler for clicks on the tab to display the contents
            $(`#${id}-tab-header`).on('click', function(event) {
                if ($(this).attr('disabled')) {
                    return;
                } 
                tabs.selectTab(id);
            });
            // add content template to cache
            insertContent(state, `${id}-tab-contents`, 'tabs-contents');
            $(`#${id}-tab-contents`).hide();
            
            tabs.cache[id] = state;
            
            if (tabs.scrollingActive) {
                tabs.disableScroll('left', false);
                tabs.tabsAtFarRight();
                tabs.leftMostTab = Object.keys(tabs.cache).length - tabs.maxNumTabsVisible;
                tabs.updateTabsDisplay();
            } else if (Object.keys(tabs.cache).length * $('.tab-header').outerWidth() + 2*$('.tabs-scroll').width() > $('#tabs-header').width()) {
                tabs.scrollingActive = true;
                // display scroll buttons
                $('#tabs-left-scroll').show();
                tabs.disableScroll('left', false);
                $('#tabs-right-scroll').show();
                tabs.disableScroll('right', true);
                // calculate max number of tabs to show
                tabs.maxNumTabsVisible = Math.floor(($('#tabs-header').width() - 2*$('.tabs-scroll').width()) / $(`#${id}-tab-header`).outerWidth());
                // calculate space left over to display hint tab header sections
                tabs.hintSpace = $('#tabs-header').width() - tabs.maxNumTabsVisible*$('.tab-header').outerWidth() - 2*$('.tabs-scroll').width();
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
                $(`#tabs-${direction}-scroll`).addClass('tabs-scroll-disabled');
                $(`#tabs-${direction}-scroll`).removeClass('clickable');
            } else {
                $(`#tabs-${direction}-scroll`).removeClass('tabs-scroll-disabled');
                $(`#tabs-${direction}-scroll`).addClass('clickable');
            }
        };
        
        /*
         * Display scrolling paraphenalia for tabs scrolled to far right
         */
        tabs.tabsAtFarRight = () => {
            tabs.disableScroll('right', true);
            $('#tabs-right-hint').hide();
            $('#tabs-left-hint').outerWidth(tabs.hintSpace);
            $('#tabs-left-hint').show();
        };
        
        /*
         * Display scrolling paraphenalia for tabs scrolled to far left
         */
        tabs.tabsAtFarLeft = () => {
            tabs.disableScroll('left', true);
            $('#tabs-left-hint').hide();
            $('#tabs-right-hint').outerWidth(tabs.hintSpace);
            $('#tabs-right-hint').show();
        };
        
        /*
         * Display scrolling paraphenalia for tabs somewhere in middle of scrolling range
         */
        tabs.tabsInMiddle = () => {
            $('#tabs-left-hint').outerWidth(tabs.hintSpace / 2);
            $('#tabs-left-hint').show();
            $('#tabs-right-hint').outerWidth(tabs.hintSpace / 2);
            $('#tabs-right-hint').show();
        };
        
        /*
         * Display newly visible tabs after scrolling has occured
         */
        tabs.updateTabsDisplay = () => {
            $('#tabs-header > .tab-header').hide();
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
        $(`#${_parent.tabsContainerId}`).append(`<div id="tabs-wrapper">
                                                    <div id="tabs-header">
                                                        <div id="tabs-left-scroll" class="tabs-scroll clickable"> < </div>
                                                        <div id="tabs-left-hint" class="tabs-hint clickable"></div>
                                                        <div id="tabs-right-scroll" class="tabs-scroll clickable"> > </div>
                                                        <div id="tabs-right-hint" class="tabs-hint clickable"></div>
                                                    </div>
                                                    <div id="tabs-contents"></div>
                                                 </div>`);
        
        $('#tabs-left-scroll').hide();
        $('#tabs-right-scroll').hide();
        $('#tabs-left-hint').hide();
        $('#tabs-right-hint').hide();
        
        $('#tabs-left-scroll').on('click', function(event) {
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
        
        $('#tabs-left-hint').on('click', function(event) {
            tabs.selectTab(Object.keys(tabs.cache)[tabs.leftMostTab-1]);
            $('#tabs-left-scroll').trigger('click');
        });
        
        $('#tabs-right-scroll').on('click', function(event) {
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
        
        $('#tabs-right-hint').on('click', function(event) {
            tabs.selectTab(Object.keys(tabs.cache)[tabs.leftMostTab+3]);
            $('#tabs-right-scroll').trigger('click');
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