import json
import datetime
import time
import io
import zipfile

from flask import current_app, Blueprint, render_template, request, send_file, jsonify, make_response
from flask_jsontools import jsonapi
import numpy as np
import nibabel as nib
from nibabel.nifti1 import Nifti1Image
from jquery_unparam import jquery_unparam

from megatrack import bcrypt, db
from megatrack.models import Tract, Subject, Dataset, SubjectTractMetrics, DatasetTracts
import megatrack.utils.cache_utils as cu
from megatrack.utils.cache_utils import JobCache
import megatrack.utils.data_utils as du
import megatrack.utils.database_utils as dbu

megatrack = Blueprint('megatrack', __name__)

def file_path_relative_to_root_path(file_path):
    '''Flask accesses the file system relative to the path of the megatrack package directory
    while other libraries access relative to the current working directory (should be the directory
    above the megatrack package). Config is defined relative to cwd so this fixes that issue.'''
    return '../' + file_path 

def check_request_query(query):
    if not isinstance(query, dict):
        return False
    else:
        for key in query:
            if not isinstance(query[key], dict):
                return False
    return True

@megatrack.route('/')
def index():
    return render_template('index.html')

@megatrack.route('/lesion')
def lesions():
    return render_template('lesions.html')

@megatrack.route('/about')
def about():
    return render_template('about.html')

@megatrack.route('/contact')
def contact():
    return render_template('contact.html')

@megatrack.route('/admin')
def admin():
    return render_template('admin.html')

@megatrack.route('/get_template')
def get_template():
    current_app.logger.info('Getting template...')
    data_dir = current_app.config['DATA_FILE_PATH']
    file_path = file_path_relative_to_root_path(data_dir+'/'+du.TEMPLATE_FILE_NAME)
    try:
        r = send_file(file_path, as_attachment=True, attachment_filename=du.TEMPLATE_FILE_NAME, conditional=True, add_etags=True)
        r.make_conditional(request)
        return r
    except FileNotFoundError:
        return "Could not find MRI template.", 500

@jsonapi
@megatrack.route('/tract_select')
def populate_tract_select():
    current_app.logger.info('Getting available tracts...')
    result, ignored_tracts = dbu.get_tract_select_info()
    if ignored_tracts:
        current_app.logger.info(f'Ignoring tracts {ignored_tracts} as they are not assigned to any datasets in dataset_tracts table')
    return jsonify(result)

@jsonapi
@megatrack.route('/dataset_select')
def populate_dataset_select():
    current_app.logger.info('Getting available datasets...')
    return jsonify(dbu.get_dataset_select_info())

@jsonapi
@megatrack.route('/query_report')
def query_report():
    '''
    What data is to be sent back to client? Total no. subjects selected, no. per dataset, per gender, per handedness etc?
    Send a json object {"dataset": {"BRC_ATLAS": 10, "OTHER_DATASET": 9}, "gender": {"Male": 7, "Female":12}} to start with
    '''
    current_app.logger.info('Getting query report...')
    query_string_decoded = request.query_string.decode('utf-8')
    request_query = jquery_unparam(query_string_decoded)
    if not check_request_query(request_query):
        current_app.logger.info(f'Could not parse param string {json.dumps(request_query, indent=4)}.')
        return 'Could not parse query param string.', 400
    query_report = dbu.subjects_per_dataset(request_query)
    return jsonify(query_report)
    

