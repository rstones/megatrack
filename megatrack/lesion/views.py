import os
import datetime
import json

from flask import render_template, current_app, Blueprint, request, make_response, send_file, jsonify
from werkzeug.utils import secure_filename
import numpy as np
import numpy.linalg as npla
import numpy.ma as ma
import nibabel as nib
from nibabel.nifti1 import Nifti1Image
from jquery_unparam import jquery_unparam

from megatrack import db
from megatrack.views import file_path_relative_to_root_path
from megatrack.utils import data_utils as du
from megatrack.utils import cache_utils as cu
from megatrack.utils.cache_utils import JobCache
from megatrack.utils import database_utils as dbu
from megatrack.lesion.models import LesionUpload
from megatrack.models import Tract, Subject, DatasetTracts
import megatrack.lesion.lesion_utils as lu

lesion = Blueprint('lesion', __name__)

ALLOWED_EXTENSIONS = ['nii.gz']

def allowed_filename(filename):
    return '.' in filename \
                and filename.split('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@lesion.route('/lesion_upload', methods=['POST'])
def lesion_upload():
    current_app.logger.info('Uploading lesion map...')
    if 'lesionmap' not in request.files:
        current_app.logger.warn('Request did not contain a file part.')
        return 'Request did not contain a file part', 400
    file = request.files['lesionmap']
    if file.filename == '':
        current_app.logger.warn('No file selected.')
        return 'No file selected', 400
    
    filename = secure_filename(file.filename)
    
    if not allowed_filename(filename):
        current_app.logger.warn(f'Invalid filename extension for uploaded file {filename}')
        return f'Invalid filename extension {filename.split(".", 1)[1]}', 400
    
    filename_components = filename.split('.', 1)
    filename = filename_components[0]
    extension = filename_components[1]
    
    data_dir = current_app.config['DATA_FILE_PATH']
    lesion_upload_dir = current_app.config['LESION_UPLOAD_FOLDER']
    saved_filename = du.temp_file(lesion_upload_dir, filename, extension)
    lesion_upload = LesionUpload(filename, saved_filename)
    #db.session.add(lesion_upload)
    
    current_app.logger.info(f'Filename allowed so saving lesion map {filename} with id {lesion_upload.lesion_id}.')
    
    #path = os.path.join(current_app.config['LESION_UPLOAD_FOLDER'], saved_filename)
    file.save(saved_filename)
    
    # now check the nifti MNI transformation matches template
    current_app.logger.info('Checking lesion is in correct format...')
    
    lesion_map = nib.load(saved_filename) #nib.load(file_path_relative_to_root_path(saved_filename))
    lesion_map_header = lesion_map.header
    lesion_map_affine = lesion_map.get_sform()
    template = nib.load(data_dir+'/'+du.TEMPLATE_FILE_NAME) #nib.load(file_path_relative_to_root_path(data_dir+'/'+du.TEMPLATE_FILE_NAME))
    template_header = template.header
    
    if not np.all(lesion_map_header['dim'][1:4] == template_header['dim'][1:4]):
        lesion_upload.dim_match = 'N'
        db.session.add(lesion_upload)
        db.session.commit()
        current_app.logger.warn(f'Nifti dimensions do not match template for lesion id {lesion_upload.lesion_id}.')
        return 'Nifti dimensions do not match template', 400
    elif not np.all(lesion_map_header['pixdim'][1:4] == template_header['pixdim'][1:4]):
        lesion_upload.dim_match = 'Y'
        lesion_upload.pixdim_match = 'N'
        db.session.add(lesion_upload)
        db.session.commit()
        current_app.logger.warn(f'Voxel size does not match template for lesion id {lesion_upload.lesion_id}.')
        return 'Voxel size does not match template', 400
    elif npla.det(lesion_map_affine) < 0: # determinant of the affine should be positive for RAS coords
        lesion_upload.dim_match = 'Y'
        lesion_upload.pixdim_match = 'Y'
        lesion_upload.RAS = 'N'
        db.session.add(lesion_upload)
        db.session.commit()
        current_app.logger.warn(f'Nifti not in RAS coordinates for lesion id {lesion_upload.lesion_id}.')
        return 'Nifti not in RAS coordinates', 400
    
    lesion_upload.dim_match = 'Y'
    lesion_upload.pixdim_match = 'Y'
    lesion_upload.RAS = 'Y'
    db.session.add(lesion_upload)
    db.session.commit()
    
    # calculate lesion volume
    volume = du.averaged_tract_volume(lesion_map.get_data(), 1.e-6)
    
    response_object = {
            'lesionCode': lesion_upload.lesion_id,
            'volume': volume,
            'message': 'Lesion map successfully uploaded'
        }
    return make_response(jsonify(response_object)), 200


@lesion.route('/lesion/<lesion_code>')
def get_lesion(lesion_code):
    lesion_upload = LesionUpload.query.get(lesion_code)
    current_app.logger.info(f'Getting lesion map with id {lesion_upload.lesion_id}')
    return send_file(f'../{lesion_upload.saved_file_name}',
                     as_attachment=True,
                     attachment_filename=f'{lesion_code}.nii.gz',
                     conditional=True,
                     add_etags=True)


@lesion.route('/lesion/example')
def get_example_lesion():
    current_app.logger.info('Fetching example lesion map...')
    data_dir = current_app.config['DATA_FILE_PATH']
    file_path = file_path_relative_to_root_path(f'{data_dir}/{du.EXAMPLE_LESION_FILE_NAME}')
    try:
        r = send_file(file_path,
                      as_attachment=True,
                      attachment_filename=du.EXAMPLE_LESION_FILE_NAME,
                      conditional=True,
                      add_etags=True)
        r.make_conditional(request)
        return r
    except FileNotFoundError:
        return "Could not find example lesion!", 500


@lesion.route('/lesion_analysis/<lesion_code>/<threshold>')
def lesion_analysis(lesion_code, threshold):
    
    cache_key = cu.construct_cache_key(request.query_string.decode('utf-8'))
    
    # get the request query
    request_query = jquery_unparam(request.query_string.decode('utf-8'))
    
    current_app.logger.info(f'Running lesion analysis for lesion id {lesion_code}, threshold {threshold} and query {json.dumps(request_query, indent=4)}')
    
    #subject_ids_dataset_path = dbu.subject_id_dataset_file_path(request_query)
    file_path_data = dbu.density_map_file_path_data(request_query)
    if not len(file_path_data):
        current_app.logger.info(f'No subjects in query {json.dumps(request_query, indent=4)}')
        return 'No subjects in dataset query', 400
    
    try:
        threshold = int(threshold) * 0.01 # scale threshold to 0 - 1 since density map is stored in this range
    except ValueError:
        current_app.logger.info(f'Invalid threshold value {threshold} applied, returning 404...')
        return f'Invalid threshold value {threshold} sent to server.', 404
    
    data_dir = current_app.config['DATA_FILE_PATH']
    
    if lesion_code == 'example':
        lesion_data = du.get_nifti_data(f'{data_dir}/{du.EXAMPLE_LESION_FILE_NAME}')
    else:
        lesion_upload = LesionUpload.query.get(lesion_code)
        if not lesion_upload:
            current_app.logger.warn(f'Lesion does not exist in database with code {lesion_code}')
            return 'Lesion code does not exist. Please re-upload lesion.', 500
        lesion_data = du.get_nifti_data(lesion_upload.saved_file_name)
        
    rh = nib.load(current_app.config['RIGHT_HEMISPHERE_MASK']).get_data()
    lh = nib.load(current_app.config['LEFT_HEMISPHERE_MASK']).get_data()
    
    rh_overlap = lesion_data * rh
    lh_overlap = lesion_data * lh
    
    intersecting_tracts = []
    
    def check_lesion_tract_overlaps(tracts):
        
        #cached_data = current_app.cache.get(cache_key)
        cache = JobCache(current_app.cache, current_app.cache_lock)
        
        for tract in tracts:
            # average density maps for this tract based on current query
            # save averaged map and cache the file path
            status = cache.job_status(cache_key, tract.code)
            if status == 'COMPLETE':
                # get file path from cache
                tract_file_path = cache.job_result(cache_key, tract.code)
            else:
                # recalculate density map
                file_path_data = dbu.density_map_file_path_data(request_query)
                if len(file_path_data) > 0:
                    current_app.logger.info(f'Adding job {tract.code}')
                    cache.add_job(cache_key, tract.code)
                    data_dir = current_app.config['DATA_FILE_PATH'] # file path to data folder
                    tract_file_path = du.generate_average_density_map(data_dir, file_path_data, tract, 'MNI')
                    cache.job_complete(cache_key, tract.code, tract_file_path)
                    current_app.logger.info(f'Job {tract.code} complete')
                else:
                    current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
                    return 'No subjects returned for the current query', 404
            
#             # perform weighted overlap: lesion * tract
#             tract_data = du.get_nifti_data(tract_file_path)
#             overlap = lesion_data * tract_data
#             # weighted sum of voxels occupied by overlap
#             # figure out percentage of tract overlapping with lesion
#             overlap_sum = np.sum(overlap)
#             if overlap_sum:
#                 overlap_score = overlap_sum / np.sum(tract_data)
#                 # add dict to intersecting_tracts list
#                 intersecting_tracts.append({"tractCode": tract.code, "overlapScore": overlap_score})
            
            # alternative overlap score
            tract_data = du.get_nifti_data(tract_file_path)
            masked_tract_data = ma.masked_where(tract_data < threshold, tract_data)
            overlap = lesion_data * masked_tract_data
            over_threshold_count = masked_tract_data.count()
            over_threshold_overlap_count = len(overlap.nonzero()[0])
            if over_threshold_overlap_count:
                overlap_percent = (over_threshold_overlap_count / over_threshold_count) * 100.
                # add dict to intersecting_tracts list
                intersecting_tracts.append({"tractName": tract.name,
                                            "tractCode": tract.code,
                                            "overlapScore": overlap_percent,
                                            "description": tract.description})
    
    '''Can speed up the loop through tracts by using multiprocessing pool'''
                
    # get unique tract codes for the datasets / methods selected
    tract_codes = set()
    for key in request_query.keys():
        dc = key
        mc = request_query[key]['method']
        tcs = DatasetTracts.query.with_entities(DatasetTracts.tract_code).filter((DatasetTracts.dataset_code==dc) & (DatasetTracts.method_code==mc)).all()
        tcs = set(tcs)
        tract_codes = tract_codes or tcs
        tract_codes = tract_codes.intersection(tcs)
    # explode the inner tuples
    tract_codes = [tc[0] for tc in tract_codes]

    if np.any(rh_overlap):
        current_app.logger.info('Checking lesion overlap with right hemisphere tracts.')
        # loop through right hemisphere tracts
        tracts = Tract.query.filter(Tract.code.in_(tract_codes) & Tract.code.like('%\_R')).all() # escape sql wildcard _
        check_lesion_tract_overlaps(tracts)
    
    if np.any(lh_overlap):
        current_app.logger.info('Checking lesion overlap with left hemisphere tracts.')
        # loop through left hemisphere tracts
        tracts = Tract.query.filter(Tract.code.in_(tract_codes) & Tract.code.like('%\_L')).all()
        check_lesion_tract_overlaps(tracts)
    
    # loop through tracts connecting hemispheres
    current_app.logger.info('Checking lesion overlap with tracts connecting hemispheres.')
    tracts = Tract.query.filter(Tract.code.in_(tract_codes) & ~Tract.code.like('%\_R') & ~Tract.code.like('%\_L')).all() # ~ negates the like
    check_lesion_tract_overlaps(tracts)
    
    # sort tracts by overlap score (highest to lowest)
    intersecting_tracts = sorted(intersecting_tracts, key=lambda tract: tract["overlapScore"])[::-1]
    
    return make_response(jsonify(intersecting_tracts)), 200

@lesion.route('/lesion_tract_disconnect/<lesion_code>/<tract_code>')
def lesion_tract_disconnect(lesion_code, tract_code):
    # get the request query
    request_query = jquery_unparam(request.query_string.decode('utf-8'))
    
    current_app.logger.info(f'Running lesion tract disconnect for lesion {lesion_code}, tract {tract_code} and query {json.dumps(request_query, indent=4)}')
    
    file_path_data = dbu.density_map_file_path_data(request_query)
    if not len(file_path_data):
        current_app.logger.info(f'No subjects returned for query {json.dumps(request_query, indent=4)}')
        return 'No subjects in dataset query', 400
    
    data_dir = current_app.config['DATA_FILE_PATH']
    
    if lesion_code == 'example':
        lesion_file_name = f'{data_dir}/{du.EXAMPLE_LESION_FILE_NAME}'
    else:
        lesion_upload = LesionUpload.query.get(lesion_code)
        
        if not lesion_upload:
            current_app.logger.warn(f'Lesion does not exist in database with code {lesion_code}')
            return 'Lesion code does not exist. Please re-upload lesion.', 500
        
        lesion_file_name = lesion_upload.saved_file_name
        
    lesion_data = du.get_nifti_data(lesion_file_name)
    
    # validate tract code
    tract = dbu.get_tract(tract_code) 
    if not tract:
        current_app.logger.warn(f'Nonexistent tract code {tract_code}, returning 400...')
        return f'The requested tract {tract_code} does not exist', 400
    
    num_streamlines_per_subject = []
    disconnected_streamlines_per_subject = []
    percent_disconnect_per_subject = []
    for subject_id, dataset_dir, method in file_path_data:
        file_path = du.file_path(data_dir, dataset_dir, tract.file_path, method, subject_id, 'MNI', tract_code, 'trk')
        num_streamlines, disconnected_streamlines, percent_disconnect = lu.calculate_tract_disconnection(file_path, lesion_data)
        num_streamlines_per_subject.append(num_streamlines)
        disconnected_streamlines_per_subject.append(disconnected_streamlines)
        percent_disconnect_per_subject.append(percent_disconnect)
        
    average_disconnect = np.mean(percent_disconnect_per_subject)
    std_disconnect = np.std(percent_disconnect_per_subject)
    histogram = np.histogram(percent_disconnect_per_subject, bins=4, range=(0,100))
    
    average_num_streamlines = np.mean(num_streamlines_per_subject)
    average_disconnected_streamlines = np.mean(disconnected_streamlines_per_subject)
    
    response_object = {
                        'averageDisconnect': average_disconnect,
                        'stdDisconnect': std_disconnect,
                        'histogram': histogram[0].tolist(),
                        'percentDisconnect': percent_disconnect_per_subject,
                        'averageNumStreamlines': average_num_streamlines,
                        'averageDisconnectedStreamlines': average_disconnected_streamlines
                        }
    
    return make_response(jsonify(response_object)), 200