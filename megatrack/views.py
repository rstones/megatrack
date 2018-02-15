from .models import Tract, Subject, Dataset, SubjectTractMetrics, DatasetTracts, User, LesionUpload
from flask import current_app, Blueprint, render_template, request, send_file, jsonify, make_response
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
from megatrack import bcrypt, db

megatrack = Blueprint('megatrack', __name__)

def file_path_relative_to_root_path(file_path):
    '''Flask accesses the file system relative to the path of the megatrack package directory
    while other libraries access relative to the current working directory (should be the directory
    above the megatrack package). Config is defined relative to cwd so this fixes that issue.'''
    return '../' + file_path 

@megatrack.route('/')
def index():
    return render_template('index.html')

@megatrack.route('/lesions')
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

@megatrack.route('/login', methods=['POST'])
def login():
    try:
        user = User.query.filter(User.user_name == request.form['username']).first()
        if user and bcrypt.check_password_hash(user.password, request.form['password']):
            auth_token = user.encode_auth_token(user.user_id)
            if auth_token:
                responseObject = {
                    'status': 'success',
                    'message': 'Successfully logged in!',
                    'authToken': auth_token.decode()
                }
                return make_response(jsonify(responseObject)), 200
        else:
            return 'User does not exist or incorrect password used. Please try again.', 404
    except Exception as e:
        current_app.logger.error(e)
        return 'Log in failed. Please try again.', 500
    
@megatrack.route('/tracts', methods=['GET','POST','PUT','DELETE'])
def modify_tracts():
    if request.method == 'GET':
        pass
    elif request.method == 'POST':
        pass
    elif request.method == 'PUT':
        pass
    elif request.method == 'DELETE':
        pass

@megatrack.route('/datasets', methods=['GET','POST','PUT','DELETE'])
def modify_datasets():
    # get auth header and split to get the token string
    auth_header = request.headers.get('Authorization')
    auth_token = auth_header.split(" ")[1] if auth_header else ''
    
    if auth_token:
        # if auth token sent, deocde to get user id
        user_id = User.decode_auth_token(auth_token)
        # get user from database
        # is it necessary to check the user id exists in the database?
        # or is it sufficient that the token could be decoded using our secret key?
        # its useful to have the user name for logging purposes anyway 
        user = User.query.filter(User.user_id == user_id).first()
        
        if user:
            if request.method == 'GET':
                try:
                    datasets = Dataset.query.all()
                    response_object = {
                        'message': 'Successfully retrieved dataset records',
                        'datasets': datasets
                    }
                    current_app.logger.info(f'User {user.user_name} retrieved all dataset records.')
                    return make_response(jsonify(response_object)), 200
                except Exception as e:
                    current_app.logger.error(f'Error occurred while user "{user.user_name}" was attempting to get all dataset records.')
                    current_app.logger.error(e)
                    return 'An error occurred while getting datasets.', 500
                
            elif request.method == 'POST':
                form = request.form
                try:
                    dataset = Dataset(form['code'], form['name'], form['filePath'], form['queryParams'])
                    db.session.add(dataset)
                    db.session.commit()
                    current_app.logger.info(f'User "{user.user_name}" inserted a new dataset with code "{dataset.code}"')
                    return 'New dataset successfully created.', 201
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f'Error occurred while user "{user.user_name}" was attempting to insert dataset.')
                    current_app.logger.error(e)
                    return 'An error occurred while creating a dataset record.', 500
                
            elif request.method == 'PUT':
                form = request.form
                try:
                    dataset = Dataset.query.filter(Dataset.code == form['code']).first()
                    if dataset:
                        dataset.name = form['name']
                        dataset.file_path = form['filePath']
                        dataset.query_params = form['queryParams']
                        db.session.commit()
                        current_app.logger.info(f'User {user.user_name} updated dataset {dataset.code}.')
                        return 'Dataset successfully updated.', 200
                    else:
                        raise Exception('Can\'t update dataset that doesn\'t exist.')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f'Error occurred while user {user.user_name} was attempting to update dataset {dataset}.')
                    current_app.logger.error(e)
                    return 'An error occurred while updating dataset.', 500
            
            elif request.method == 'DELETE':
                code = request.args['code']
                if code:
                    try:
                        dataset = Dataset.query.filter(Dataset.code == code).first()
                        if dataset:
                            Dataset.query.filter(Dataset.code == code).delete()
                            db.session.commit()
                        else:
                            raise Exception(f'Cannot delete dataset with code "{code}" since a record doesn\'t exist.')
                        current_app.logger.info(f'User {user.user_name} deleted dataset {code}.')
                        return 'Dataset successfully deleted.', 200
                    except Exception as e:
                        db.session.rollback()
                        current_app.logger.error(f'Error occurred while user {user.user_name} was attempting to delete dataset with code {code}.')
                        current_app.logger.error(e)
                        return 'An error occurred while deleting dataset.', 500
                else:
                    current_app.logger.warn('No code sent with dataset DELETE request')
                    return 'No dataset code was sent with DELETE request.', 400
         
        else:
            current_app.logger.warn(f'No user with id "{user_id}" found in database.')
            return 'Invalid user id passed with authentication token', 401
    else:
        current_app.logger.warn('No authentication token sent with request to /datasets')
        return 'No authentication token sent with request.', 401

