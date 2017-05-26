from megatrack.models import Tract, Subject
from flask import current_app, Blueprint, render_template, request, send_file, jsonify
from flask_jsontools import jsonapi

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

@jsonapi
@megatrack.route('/query_report')
def query_report():
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
    
    if request.args.get("brc") == "true":
        filter_list.append(Subject.dataset_code == "BRC_ATLAS") # probably shouldnt hard code the dataset codes here
    # need a query to get subject ids
    subjects = Subject.query.with_entities(Subject.subject_id, Subject.file_path).filter(*filter_list).all()
    return jsonify(subjects)

@megatrack.route('/get_tract')
def get_tract():
    tract_code = request.args.get("tract")
    # query db to get subjects satisfying other query params
    # construct a list of file paths for each subject
    # <dataset.file_path>/<tract.file_path>/<subject.file_path>+<tract.file_path>+".nii.gz"
    # load each file data and average before converting back to nifti
    # return the nifti file (this may be slightly tricky, may need to save it first then use send_file, then delete it)    
    return False

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