from megatrack.models import Tract, Subject, Dataset
from flask import current_app, Blueprint, render_template, request, send_file, jsonify
from flask_jsontools import jsonapi
import numpy as np
import numpy.ma as ma
import nibabel as nib
from nibabel.nifti1 import Nifti1Image
import datetime
from jquery_unparam import jquery_unparam
import os
import json
import megatrack.cache_utils as cu
import megatrack.data_utils as du

megatrack = Blueprint('megatrack', __name__)

def file_path_relative_to_root_path(file_path):
    '''Flask accesses the file system relative to the path of the megatrack package directory
    while other libraries access relative to the current working directory (should be the directory
    above the megatrack package). Config is defined relative to cwd so this fixes that issue.'''
    return '../' + file_path 

@megatrack.route('/')
def index():
    return render_template('index.html')

@megatrack.route('/about')
def about():
    return render_template('about.html')

@megatrack.route('/contact')
def contact():
    return render_template('contact.html')

@megatrack.route('/get_template')
def get_template():
    current_app.logger.info('Loading template...')
    file_name = 'Template_T1_2mm_new_RAS.nii.gz'
    data_file_path = current_app.config['DATA_FILE_PATH']
    file_path = file_path_relative_to_root_path(data_file_path+file_name)
    r = send_file(file_path, as_attachment=True, attachment_filename=file_name, conditional=True, add_etags=True)
    r.make_conditional(request)
    return r

@jsonapi
@megatrack.route('/tract_select')
def populate_tract_select():
    current_app.logger.info('Getting available tracts...')
    tracts = Tract.query.all() # can order them in a certain way here
    return jsonify(tracts)

@jsonapi
@megatrack.route('/dataset_select')
def populate_dataset_select():
    current_app.logger.info('Getting available datasets...')
    datasets = Dataset.query.all()
    return jsonify(datasets)

@jsonapi
@megatrack.route('/query_report')
def query_report():
    '''
    What data is to be sent back to client? Total no. subjects selected, no. per dataset, per gender, per handedness etc?
    Send a json object {"dataset": {"BRC_ATLAS": 10, "OTHER_DATASET": 9}, "gender": {"Male": 7, "Female":12}} to start with
    '''
    current_app.logger.info('Requesting query report...')
    query_string_decoded = request.query_string.decode('utf-8')
    cache_key = cu.construct_cache_key(query_string_decoded)
    cached_data = current_app.cache.get(cache_key)
    if not cached_data or not cu.check_valid_filepaths_in_cache(cached_data, 'FA', 'MD'):
        '''Generate query report and preprocess averaged FA/MD maps'''
        request_query = jquery_unparam(query_string_decoded)
        results = {"dataset":{}}
        all_file_paths = []
        
        data_file_path = current_app.config['DATA_FILE_PATH'] # file path to data folder
        
        for key in request_query:
            dataset_filter = construct_subject_query_filter(request_query[key])
            dataset_filter.append(Subject.dataset_code == key)
            subject_file_paths = Subject.query.with_entities(Subject.file_path).filter(*dataset_filter).all()
            dataset_file_path = Dataset.query.with_entities(Dataset.file_path).filter(Dataset.file_path == key).first()[0]            
            for path in subject_file_paths:
                all_file_paths.append(data_file_path + dataset_file_path + '/full_brain_maps/' + path[0][:-5])
            results['dataset'][key] = len(subject_file_paths)
        
        current_app.logger.info('Generating mean FA map...')
        mean_FA = du.subject_averaged_FA(all_file_paths, data_file_path)
        current_app.logger.info('Generating mean MD map...')
        mean_MD = du.subject_averaged_MD(all_file_paths, data_file_path)
        current_app.logger.info('Putting query data in cache for query\n' + json.dumps(request_query, indent=4))
        current_app.cache.set(cache_key, cu.add_to_cache_dict(cached_data, {'query_report':results, 'FA':mean_FA, 'MD':mean_MD}))
    else:
        results = cached_data['query_report']
    
    return jsonify(results)

def construct_subject_query_filter(dataset_constraints):
    dataset_filter = []
    for constraint_field in dataset_constraints:
        constraint_info = dataset_constraints[constraint_field]
        if constraint_info['type'] == 'radio':
            dataset_filter.append(getattr(Subject, constraint_field) == constraint_info['value'])
        elif constraint_info['type'] == 'range':
            dataset_filter.append(getattr(Subject, constraint_field) >= constraint_info['min'])
            dataset_filter.append(getattr(Subject, constraint_field) <= constraint_info['max'])
        elif constraint_info['type'] == 'checkbox':
            dataset_filter.append(getattr(Subject, constraint_field).in_(constraint_info['values']))
        else:
            # maybe just want to warn here and carry on with next constraint?
            raise ValueError('Unexpected query type "' + constraint_info['type'] + '" received from client!')
    return dataset_filter