@megatrack.route('/generate_mean_maps')
def generate_mean_maps():
    # instantiate JobCache
    cache = JobCache(current_app.cache, current_app.cache_lock)
    
    # construct cache key
    query_string_decoded = request.query_string.decode('utf-8')
    cache_key = cu.construct_cache_key(query_string_decoded)
    
    # jquery_unparam query string
    # check request query is valid
    request_query = jquery_unparam(query_string_decoded)
    if not check_request_query(request_query):
        current_app.logger.info(f'Could not parse param string {json.dumps(request_query, indent=4)}')
        return 'Could not parse query param string.', 400
    
    current_app.logger.info('Attempting to add job mean_maps')
    status = cache.add_job_locked(cache_key, 'mean_maps')
    
    if status is None:
        # could not access cache so no point doing the work if we can't cache it
        current_app.logger.info(f'Could not access cache, returning...')
        return 'Could not access cache', 204
    
    elif status in ['PROCEED', 'FAILED']:
        current_app.logger.info(f'Job status is {status}')
        subject_ids_dataset_paths = dbu.subject_id_dataset_file_path(request_query)
        
        if len(subject_ids_dataset_paths) > 0:
            
            current_app.logger.info(f'Adding mean_maps job for query {json.dumps(request_query, indent=4)}')
            cache.job_in_progress(cache_key, 'mean_maps')
            
            data_dir = current_app.config['DATA_FILE_PATH']
            mean_FA = du.subject_averaged_FA(subject_ids_dataset_paths, data_dir)
            mean_MD = du.subject_averaged_MD(subject_ids_dataset_paths, data_dir)

            cache.job_complete(cache_key, 'mean_maps', {'FA': mean_FA, 'MD': mean_MD})
            current_app.logger.info(f'mean_maps job complete for query {json.dumps(request_query, indent=4)}')
                
            return 'Mean maps created', 204
        else:
            # no subjects returned in query
            current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
            cache.remove_job(cache_key, 'mean_maps')
            return 'No subjects returned in query', 204
    
    elif status in ['STAGED', 'IN_PROGRESS', 'COMPLETE']:
        
        current_app.logger.info('mean_maps job in_progress or complete, returning...')
        return 'Mean maps job in progress or complete', 204
    
    else:
        
        return f'Unrecognised status {status} for job mean_maps with query {json.dumps(request_query, indent=4)}.', 500
    
    
@megatrack.route('/tract/<tract_code>')
def get_tract(tract_code):
    
    cache = JobCache(current_app.cache, current_app.cache_lock)
    
    # construct cache key
    query_string_decoded = request.query_string.decode('utf-8')
    cache_key = cu.construct_cache_key(query_string_decoded)
    
    # jquery_unparam query string
    # check request query is valid
    request_query = jquery_unparam(query_string_decoded)
    request_query.pop('file_type', None) # remove query param required for correct parsing of nii.gz client side
    if not check_request_query(request_query):
        current_app.logger.warn(f'Could not parse param string {query_string_decoded}, returning 400...')
        return 'Could not parse query param string.', 400
    
    current_app.logger.info(f'Getting tract {tract_code} for query {json.dumps(request_query, indent=4)}')
    
    # validate tract code
    tract = dbu.get_tract(tract_code) 
    if not tract:
        current_app.logger.warn(f'Nonexistent tract code {tract_code}, returning 400...')
        return f'The requested tract {tract_code} does not exist', 400
    
    status = cache.add_job_locked(cache_key, tract_code)
    
    if status in ['PROCEED', None]: # new job created or could not access cache
        
        current_app.logger.info(f'Job status is {status}')
        file_path_data = dbu.density_map_file_path_data(request_query)
        
        if len(file_path_data) > 0:
            
            if status:
                current_app.logger.info(f'Adding {tract_code} job for query {json.dumps(request_query, indent=4)}')
                cache.job_in_progress(cache_key, tract_code)
            else:
                current_app.logger.info(f'Calculating probability map for tract {tract_code} and query {json.dumps(request_query, indent=4)}')
                
            data_dir = current_app.config['DATA_FILE_PATH'] # file path to data folder
            file_path = du.generate_average_density_map(data_dir, file_path_data, tract, 'MNI')
            
            if status:
                cache.job_complete(cache_key, tract_code, file_path)
                current_app.logger.info(f'{tract_code} job complete for query {json.dumps(request_query, indent=4)}')
            else:
                current_app.logger.info(f'Completed probabilty map for tract {tract_code} and query {json.dumps(request_query, indent=4)}')
            
            file_path = file_path_relative_to_root_path(file_path)
            return send_file(file_path,
                             as_attachment=True,
                             attachment_filename=tract_code+'.nii.gz',
                             conditional=True,
                             add_etags=True)
        else:
            current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
            return "No subjects returned for the current query", 404
            
    elif status in ['STAGED', 'IN_PROGRESS']: # another worker is running the job
        
        current_app.logger.info(f'{tract_code} job in progress, waiting to complete...')
        # poll cache waiting for complete status (max wait 10 secs before quitting)
        timeout = 10
        cache.poll_cache(cache_key, tract_code, timeout, 0.2)
        
        # set status to FAILED if not COMPLETE after 10 secs
        if cache.job_status(cache_key, tract_code) == 'COMPLETE':
            file_path = cache.job_result(cache_key, tract_code)
            file_path = file_path_relative_to_root_path(file_path)
            return send_file(file_path,
                             as_attachment=True,
                             attachment_filename=tract_code+'.nii.gz',
                             conditional=True,
                             add_etags=True)
        else:
            current_app.logger.warn(f'{tract_code} job did not complete in {timeout} secs, setting job status to FAILED.')
            cache.job_failed(cache_key, tract_code)
            return f'Job {tract_code} timed out for query {json.dumps(request_query, indent=4)}.', 500
    
    elif status == 'COMPLETE': # job has already been completed
        
        current_app.logger.info(f'{tract_code} job complete.')
        # job has already been run, get file_path from cache
        file_path = cache.job_result(cache_key, tract_code)
        file_path = file_path_relative_to_root_path(file_path)
        return send_file(file_path,
                         as_attachment=True,
                         attachment_filename=tract_code+'.nii.gz',
                         conditional=True,
                         add_etags=True)
        
    elif status == 'FAILED': # job was attempted but failed
        
        return f'Job {tract_code} failed for query {json.dumps(request_query, indent=4)}.', 500
    
    else:
        
        return f'Unrecognised status {status} for job {tract_code} with query {json.dumps(request_query, indent=4)}.', 500


