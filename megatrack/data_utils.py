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

def file_path(data_dir, dataset_dir, subdir, subject_id, space, code, file_type):
    '''Constructs a file path to some data following the convention
    <data dir>/<dataset dir>/<subdir>/<space_dir:mni|native>/<subject_id>_<space:MNI|Native>_<code>.<file_type:nii.gz|trk>'''
    
    # check space code and ensure capitalisation is correct for later
    if space.lower() == 'mni':
        space = 'MNI'
    elif space.lower() == 'native':
        space = 'Native'
    else:
        raise ValueError('Invalid space code ' + str(space) + ' passed to data_utils.file_path')
    
    # check file type and ensure leading dot present for later
    if file_type.lower() in ['nii.gz', '.nii.gz']:
        file_type = '.nii.gz'
    elif file_type.lower() in ['trk', '.trk']:
        file_type = '.trk'
    else:
        raise ValueError('Unexpected file type ' + str(file_type) + ' passed to data_utils.file_path')
    
    # construct file path
    return data_dir + '/' \
            + dataset_dir + '/' \
            + subdir + '/' \
            + ('mni/' if space == 'MNI' else 'native/') \
            + subject_id + '_' \
            + space + '_' \
            + code \
            + file_type
            
def temp_file(data_dir, code, file_type):
    if file_type.lower() in ['.nii.gz', 'nii.gz']:
        file_type = '.nii.gz'
    else:
        raise ValueError('Unexpected file type ' + str(file_type) + ' passed to data_utils.temp_file')
    
    return data_dir + '/' + 'temp/' + code + '_' + '{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now()) + file_type
        
            
def generate_average_density_map(data_dir, subject_ids_dataset_paths, tract, space):
    '''Loads and averages the tract density maps in the file_paths list.
    Then saves averaged density map in data/temp folder so it can be sent in 
    a response later.
    '''
    data = np.zeros((len(subject_ids_dataset_paths), 91, 109, 91), dtype=np.int16)
    for i in range(len(subject_ids_dataset_paths)):
        subject_id = subject_ids_dataset_paths[i][0]
        dataset_dir = subject_ids_dataset_paths[i][1]
        data[i] = nib.load(file_path(data_dir, dataset_dir, tract.file_path, subject_id, space, tract.code, 'nii.gz')).get_data()
    
    data[np.nonzero(data)] = 255 # 'binarize' to 255 before averaging
    mean = np.mean(data, axis=0)
    
    # add the template affine and header to the averaged nii to ensure correct alignment in XTK library
    # maybe cache the template affine and header on startup so we don't need to do this load here?
    template = nib.load(data_dir+'/'+TEMPLATE_FILE_NAME)
    new_img = Nifti1Image(mean.astype(np.int16), template.affine, template.header)
    temp_file_path = temp_file(data_dir, tract.code , '.nii.gz')
    nib.save(new_img, temp_file_path)
    return temp_file_path

def subject_averaged_FA(subject_ids_dataset_paths, data_dir):
    template = nib.load(data_dir+'/'+TEMPLATE_FILE_NAME)
    new_img = Nifti1Image(subject_averaged_map(subject_ids_dataset_paths, 'FA', data_dir), template.affine, template.header)
    #file_path = data_file_path+'temp/mean_FA_'+'{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now())+'.nii.gz'
    file_path = temp_file(data_dir, 'FA', '.nii.gz')
    nib.save(new_img, file_path)
    return file_path

def subject_averaged_MD(subject_ids_dataset_paths, data_dir):
    template = nib.load(data_dir+'/'+TEMPLATE_FILE_NAME)
    new_img = Nifti1Image(subject_averaged_map(subject_ids_dataset_paths, 'MD', data_dir), template.affine, template.header)
    #file_path = data_file_path+'temp/mean_MD_'+'{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now())+'.nii.gz'
    file_path = temp_file(data_dir, 'MD', '.nii.gz')
    nib.save(new_img, file_path)
    return file_path

def subject_averaged_map(subject_ids_dataset_paths, map_code, data_dir):
    '''arg: map_code Currently should be either FA or MD'''
    subject_averaged_map = np.zeros((len(subject_ids_dataset_paths), 91, 109, 91), dtype=np.float64)
    try:
        for i in range(len(subject_ids_dataset_paths)):
            dataset_dir = subject_ids_dataset_paths[i][1]
            subject_id = subject_ids_dataset_paths[i][0]
            fp = file_path(data_dir, dataset_dir, 'full_brain_maps', subject_id, 'MNI', map_code, '.nii.gz')
            subject_averaged_map[i] = get_nifti_data(fp)
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
    



    
    
    