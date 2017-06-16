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
    file_name = 'Template_T1_2mm_new_RAS.nii.gz'#'Template_T1_2mm_brain.nii.gz' #
    data_file_path = current_app.config['DATA_FILE_PATH']
    r = send_file(data_file_path+file_name, as_attachment=True, attachment_filename=file_name, conditional=True, add_etags=True)
    r.make_conditional(request)
    return r

def get_map_response(file_name):
    data_file_path = current_app.config['DATA_FILE_PATH']
    return send_file(data_file_path+file_name, as_attachment=True, attachment_filename=file_name, conditional=True, add_etags=True)

@jsonapi
@megatrack.route('/tract_select')
def populate_tract_select():
    tracts = Tract.query.all() # can order them in a certain way here
    return jsonify(tracts)

@megatrack.route('/dataset_select')
def populate_dataset_select():
    datasets = Dataset.query.all()
    return jsonify(datasets)

@jsonapi
@megatrack.route('/query_report')
def query_report():
    '''
    What data is to be sent back to client? Total no. subjects selected, no. per dataset, per gender, per handedness etc?
    Send a json object {"dataset": {"BRC_ATLAS": 10, "OTHER_DATASET": 9}, "gender": {"Male": 7, "Female":12}} to start with
    '''
    request_query = jquery_unparam(request.query_string.decode('utf-8'))
    results = {"dataset":{}}
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key])
        dataset_filter.append(Subject.dataset_code == key)
        subjects = Subject.query.filter(*dataset_filter).all()
        results['dataset'][key] = len(subjects)
    # need to analyse query results to send only required info to client eg. number of results
    return jsonify(results)

@megatrack.route('/get_tract')
def get_density_map():
    # get the filepath for the tract
    tract_code = request.args.get("tract")
    tract_dir = Tract.query.with_entities(Tract.file_path).filter(Tract.code == tract_code).first()
    tract_file_name = tract_dir[tract_dir.index("_")+1:] # strips Left_ or Right_ from front of tract dir name
    # get file path for the datasets
    # this is always the BRC_ATLAS for now
    dataset_dir = Dataset.query.with_entities(Dataset.file_path).filter(Dataset.code == "BRC_ATLAS").first()
    # query db to get subjects satisfying other query params
    subject_filter_list = construct_subject_query_filter(request)
    subject_file_names = Subject.query.with_entities(Subject.file_path).filter(*subject_filter_list).all()
    # file path to data folder
    data_file_path = current_app.config['DATA_FILE_PATH']
    # construct a list of file paths for each subject
    # <dataset.file_path>/<tract.file_path>/<subject.file_path>+<tract.file_path>+".nii.gz"
    # load each file data and average before converting back to nifti
    imgs = []
    data = np.zeros((len(subject_file_names), 91, 109, 91), dtype=np.int16)
    for i in range(len(subject_file_names)):
        file_path = data_file_path + dataset_dir + '/' + tract_dir + '/' + subject_file_names[i] + tract_file_name + '.nii.gz'
        imgs.append(nib.load(file_path))
        data[i] = imgs[i].get_data()
        
    mean = np.mean(data, axis=0)
    new_img = Nifti1Image(mean.astype(np.int16), imgs[0].affine, imgs[0].header)
    temp_file = '../data/temp/'+'BRC_ATLAS_'+tract_code+'_'+'{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now())+'.nii.gz'
    nib.save(new_img, temp_file)
    
    # return the nifti file (this may be slightly tricky, may need to save it first then use send_file, then delete it)    
    return send_file(temp_file, as_attachment=True, attachment_filename=temp_file, conditional=True, add_etags=True)

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
            dataset_filter.append(getattr(Subject, constraint_field) in constraint_info['values'])
        else:
            raise ValueError('Unexpected query type "' + constraint_info['type'] + '" received from client!')
    return dataset_filter
    