@megatrack.route('/get_template')
def get_template():
    current_app.logger.info('Loading template...')
    data_dir = current_app.config['DATA_FILE_PATH']
    file_path = file_path_relative_to_root_path(data_dir+'/'+du.TEMPLATE_FILE_NAME)
    r = send_file(file_path, as_attachment=True, attachment_filename=du.TEMPLATE_FILE_NAME, conditional=True, add_etags=True)
    r.make_conditional(request)
    return r

@jsonapi
@megatrack.route('/tract_select')
def populate_tract_select():
    current_app.logger.info('Getting available tracts...')
    result, ignored_tracts = dbu.get_tract_select_info()
    if ignored_tracts:
        current_app.logger.info('Ignoring tracts ' + str(ignored_tracts) + ' as they are not assigned to any datasets in dataset_tracts table')
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
    current_app.logger.info('Requesting query report...')
    query_string_decoded = request.query_string.decode('utf-8')
    cache_key = cu.construct_cache_key(query_string_decoded)
    cached_data = current_app.cache.get(cache_key)
    if not cached_data or not cu.check_items_in_cache(cached_data, 'query_report', 'subject_file_paths'):
        current_app.logger.info('Calculating cache stuff...')
        request_query = jquery_unparam(query_string_decoded)
        query_report = dbu.subjects_per_dataset(request_query)
        
        cached_data = cu.add_to_cache_dict(cached_data, {'query_report':query_report})
        current_app.cache.set(cache_key, cached_data)
    
    return jsonify(cached_data['query_report'])

@megatrack.route('/generate_mean_maps')
def generate_mean_maps():
    query_string_decoded = request.query_string.decode('utf-8')
    cache_key = cu.construct_cache_key(query_string_decoded)
    cached_data = current_app.cache.get(cache_key)
    data_dir = current_app.config['DATA_FILE_PATH']
    request_query = jquery_unparam(query_string_decoded)
    if not cached_data or not cu.check_items_in_cache(cached_data, 'query_report'):
        # construct query report and subject file paths again
        current_app.logger.info('Regenerating full subject file paths...')
        query_report = dbu.subjects_per_dataset(request_query)
        cached_data = cu.add_to_cache_dict(cached_data, {'query_report':query_report})
        current_app.cache.set(cache_key, cached_data)
    
    
    if not cu.check_items_in_cache(cached_data, 'FA', 'MD'):
        current_app.logger.info('Generating mean MD and FA maps...')
        subject_ids_dataset_paths = dbu.subject_id_dataset_file_path(request_query)
        
        mean_FA = du.subject_averaged_FA(subject_ids_dataset_paths, data_dir)
        mean_MD = du.subject_averaged_MD(subject_ids_dataset_paths, data_dir)
        current_app.logger.info('Putting mean map file paths in cache for query\n' + json.dumps(request_query, indent=4))
        current_app.cache.set(cache_key, cu.add_to_cache_dict(cached_data, {'FA': mean_FA, 'MD': mean_MD}))
    
    return 'Success!', 202
    
