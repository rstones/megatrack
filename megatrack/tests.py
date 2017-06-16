from flask import Flask
import unittest
from flask_testing import TestCase
from .models import db, AlchemyEncoder, Tract, Dataset, Subject
from .views import megatrack
        
class MegatrackTestCase(TestCase):
    
    # test tract data
    tract_code = 'AFL_ANT'
    tract_name = 'Left Anterior AF'
    tract_file_path ='Left_AF_anterior'
    
    # test dataset data
    dataset_code = 'BRC_ATLAS'
    dataset_name = 'BRC Atlas'
    dataset_file_path = 'brc_atlas'
    
    # test subject data
    sbjct1_subject_id = 'BRCATLAS001'
    sbjct1_gender = 'M'
    sbjct1_age = 25
    sbjct1_handedness = 'R'
    sbjct1_dataset_code = dataset_code
    sbjct1_ravens_iq_raw = 60
    sbjct1_file_path = 'BRCATLASB001_MNI_'
    sbjct1_mmse = None
    
    sbjct2_subject_id = 'BRCATLAS002'
    sbjct2_gender = 'F'
    sbjct2_age = 45
    sbjct2_handedness = 'R'
    sbjct2_dataset_code = dataset_code
    sbjct2_ravens_iq_raw = 58
    sbjct2_file_path = 'BRCATLASB002_MNI_'
    sbjct2_mmse = None
    
    sbjct3_subject_id = 'BRCATLAS003'
    sbjct3_gender = 'M'
    sbjct3_age = 70
    sbjct3_handedness = 'L'
    sbjct3_dataset_code = dataset_code
    sbjct3_ravens_iq_raw = 49
    sbjct3_file_path = 'BRCATLASB003_MNI_'
    sbjct3_mmse = None
    
    def create_app(self):
        app = Flask(__name__)
        app.config.from_object('config.TestConfig')
        app.json_encoder = AlchemyEncoder
        db.init_app(app)
        app.register_blueprint(megatrack)
        return app
    
    def setUp(self):
        db.create_all()
        
    def tearDown(self):
        db.session.remove()
        db.drop_all()
        
    def setup_query_data(self):
        # insert a tract
        tract = Tract(code=MegatrackTestCase.tract_code, name=MegatrackTestCase.tract_name, file_path=MegatrackTestCase.tract_file_path)
        db.session.add(tract)
        # insert a dataset
        dataset = Dataset(code=MegatrackTestCase.dataset_code,
                          name=MegatrackTestCase.dataset_name,
                          file_path=MegatrackTestCase.dataset_file_path)
        db.session.add(dataset)
        # insert subjects
        sbjct1 = Subject(subject_id=MegatrackTestCase.sbjct1_subject_id,
                         gender=MegatrackTestCase.sbjct1_gender,
                         age=MegatrackTestCase.sbjct1_age,
                         handedness=MegatrackTestCase.sbjct1_handedness,
                         ravens_iq_raw=MegatrackTestCase.sbjct1_ravens_iq_raw,
                         dataset_code=MegatrackTestCase.sbjct1_dataset_code,
                         file_path=MegatrackTestCase.sbjct1_file_path,
                         mmse=MegatrackTestCase.sbjct1_mmse)
        db.session.add(sbjct1)
        sbjct2 = Subject(subject_id=MegatrackTestCase.sbjct2_subject_id,
                         gender=MegatrackTestCase.sbjct2_gender,
                         age=MegatrackTestCase.sbjct2_age,
                         handedness=MegatrackTestCase.sbjct2_handedness,
                         ravens_iq_raw=MegatrackTestCase.sbjct2_ravens_iq_raw,
                         dataset_code=MegatrackTestCase.sbjct2_dataset_code,
                         file_path=MegatrackTestCase.sbjct2_file_path,
                         mmse=MegatrackTestCase.sbjct2_mmse)
        db.session.add(sbjct2)
        sbjct3 = Subject(subject_id=MegatrackTestCase.sbjct3_subject_id,
                         gender=MegatrackTestCase.sbjct3_gender,
                         age=MegatrackTestCase.sbjct3_age,
                         handedness=MegatrackTestCase.sbjct3_handedness,
                         ravens_iq_raw=MegatrackTestCase.sbjct3_ravens_iq_raw,
                         dataset_code=MegatrackTestCase.sbjct3_dataset_code,
                         file_path=MegatrackTestCase.sbjct3_file_path,
                         mmse=MegatrackTestCase.sbjct3_mmse)
        db.session.add(sbjct3)
        
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
                      file_path=MegatrackTestCase.tract_file_path)
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
        dataset = Dataset(code=MegatrackTestCase.dataset_code,
                          name=MegatrackTestCase.dataset_name,
                          file_path=MegatrackTestCase.dataset_file_path)
        db.session.add(dataset)
        db.session.commit()
        # get response
        resp = self.client.get('/dataset_select')
        # test response
        assert resp.mimetype == 'application/json'
        assert bytes('"code": "'+MegatrackTestCase.dataset_code+'"', 'utf-8') in resp.get_data()
        assert bytes('"name": "'+MegatrackTestCase.dataset_name+'"', 'utf-8') in resp.get_data()
        assert bytes('"file_path": "'+MegatrackTestCase.dataset_file_path+'"', 'utf-8') not in resp.get_data() # we don't want to expose file paths
        
    def test_query_report(self):
        assert False
        
    def test_construct_subject_query_filter(self):
        test_query = {
                        "file_path": ".nii.gz", 
                        "BRC_ATLAS": {
                                    "gender": {"type": "radio", "value": "M"},
                                    "age": {"type": "range", "min": "20", "max": "40"}
                                    }
                      }
        assert False
        
    def test_get_tract(self):
        jquery_param_string = 'BRC_ATLAS%5Bgender%5D%5Btype%5D=radio&BRC_ATLAS%5Bgender%5D%5Bvalue%5D=M&file_type=.nii.gz'
        '''
        Test cases for several valid jquery param strings: single dataset multiple constraints, multiple datasets multiple constraints,
        also tests with incorrect param strings
        Also for nonexistent tracts, need a 404 error
        '''
        self.setup_query_data()
        resp = self.client.get('/tract/'+MegatrackTestCase.tract_code+'?'+jquery_param_string)
        assert resp.mimetype == 'application/octet-stream'
        assert 'attachment;' in resp.headers.get('Content-Disposition')

if __name__ == '__main__':
    unittest.main()