@megatrack.route('/tract/<tract_code>')
def get_tract(tract_code):
    if tract_code == 'CINGL':
        print('getting cingulum...')
        filename = 'BRCATLAS_test_2mm.nii.gz' #../data/brc_atlas/Left_AF_posterior/BRCATLASB009_MNI_AF_posterior_2mm.nii.gz'
        return get_map_response(filename)#'mean_Cing_L_2mm.nii.gz')
    elif tract_code == 'FATL':
        return get_map_response('mean_Fat_L_2mm.nii.gz')
    elif tract_code == 'FATR':
        return get_map_response('mean_Fat_R_2mm.nii.gz')
    else:
        # do the querying and averaging stuff here
        request_query = jquery_unparam(request.query_string.decode('utf-8'))
        tract_dir = Tract.query.with_entities(Tract.file_path).filter(Tract.code == tract_code).first()[0]
        tract_file_name = tract_dir[tract_dir.index("_")+1:] # strips Left_ or Right_ from front of tract dir name
        if len(request_query.keys()) > 1:
            for key in request_query:
                if key != 'file_type':  # ignore the key if == 'file_type', this is used to indicate file type to XTK javascript library
                    # get file path for the datasets
                    dataset_dir = Dataset.query.with_entities(Dataset.file_path).filter(Dataset.code == key).first()[0]
                    dataset_filter = construct_subject_query_filter(request_query[key])
                    dataset_filter.append(Subject.dataset_code == key)
                    subject_file_names = Subject.query.with_entities(Subject.file_path).filter(*dataset_filter).all()
                    # file path to data folder
                    data_file_path = current_app.config['DATA_FILE_PATH']
                    # construct a list of file paths for each subject
                    # <dataset.file_path>/<tract.file_path>/<subject.file_path>+<tract.file_path>+".nii.gz"
                    # load each file data and average before converting back to nifti
                    data = np.zeros((len(subject_file_names), 91, 109, 91), dtype=np.int16)
                    for i in range(len(subject_file_names)):
                        file_path = 'megatrack/'+data_file_path + dataset_dir + '/' + tract_dir + '/' + subject_file_names[i][0] + tract_file_name + '_2mm.nii.gz'
                        img = nib.load(file_path)
                        data[i] = img.get_data()
                    
                    # binarize data before averaging (why?)
                    '''Maybe binarizing didn't work well because setting the nonzero elements to 1 didn't match up with the 
                    max intensities?
                    '''
                    #data[np.nonzero(data)] = 1
                    mean = np.mean(data, axis=0)
                    # add the template affine and header to the averaged nii to ensure correct alignment in XTK library
                    template = nib.load('megatrack/'+data_file_path+'Template_T1_2mm_new_RAS.nii.gz')
                    new_img = Nifti1Image(mean.astype(np.int16), template.affine, template.header)
                    temp_file = '../data/temp/'+tract_code+'_'+'{:%d-%m-%Y_%H:%M:%S:%s}'.format(datetime.datetime.now())+'.nii.gz'
                    nib.save(new_img, 'megatrack/'+temp_file)
                    
                    # return the nifti file (this may be slightly tricky, may need to save it first then use send_file, then delete it)    
                    return send_file(temp_file, as_attachment=True, attachment_filename=temp_file, conditional=True, add_etags=True)
        else:
            filename = '../data/brc_atlas/' + tract_dir + '/BRCATLASB009_MNI_'+tract_file_name+'_2mm.nii.gz'
            return send_file(filename, as_attachment=True, attachment_filename=filename, conditional=True, add_etags=True)

'''
Could dynamically generate the density map routes based on entries in Tract table?
Data can drive server side code as well as front end
'''
@megatrack.route('/CINGL_map')
def get_CingL_map():
    return get_map_response('mean_Cing_L_2mm.nii.gz')

@megatrack.route('/FATL_map')
def get_FAT_L_map():
    return get_map_response('mean_Fat_L_2mm.nii.gz')

@megatrack.route('/FATR_map')
def get_FAT_R_map():
    return get_map_response('mean_Fat_R_2mm.nii.gz')

@megatrack.route('/_test_viewer')
def _test_viewer():
    '''Serve QUnit test file for javascript Viewer.'''
    return render_template('test_viewer.html') if current_app.debug else render_template('page_not_found.html'), 404