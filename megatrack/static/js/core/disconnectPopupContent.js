var mgtrk = mgtrk || {};

mgtrk.popupContent = mgtrk.popupContent || {};

mgtrk.popupContent.disconnect = (contentWrapperId) => {
    $(`#${contentWrapperId}`).append(`<div id="disconnect-popup-title">Tract disconnection</div>
                                      <div id="disconnect-popup-description">
                                          The tract disconnection provides a more in depth analysis of the lesion
                                          overlap at the streamline level.
                                          <br><br>
                                          Three quantities are obtained for each subject in the currently selected
                                          query: the total number of streamlines in the tract, the number of
                                          streamlines intersecting the lesion and the percentage of these disconnected
                                          streamlines.
                                          <br><br>
                                          The results shown are the averages of these quantities across the selected
                                          demographic.
                                      </div>`);
};