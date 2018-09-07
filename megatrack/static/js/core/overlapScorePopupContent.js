var mgtrk = mgtrk || {};

mgtrk.popupContent = mgtrk.popupContent || {};

mgtrk.popupContent.overlapScore = (contentWrapperId) => {
    $(`#${contentWrapperId}`).append(`There will be some info here eventually about how the overlap score was calculated.`);
};