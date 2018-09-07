var mgtrk = mgtrk || {};

mgtrk.popupContent = mgtrk.popupContent || {};

mgtrk.popupContent.disconnect = (contentWrapperId) => {
    $(`#${contentWrapperId}`).append(`<div id="disconnect-popup-title">Tract disconnection</div>
                                      <div id="disconnect-popup-description">
                                          The tract disconnection is calculated as follows:
                                          <ul>
                                              <li>Three quantities are obtained for each subject in the selected 
                                              demographic. The total number of streamlines in the trk file for the
                                              specified tract, the number of streamlines that intersect the lesion
                                              and the percentage of these disconnected streamlines.</li>
                                              <li>Each of these quantities is averaged over the selected demographic
                                              to give the tract disconnection results.</li>
                                          </ul>
                                      </div>`);
};