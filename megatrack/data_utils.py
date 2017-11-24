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

def generate_average_density_map(file_paths, data_file_path, tract_code):
    '''Loads and averages the tract density maps in the file_paths list.
    Then saves averaged density map in data/temp folder so it can be sent in
    response later.
    '''
    data = np.zeros((len(file_paths), 91, 109, 91), dtype=np.int16)
    for i in range(len(file_paths)):
        data[i] = nib.load(file_paths[i]).get_data()
    
    data[np.nonzero(data)] = 255 # 'binarize' to 255 before averaging
    mean = np.mean(data, axis=0)
    
    # add the template affine and header to the averaged nii to ensure correct alignment in XTK library
    # maybe cache the template affine and header on startup so we don't need to do this load here?
    template = nib.load(data_file_path+TEMPLATE_FILE_NAME)
    new_img = Nifti1Image(mean.astype(np.int16), template.affine, template.header)
    temp_file_path = data_file_path + 'temp/' + tract_code + '_' + '{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now()) + '.nii.gz'
    nib.save(new_img, temp_file_path)
    return temp_file_path

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
    '''arg: map_code Currently should be either FA or MD'''
    subject_averaged_map = np.zeros((len(file_paths), 91, 109, 91), dtype=np.float64)
    try:
        for i,file_name in enumerate(file_paths):
            subject_averaged_map[i] = nib.load(file_name+'_MNI_'+map_code+'.nii.gz').get_data()
    except IOError:
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
    average = ma.average(masked_map, weights=tract_data)
    std = np.sqrt(ma.average((masked_map-average)**2, weights=tract_data)) # weighted std
    return average, std

''' Theres a lot of loading going on in these functions...maybe have the args being optionally file name or data array
so a tract can be loaded once and passed around to calculate various metrics?'''
def averaged_tract_volume(tract_data, threshold):
    masked_map = ma.masked_less_equal(tract_data, threshold)
    return masked_map.count() * 8.e-3 # assuming voxel size is 2x2x2mm, this gives volume in ml (cm^3)

def get_nifti_data(file_path):
    return nib.load(file_path).get_data()

def average_density_map():
    pass
    



    
    
    