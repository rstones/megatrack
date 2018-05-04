var mgtrk = mgtrk || {};

// basics:
// a target element to insert into
// common html template for headers and contents section
// default behaviour on tab header click
// contents cache 
// functions to add and remove tabs
// scrolling (either horizontally or vertically) if many tabs are open
//
// to generalise we need:
// tab header html template
// tab contents html template
// tab header click event handle (auto show the contents too)
// 
mgtrk.Tabs = (function() {
    const Tabs = {};
    
    /**
     * Initialise the tabs object
     * @param {Object} _parent              The parent object.
     * @param {Object} contents             Contains inital tab headers and contents.
     * @param {Function} tabSelectHandler   Called when a tab is selected. Will be passed the tab id.
     */
    Tabs.init = (_parent, templates, initState, tabSelectHandler) => {
        const tabs = {};
        
        /*
        initState will be an object of the form
            initState = {
                'AF_LONG': {various settings to be passed to the template strings},
                'FAT_L;: {various settings to be passed to the template strings},
            }
        */
        Tabs.cache = initState || {};
        
        Tabs.tabSelectHandler = tabSelectHandler;
        
        Tabs.currentTabId = '';
        
        // insert DOM elements for general header and contents section
        $(`#${_parent.tabsContainer}`).append(`<div id="tabs-wrapper">
                                                <div id="tabs-header"></div>
                                                <div id="tabs-contents"></div>
                                             </div>`);
        
        // insert the template for each header and corresponding contents
        const tabsCacheKeys = Object.keys(Tabs.cache);
        for (let i=0; i<tabsCacheKeys.length; i++) {
            const state = Tabs.cache[tabsCacheKeys[i]];
            Tabs.addRow(tabsCacheKeys[i], templates.header, templates.content, state);
        }
        
        // make first tab on the list visible
        $(`#${tabsCacheKeys[0]}-tab-contents`).show();
        $(`#${tabsCacheKeys[0]}-tab-header`).toggleClass('tab-header-selected');
        Tabs.selectedTabId = tabsCacheKeys[0];
        
        return tabs;
    };
    
    Tabs.addTab = (id, headerTemplate, contentTemplate, state) => {
        // add elements to DOM (tab header)
        $('#tabs-header').append(`<div id="${id}-tab-header"></div>`);
        $(`#${id}-tab-header`).html(headerTemplate(state));
        // have an event handler for clicks on the tab to display the contents
        $(`#${id}-tab-header`).on('click', function(event) {
            Tabs.selectTab(id);
        });
        // add content template to cache
        $('#tabs-contents').append(`<div id="${id}-tab-contents">${contentTemplate(state)}</div>`);
        $(`#${id}-tab-contents`).hide();
        
        // need some logic to decide on when to start scrolling the tab header if there are lots of tabs open
    };
    
    Tabs.removeTab = () => {
        // remove relevant elements from DOM
        // remove contents from cache
    };
    
    Tabs.selectTab = (id) => {
        const tabContents = Tabs.cache[id];
        // display the tab contents, show reuqired content view and hide
        $(`#${Tabs.selectedTabId}-tab-contents`).hide();
        $(`#${id}-tab-contents`).show();
        Tabs.selectedTabId = id; 
        // change the tab header style to selected
        $(`#${id}-tab-header`).toggleClass('tab-header-selected');
        // add icons like remove or toggle to the header
        // do I only want them visible when tab is selected?
        
        // fire further event which can initiate other actions
        // ie. reordering the tract in the renderers
        Tabs.tabSelectHandler(id);
    };
    
    return Tabs;
})();