@jsonapi
@megatrack.route('/get_tract_info/<tract_code>/<threshold>')
def get_dynamic_tract_info(tract_code, threshold):
    current_app.logger.info(f'Getting dynamic tract info for tract {tract_code} and threshold {threshold}.')
    
    cache = JobCache(current_app.cache, current_app.cache_lock)
    
    query_string_decoded = request.query_string.decode('utf-8')
    cache_key = cu.construct_cache_key(query_string_decoded)
    
    # jquery_unparam query string
    # check request query is valid
    request_query = jquery_unparam(query_string_decoded)
    if not check_request_query(request_query):
        current_app.logger.info(f'Could not properly parse param string {query_string_decoded} in /generate_mean_maps, returning 400...')
        return 'Could not parse query param string.', 400
    
    # validate tract code
    tract = dbu.get_tract(tract_code)
    if not tract:
        current_app.logger.info(f'Tract with code {tract_code} does not exist, returning 404...')
        return 'The requested tract ' + tract_code + ' does not exist', 404
    
    # validate threshold
    try:
        threshold = int(threshold) * (255. / 100) # scale threshold to 0 - 255 since density map is stored in this range
    except ValueError:
        current_app.logger.info('Invalid threshold value applied, returning 404...')
        return f'Invalid threshold value {threshold} sent to server.', 404
    
    # check mean_maps job status
    mean_maps_status = cache.add_job_locked(cache_key, 'mean_maps')
    
    if mean_maps_status in ['PROCEED', 'FAILED', None]:
        # job ready to go or cache could not be accessed
        current_app.logger.info(f'mean_maps job status is {mean_maps_status}. Generating mean_maps for query {json.dumps(request_query, indent=4)}')
        subject_ids_dataset_paths = dbu.subject_id_dataset_file_path(request_query)
        
        if len(subject_ids_dataset_paths) > 0:
            
            if mean_maps_status: cache.job_in_progress(cache_key, 'mean_maps')
                
            data_dir = current_app.config['DATA_FILE_PATH']
            mean_FA = du.subject_averaged_FA(subject_ids_dataset_paths, data_dir)
            mean_MD = du.subject_averaged_MD(subject_ids_dataset_paths, data_dir)
            
            if mean_maps_status: cache.job_complete(cache_key, 'mean_maps', {'FA': mean_FA, 'MD': mean_MD})
                
        else:
            # no subjects returned in query
            current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
            return 'No subjects returned in query', 404
    
    elif mean_maps_status in ['STAGED', 'IN_PROGRESS']:
        
        current_app.logger.info(f'mean_maps job in progress waiting for job to finish...')
        # poll cache until COMPLETE
        # set status to failed if waiting 20 secs
        timeout = 20
        cache.poll_cache(cache_key, 'mean_maps', timeout, 0.2)
        
        if cache.job_status(cache_key, 'mean_maps') == 'COMPLETE':
            current_app.logger.info('mean_maps job complete')
            # get FA and MD maps from cache
            mean_maps = cache.job_result(cache_key, 'mean_maps')
            FA_file_path = mean_maps.get('FA')
            MD_file_path = mean_maps.get('MD')
        else:
            current_app.logger.warn(f'mean_maps job failed to complete in {timeout} secs, setting job status to FAILED and returning...')
            cache.job_failed(cache_key, 'mean_maps')
            return 'mean_maps job FAILED', 500
    
    elif mean_maps_status == 'COMPLETE':
        current_app.logger.info('mean_maps job complete')
        # get FA and MD maps from cache
        mean_maps = cache.job_result(cache_key, 'mean_maps')
        FA_file_path = mean_maps.get('FA')
        MD_file_path = mean_maps.get('MD')
        
    # check if tract probability map has been cached or needs to be recreated
    tract_status = cache.add_job_locked(cache_key, tract_code)
    
    if tract_status in ['PROCEED', 'FAILED', None]: # new job created or could not access cache
        current_app.logger.info(f'{tract_code} job status is {tract_status}, generating new probability map...')
        file_path_data = dbu.density_map_file_path_data(request_query)
        
        if len(file_path_data) > 0:
            
            if tract_status:
                current_app.logger.info(f'Adding {tract_code} job for query {json.dumps(request_query, indent=4)}')
                cache.job_in_progress(cache_key, tract_code)
            else:
                current_app.logger.info(f'Calculating probability map for tract {tract_code} and query {json.dumps(request_query, indent=4)}')
                
            data_dir = current_app.config['DATA_FILE_PATH'] # file path to data folder
            tract_file_path = du.generate_average_density_map(data_dir, file_path_data, tract, 'MNI')
            
            if tract_status:
                cache.job_complete(cache_key, tract_code, tract_file_path)
                current_app.logger.info(f'{tract_code} job complete for query {json.dumps(request_query, indent=4)}')
            else:
                current_app.logger.info(f'Completed probabilty map for tract {tract_code} and query {json.dumps(request_query, indent=4)}')
            
        else:
            current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
            return "No subjects returned for the current query", 404
            
    elif tract_status in ['STAGED', 'IN_PROGRESS']: # another worker is running the job
        
        current_app.logger.info(f'{tract_code} job in progress, waiting to complete...')
        # poll cache waiting for complete status (max wait 10 secs before quitting)
        timeout = 10
        cache.poll_cache(cache_key, tract_code, timeout, 0.2)
        
        # set status to FAILED if not COMPLETE after 10 secs
        if cache.job_status(cache_key, tract_code) == 'COMPLETE':
            tract_file_path = cache.job_result(cache_key, tract_code)
        else:
            current_app.logger.warn(f'{tract_code} job did not complete in {timeout} secs, setting job status to FAILED.')
            cache.job_failed(cache_key, tract_code)
            return f'Job {tract_code} timed out for query {json.dumps(request_query, indent=4)}.', 500
    
    elif tract_status == 'COMPLETE': # job has already been completed
        
        current_app.logger.info(f'{tract_code} job complete.')
        # job has already been run, get file_path from cache
        tract_file_path = cache.job_result(cache_key, tract_code)
        
    
    # calculate results and return
    FA_map_data = du.get_nifti_data(FA_file_path)
    MD_map_data = du.get_nifti_data(MD_file_path)
    tract_data = du.get_nifti_data(tract_file_path)
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

    return jsonify(results)