def construct_subject_file_paths(request_query, data_file_path, tract_dir, tract_file_name):
    subject_file_paths = []
    subject_file_names = []
    if request_query:
        for key in request_query:
            # get file path for the datasets
            dataset = Dataset.query.filter(Dataset.code == key).first()
            if not dataset:
                continue # this dataset doesn't exist, try next one
            dataset_dir = dataset.file_path
            dataset_filter = construct_subject_query_filter(request_query[key])
            dataset_filter.append(Subject.dataset_code == key)
            subject_file_names = Subject.query.with_entities(Subject.file_path).filter(*dataset_filter).all()
            for i in range(len(subject_file_names)):
                subject_file_paths.append(data_file_path + dataset_dir + '/' + tract_dir + '/' + subject_file_names[i][0] + tract_file_name + '_2mm.nii.gz')
    else: # average all the density maps for this tract if no query selected
        subject_dataset_file_names = Subject.query.join(Dataset).with_entities(Subject.file_path, Dataset.file_path).all()
        for i in range(len(subject_dataset_file_names)):
            subject_file_name = subject_dataset_file_names[i][0] 
            dataset_dir = subject_dataset_file_names[i][1]
            subject_file_paths.append(data_file_path + dataset_dir + '/' + tract_dir + '/' + subject_file_name + tract_file_name + '_2mm.nii.gz')
            subject_file_names.append(subject_file_name)
    return subject_file_paths, subject_file_names

def generate_average_density_map(file_paths, data_file_path, tract_code):
    '''Loads and averages the tract density maps in the file_paths list.
    Then saves averaged density map in data/temp folder so it can be sent in
    response later.
    '''
    data = np.zeros((len(file_paths), 91, 109, 91), dtype=np.int16)
    for i in range(len(file_paths)):
        data[i] = nib.load(file_paths[i]).get_data()
    
    # binarize data before averaging (why?)
    '''Maybe binarizing didn't work well because setting the nonzero elements to 1 didn't match up with the 
    max intensities?
    '''
    
#     masked_data = ma.masked_equal(data, 0)
#     mean = ma.mean(masked_data, axis=0)
    
    #data[np.nonzero(data)] = 1
    data = np.where(data > 0, 1, 0)
    mean = np.mean(data, axis=0)
    # add the template affine and header to the averaged nii to ensure correct alignment in XTK library
    template = nib.load(data_file_path+'Template_T1_2mm_new_RAS.nii.gz')
    new_img = Nifti1Image(mean.astype(np.int16), template.affine, template.header)
    temp_file_path = 'data/temp/'+tract_code+'_'+'{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now())+'.nii.gz'
    # is there a better way to return the averaged nifti without having to save it first?
    nib.save(new_img, temp_file_path)
    return temp_file_path
    
@megatrack.route('/tract/<tract_code>')
def get_tract(tract_code):
    current_app.logger.info('Getting tract ' + tract_code)
    
    tract = Tract.query.filter(Tract.code == tract_code).first()
    cache_key = cu.construct_cache_key(request.query_string.decode('utf-8'))
    cached_data = current_app.cache.get(cache_key)
    if not cached_data or not cu.check_valid_filepaths_in_cache(cached_data, tract_code): # either request not cached or associated density map doesn't exist
        current_app.logger.info('No density map in cache so calculating average from scratch')
        if not tract:
            return 'The requested tract ' + tract_code + ' does not exist', 404
        tract_dir = tract.file_path
        tract_file_name = tract_dir[tract_dir.index("_")+1:] # strips Left_ or Right_ from front of tract dir name
        
        data_file_path = current_app.config['DATA_FILE_PATH'] # file path to data folder
        
        request_query = jquery_unparam(request.query_string.decode('utf-8'))
        request_query.pop('file_type', None) # remove query param required for correct parsing of nii.gz client side 
        
        subject_file_paths, subject_file_names = construct_subject_file_paths(request_query, data_file_path, tract_dir, tract_file_name)
        
        if subject_file_paths:
            temp_file_path = generate_average_density_map(subject_file_paths, data_file_path, tract_code)
            current_app.logger.info('Caching temp file path of averaged density map for tract ' + tract_code)
            current_app.cache.set(cache_key, cu.add_to_cache_dict(cached_data, {tract_code:temp_file_path}))
        else:
            return "No subjects returned for the current query", 404
    else:
        temp_file_path = cached_data[tract_code]
            
    temp_file_path = file_path_relative_to_root_path(temp_file_path)
    return send_file(temp_file_path, as_attachment=True, attachment_filename=tract_code+'.nii.gz', conditional=True, add_etags=True)

