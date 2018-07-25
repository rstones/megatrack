'''
Created on 7 Sep 2017

@author: richard
'''
from flask import Flask, json
import flask
import unittest
import mock
from flask_testing import TestCase
from megatrack.models import db, Tract, Dataset, Subject, LesionUpload
from megatrack.alchemy_encoder import AlchemyEncoder
from megatrack.views import megatrack
import megatrack.views as views
from .cache_mock import CacheMock
import numpy as np
from nibabel import Nifti1Image, Nifti1Header
from werkzeug.datastructures import FileStorage
import contextlib
from io import BytesIO
import pickle
from flask_assets import Environment, Bundle

@contextlib.contextmanager
def monkey_patch(module, fn_name, patch):
    unpatch = getattr(module, fn_name)
    setattr(module, fn_name, patch)
    try:
        yield
    finally:
        setattr(module, fn_name, unpatch)
        
class MegatrackTestCase(TestCase):
    
    # test tract data
    tract_code = 'AFL_ANT'
    tract_name = 'Left Anterior AF'
    tract_file_path ='Left_AF_anterior'
    tract_description = 'This is a tract etc etc...'
    
    # test dataset data
    dataset1_code = 'BRC_ATLAS'
    dataset1_name = 'BRC Atlas'
    dataset1_file_path = 'brc_atlas'
    dataset1_query_params = '{"test":"dataset1"}'
    
    dataset2_code = 'TEST_DATASET2'
    dataset2_name = 'Test Dataset 2'
    dataset2_file_path = 'test_dataset_2'
    dataset2_query_params = '{"test":"dataset2"}'
    
    # test subject data
    sbjct1_subject_id = 'BRCATLAS001'
    sbjct1_gender = 'M'
    sbjct1_age = 25
    sbjct1_handedness = 'R'
    sbjct1_edinburgh_handedness_raw = 100
    sbjct1_dataset_code = dataset1_code
    sbjct1_ravens_iq_raw = 60
    sbjct1_file_path = 'BRCATLASB001_MNI_'
    sbjct1_mmse = None
    
    sbjct2_subject_id = 'BRCATLAS002'
    sbjct2_gender = 'F'
    sbjct2_age = 45
    sbjct2_handedness = 'R'
    sbjct2_edinburgh_handedness_raw = 50
    sbjct2_dataset_code = dataset1_code
    sbjct2_ravens_iq_raw = 58
    sbjct2_file_path = 'BRCATLASB002_MNI_'
    sbjct2_mmse = None
    
    sbjct3_subject_id = 'BRCATLAS003'
    sbjct3_gender = 'M'
    sbjct3_age = 70
    sbjct3_handedness = 'L'
    sbjct3_edinburgh_handedness_raw = -70
    sbjct3_dataset_code = dataset1_code
    sbjct3_ravens_iq_raw = 49
    sbjct3_file_path = 'BRCATLASB003_MNI_'
    sbjct3_mmse = None
    
    sbjct4_subject_id = 'TESTDATASET004'
    sbjct4_gender = 'F'
    sbjct4_age = 35
    sbjct4_handedness = 'L'
    sbjct4_edinburgh_handedness_raw = -70
    sbjct4_dataset_code = dataset2_code
    sbjct4_ravens_iq_raw = 55
    sbjct4_file_path = 'TESTDATASETB004_MNI_'
    sbjct4_mmse = None
    
    # template and lesion to test lesion upload
    test_affine = np.eye(4)
    nifti_dim = (91,109,91)
    template_filepath = 'Template_T1_2mm_new_RAS.nii.gz'
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
        
        # configure assets to get templating to work
        assets = Environment(app)
        assets.register('core-js', Bundle())
        assets.register('core-css', Bundle())
        
        db.init_app(app)
        app.register_blueprint(megatrack)
        return app
    
    def setUp(self):
        db.create_all()
        
    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app.cache.flush()
        
    def setup_query_data(self):
        # insert a tract
        tract = Tract(code=MegatrackTestCase.tract_code, name=MegatrackTestCase.tract_name, file_path=MegatrackTestCase.tract_file_path, description=MegatrackTestCase.tract_description)
        db.session.add(tract)
        # insert datasets
        dataset1 = Dataset(code=MegatrackTestCase.dataset1_code,
                          name=MegatrackTestCase.dataset1_name,
                          file_path=MegatrackTestCase.dataset1_file_path,
                          query_params=MegatrackTestCase.dataset1_query_params)
        db.session.add(dataset1)
        dataset2 = Dataset(code=MegatrackTestCase.dataset2_code,
                          name=MegatrackTestCase.dataset2_name,
                          file_path=MegatrackTestCase.dataset2_file_path,
                          query_params=MegatrackTestCase.dataset2_query_params)
        db.session.add(dataset2)
        # insert subjects
        sbjct1 = Subject(subject_id=MegatrackTestCase.sbjct1_subject_id,
                         gender=MegatrackTestCase.sbjct1_gender,
                         age=MegatrackTestCase.sbjct1_age,
                         handedness=MegatrackTestCase.sbjct1_handedness,
                         edinburgh_handedness_raw=MegatrackTestCase.sbjct1_edinburgh_handedness_raw,
                         ravens_iq_raw=MegatrackTestCase.sbjct1_ravens_iq_raw,
                         dataset_code=MegatrackTestCase.sbjct1_dataset_code,
                         file_path=MegatrackTestCase.sbjct1_file_path,
                         mmse=MegatrackTestCase.sbjct1_mmse)
        db.session.add(sbjct1)
        sbjct2 = Subject(subject_id=MegatrackTestCase.sbjct2_subject_id,
                         gender=MegatrackTestCase.sbjct2_gender,
                         age=MegatrackTestCase.sbjct2_age,
                         handedness=MegatrackTestCase.sbjct2_handedness,
                         edinburgh_handedness_raw=MegatrackTestCase.sbjct2_edinburgh_handedness_raw,
                         ravens_iq_raw=MegatrackTestCase.sbjct2_ravens_iq_raw,
                         dataset_code=MegatrackTestCase.sbjct2_dataset_code,
                         file_path=MegatrackTestCase.sbjct2_file_path,
                         mmse=MegatrackTestCase.sbjct2_mmse)
        db.session.add(sbjct2)
        sbjct3 = Subject(subject_id=MegatrackTestCase.sbjct3_subject_id,
                         gender=MegatrackTestCase.sbjct3_gender,
                         age=MegatrackTestCase.sbjct3_age,
                         handedness=MegatrackTestCase.sbjct3_handedness,
                         edinburgh_handedness_raw=MegatrackTestCase.sbjct3_edinburgh_handedness_raw,
                         ravens_iq_raw=MegatrackTestCase.sbjct3_ravens_iq_raw,
                         dataset_code=MegatrackTestCase.sbjct3_dataset_code,
                         file_path=MegatrackTestCase.sbjct3_file_path,
                         mmse=MegatrackTestCase.sbjct3_mmse)
        db.session.add(sbjct3)
        sbjct4 = Subject(subject_id=MegatrackTestCase.sbjct4_subject_id,
                         gender=MegatrackTestCase.sbjct4_gender,
                         age=MegatrackTestCase.sbjct4_age,
                         handedness=MegatrackTestCase.sbjct4_handedness,
                         edinburgh_handedness_raw=MegatrackTestCase.sbjct4_edinburgh_handedness_raw,
                         ravens_iq_raw=MegatrackTestCase.sbjct4_ravens_iq_raw,
                         dataset_code=MegatrackTestCase.sbjct4_dataset_code,
                         file_path=MegatrackTestCase.sbjct4_file_path,
                         mmse=MegatrackTestCase.sbjct4_mmse)
        db.session.add(sbjct4)
        
        db.session.commit()
    
    def test_index(self):
        resp = self.client.get('/')
        assert b'MegaTrack Atlas' in resp.get_data()
        
    def test_lesions(self):
        resp = self.client.get('/lesions')
        assert b'Lesion' in resp.get_data()
    
    def test_about(self):
        resp = self.client.get('/about')
        assert b'About' in resp.get_data()
        
    def test_contact(self):
        resp = self.client.get('/contact')
        assert b'Contact' in resp.get_data()
        
    def test_admin(self):
        resp = self.client.get('/admin')
        assert b'Login' in resp.get_data()
    
    def test_get_template(self):
        resp = self.client.get('/get_template')
        assert resp.mimetype == 'application/octet-stream'
        assert resp.headers.get('Content-Disposition') == 'attachment; filename=Template_T1_2mm_new_RAS.nii.gz'
        assert resp.headers.get('Content-Length') == '1431363'
        
    def test_populate_tract_select(self):
        # insert test tract
        tract = Tract(code=MegatrackTestCase.tract_code,
                      name=MegatrackTestCase.tract_name,
                      file_path=MegatrackTestCase.tract_file_path,
                      description=MegatrackTestCase.tract_description)
        db.session.add(tract)
        db.session.commit()
        # get response
        resp = self.client.get('/tract_select')
        # test response
        assert resp.mimetype == 'application/json'
        assert bytes('"code": "'+MegatrackTestCase.tract_code+'"', 'utf-8') in resp.get_data()
        assert bytes('"name": "'+MegatrackTestCase.tract_name+'"', 'utf-8') in resp.get_data()
        assert bytes('"file_path": "'+MegatrackTestCase.tract_file_path+'"', 'utf-8') not in resp.get_data() # we don't want to expose file paths
        
    def test_populate_dataset_select(self):
        self.setup_query_data()
        # get response
        resp = self.client.get('/dataset_select')
        # test response
        assert resp.mimetype == 'application/json'
        assert bytes('"code": "'+MegatrackTestCase.dataset1_code+'"', 'utf-8') in resp.get_data()
        assert bytes('"name": "'+MegatrackTestCase.dataset1_name+'"', 'utf-8') in resp.get_data()
        assert bytes('"file_path": "'+MegatrackTestCase.dataset1_file_path+'"', 'utf-8') not in resp.get_data() # we don't want to expose file paths
        assert bytes('"code": "'+MegatrackTestCase.dataset2_code+'"', 'utf-8') in resp.get_data()
        assert bytes('"name": "'+MegatrackTestCase.dataset2_name+'"', 'utf-8') in resp.get_data()
        assert bytes('"file_path": "'+MegatrackTestCase.dataset2_file_path+'"', 'utf-8') not in resp.get_data()
        
    def test_query_report(self):
        assert False
    
    @mock.patch.object(flask, 'send_file', autospec=True)  
    def test_get_tract(self, mock_put_object):
        valid_jquery_param_string = 'BRC_ATLAS%5Bgender%5D%5Btype%5D=radio&BRC_ATLAS%5Bgender%5D%5Bvalue%5D=M&file_type=.nii.gz'
        self.setup_query_data()
        resp = self.client.get('/tract/'+MegatrackTestCase.tract_code+'?'+valid_jquery_param_string)
        mock_put_object.assert_called_with('asdfadfsd')