@megatrack.route('/tract/<tract_code>')
def get_tract(tract_code):
    current_app.logger.info('Getting tract ' + tract_code)
    
    tract = dbu.get_tract(tract_code)
    cache_key = cu.construct_cache_key(request.query_string.decode('utf-8'))
    cached_data = current_app.cache.get(cache_key)
    if not cached_data or not cu.check_valid_filepaths_in_cache(cached_data, tract_code): # either request not cached or associated density map doesn't exist
        current_app.logger.info('No density map in cache so calculating average from scratch')
        if not tract:
            return 'The requested tract ' + tract_code + ' does not exist', 404
        
        data_dir = current_app.config['DATA_FILE_PATH'] # file path to data folder
        request_query = jquery_unparam(request.query_string.decode('utf-8'))
        request_query.pop('file_type', None) # remove query param required for correct parsing of nii.gz client side 
        subject_ids_dataset_path = dbu.subject_id_dataset_file_path(request_query)
        
        if len(subject_ids_dataset_path) > 0:
            temp_file_path = du.generate_average_density_map(data_dir, subject_ids_dataset_path, tract, 'MNI')
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
    request_query = jquery_unparam(request.query_string.decode('utf-8'))
    data_dir = current_app.config['DATA_FILE_PATH']
    
    try:
        threshold = int(threshold) * (255. / 100) # scale threshold to 0 - 255 since density map is stored in this range
    except ValueError:
        current_app.logger.info('Invalid threshold value applied returning 404...')
        return 'Invalid threshold value ' + str(threshold) + ' sent to server.', 404
    
    tract = dbu.get_tract(tract_code)
    if not tract:
        return 'The requested tract ' + tract_code + ' does not exist', 404

    if not cached_data or not cu.check_valid_filepaths_in_cache(cached_data, tract_code):
        # recalculate average density map for tract
        subject_ids_dataset_path = dbu.subject_id_dataset_file_path(request_query)
        
        if len(subject_ids_dataset_path) > 0:
            current_app.logger.info('Generating averaged tract density map for ' + tract_code + '...')
            tract_file_path = du.generate_average_density_map(data_dir, subject_ids_dataset_path, tract, 'MNI')
        
        current_app.logger.info('Caching ' + str(tract.code) + ' density map for query\n' + json.dumps(request_query, indent=4))
        cached_data = cu.add_to_cache_dict(cached_data, {tract_code:tract_file_path})
        current_app.cache.set(cache_key, cached_data)
    
    if not cached_data or not cu.check_valid_filepaths_in_cache(cached_data, 'FA', 'MD'):
        # recalculate mean FA/MD etc..
        current_app.logger.info('Recalculating mean FA/MD maps for  query\n' + json.dumps(request_query, indent=4))
        
        subject_ids_dataset_paths = dbu.subject_id_dataset_file_path(request_query)
        mean_FA = du.subject_averaged_FA(subject_ids_dataset_paths, data_dir)
        mean_MD = du.subject_averaged_MD(subject_ids_dataset_paths, data_dir)
        
        current_app.logger.info('Caching MD/FA file paths for query\n' + json.dumps(request_query, indent=4))
        cached_data = cu.add_to_cache_dict(cached_data, {'FA':mean_FA, 'MD':mean_MD})
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

    return jsonify(results)

@jsonapi
@megatrack.route('/get_tract_info/<tract_code>')
def get_static_tract_info(tract_code):
    '''Calculates the mean/std FA/MD + vol from the individual metrics of subjects in the query''' 
    current_app.logger.info('Getting static info for tract ' + tract_code)
    cache_key = cu.construct_cache_key(request.query_string.decode('utf-8'))
    cached_data = current_app.cache.get(cache_key)
    request_query = jquery_unparam(request.query_string.decode('utf-8'))
    data_dir = current_app.config['DATA_FILE_PATH']
    
    if not cached_data or not cu.check_valid_filepaths_in_cache(cached_data, tract_code):
        # recalculate average density map for tract
        subject_ids_dataset_path = dbu.subject_id_dataset_file_path(request_query)
        tract = dbu.get_tract(tract_code)
        if not tract:
            return 'The requested tract ' + tract_code + ' does not exist', 404
        
        if len(subject_ids_dataset_path) > 0:
            current_app.logger.info('Generating averaged tract density map for ' + tract_code + '...')
            tract_file_path = du.generate_average_density_map(data_dir, subject_ids_dataset_path, tract, 'MNI')
        
        current_app.logger.info('Caching ' + str(tract.code) + ' density map for query\n' + json.dumps(request_query, indent=4))
        cached_data = cu.add_to_cache_dict(cached_data, {tract_code:tract_file_path})
        current_app.cache.set(cache_key, cached_data)
    
    tract = dbu.get_tract(tract_code)
    subject_tract_metrics = dbu.subject_tract_metrics(request_query, tract.code)
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