@jsonapi
@megatrack.route('/get_tract_info/<tract_code>')
def get_static_tract_info(tract_code):
    '''Calculates the mean/std FA/MD + vol from the individual metrics of subjects in the query''' 
    current_app.logger.info(f'Getting static info for tract {tract_code}')
    
    tract = dbu.get_tract(tract_code)
    request_query = jquery_unparam(request.query_string.decode('utf-8'))
    subject_tract_metrics = dbu.subject_tract_metrics(request_query, tract.code)
    if len(subject_tract_metrics) > 0:
        averaged_metrics = np.mean(subject_tract_metrics, axis=0)
    
        results = {}
        results['tractCode'] = tract.code
        results['volume'] = averaged_metrics[0]
        results['meanFA'] = averaged_metrics[1]
        results['meanMD'] = averaged_metrics[2]
        results['stdFA'] = averaged_metrics[3]
        results['stdMD'] = averaged_metrics[4]
        results['name'] = tract.name
        results['description'] = tract.description
        return jsonify(results)
    else:
        current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
        return 'No subjects returned for the current query', 404
    
@megatrack.route('/download/tract/<tract_code>')
def download_tract(tract_code):
    current_app.logger.info(f'Downloading tract info with code {tract_code}')
    
    cache = JobCache(current_app.cache, current_app.cache_lock)
    
    query_string_decoded = request.query_string.decode('utf-8')
    cache_key = cu.construct_cache_key(query_string_decoded)
    
    # validate request query and tract_code
    request_query = jquery_unparam(query_string_decoded)
    if not check_request_query(request_query):
        current_app.logger.info(f'Could not properly parse param string {query_string_decoded} in /generate_mean_maps, returning 400...')
        return 'Could not parse query param string.', 400
    
    # validate tract code
    tract = dbu.get_tract(tract_code)
    if not tract:
        current_app.logger.info(f'Tract with code {tract_code} does not exist, returning 404...')
        return 'The requested tract ' + tract_code + ' does not exist', 404
    
    # check tract prob map and mean maps are in cache
    # if not in there, re-calculate them
    # else get file paths from the cache
    mean_maps_status = cache.add_job_locked(cache_key, 'mean_maps')
    
    if mean_maps_status in ['PROCEED', 'FAILED', None]:
        # job ready to go or cache could not be accessed
        current_app.logger.info(f'mean_maps job status is {mean_maps_status}. Generating mean_maps for query {json.dumps(request_query, indent=4)}')
        subject_ids_dataset_paths = dbu.subject_id_dataset_file_path(request_query)
        
        if len(subject_ids_dataset_paths) > 0:
            
            if mean_maps_status: cache.job_in_progress(cache_key, 'mean_maps')
                
            data_dir = current_app.config['DATA_FILE_PATH']
            mean_FA = du.subject_averaged_FA(subject_ids_dataset_paths, data_dir)
            mean_MD = du.subject_averaged_MD(subject_ids_dataset_paths, data_dir)
            
            if mean_maps_status: cache.job_complete(cache_key, 'mean_maps', {'FA': mean_FA, 'MD': mean_MD})
                
        else:
            # no subjects returned in query
            current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
            return 'No subjects returned in query', 404
    
    elif mean_maps_status in ['STAGED', 'IN_PROGRESS']:
        
        current_app.logger.info(f'mean_maps job in progress waiting for job to finish...')
        # poll cache until COMPLETE
        # set status to failed if waiting 20 secs
        timeout = 20
        cache.poll_cache(cache_key, 'mean_maps', timeout, 0.2)
        
        if cache.job_status(cache_key, 'mean_maps') == 'COMPLETE':
            current_app.logger.info('mean_maps job complete')
            # get FA and MD maps from cache
            mean_maps = cache.job_result(cache_key, 'mean_maps')
            FA_file_path = mean_maps.get('FA')
            MD_file_path = mean_maps.get('MD')
        else:
            current_app.logger.warn(f'mean_maps job failed to complete in {timeout} secs, setting job status to FAILED and returning...')
            cache.job_failed(cache_key, 'mean_maps')
            return 'mean_maps job FAILED', 500
    
    elif mean_maps_status == 'COMPLETE':
        current_app.logger.info('mean_maps job complete')
        # get FA and MD maps from cache
        mean_maps = cache.job_result(cache_key, 'mean_maps')
        FA_file_path = mean_maps.get('FA')
        MD_file_path = mean_maps.get('MD')
        
    # check if tract probability map has been cached or needs to be recreated
    tract_status = cache.add_job_locked(cache_key, tract_code)
    
    if tract_status in ['PROCEED', 'FAILED', None]: # new job created or could not access cache
        current_app.logger.info(f'{tract_code} job status is {tract_status}, generating new probability map...')
        file_path_data = dbu.density_map_file_path_data(request_query)
        
        if len(file_path_data) > 0:
            
            if tract_status:
                current_app.logger.info(f'Adding {tract_code} job for query {json.dumps(request_query, indent=4)}')
                cache.job_in_progress(cache_key, tract_code)
            else:
                current_app.logger.info(f'Calculating probability map for tract {tract_code} and query {json.dumps(request_query, indent=4)}')
                
            data_dir = current_app.config['DATA_FILE_PATH'] # file path to data folder
            tract_file_path = du.generate_average_density_map(data_dir, file_path_data, tract, 'MNI')
            
            if tract_status:
                cache.job_complete(cache_key, tract_code, tract_file_path)
                current_app.logger.info(f'{tract_code} job complete for query {json.dumps(request_query, indent=4)}')
            else:
                current_app.logger.info(f'Completed probabilty map for tract {tract_code} and query {json.dumps(request_query, indent=4)}')
            
        else:
            current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
            return "No subjects returned for the current query", 404
            
    elif tract_status in ['STAGED', 'IN_PROGRESS']: # another worker is running the job
        
        current_app.logger.info(f'{tract_code} job in progress, waiting to complete...')
        # poll cache waiting for complete status (max wait 10 secs before quitting)
        timeout = 10
        cache.poll_cache(cache_key, tract_code, timeout, 0.2)
        
        # set status to FAILED if not COMPLETE after 10 secs
        if cache.job_status(cache_key, tract_code) == 'COMPLETE':
            tract_file_path = cache.job_result(cache_key, tract_code)
        else:
            current_app.logger.warn(f'{tract_code} job did not complete in {timeout} secs, setting job status to FAILED.')
            cache.job_failed(cache_key, tract_code)
            return f'Job {tract_code} timed out for query {json.dumps(request_query, indent=4)}.', 500
    
    elif tract_status == 'COMPLETE': # job has already been completed
        
        current_app.logger.info(f'{tract_code} job complete.')
        # job has already been run, get file_path from cache
        tract_file_path = cache.job_result(cache_key, tract_code)
    
    
    # get subjects and demographic tract metrics from db
    subjects = dbu.subjects_to_download(request_query)
    subject_tract_metrics = dbu.subject_tract_metrics(request_query, tract.code)
    if len(subject_tract_metrics) > 0:
        averaged_metrics = np.mean(subject_tract_metrics, axis=0)
    
        results = {}
        results['volume'] = averaged_metrics[0]
        results['meanFA'] = averaged_metrics[1]
        results['meanMD'] = averaged_metrics[2]
        results['stdFA'] = averaged_metrics[3]
        results['stdMD'] = averaged_metrics[4]
        results['name'] = tract.name
        results['description'] = tract.description
    else:
        current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
        return 'No subjects returned for the current query', 404
    
    data_dict = {
        'query': request_query,
        'subjects': subjects,
        'demographic_data': subject_tract_metrics
    }
    
    # construct json file with query, subjects, metrics in
    data_json = io.BytesIO(bytes(json.dumps(data_dict), 'utf-8'))
    # construct zip file containing: json file, tract prob map, mean maps (in memory)
    output = io.BytesIO()
    output_zip = zipfile.ZipFile(output, 'w')
    output_zip.write(data_json, arcname='data.json')
    output_zip.write(file_path_relative_to_root_path(tract_file_path), arcname=f'{tract_code}.nii.gz')
    output_zip.write(file_path_relative_to_root_path(MD_file_path), arcname='MD.nii.gz')
    output_zip.write(file_path_relative_to_root_path(FA_file_path), arcname='FA.nii.gz')
    
    # send file in request
    return send_file(output_zip,
                     as_attachment=True,
                     attachment_filename=f'mgtrk_{tract_code}.zip',
                     conditional=True,
                     add_etags=True)

@megatrack.route('/get_trk/<tract_code>')
def get_trk(tract_code):
    tract = dbu.get_tract(tract_code)
    data_dir = current_app.config['DATA_FILE_PATH']
    return send_file('../'+data_dir+'/trk/'+tract.file_path+'.trk', as_attachment=True, attachment_filename=tract.code+'.trk', conditional=True, add_etags=True)

@megatrack.route('/get_cortex')
def get_cortex():
    data_dir = current_app.config['DATA_FILE_PATH']
    return send_file('../'+data_dir+'/cortex6mb.stl', as_attachment=True, attachment_filename='cortex.stl', conditional=True, add_etags=True)

@megatrack.route('/_test_viewer')
def _test_viewer():
    '''Serve QUnit test file for javascript Viewer.'''
    return render_template('test_viewer.html') if current_app.debug else render_template('page_not_found.html'), 404
