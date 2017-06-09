from megatrack.models import Tract, Subject, Dataset
from flask import current_app, Blueprint, render_template, request, send_file, jsonify
from flask_jsontools import jsonapi
import numpy as np
import nibabel as nib
from nibabel.nifti1 import Nifti1Image
import datetime

megatrack = Blueprint('megatrack', __name__)

@megatrack.route('/')
def index():
    return render_template('index.html')

@megatrack.route('/about')
def about():
    return render_template('about.html')

@megatrack.route('/get_template')
def get_template():
    file_name = 'Template_T1_2mm_new.nii.gz'#'Template_T1_2mm_brain.nii.gz' #
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
    Need to change filter constructor to deal with json coming from client and unknown
    fields. Use getattr(<string>) to access attributes of models from JSON object keys.
    Only bit of coupling is to have different behaviour for query types:
    radio is equals
    range is less than / greater than
    checkbox is in
    Also need 'and' logic within a dataset and 'or' logic between datasets.
    
    What data is to be sent back to client? Total no. subjects selected, no. per dataset, per gender, per handedness etc?
    '''
    filter_list = construct_subject_query_filter(request)
    # need a query to get subject ids
    subjects = Subject.query.with_entities(Subject.subject_id, Subject.file_path).filter(*filter_list).all()
    # need to analyse query results to send only required info to client eg. number of results
    return jsonify(subjects)

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

def construct_subject_query_filter(request):
    filter_list = []
    
    if request.args.get("male") == "true" and request.args.get("female") == "false":
        filter_list.append(Subject.gender == 'M')
    elif request.args.get("female") == "true" and request.args.get("male") == "false":
        filter_list.append(Subject.gender == 'F')
    
    if request.args.get("right") == "true" and request.args.get("left") == "false":
        filter_list.append(Subject.handedness == 'R')
    elif request.args.get("left") == "true" and request.args.get("right") == "false":
        filter_list.append(Subject.handedness == 'L')
    
    filter_list.append(Subject.age >= int(request.args.get("age_min")))
    filter_list.append(Subject.age <= int(request.args.get("age_max")))
    
    iq_min = int(request.args.get("iq_min"))
    iq_max = int(request.args.get("iq_max"))
    if iq_min != Subject.ravens_iq_raw_min and iq_max != Subject.ravens_iq_raw_max:
        filter_list.append(Subject.ravens_iq_raw >= iq_min)
        filter_list.append(Subject.ravens_iq_raw <= iq_max)
    
    if request.args.get("brc") == "true": # should always be true for now
        filter_list.append(Subject.dataset_code == "BRC_ATLAS") # probably shouldnt hard code the dataset codes here
    return filter_list
    

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