@megatrack.route('/get_trk/<tract_code>')
def get_trk(tract_code):
    tract = dbu.get_tract(tract_code)
    data_dir = current_app.config['DATA_FILE_PATH']
    return send_file('../'+data_dir+'/trk/'+tract.file_path+'.trk', as_attachment=True, attachment_filename=tract.code+'.trk', conditional=True, add_etags=True)


################################################################################
#
# Lesion mapping routes
#
################################################################################

from werkzeug.utils import secure_filename
import os
import numpy.linalg as npla

ALLOWED_EXTENSIONS = ['nii.gz']

def allowed_filename(filename):
    return '.' in filename \
                and filename.split('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@megatrack.route('/lesion_upload', methods=['POST'])
def lesion_upload():
    current_app.logger.info('Received request to upload lesion map.')
    if 'lesionmap' not in request.files:
        current_app.logger.info('Request did not contain a file part.')
        return 'Request did not contain a file part', 400
    file = request.files['lesionmap']
    if file.filename == '':
        current_app.logger.info('No file selected.')
        return 'No file selected', 400
    if file and allowed_filename(file.filename):
        current_app.logger.info(f'Filename allowed so saving lesion map {file.filename}...')
        filename = secure_filename(file.filename)
        extension = filename.split('.', 1)[1]
        
        data_dir = current_app.config['DATA_FILE_PATH']
        saved_filename = du.temp_file(data_dir, filename, extension)
        lesion_upload = LesionUpload(filename, saved_filename)
        db.session.add(lesion_upload)
        
        # generate lesion code
        lesion_code = lesion_upload.lesion_id
        
        path = os.path.join(current_app.config['LESION_UPLOAD_FOLDER'], saved_filename)
        file.save(path)
        
        # now check the nifti MNI transformation matches template
        
        lesion_map = nib.load(file_path_relative_to_root_path(path))
        lesion_map_header = lesion_map.header
        lesion_map_affine = lesion_map.get_sform()
        template = nib.load(file_path_relative_to_root_path(data_dir+'/'+du.TEMPLATE_FILE_NAME))
        template_header = template.header
        
        if np.all(lesion_map_header['dim'] != template_header['dim']):
            lesion_upload.dim_match = 'N'
            db.session.commit()
            return 'Nifti dimensions do not match template', 400
        elif np.all(lesion_map_header['pixdim'] != template_header['pixdim']):
            lesion_upload.dim_match = 'Y'
            lesion_upload.pixdim_match = 'N'
            db.session.commit()
            return 'Voxel size does not match template', 400
        elif npla.det(lesion_map_affine) < 0: # determinant of the affine should be positive for RAS coords
            lesion_upload.pixdim_match = 'Y'
            lesion_upload.RAS = 'N'
            db.session.commit()
            return 'Nifti not in RAS coordinates', 400
        
        lesion_upload.RAS = 'Y'
        db.session.commit()
        
        # calculate lesion volume
        volume = du.averaged_tract_volume(lesion_map.get_data(), 1.e-6)
        
        response_object = {
                'lesionCode': lesion_code,
                'volume': volume,
                'message': 'Lesion map successfully uploaded'
            }
        return make_response(jsonify(response_object)), 200
        
@megatrack.route('/lesion/<lesion_code>')
def get_lesion(lesion_code):
    return send_file('../'+current_app.config['LESION_UPLOAD_FOLDER']+lesion_code+'.nii.gz', as_attachment=True, attachment_filename=lesion_code+'.nii.gz', conditional=True, add_etags=True)

@megatrack.route('/_test_viewer')
def _test_viewer():
    '''Serve QUnit test file for javascript Viewer.'''
    return render_template('test_viewer.html') if current_app.debug else render_template('page_not_found.html'), 404
