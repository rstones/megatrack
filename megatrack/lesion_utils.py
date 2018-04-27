import numpy as np
import nibabel as nib
from nibabel.streamlines.trk import TrkFile
import megatrack.data_utils as du


# given a lesion, a tract code and a query I want to return the average % disconnection
# of the tract over all subjects in the query as well as a histogram showing the number
# of subjects with certain ranges of % disconnection (eg. 0-25%, 25-50%, 50-75%, 75-100%)

def calculate_tract_disconnection(trk_file_path, lesion):
    ''' Calculates the percent disconnection of tract defined in trk_file_path 
        for a given lesion.
    
        trk_file_path (String)
        lesion (ndarray)
    '''
    # load the trk
    try:
        trk = TrkFile.load(trk_file_path)
    except:
        print('Error during lesion analysis when loading file: ', trk_file_path)
        return 0
    streamlines = trk.tractogram.streamlines # ArraySequence
    
    # get the start indices of each set of streamline coords if they were to be concatenated 
    start_indices = []
    for i,streamline in enumerate(streamlines):
        start_indices.append((start_indices[i-1] if start_indices else 0) + len(streamline))
    
    # concatenate the streamline coords, floor then cast to int
    # scale the streamline coords by 0.5 for now since they are in 1mm voxel space and we are comparing to 2mm voxel lesion
    coords = np.floor(0.5 * np.vstack(streamlines)).astype('int16')
    
    # get value of lesion voxels at streamline coords
    overlap = lesion[coords[:,0], coords[:,1], coords[:,2]]
    
    # split list so it is grouped by streamline
    overlap = np.split(overlap, start_indices)[:-1]
    
    # see if streamlines pass through lesion
    overlap = np.array([np.any(i) for i in overlap])
    
    return 100 * (np.count_nonzero(overlap) / len(streamlines))

