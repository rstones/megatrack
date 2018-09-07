var mgtrk = mgtrk || {};

mgtrk.popupContent = mgtrk.popupContent || {};

mgtrk.popupContent.disconnect = (contentWrapperId) => {
    $(`#${contentWrapperId}`).append(`This will eventually tell you something about how the disconnection is calculated.`);
};