#         assert resp.mimetype == 'application/octet-stream'
#         assert 'attachment;' in resp.headers.get('Content-Disposition')
        
    def test_get_tract_nonexistent_tract(self):
        valid_jquery_param_string = 'BRC_ATLAS%5Bgender%5D%5Btype%5D=radio&BRC_ATLAS%5Bgender%5D%5Bvalue%5D=M&file_type=.nii.gz'
        self.setup_query_data()
        resp = self.client.get('/tract/NONEXISTENT_TRACT?'+valid_jquery_param_string)
        assert resp.status_code == 404
        assert b'NONEXISTENT_TRACT' in resp.get_data()
        
    def test_get_tract_nonexistent_dataset(self):
        valid_jquery_param_string = 'NONEXISTENT_DATASET%5Bgender%5D%5Btype%5D=radio&NONEXISTENT_DATASET%5Bgender%5D%5Bvalue%5D=M&file_type=.nii.gz'
        self.setup_query_data()
        resp = self.client.get('/tract/'+MegatrackTestCase.tract_code+'?'+valid_jquery_param_string)
        assert resp.mimetype != 'application/octet-stream' # don't return a nii.gz file
        assert resp.status_code == 404
        
    def test_get_tract_no_tracts_returned(self):
        valid_jquery_param_string = 'BRC_ATLAS%5Bage%5D%5Btype%5D=range&BRC_ATLAS%5Bage%5D%5Bmin%5D=90&BRC_ATLAS%5Bage%5D%5Bmax%5D=99'
        self.setup_query_data()
        resp = self.client.get('/tract/'+MegatrackTestCase.tract_code+'?'+valid_jquery_param_string)
        assert resp.mimetype != 'application/octet-stream' # don't return a nii.gz file
        assert resp.status_code == 404
        
    def test_get_tract_invalid_param_string(self):
        invalid_jquery_param_string = 'BRC_ATLA5Bgender%5D%5derD%5Bvalue%5DM&file_type=.nii.gz'
        self.setup_query_data()
        resp = self.client.get('/tract/'+MegatrackTestCase.tract_code+'?'+invalid_jquery_param_string)
        assert resp.mimetype != 'application/octet-stream'
        assert resp.status != 404
        
    def test_get_tract_multiple_datasets(self):
        valid_jquery_param_string = 'BRC_ATLAS%5Bgender%5D%5Btype%5D=radio&BRC_ATLAS%5Bgender%5D%5Bvalue%5D=F&' \
                                    +'TEST_DATASET%5Bgender%5D%5Btype%5D=radio&TEST_DATASET%5Bgender%5D%5Bvalue%5D=F' \
                                    +'&file_type=.nii.gz'
        self.setup_query_data()
        resp = self.client.get('/tract/'+MegatrackTestCase.tract_code+'?'+valid_jquery_param_string)
        assert resp.mimetype == 'application/octet-stream'
        assert 'attachment;' in resp.headers.get('Content-Disposition')
        
    def test_get_tract_no_query(self):
        self.setup_query_data()
        resp = self.client.get('/tract/'+MegatrackTestCase.tract_code+'?')
        assert resp.mimetype == 'application/octet-stream'
        assert 'attachment;' in resp.headers.get('Content-Disposition')
        
    def test_construct_subject_file_paths(self):
        self.setup_query_data()
        test_query = {
                        "BRC_ATLAS": {
                                    "gender": {"type": "radio", "value": "M"},
                                    "age": {"type": "range", "min": "20", "max": "40"}
                                    }
                      }
        file_paths, file_names = construct_subject_file_paths(test_query, 'TEST_DATA_DIR', 'TEST_TRACT_DIR', 'TEST_TRACT_FILE_NAME')
        assert len(file_paths) == 1
        
    def test_lesion_upload(self):
        
        # mock uploaded file
        # mock template file
        # mock save method of FileStorage class
        # mock nibabel.load
        
        self.saved_file = None
        self.saved_file_path = None
        
        def nib_load(path):
            '''Function to monkey patch nibabel.load using relevant files created in memory'''
            template = MegatrackTestCase.template_filepath
            lesion = MegatrackTestCase.lesion_filepath
            wrong_dim = MegatrackTestCase.lesion_wrong_dim_filepath
            wrong_pixdim = MegatrackTestCase.lesion_wrong_pixdim_filepath
            not_RAS = MegatrackTestCase.lesion_not_RAS_filepath
            if template[:len(template)-7] in path:
                return MegatrackTestCase.template
            elif wrong_dim[:len(wrong_dim)-7] in path:
                return MegatrackTestCase.lesion_wrong_dim
            elif wrong_pixdim[:len(wrong_pixdim)-7] in path:
                return MegatrackTestCase.lesion_wrong_pixdim
            elif not_RAS[:len(not_RAS)-7] in path:
                return MegatrackTestCase.lesion_not_RAS
            elif lesion[:len(lesion)-7] in path:
                return MegatrackTestCase.lesion
        
        def file_storage_save(_self, path):
            '''Function to monkey patch FileStorage.save(self, dst, buffer_size=16384)'''
            self.saved_file_path = path
            self.saved_file = MegatrackTestCase.lesion
        
        with monkey_patch(views.nib, 'load', nib_load):
            
            with monkey_patch(FileStorage, 'save', file_storage_save):
            
                # no file attached to request
                resp = self.client.post('/lesion_upload', data={})
                assert resp.status_code == 400
                assert b'Request did not contain a file part' in resp.get_data()
