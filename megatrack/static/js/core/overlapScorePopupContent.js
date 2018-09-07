var mgtrk = mgtrk || {};

mgtrk.popupContent = mgtrk.popupContent || {};

mgtrk.popupContent.overlapScore = (contentWrapperId) => {
    $(`#${contentWrapperId}`).append(`<div id="overlap-score-popup-title">Overlap score</div>
                                      <div id="overlap-score-popup-description">
                                          The overlap score is calculated as follows:
                                          <ul>
                                              <li>The voxels of the tract probability map which are greater than or
                                              equal to the provided threshold are taken.</li>
                                              <li>The overlap score is then the percentage of these voxels which overlap
                                              with the lesion binary mask.</li>
                                          </ul>
                                      </div>`);
};