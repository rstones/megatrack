from megatrack import app
from megatrack.models import Tract
from flask import render_template, json, make_response, request, send_file, jsonify
from sqlalchemy.ext.declarative.api import DeclarativeMeta
from flask_jsontools import jsonapi

data_file_path = '../data/'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/get_template')
def get_template():
    file_name = 'Template_T1_2mm_new.nii.gz'
    r = send_file(data_file_path+file_name, as_attachment=True, attachment_filename=file_name, conditional=True, add_etags=True)
    r.make_conditional(request)
    return r

def get_map_response(file_name):
    return send_file(data_file_path+file_name, as_attachment=True, attachment_filename=file_name, conditional=True, add_etags=True)

@jsonapi
@app.route('/tract_select')
def populate_tract_select():
    tracts = Tract.query.all() # can order them in a certain way here
    return jsonify(tracts)

@app.route('/CINGL_map')
def get_CingL_map():
    return get_map_response('mean_Cing_L_2mm.nii.gz')

@app.route('/FATL_map')
def get_FAT_L_map():
    return get_map_response('mean_Fat_L_2mm.nii.gz')

@app.route('/FATR_map')
def get_FAT_R_map():
    return get_map_response('mean_Fat_R_2mm.nii.gz')

@app.route('/_test_viewer')
def _test_viewer():
    '''Serve QUnit test file for javascript Viewer.'''
    return render_template('test_viewer.html') if app.debug else render_template('page_not_found.html'), 404