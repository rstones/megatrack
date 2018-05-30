var mgtrk = mgtrk || {};

$(document).ready(function() {
    mgtrk.viewer = mgtrk.LesionViewer.init({
                                            containerId: 'viewer',
                                            rootPath: '/megatrack',
                                            queryBuilderId: 'query-panel',
                                            lesionAnalysisId: 'lesion-panel'
                                        });
});