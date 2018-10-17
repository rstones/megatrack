import unittest
import pickle
from io import BytesIO

import flask
from flask import Flask, json, current_app
from flask_testing import TestCase
from nibabel import Nifti1Image, Nifti1Header
import numpy as np
from werkzeug.datastructures import FileStorage, Headers
from flask_assets import Environment, Bundle
from werkzeug.wrappers import Response

from megatrack.models import db, Tract, Dataset, DatasetTracts, Subject
from megatrack.lesion.models import LesionUpload
from megatrack.alchemy_encoder import AlchemyEncoder
from megatrack.views import megatrack
from megatrack.lesion.views import lesion
from megatrack import views
from megatrack.lesion import views as lesion_views
from megatrack.utils import data_utils as du
from megatrack.test.cache_mock import CacheMock, LockMock
from megatrack.test.monkey_patch import monkey_patch
#from megatrack.test.mock_data import *

class LesionTestCase(TestCase):
    
    # template and lesion to test lesion upload
    test_affine = np.eye(4)
    nifti_dim = (91,109,91)
    template_filepath = 'mgtrk_atlas_template.nii.gz'
    template = Nifti1Image(np.ones(nifti_dim, dtype=np.int16), test_affine)
    lesion_filepath = 'lesion.nii.gz'
    lesion = Nifti1Image(np.ones(nifti_dim, dtype=np.int16), test_affine)
    
    # non-matching dim
    lesion_wrong_dim_filepath = 'wrong_dim.nii.gz'
    lesion_wrong_dim = Nifti1Image(np.ones((182,218,182), dtype=np.int16), test_affine)
    
    # non-matching pixdim
    lesion_wrong_pixdim_filepath = 'wrong_pixdim.nii.gz'
    lesion_wrong_pixdim = Nifti1Image(np.ones(nifti_dim, dtype=np.int16), test_affine)
    lesion_wrong_pixdim.header['pixdim'] = [1, 2, 2, 2, 1, 1, 1, 1]
    
    # not RAS
    lesion_not_RAS_filepath = 'not_RAS.nii.gz'
    not_RAS_affine = np.eye(4)
    not_RAS_affine[0,0] = -1
    lesion_not_RAS = Nifti1Image(np.ones(nifti_dim, dtype=np.int16), not_RAS_affine)
    
    def create_app(self):
        app = Flask(__name__, template_folder='../templates')
        app.config.from_object('config.TestConfig')
        app.json_encoder = AlchemyEncoder
        app.cache = CacheMock()
        app.cache_lock = LockMock()
        
        # configure assets to get templating to work
        assets = Environment(app)
        assets.register('core-js', Bundle())
        assets.register('core-css', Bundle())
        
        db.init_app(app)
        app.register_blueprint(megatrack)
        app.register_blueprint(lesion)
        return app
    
    def setUp(self):
        db.create_all()
    
    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app.cache.flush()
        
    def test_lesion_upload(self):
        
        # mock uploaded file
        # mock template file
        # mock save method of FileStorage class
        # mock nibabel.load
        
        self.saved_file = None
        self.saved_file_path = None
        
        def nib_load(path):
            '''Function to monkey patch nibabel.load using relevant files created in memory'''
            template = self.template_filepath
            lesion = self.lesion_filepath
            wrong_dim = self.lesion_wrong_dim_filepath
            wrong_pixdim = self.lesion_wrong_pixdim_filepath
            not_RAS = self.lesion_not_RAS_filepath
            if template[:len(template)-7] in path:
                return self.template
            elif wrong_dim[:len(wrong_dim)-7] in path:
                return self.lesion_wrong_dim
            elif wrong_pixdim[:len(wrong_pixdim)-7] in path:
                return self.lesion_wrong_pixdim
            elif not_RAS[:len(not_RAS)-7] in path:
                return self.lesion_not_RAS
            elif lesion[:len(lesion)-7] in path:
                return self.lesion
        
        def file_storage_save(_self, path):
            '''Function to monkey patch FileStorage.save(self, dst, buffer_size=16384)'''
            self.saved_file_path = path
            self.saved_file = self.lesion
        
        with monkey_patch(views.nib, 'load', nib_load):
            
            with monkey_patch(FileStorage, 'save', file_storage_save):
            
                # no file attached to request
                resp = self.client.post('/lesion_upload', data={})
                assert resp.status_code == 400
                assert b'Request did not contain a file part' in resp.get_data()
