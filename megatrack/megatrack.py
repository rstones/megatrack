import os
from flask import Flask

app = Flask(__name__)

from flask import render_template, json, make_response, request, send_file
import numpy as np
#from megatrack import app

data_file_path = '../data/'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/get_template')
def get_template():
    file_name = 'Template_T1_2mm_new.nii.gz' #'anatomical.nii.gz'
    r = send_file(data_file_path+file_name, as_attachment=True, attachment_filename=file_name, conditional=True, add_etags=True)
    #r.last_modified = dt.datetime.fromtimestamp(os.path.getmtime(filename))
    r.make_conditional(request)
    return r

@app.route('/get_test_map')
def get_test_map():
    file_name = 'mean_Cing_L_2mm.nii.gz'
    r = send_file(data_file_path+file_name, as_attachment=True, attachment_filename=file_name, conditional=True, add_etags=True)
    return r

def get_map_response(file_name):
    return send_file(data_file_path+file_name, as_attachment=True, attachment_filename=file_name, conditional=True, add_etags=True)

@app.route('/CingL_map')
def get_CingL_map():
    return get_map_response('mean_Cing_L_2mm.nii.gz')

@app.route('/FatL_map')
def get_FAT_L_map():
    return get_map_response('mean_Fat_L_2mm.nii.gz')

@app.route('/FatR_map')
def get_FAT_R_map():
    return get_map_response('mean_Fat_R_2mm.nii.gz')

@app.route('/_test_viewer')
def _test_viewer():
    '''Serve QUnit test file for javascript Viewer.'''
    return render_template('test_viewer.html')

if __name__ == '__main__':
    app.debug = True
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)    
