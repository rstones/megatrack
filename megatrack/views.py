from megatrack.models import Tract, Subject, Dataset, SubjectTractMetrics
from flask import current_app, Blueprint, render_template, request, send_file, jsonify
from flask_jsontools import jsonapi
import numpy as np
import nibabel as nib
from nibabel.nifti1 import Nifti1Image
import datetime
from jquery_unparam import jquery_unparam
import json
import megatrack.cache_utils as cu
import megatrack.data_utils as du
import megatrack.database_utils as dbu
import time
 
megatrack = Blueprint('megatrack', __name__)

def file_path_relative_to_root_path(file_path):
    '''Flask accesses the file system relative to the path of the megatrack package directory
    while other libraries access relative to the current working directory (should be the directory
    above the megatrack package). Config is defined relative to cwd so this fixes that issue.'''
    return '../' + file_path 

@megatrack.route('/')
def index():
    user_agent = request.headers['User-Agent']
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
    if not cached_data or not cu.check_items_in_cache(cached_data, 'query_report', 'subject_file_paths'):
        current_app.logger.info('Calculating cache stuff...')
        request_query = jquery_unparam(query_string_decoded)
        query_report, subject_file_paths = dbu.construct_subject_file_paths(request_query, current_app.config['DATA_FILE_PATH'])
        
        cached_data = cu.add_to_cache_dict(cached_data, {'query_report':query_report, 'subject_file_paths': subject_file_paths})
        current_app.cache.set(cache_key, cached_data)
    
    return jsonify(cached_data['query_report'])

@megatrack.route('/generate_mean_maps')
def generate_mean_maps():
    current_app.logger.info('Generating mean MD and FA maps...')
    query_string_decoded = request.query_string.decode('utf-8')
    cache_key = cu.construct_cache_key(query_string_decoded)
    cached_data = current_app.cache.get(cache_key)
    data_file_path = current_app.config['DATA_FILE_PATH']
    request_query = jquery_unparam(query_string_decoded)
    if not cached_data or cu.check_items_in_cache(cached_data, 'query_report', 'subject_file_paths'):
        # construct query report and subject file paths again
        current_app.logger.info('Regenerating full subject file paths...')
        query_report, subject_file_paths = dbu.construct_subject_file_paths(request_query, data_file_path)
        cached_data = cu.add_to_cache_dict(cached_data, {'query_report':query_report, 'subject_file_paths': subject_file_paths})
        current_app.cache.set(cache_key, cached_data)
    
    subject_file_paths = cached_data['subject_file_paths']
    
    mean_FA = du.subject_averaged_FA(subject_file_paths, data_file_path)
    mean_MD = du.subject_averaged_MD(subject_file_paths, data_file_path)
    current_app.logger.info('Putting mean map file paths in cache for query\n' + json.dumps(request_query, indent=4))
    current_app.cache.set(cache_key, cu.add_to_cache_dict(cached_data, {'FA': mean_FA, 'MD': mean_MD}))
    
    return 'Success!', 202

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
            dataset_filter = dbu.construct_subject_query_filter(request_query[key])
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
    
    data[np.nonzero(data)] = 255 # 'binarize' to 255 before averaging
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
            cached_data = cu.add_to_cache_dict(cached_data, {tract_code:temp_file_path})
            current_app.cache.set(cache_key, cached_data)
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
        threshold = int(threshold) * (255. / 100) # scale threshold to 0 - 255 since density map is stored in this range
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
            dataset_filter = dbu.construct_subject_query_filter(request_query[key])
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
        cached_data = cu.add_to_cache_dict(cached_data, {'FA':mean_FA, 'MD':mean_MD, tract_code:tract_file_path})
        current_app.cache.set(cache_key, cached_data)
        
    FA_map_data = du.get_nifti_data(cached_data['FA'])
    MD_map_data = du.get_nifti_data(cached_data['MD'])
    tract_data = du.get_nifti_data(cached_data[tract_code])
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
    
    current_app.logger.info('dynamics info for threshold ' + str(threshold) + ' \n' + str(results))

    return jsonify(results)

@jsonapi
@megatrack.route('/get_tract_info/<tract_code>')
def get_static_tract_info(tract_code):
    '''Calculates the mean/std FA/MD + vol from the individual metrics of subjects in the query''' 
    current_app.logger.info('Getting static info for tract ' + tract_code)
    cache_key = cu.construct_cache_key(request.query_string.decode('utf-8'))
    cached_data = current_app.cache.get(cache_key)
    request_query = jquery_unparam(request.query_string.decode('utf-8'))
    
    tract = Tract.query.filter(Tract.code == tract_code).first()
    if not tract:
        return 'The requested tract ' + tract_code + ' does not exist', 404
    
    if not cached_data or not cu.check_valid_filepaths_in_cache(cached_data, tract_code):
        # need to generate averaged density map again
        current_app.logger.info('Recalculating averaged density map for ' + tract_code)
        tract_dir = tract.file_path
        tract_file_name = tract_dir[tract_dir.index("_")+1:] # strips Left_ or Right_ from front of tract dir name
        data_file_path = current_app.config['DATA_FILE_PATH']
        subject_file_paths, subject_file_names = construct_subject_file_paths(request_query, data_file_path, tract_dir, tract_file_name)
        tract_file_path = generate_average_density_map(subject_file_paths, data_file_path, tract_code)
        current_app.logger.info('Caching averaged density map ' + tract_code + ' for query\n' + json.dumps(request_query, indent=4))
        cached_data = cu.add_to_cache_dict(cached_data, {tract_code:tract_file_path})
        current_app.cache.set(cache_key, cached_data)
    
    subject_ids = []
    for key in request_query:
        dataset_filter = dbu.construct_subject_query_filter(request_query[key])
        dataset_filter.append(Subject.dataset_code == key)
        ids = Subject.query.with_entities(Subject.subject_id).filter(*dataset_filter).all()
        subject_ids += np.array(ids).squeeze().tolist()

    subject_tract_metrics = SubjectTractMetrics.query.with_entities(
                                                            SubjectTractMetrics.volume, SubjectTractMetrics.mean_FA, 
                                                            SubjectTractMetrics.mean_MD, SubjectTractMetrics.std_FA,
                                                            SubjectTractMetrics.std_MD
                                                        ).filter(SubjectTractMetrics.tract_code == tract_code, \
                                                             SubjectTractMetrics.subject_id.in_(subject_ids)).all()
                                    
    subject_tract_metrics = np.array(subject_tract_metrics).astype(np.float)
    averaged_metrics = np.mean(subject_tract_metrics, axis=0)
    
    results = {}
    results['tractCode'] = tract_code
    results['volume'] = averaged_metrics[0]
    results['meanFA'] = averaged_metrics[1]
    results['meanMD'] = averaged_metrics[2]
    results['stdFA'] = averaged_metrics[3]
    results['stdMD'] = averaged_metrics[4]
    results['name'] = tract.name
    results['description'] = tract.description
    
    return jsonify(results)

@megatrack.route('/get_trk/<tract_code>')
def get_trk(tract_code):
    tract_file_path = Tract.query.with_entities(Tract.file_path).filter(Tract.code == tract_code).first()[0]
    data_file_path = current_app.config['DATA_FILE_PATH']
    return send_file('../'+data_file_path+'trk/'+tract_file_path+'.trk', as_attachment=True, attachment_filename=tract_code+'.trk', conditional=True, add_etags=True)
    
@megatrack.route('/_test_viewer')
def _test_viewer():
    '''Serve QUnit test file for javascript Viewer.'''
    return render_template('test_viewer.html') if current_app.debug else render_template('page_not_found.html'), 404
