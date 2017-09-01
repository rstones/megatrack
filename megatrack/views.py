from megatrack.models import Tract, Subject, Dataset
from flask import current_app, Blueprint, render_template, request, send_file, jsonify
from flask_jsontools import jsonapi
import numpy as np
import nibabel as nib
from nibabel.nifti1 import Nifti1Image
import datetime
from jquery_unparam import jquery_unparam

megatrack = Blueprint('megatrack', __name__)

@megatrack.route('/')
def index():
    return render_template('index.html')

@megatrack.route('/about')
def about():
    return render_template('about.html')

@megatrack.route('/get_template')
def get_template():
    current_app.logger.info('Loading template...')
    file_name = 'Template_T1_2mm_new_RAS.nii.gz'#'Template_T1_2mm_brain.nii.gz' #
    data_file_path = current_app.config['DATA_FILE_PATH']
    r = send_file(data_file_path+file_name, as_attachment=True, attachment_filename=file_name, conditional=True, add_etags=True)
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
    request_query = jquery_unparam(request.query_string.decode('utf-8'))
    results = {"dataset":{}}
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key])
        dataset_filter.append(Subject.dataset_code == key)
        subjects = Subject.query.filter(*dataset_filter).all()
        results['dataset'][key] = len(subjects)
    # need to analyse query results to send only required info to client eg. number of results
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
    if request_query:
        for key in request_query:
            # get file path for the datasets
            dataset = Dataset.query.filter(Dataset.code == key).first()
            if not dataset:
                continue # this dataset doesn't exists, try next one
            dataset_dir = dataset.file_path
            dataset_filter = construct_subject_query_filter(request_query[key])
            dataset_filter.append(Subject.dataset_code == key)
            subject_file_names = Subject.query.with_entities(Subject.file_path).filter(*dataset_filter).all()
            for i in range(len(subject_file_names)):
                subject_file_paths.append('megatrack/'+data_file_path + dataset_dir + '/' + tract_dir + '/' + subject_file_names[i][0] + tract_file_name + '_2mm.nii.gz')
    else: # average all the density maps for this tract is no query selected
        subject_dataset_file_names = Subject.query.join(Dataset).with_entities(Subject.file_path, Dataset.file_path).all()
        for i in range(len(subject_dataset_file_names)):
            subject_file_name = subject_dataset_file_names[i][0] 
            dataset_dir = subject_dataset_file_names[i][1]
            subject_file_paths.append('megatrack/'+data_file_path + dataset_dir + '/' + tract_dir + '/' + subject_file_name + tract_file_name + '_2mm.nii.gz')
    return subject_file_paths

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
    #data[np.nonzero(data)] = 1
    mean = np.mean(data, axis=0)
    # add the template affine and header to the averaged nii to ensure correct alignment in XTK library
    template = nib.load('megatrack/'+data_file_path+'Template_T1_2mm_new_RAS.nii.gz')
    new_img = Nifti1Image(mean.astype(np.int16), template.affine, template.header)
    temp_file_path = '../data/temp/'+tract_code+'_'+'{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now())+'.nii.gz'
    # is there a better way to return the averaged nifti without having to save it first?
    nib.save(new_img, 'megatrack/'+temp_file_path)
    return temp_file_path
    
@megatrack.route('/tract/<tract_code>')
def get_tract(tract_code):
    current_app.logger.info('Getting tract ' + tract_code)
    tract = Tract.query.filter(Tract.code == tract_code).first()
    temp_file_path = current_app.cache.get(request.query_string)
    if not temp_file_path:
        if not tract:
            return 'The requested tract ' + tract_code + ' does not exist', 404
        tract_dir = tract.file_path
        tract_file_name = tract_dir[tract_dir.index("_")+1:] # strips Left_ or Right_ from front of tract dir name
        
        data_file_path = current_app.config['DATA_FILE_PATH'] # file path to data folder
        
        request_query = jquery_unparam(request.query_string.decode('utf-8'))
        request_query.pop('file_type', None) # remove query param required for correct parsing of nii.gz client side 
        
        subject_file_paths = construct_subject_file_paths(request_query, data_file_path, tract_dir, tract_file_name)
        
        if subject_file_paths:
            temp_file_path = generate_average_density_map(subject_file_paths, data_file_path, tract_code)
            current_app.cache.set(request.query_string, temp_file_path, timeout=60*60)
            #return send_file(temp_file_path, as_attachment=True, attachment_filename=tract_code+'.nii.gz', conditional=True, add_etags=True)
        else:
            return "No subjects returned for the current query", 404
    
    return send_file(temp_file_path, as_attachment=True, attachment_filename=tract_code+'.nii.gz', conditional=True, add_etags=True)

@jsonapi
@megatrack.route('/get_tract_info/<tract_code>')
def get_tract_info(tract_code):
    current_app.logger.info('Getting info for tract ' + tract_code)
    tract = Tract.query.filter(Tract.code == tract_code).first()
    if not tract:
        return 'The requested tract ' + tract_code + ' does not exist', 404
    tract_dir = tract.file_path
    tract_file_name = tract_dir[tract_dir.index("_")+1:] # strips Left_ or Right_ from front of tract dir name
    request_query = jquery_unparam(request.query_string.decode('utf-8'))
    data_file_path = current_app.config['DATA_FILE_PATH']
    subject_file_paths = construct_subject_file_paths(request_query, data_file_path, tract_dir, tract_file_name)
    temp_file_path = generate_average_density_map(subject_file_paths, data_file_path, tract_code)
       
    # calculate metrics here like volume, mean FA
    data = nib.load('megatrack/'+temp_file_path).get_data()
    vol = np.count_nonzero(data) * 8. # assuming the voxel size is 2x2x2mm, get this from the header?
    
    results = {}
    results['tractCode'] = tract_code
    results['tractName'] = tract.name
    results['volume'] = vol
    results['description'] = tract.description
    
    return jsonify(results)
    
@megatrack.route('/_test_viewer')
def _test_viewer():
    '''Serve QUnit test file for javascript Viewer.'''
    return render_template('test_viewer.html') if current_app.debug else render_template('page_not_found.html'), 404
