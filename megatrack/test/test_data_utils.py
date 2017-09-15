'''
Created on 14 Sep 2017

@author: richard
'''
import unittest
import mock
import numpy as np
import megatrack.data_utils as du
import contextlib
from nibabel import Nifti1Image, Nifti1Header

@contextlib.contextmanager
def monkey_patch(module, fn_name, patch):
    unpatch = getattr(module, fn_name)
    setattr(module, fn_name, patch)
    try:
        yield
    finally:
        setattr(module, fn_name, unpatch)

class DataUtilsTestCase(unittest.TestCase):
    
    test_affine = np.eye(4)
    nifti_dim = (91,109,91)

    def test_subject_averaged_map(self):
        test_filepath_1 = 'test_filepath_1_FA.nii.gz'
        test_nifti_1 = Nifti1Image(2*np.ones(self.nifti_dim, dtype=np.int16), self.test_affine)
        test_filepath_2 = 'test_filepath_2_FA.nii.gz'
        test_nifti_2 = Nifti1Image(4*np.ones(self.nifti_dim, dtype=np.int16), self.test_affine)
        subject_file_names = ['test_file_path_1', 'test_file_path_2']
        
        with monkey_patch(du.nib, 'load', lambda filepath: test_nifti_1 if filepath == test_filepath_1 else test_nifti_2):
            averaged_map = du.subject_averaged_map(subject_file_names, 'FA')
            assert np.all(averaged_map == 4)
            assert averaged_map.dtype == 'float64'
            
    def test_averaged_tract_mean_std(self):
        mean_map_data = np.ones(self.nifti_dim, dtype=np.float64)
        tract_data = np.ones(self.nifti_dim, dtype=np.float64)
        
        # test trivial use cases
        mean, std = du.averaged_tract_mean_std(mean_map_data, tract_data, 0)
        assert mean == 1
        assert std == 0
        
        # test case with some tract_data elements below threshold
        tract_data[:10,:10,:10] = 0.2
        mean, std = du.averaged_tract_mean_std(mean_map_data, tract_data, 0.5)
        assert mean == 1
        assert std == 0
        
        # test nonzero std
        mean_map_data[:self.nifti_dim[0]/2, :self.nifti_dim[1]/2, self.nifti_dim[2]/2] = 2.
        tract_data = np.ones(self.nifti_dim, dtype=np.float64)
        mean, std = du.averaged_tract_mean_std(mean_map_data, tract_data, 0)
        assert mean == np.mean(mean_map_data)
        assert std == np.std(mean_map_data)
        
        # test threshold greater than all tract elements, should warn
        mean, std = du.averaged_tract_mean_std(mean_map_data, tract_data, 2)
        assert mean == 0
        assert std == 0
        
        # test tract data empty, should warn
        tract_data_empty = np.zeros(self.nifti_dim)
        mean, std = du.averaged_tract_mean_std(mean_map_data, tract_data_empty, 0)
        assert mean == 0
        assert std == 0
        
    def test_averaged_tract_volume(self):
        tract_data = np.ones(self.nifti_dim, dtype=np.float64)
        
        # test trivial case with all tract data elements ones
        vol = du.averaged_tract_volume(tract_data)
        assert vol == tract_data.size * 8. # assuming voxel size is 2x2x2mm
        
        # test 2D case with some zero elements
        vol = du.averaged_tract_volume(np.eye(10))
        assert vol == 10 * 8.
        
    def test_get_nifti_data(self):
        test_file_path = 'test_file_path.nii.gz'
        test_nifti = Nifti1Image(np.ones(self.nifti_dim, dtype=np.int16), self.test_affine)
        
        with monkey_patch(du.nib, 'load', lambda file_path: test_nifti if file_path == test_file_path else ''):
            data = du.get_nifti_data(test_file_path)
            assert type(data) == np.ndarray
            assert np.all(data == 1)
            assert data.shape == self.nifti_dim

if __name__ == "__main__":
    unittest.main()
    
    
    