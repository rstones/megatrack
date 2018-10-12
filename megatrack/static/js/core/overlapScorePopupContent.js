var mgtrk = mgtrk || {};

mgtrk.popupContent = mgtrk.popupContent || {};

mgtrk.popupContent.overlapScore = (contentWrapperId) => {
    $(`#${contentWrapperId}`).append(`<div id="overlap-score-popup-title">Overlap score</div>
                                      <div id="overlap-score-popup-description">
                                          The lesion overlap score for a tract is the percentage of tract probability
                                          map voxels above the selected probability threshold that overlap with the
                                          uploaded lesion.
                                          <br><br>
                                          The probability map is obtained from the average of the binarised density maps
                                          of individual subjects in the currently selected query.
                                      </div>`);
};