@jsonapi
@megatrack.route('/get_tract_info/<tract_code>/<threshold>')
def get_dynamic_tract_info(tract_code, threshold):
    '''Calculates the mean/std FA/MD + vol for the thresholded averaged tract density map''' 
    current_app.logger.info('Getting dynamic info for tract ' + tract_code)
    cache_key = cu.construct_cache_key(request.query_string.decode('utf-8'))
    cached_data = current_app.cache.get(cache_key)
    
    try:
        threshold = int(threshold) / 100 # fail gracefully here in case threshold can't be cast to int
    except ValueError:
        current_app.logger.info('Invalid threshold value applied returning 404...')
        return 'Invalid threshold value ' + str(threshold) + ' sent to server.', 404
    
    tract = Tract.query.filter(Tract.code == tract_code).first()
    if not tract:
        return 'The requested tract ' + tract_code + ' does not exist', 404
    
    if not cached_data or not cu.check_valid_filepaths_in_cache(cached_data, 'FA', 'MD', tract_code):
        # recalculate everything: mean FA/MD etc..
        current_app.logger.info('Recalculating mean FA/MD and averaged density map for ' + tract_code)
        tract_dir = tract.file_path
        tract_file_name = tract_dir[tract_dir.index("_")+1:] # strips Left_ or Right_ from front of tract dir name
        request_query = jquery_unparam(request.query_string.decode('utf-8'))
        data_file_path = current_app.config['DATA_FILE_PATH']
#         subject_file_paths, subject_file_names = construct_subject_file_paths(request_query, data_file_path, tract_dir, tract_file_name)
#         temp_file_path = generate_average_density_map(subject_file_paths, data_file_path, tract_code)
        
        all_file_paths = []
        
        for key in request_query:
            dataset_filter = construct_subject_query_filter(request_query[key])
            dataset_filter.append(Subject.dataset_code == key)
            subject_file_paths = Subject.query.with_entities(Subject.file_path).filter(*dataset_filter).all()[0]
            dataset_file_path = Dataset.query.with_entities(Dataset.file_path).filter(Dataset.file_path == key).first()[0]            
            for path in subject_file_paths:
                all_file_paths.append(data_file_path + dataset_file_path + '/full_brain_maps/' + path[:-5])
                
        current_app.logger.info('Generating mean FA map...')
        mean_FA = du.subject_averaged_FA(all_file_paths, data_file_path)
        current_app.logger.info('Generating mean MD map...')
        mean_MD = du.subject_averaged_MD(all_file_paths, data_file_path)
        
        subject_file_paths, subject_file_names = construct_subject_file_paths(request_query, data_file_path, tract_dir, tract_file_name)
        
        if subject_file_paths:
            current_app.logger.info('Generating averaged tract density map for ' + tract_code + '...')
            tract_file_path = generate_average_density_map(subject_file_paths, data_file_path, tract_code)
        
        current_app.logger.info('Putting file paths to averaged maps in cache for query\n' + json.dumps(request_query, indent=4))
        current_app.cache.set(cache_key, \
                              cu.add_to_cache_dict(cached_data, {'FA':mean_FA, 'MD':mean_MD, tract_code:tract_file_path}))
        
    current_app.logger.info('THRESHOLD: ' + str(threshold))
    FA_map_data = du.get_nifti_data(cached_data['FA'])
    MD_map_data = du.get_nifti_data(cached_data['MD'])
    tract_data = du.get_nifti_data(cached_data[tract_code])
    current_app.logger.info('TRACT MAX: ' + str(np.amax(tract_data)))
    mean_FA, std_FA = du.averaged_tract_mean_std(FA_map_data, tract_data, threshold)
    mean_MD, std_MD = du.averaged_tract_mean_std(MD_map_data, tract_data, threshold)
    vol = du.averaged_tract_volume(tract_data, threshold)
    
    results = {}
    results['tractCode'] = tract_code
    results['tractName'] = tract.name
    results['volume'] = vol
    results['meanFA'] = mean_FA
    results['stdFA'] = std_FA
    results['meanMD'] = mean_MD
    results['stdMD'] = std_MD
    #results['description'] = tract.description
    
    return jsonify(results)

def calculate_mean_FA(density_map_data, subject_file_names):    
    # create mask (binarize)
    density_map_mask = np.zeros(density_map_data.shape, dtype=np.int16)
    density_map_mask[np.nonzero(density_map_data)] = 1
    
    # get subject FA maps for query and average
    subject_averaged_FA = np.zeros((len(subject_file_names), 91, 109, 91), dtype=np.float64)
    for i,file_name in enumerate(subject_file_names):
        subject_averaged_FA[i] = nib.load('megatrack/../data/brc_atlas/full_brain_maps/'+file_name[0][:13]+'FA.nii.gz').get_data()
    subject_averaged_FA = np.mean(subject_averaged_FA, axis=0)
    
    # get overlap of mask and subject averaged FA
    overlap = density_map_mask * subject_averaged_FA
    
    # average all resulting non-zero elements
    overlap_nonzero = overlap[np.nonzero(overlap)]
    mean_FA = np.sum(overlap_nonzero) / len(overlap_nonzero)
    return mean_FA
    
@megatrack.route('/_test_viewer')
def _test_viewer():
    '''Serve QUnit test file for javascript Viewer.'''
    return render_template('test_viewer.html') if current_app.debug else render_template('page_not_found.html'), 404
