import os
from flask import Flask, render_template, json
import numpy as np

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/template')
def get_template():
    template_data = np.load('data/compact_template_data.npz')['template_data']
    return json.dumps(template_data.to_list())

if __name__ == '__main__':
    app.debug = True
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)    
