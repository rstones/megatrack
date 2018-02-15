var mgtrk = mgtrk || {};

$(document).ready(function() {
    mgtrk.viewer = mgtrk.AtlasViewer.init({
                                            containerId: 'viewer',
                                            rootPath: '/megatrack',
                                            queryBuilderId: 'query-panel',
                                            tractSelectId: 'tract-panel'
                                        });
});