var mgtrk = mgtrk || {};

$(document).ready(function() {
    mgtrk.viewer = mgtrk.AtlasViewer.init({
                                            containerId: 'viewer',
                                            rootPath: '/megatrack',
                                            objectSelectId: 'query-panel',
                                            tractSelectId: 'tract-panel'
                                        });
});