#                 
#                 # no file with key 'lesionmap' in request.files
                uploaded_file = FileStorage(stream=BytesIO(), filename=MegatrackTestCase.lesion_filepath, name='wrongfile')
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
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(MegatrackTestCase.lesion)),
                                            filename=MegatrackTestCase.lesion_filepath,
                                            name='lesionmap',
                                            content_type='application/octet-stream')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                assert resp.status_code == 200
                test_str = 'data/lesion_upload/temp/' + MegatrackTestCase.lesion_filepath.split('.', 1)[0]
                assert self.saved_file_path[:len(test_str)] == test_str
                lesion_upload_record = LesionUpload.query.all()[0]
                resp_data = json.loads(resp.get_data())
                assert lesion_upload_record.lesion_id == resp_data['lesionCode']
                assert lesion_upload_record.upload_file_name == uploaded_file.filename.split('.', 1)[0]
                assert resp_data['volume'] == np.sum(np.ones(MegatrackTestCase.nifti_dim)) * 8.e-3
                
                # not a secure filename
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(MegatrackTestCase.lesion)),
                                            filename='../../../'+MegatrackTestCase.lesion_filepath,
                                            name='lesionmap',
                                            content_type='application/octet-stream')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                # assert that everything succeeded and the path arg passed to monkey patched file_storage_save function has
                # the leading '../../../' stripped
                assert resp.status_code == 200
                test_str = 'data/lesion_upload/temp/' + MegatrackTestCase.lesion_filepath.split('.', 1)[0]
                assert self.saved_file_path[:len(test_str)] == test_str
                
                # check not matching dim, pixdim or RAS
                # check response and check flags in db
                
                # not matching dim
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(MegatrackTestCase.lesion_wrong_dim)),
                                            filename=MegatrackTestCase.lesion_wrong_dim_filepath,
                                            name='lesionmap',
                                            content_type='application/octet-stream')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                assert resp.status_code == 400
                assert b'Nifti dimensions do not match template' in resp.get_data()
                lesion_upload_record = LesionUpload.query.all()[-1]
                assert lesion_upload_record.dim_match == 'N'
                
                # not matching pixdim
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(MegatrackTestCase.lesion_wrong_pixdim)),
                                            filename=MegatrackTestCase.lesion_wrong_pixdim_filepath,
                                            name='lesionmap',
                                            content_type='application/octet-stream')
                resp = self.client.post('/lesion_upload', data={'lesionmap': uploaded_file})
                assert resp.status_code == 400
                assert b'Voxel size does not match template' in resp.get_data()
                lesion_upload_record = LesionUpload.query.all()[-1]
                assert lesion_upload_record.dim_match == 'Y'
                assert lesion_upload_record.pixdim_match == 'N'
                
                # not RAS
                uploaded_file = FileStorage(stream=BytesIO(pickle.dumps(MegatrackTestCase.lesion_not_RAS)),
                                            filename=MegatrackTestCase.lesion_not_RAS_filepath,
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
    
    def test_lesion_analysis(self):
        
        # create a lesion nifti
        lesion_data = np.zeros(MegatrackTestCase.nifti_dim, dtype=np.int16)
        lesion_data[50:60,60:70,50:60] = 1
        lesion = Nifti1Image(lesion_data, np.eye(4))
        
        # create 3 tract niftis (1 left, 1 right and 1 connecting hemispheres)
        right_tract_data = np.zeros(MegatrackTestCase.nifti_dim, dtype=np.int16)
        right_tract_data[:,:,:] = 1
        right_tract = Nifti1Image(right_tract_data, np.eye(4))
        
        left_tract_data = np.zeros(MegatrackTestCase.nifti_dim, dtype=np.int16)
        left_tract_data[:,:,:] = 1
        left_tract = Nifti1Image(left_tract_data, np.eye(4))
        
        both_tract_data = np.zeros(MegatrackTestCase.nifti_dim, dtype=np.int16)
        both_tract_data[:,:,:] = 1
        both_tract = Nifti1Image(both_tract_data, np.eye(4))
        
        # create left and right hemisphere mask niftis
        right_mask_data = np.zeros(MegatrackTestCase.nifti_dim, dtype=np.int16)
        right_mask_data[46:,:,:] = 1
        right_mask = Nifti1Image(right_mask_data, np.eye(4))
        
        left_mask_data = np.zeros(MegatrackTestCase.nifti_dim, dtype=np.int16)
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
        
        
        # test request with lesion code that isn't in db
        
        # test request without query string
        
        # test request with existing lesion code
        
        pass

if __name__ == '__main__':
    unittest.main()