#                 
#                 # no file with key 'lesionmap' in request.files
                uploaded_file = FileStorage(stream=BytesIO(), filename=self.lesion_filepath, name='wrongfile')
                resp = self.client.post('/lesion_upload', data={'wrongfile': uploaded_file})
                assert resp.status_code == 400
                assert b'Request did not contain a file part' in resp.get_data()
                
                # no file selected
                uploaded_file = FileStorage(stream=BytesIO(), filename='', name='lesionmap')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                assert resp.status_code == 400
                assert b'No file selected' in resp.get_data()
                
                # filename not an allowed filename
                uploaded_file = FileStorage(stream=BytesIO(), filename='invalid_filename.php', name='lesionmap')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                assert resp.status_code == 400
                assert b'Invalid filename extension' in resp.get_data()
                assert uploaded_file.filename.split('.', 1)[1].encode() in resp.get_data()
                
                # success: check response and db
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(self.lesion)),
                                            filename=self.lesion_filepath,
                                            name='lesionmap',
                                            content_type='application/octet-stream')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                assert resp.status_code == 200
                test_str = 'data/lesion_upload/temp/' + self.lesion_filepath.split('.', 1)[0]
                assert self.saved_file_path[:len(test_str)] == test_str
                lesion_upload_record = LesionUpload.query.all()[0]
                resp_data = json.loads(resp.get_data())
                assert lesion_upload_record.lesion_id == resp_data['lesionCode']
                assert lesion_upload_record.upload_file_name == uploaded_file.filename.split('.', 1)[0]
                assert resp_data['volume'] == np.sum(np.ones(self.nifti_dim)) * 8.e-3
                
                # not a secure filename
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(self.lesion)),
                                            filename='../../../'+self.lesion_filepath,
                                            name='lesionmap',
                                            content_type='application/octet-stream')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                # assert that everything succeeded and the path arg passed to monkey patched file_storage_save function has
                # the leading '../../../' stripped
                assert resp.status_code == 200
                test_str = 'data/lesion_upload/temp/' + self.lesion_filepath.split('.', 1)[0]
                assert self.saved_file_path[:len(test_str)] == test_str
                
                # check not matching dim, pixdim or RAS
                # check response and check flags in db
                
                # not matching dim
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(self.lesion_wrong_dim)),
                                            filename=self.lesion_wrong_dim_filepath,
                                            name='lesionmap',
                                            content_type='application/octet-stream')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                assert resp.status_code == 400
                assert b'Nifti dimensions do not match template' in resp.get_data()
                lesion_upload_record = LesionUpload.query.all()[-1]
                assert lesion_upload_record.dim_match == 'N'
                
                # not matching pixdim
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(self.lesion_wrong_pixdim)),
                                            filename=self.lesion_wrong_pixdim_filepath,
                                            name='lesionmap',
                                            content_type='application/octet-stream')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                assert resp.status_code == 400
                assert b'Voxel size does not match template' in resp.get_data()
                lesion_upload_record = LesionUpload.query.all()[-1]
                assert lesion_upload_record.dim_match == 'Y'
                assert lesion_upload_record.pixdim_match == 'N'
                
                # not RAS
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(self.lesion_not_RAS)),
                                            filename=self.lesion_not_RAS_filepath,
                                            name='lesionmap',
                                            content_type='application/octet-stream')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                assert resp.status_code == 400
                assert b'Nifti not in RAS coordinates' in resp.get_data()
                lesion_upload_record = LesionUpload.query.all()[-1]
                assert lesion_upload_record.dim_match == 'Y'
                assert lesion_upload_record.pixdim_match == 'Y'
                assert lesion_upload_record.RAS == 'N'
                
                # assert saved_file == lesion
                # assert lesion code is the db
                # check consecutive uploads with same file name get distinct records in the db
                # check volume is correct
    
    def test_get_example_lesion(self):
        
        file_path_to_test = ''
        
        def send_file_patch(file_path, as_attachment=True, attachment_filename=None, conditional=True, add_etags=True):
            '''Monkey patch flask.send_file with this function to create a response object without needing
            to load a file from file system'''
            nonlocal file_path_to_test
            file_path_to_test = file_path
            headers = Headers()
            headers.add('Content-Disposition', 'attachment', filename=attachment_filename)
            #headers['Content-Length'] = 1431363
            return Response(mimetype='application/octet-stream', headers=headers)
        
        with monkey_patch(lesion_views, 'send_file', send_file_patch):
            resp = self.client.get('/lesion/example')
        
        assert file_path_to_test == f'../{current_app.config["DATA_FILE_PATH"]}/{du.EXAMPLE_LESION_FILE_NAME}'
        assert resp.mimetype == 'application/octet-stream'
        assert resp.headers.get('Content-Disposition') == f'attachment; filename={du.EXAMPLE_LESION_FILE_NAME}'
        #assert resp.headers.get('Content-Length') == '1431363'
        
    def test_get_example_lesion_file_not_found(self):
        
        def send_file_patch(file_path, as_attachment=True, attachment_filename=None, conditional=True, add_etags=True):
            '''Monkey patch flask.send_file with this function to generate FileNotFoundError'''
            file = open('fail.nii.gz', 'rb')
        
        with monkey_patch(views, 'send_file', send_file_patch):
            resp = self.client.get('/lesion/example')
            
        self.assert500(resp)
    
    def test_lesion_analysis(self):
        
        # create a lesion nifti
        lesion_data = np.zeros(self.nifti_dim, dtype=np.int16)
        lesion_data[50:60,60:70,50:60] = 1
        lesion = Nifti1Image(lesion_data, np.eye(4))
        
        # create 3 tract niftis (1 left, 1 right and 1 connecting hemispheres)
        right_tract_data = np.zeros(self.nifti_dim, dtype=np.int16)
        right_tract_data[:,:,:] = 1
        right_tract = Nifti1Image(right_tract_data, np.eye(4))
        
        left_tract_data = np.zeros(self.nifti_dim, dtype=np.int16)
        left_tract_data[:,:,:] = 1
        left_tract = Nifti1Image(left_tract_data, np.eye(4))
        
        both_tract_data = np.zeros(self.nifti_dim, dtype=np.int16)
        both_tract_data[:,:,:] = 1
        both_tract = Nifti1Image(both_tract_data, np.eye(4))
        
        # create left and right hemisphere mask niftis
        right_mask_data = np.zeros(self.nifti_dim, dtype=np.int16)
        right_mask_data[46:,:,:] = 1
        right_mask = Nifti1Image(right_mask_data, np.eye(4))
        
        left_mask_data = np.zeros(self.nifti_dim, dtype=np.int16)
        left_mask_data[:46,:,:] = 1
        left_mask = Nifti1Image(left_mask_data, np.eye(4))
        
        # insert records into LesionUpload and Tract corresponding to these niftis
        lesion_upload = LesionUpload('lesion_upload.nii.gz', 'lesion_upload_saved.nii.gz')
        db.session.add(lesion_upload)
        
        right_tract_record = Tract('TRACT_R', 'Test Tract (right)', 'test/tract/right', 'This tract is in the right hemisphere')
        db.session.add(right_tract_record)
        
        left_tract_record = Tract('TRACT_L', 'Test Tract (left)', 'test/tract/left', 'This tract is in the left hemisphere')
        db.session.add(left_tract_record)
        
        both_tract_record = Tract('TRACT_BOTH', 'Test Tract (both)', 'test/tract/both', 'This tract is in both hemispheres')
        db.session.add(both_tract_record)
        
        db.session.commit()
        
        # mock data_utils.generate_averaged_density_map to return a tract file path to be used with nib.load
        # mock nibabel load
        
        # test request where lesion code == 'example'
        
        # test request with lesion code that isn't in db
        
        # test request without query string
        
        # test request with existing lesion code
        
        pass
        
if __name__ == '__main__':
    unittest.main()