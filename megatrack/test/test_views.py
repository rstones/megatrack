'''
Created on 7 Sep 2017

@author: richard
'''
from flask import Flask
import flask
import unittest
import mock
from flask_testing import TestCase
from megatrack.models import db, AlchemyEncoder, Tract, Dataset, Subject
from megatrack.views import megatrack, construct_subject_file_paths, construct_subject_query_filter
import megatrack.views as views
from .cache_mock import CacheMock
        
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
    
    def create_app(self):
        app = Flask(__name__, template_folder='../templates')
        app.config.from_object('config.TestConfig')
        app.json_encoder = AlchemyEncoder
        app.cache = CacheMock()
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
        assert b'Megatrack' in resp.get_data()
    
    def test_about(self):
        resp = self.client.get('/about')
        assert b'About page' in resp.get_data()
    
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
        
    def test_construct_subject_query_filter(self):
        test_query = {
                        "BRC_ATLAS": {
                                    "gender": {"type": "radio", "value": "M"},
                                    "age": {"type": "range", "min": "20", "max": "40"}
                                    }
                      }
        query_filter = construct_subject_query_filter(test_query['BRC_ATLAS'])
        print(query_filter)
        assert len(query_filter) == 3 # 1 constraint for radio, 2 constraints for range
        
    def test_construct_subject_query_filter_nonexistent_constraint_type(self):
        '''
        Not sure a ValueError is the correct way to go here. Maybe a warning instead.
        '''
        test_query = {
                        "BRC_ATLAS": {
                                    "gender": {"type": "nonexistent_type", "value": "M"},
                                    "age": {"type": "range", "min": "20", "max": "40"}
                                    }
                      }
        try:
            query_filter = construct_subject_query_filter(test_query['BRC_ATLAS'])
            assert False
        except ValueError:
            assert True
        
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

if __name__ == '__main__':
    unittest.main()