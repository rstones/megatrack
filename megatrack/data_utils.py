'''
Created on 13 Sep 2017

@author: richard
'''
import warnings
import numpy as np
import numpy.ma as ma
import nibabel as nib
import datetime
from nibabel.nifti1 import Nifti1Image

TEMPLATE_FILE_NAME = 'Template_T1_2mm_new_RAS.nii.gz'

def subject_averaged_FA(file_paths, data_file_path):
    template = nib.load(data_file_path+TEMPLATE_FILE_NAME)
    new_img = Nifti1Image(subject_averaged_map(file_paths, 'FA'), template.affine, template.header)
    file_path = data_file_path+'temp/mean_FA_'+'{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now())+'.nii.gz'
    nib.save(new_img, file_path)
    return file_path

def subject_averaged_MD(file_paths, data_file_path):
    template = nib.load(data_file_path+TEMPLATE_FILE_NAME)
    new_img = Nifti1Image(subject_averaged_map(file_paths, 'MD'), template.affine, template.header)
    file_path = data_file_path+'temp/mean_MD_'+'{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now())+'.nii.gz'
    nib.save(new_img, file_path)
    return file_path

def subject_averaged_map(file_paths, map_code):
    '''This is hardcoded to be specific to brc_atlas, need to make it general for all data sets and subjects
    
    arg: map_code Currently should be either FA or MD
    '''
    subject_averaged_map = np.zeros((len(file_paths), 91, 109, 91), dtype=np.float64)
    try:
        for i,file_name in enumerate(file_paths):
            subject_averaged_map[i] = nib.load(file_name+'_'+map_code+'.nii.gz').get_data()
    except IOError:
        print(file_name)
        raise IOError('No files found for map code ' + map_code + '. (Or possibly for the subject file names passed in)')
    return np.mean(subject_averaged_map, axis=0)

def mean_std_FA(subject_file_names, data_file_path):
    pass

def mean_std_MD():
    pass

def averaged_tract_mean_std(mean_map_data, tract_data, threshold):

    if np.all(tract_data == 0):
        warnings.warn('Tract data is empty')
        return 0, 0
    if np.all(tract_data <= threshold):
        warnings.warn('Threshold has excluded all tract data')
        return 0, 0
    
    masked_map = ma.masked_where(tract_data <= threshold, mean_map_data)
    return ma.mean(masked_map), ma.std(masked_map)

''' Theres a lot of loading going on in these functions...maybe have the args being optionally file name or data array
so a tract can be loaded once and passed around to calculate various metrics?'''
def averaged_tract_volume(tract_data, threshold):
    masked_map = ma.masked_less(tract_data, threshold)
    return masked_map.count() * 8.
    #return np.count_nonzero(tract_data) * 8. # assuming the voxel size is 2x2x2mm, get this from the header?

def get_nifti_data(file_path):
    return nib.load(file_path).get_data()

def average_density_map():
    pass
    



    
    
    