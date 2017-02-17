import os
from flask import Flask

app = Flask(__name__)

from flask import render_template, json, make_response
import numpy as np
#from megatrack import app

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/get_template')
def get_template():
    template_data = np.load('../data/compact_template_data.npz')['template_data']
    # may be best to put array into dict along with header data before converting to json
    r = make_response(json.dumps(template_data.tolist()))
    r.mimetype = "application/json"
    return r

@app.route('/_test_viewer')
def _test_viewer():
    '''Serve QUnit test file for javascript Viewer.'''
    return render_template('test_viewer.html')

if __name__ == '__main__':
    app.debug = True
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)    
