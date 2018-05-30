'''
Created on 15 Nov 2017

@author: richard
'''
import unittest
from flask_testing import TestCase
import mock
import numpy as np
import megatrack.database_utils as dbu
from megatrack.models import db, Tract, Dataset, Subject, DatasetTracts, SubjectTractMetrics
from megatrack.alchemy_encoder import AlchemyEncoder
from sqlalchemy.sql.expression import BinaryExpression
from flask import Flask
from megatrack.views import megatrack
import numpy as np

class DatabaseUtilsTestCase(TestCase):
    
    # test tract data
    tract1_code = 'TESTTRACT1'
    tract1_name = 'Test Tract 1'
    tract1_file_path ='test_tract_1'
    tract1_description = 'This is test tract 1 etc etc...'
    
    tract2_code = 'TESTTRACT2'
    tract2_name = 'Test Tract 2'
    tract2_file_path ='test_tract_2'
    tract2_description = 'This is test tract 2 etc etc...'
    
    tract3_code = 'TESTTRACT3'
    tract3_name = 'Test Tract 3'
    tract3_file_path ='test_tract_3'
    tract3_description = 'This is test tract 3 etc etc...'
    
    dataset1_code = 'TESTDATASET1'
    dataset1_name = 'Test Dataset 1'
    dataset1_file_path = 'test_dataset_1'
    dataset1_query_params = '{}'
    
    dataset2_code = 'TESTDATASET2'
    dataset2_name = 'Test Dataset 2'
    dataset2_file_path = 'test_dataset_2'
    dataset2_query_params = '{}'
    
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
        db.init_app(app)
        app.register_blueprint(megatrack)
        return app
    
    def setUp(self):
        db.create_all()
        
    def tearDown(self):
        db.session.remove()
        db.drop_all()
        
    def test_get_dataset_select_info(self):
        # insert 2 test datasets
        
        dataset1 = Dataset(code=DatabaseUtilsTestCase.dataset1_code,
                          name=DatabaseUtilsTestCase.dataset1_name,
                          file_path=DatabaseUtilsTestCase.dataset1_file_path,
                          query_params=DatabaseUtilsTestCase.dataset1_query_params)
        db.session.add(dataset1)
        dataset2 = Dataset(code=DatabaseUtilsTestCase.dataset2_code,
                          name=DatabaseUtilsTestCase.dataset2_name,
                          file_path=DatabaseUtilsTestCase.dataset2_file_path,
                          query_params=DatabaseUtilsTestCase.dataset2_query_params)
        db.session.add(dataset2)
        db.session.commit()
        
        datasets = dbu.get_dataset_select_info()
        assert len(datasets) == 2
        assert datasets[0].code == DatabaseUtilsTestCase.dataset1_code
        assert datasets[1].code == DatabaseUtilsTestCase.dataset2_code
        
    def test_get_tract_select_info(self):
        
        # insert 2 test tracts
        tract1 = Tract(code=DatabaseUtilsTestCase.tract1_code,
                       name=DatabaseUtilsTestCase.tract1_name,
                       file_path=DatabaseUtilsTestCase.tract1_file_path,
                       description=DatabaseUtilsTestCase.tract1_description)
        db.session.add(tract1)
        
        tract2 = Tract(code=DatabaseUtilsTestCase.tract2_code,
                       name=DatabaseUtilsTestCase.tract2_name,
                       file_path=DatabaseUtilsTestCase.tract2_file_path,
                       description=DatabaseUtilsTestCase.tract2_description)
        db.session.add(tract2)
        
        # insert 2 test datasets
        
        dataset1 = Dataset(code=DatabaseUtilsTestCase.dataset1_code,
                          name=DatabaseUtilsTestCase.dataset1_name,
                          file_path=DatabaseUtilsTestCase.dataset1_file_path,
                          query_params=DatabaseUtilsTestCase.dataset1_query_params)
        db.session.add(dataset1)
        dataset2 = Dataset(code=DatabaseUtilsTestCase.dataset2_code,
                          name=DatabaseUtilsTestCase.dataset2_name,
                          file_path=DatabaseUtilsTestCase.dataset2_file_path,
                          query_params=DatabaseUtilsTestCase.dataset2_query_params)
        db.session.add(dataset2)
        
        # insert records linking 2 of the tracts to the datasets into dataset_tracts
        
        datrac1 = DatasetTracts(dataset_code=DatabaseUtilsTestCase.dataset1_code,
                               tract_code=DatabaseUtilsTestCase.tract1_code)
        db.session.add(datrac1)
        datrac2 = DatasetTracts(dataset_code=DatabaseUtilsTestCase.dataset1_code,
                               tract_code=DatabaseUtilsTestCase.tract2_code)
        db.session.add(datrac2)
        
        datrac3 = DatasetTracts(dataset_code=DatabaseUtilsTestCase.dataset2_code,
                               tract_code=DatabaseUtilsTestCase.tract1_code)
        db.session.add(datrac3)
        
        db.session.commit()
        
        # test no ignored tracts
        result, ignored_tracts = dbu.get_tract_select_info()
        assert len(result.keys()) == 2
        assert len(ignored_tracts) == 0
        assert DatabaseUtilsTestCase.tract1_code in result.keys()
        assert DatabaseUtilsTestCase.tract2_code in result.keys()
        tract1_info = result[DatabaseUtilsTestCase.tract1_code]
        tract2_info = result[DatabaseUtilsTestCase.tract2_code]
        assert tract1_info['name'] == DatabaseUtilsTestCase.tract1_name
        assert tract1_info['description'] == DatabaseUtilsTestCase.tract1_description
        assert len(tract1_info['datasets']) == 2
        assert tract2_info['name'] == DatabaseUtilsTestCase.tract2_name
        assert tract2_info['description'] == DatabaseUtilsTestCase.tract2_description
        assert len(tract2_info['datasets']) == 1
        
        # test ignored tracts
        tract3 = Tract(code=DatabaseUtilsTestCase.tract3_code,
                       name=DatabaseUtilsTestCase.tract3_name,
                       file_path=DatabaseUtilsTestCase.tract3_file_path,
                       description=DatabaseUtilsTestCase.tract3_description)
        db.session.add(tract3)
        db.session.commit()
        
        result, ignored_tracts = dbu.get_tract_select_info()
        assert len(result.keys()) == 2
        assert len(ignored_tracts) == 1
        assert ignored_tracts[0] == DatabaseUtilsTestCase.tract3_code
        
    def test_construct_subject_query_filter(self):
        '''Test subject_query_filter returns correct length list or returns ValueError'''
        test_query = {
                        "BRC_ATLAS": {
                                    "gender": {"type": "radio", "value": "M"},
                                    "age": {"type": "range", "min": "20", "max": "40"},
                                    "handedness": {"type": "checkbox", "values": ["R","L"]}
                                    }
                      }
        query_filter = dbu.construct_subject_query_filter(test_query['BRC_ATLAS'])
        assert len(query_filter) == 4 # 1 constraint for radio, 2 constraints for range
        
        query_strings = []
        for expr in query_filter:
            query_strings.append(str(expr))
        assert 'subject.age >= :age_1' in query_strings
        assert 'subject.age <= :age_1' in query_strings
        assert 'subject.gender = :gender_1' in query_strings
        assert 'subject.handedness IN (:handedness_1, :handedness_2)' in query_strings
        
        test_query = {
                        "BRC_ATLAS": {
                                    "gender": {"type": "nonexistent_type", "value": "M"},
                                    "age": {"type": "range", "min": "20", "max": "40"}
                                    }
                      }
        try:
            query_filter = dbu.construct_subject_query_filter(test_query['BRC_ATLAS'])
            assert False
        except ValueError:
            assert True
            
    def test_get_tract(self):
        # insert 2 test tracts
        tract1 = Tract(code=DatabaseUtilsTestCase.tract1_code,
                       name=DatabaseUtilsTestCase.tract1_name,
                       file_path=DatabaseUtilsTestCase.tract1_file_path,
                       description=DatabaseUtilsTestCase.tract1_description)
        db.session.add(tract1)
        
        tract2 = Tract(code=DatabaseUtilsTestCase.tract2_code,
                       name=DatabaseUtilsTestCase.tract2_name,
                       file_path=DatabaseUtilsTestCase.tract2_file_path,
                       description=DatabaseUtilsTestCase.tract2_description)
        db.session.add(tract2)
        db.session.commit()
        
        tract = dbu.get_tract(DatabaseUtilsTestCase.tract1_code)
        assert type(tract) == Tract
        assert tract.code == DatabaseUtilsTestCase.tract1_code
        
    def test_subjects_per_dataset(self):
        # insert 2 test datasets
        dataset1 = Dataset(code=DatabaseUtilsTestCase.dataset1_code,
                          name=DatabaseUtilsTestCase.dataset1_name,
                          file_path=DatabaseUtilsTestCase.dataset1_file_path,
                          query_params=DatabaseUtilsTestCase.dataset1_query_params)
        db.session.add(dataset1)
        dataset2 = Dataset(code=DatabaseUtilsTestCase.dataset2_code,
                          name=DatabaseUtilsTestCase.dataset2_name,
                          file_path=DatabaseUtilsTestCase.dataset2_file_path,
                          query_params=DatabaseUtilsTestCase.dataset2_query_params)
        db.session.add(dataset2)
        # insert subjects
        sbjct1 = Subject(subject_id=DatabaseUtilsTestCase.sbjct1_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct1_gender,
                         age=DatabaseUtilsTestCase.sbjct1_age,
                         handedness=DatabaseUtilsTestCase.sbjct1_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct1_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct1_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct1_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct1_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct1_mmse)
        db.session.add(sbjct1)
        sbjct2 = Subject(subject_id=DatabaseUtilsTestCase.sbjct2_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct2_gender,
                         age=DatabaseUtilsTestCase.sbjct2_age,
                         handedness=DatabaseUtilsTestCase.sbjct2_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct2_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct2_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct2_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct2_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct2_mmse)
        db.session.add(sbjct2)
        sbjct3 = Subject(subject_id=DatabaseUtilsTestCase.sbjct3_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct3_gender,
                         age=DatabaseUtilsTestCase.sbjct3_age,
                         handedness=DatabaseUtilsTestCase.sbjct3_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct3_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct3_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct3_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct3_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct3_mmse)
        db.session.add(sbjct3)
        sbjct4 = Subject(subject_id=DatabaseUtilsTestCase.sbjct4_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct4_gender,
                         age=DatabaseUtilsTestCase.sbjct4_age,
                         handedness=DatabaseUtilsTestCase.sbjct4_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct4_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct4_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct4_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct4_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct4_mmse)
        db.session.add(sbjct4)
        db.session.commit()
        
        test_query = {
                        "TESTDATASET1": {
                                    "handedness": {"type": "checkbox", "values": ["R","L"]}
                                    },
                        "TESTDATASET2": {
                                    "handedness": {"type": "checkbox", "values": ["R","L"]}
                                    }
                      }
        
        result = dbu.subjects_per_dataset(test_query)
        assert result['dataset']['TESTDATASET1'] == 3
        assert result['dataset']['TESTDATASET2'] == 1
        
    def test_subject_id_dataset_file_path(self):
        # insert 2 test datasets
        dataset1 = Dataset(code=DatabaseUtilsTestCase.dataset1_code,
                          name=DatabaseUtilsTestCase.dataset1_name,
                          file_path=DatabaseUtilsTestCase.dataset1_file_path,
                          query_params=DatabaseUtilsTestCase.dataset1_query_params)
        db.session.add(dataset1)
        dataset2 = Dataset(code=DatabaseUtilsTestCase.dataset2_code,
                          name=DatabaseUtilsTestCase.dataset2_name,
                          file_path=DatabaseUtilsTestCase.dataset2_file_path,
                          query_params=DatabaseUtilsTestCase.dataset2_query_params)
        db.session.add(dataset2)
        # insert subjects
        sbjct1 = Subject(subject_id=DatabaseUtilsTestCase.sbjct1_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct1_gender,
                         age=DatabaseUtilsTestCase.sbjct1_age,
                         handedness=DatabaseUtilsTestCase.sbjct1_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct1_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct1_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct1_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct1_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct1_mmse)
        db.session.add(sbjct1)
        sbjct2 = Subject(subject_id=DatabaseUtilsTestCase.sbjct2_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct2_gender,
                         age=DatabaseUtilsTestCase.sbjct2_age,
                         handedness=DatabaseUtilsTestCase.sbjct2_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct2_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct2_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct2_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct2_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct2_mmse)
        db.session.add(sbjct2)
        sbjct3 = Subject(subject_id=DatabaseUtilsTestCase.sbjct3_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct3_gender,
                         age=DatabaseUtilsTestCase.sbjct3_age,
                         handedness=DatabaseUtilsTestCase.sbjct3_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct3_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct3_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct3_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct3_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct3_mmse)
        db.session.add(sbjct3)
        sbjct4 = Subject(subject_id=DatabaseUtilsTestCase.sbjct4_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct4_gender,
                         age=DatabaseUtilsTestCase.sbjct4_age,
                         handedness=DatabaseUtilsTestCase.sbjct4_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct4_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct4_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct4_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct4_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct4_mmse)
        db.session.add(sbjct4)
        db.session.commit()
        
        test_query = {
                        "TESTDATASET1": {
                                    "handedness": {"type": "checkbox", "values": ["R","L"]}
                                    },
                        "TESTDATASET2": {
                                    "handedness": {"type": "checkbox", "values": ["R","L"]}
                                    }
                      }
        
        result = dbu.subject_id_dataset_file_path(test_query)
        assert len(result) == 4
        sorted_result = sorted(result, key=lambda subject: subject[0])
        assert sorted_result[0][0] == DatabaseUtilsTestCase.sbjct1_subject_id
        assert sorted_result[0][1] == DatabaseUtilsTestCase.dataset1_file_path
        assert sorted_result[1][0] == DatabaseUtilsTestCase.sbjct2_subject_id
        assert sorted_result[1][1] == DatabaseUtilsTestCase.dataset1_file_path
        assert sorted_result[2][0] == DatabaseUtilsTestCase.sbjct3_subject_id
        assert sorted_result[2][1] == DatabaseUtilsTestCase.dataset1_file_path
        assert sorted_result[3][0] == DatabaseUtilsTestCase.sbjct4_subject_id
        assert sorted_result[3][1] == DatabaseUtilsTestCase.dataset2_file_path
        
    def test_subject_tract_metrics(self):
        
        # insert subjects
        sbjct1 = Subject(subject_id=DatabaseUtilsTestCase.sbjct1_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct1_gender,
                         age=DatabaseUtilsTestCase.sbjct1_age,
                         handedness=DatabaseUtilsTestCase.sbjct1_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct1_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct1_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct1_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct1_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct1_mmse)
        db.session.add(sbjct1)
        sbjct2 = Subject(subject_id=DatabaseUtilsTestCase.sbjct2_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct2_gender,
                         age=DatabaseUtilsTestCase.sbjct2_age,
                         handedness=DatabaseUtilsTestCase.sbjct2_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct2_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct2_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct2_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct2_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct2_mmse)
        db.session.add(sbjct2)
        sbjct3 = Subject(subject_id=DatabaseUtilsTestCase.sbjct3_subject_id,
                         gender=DatabaseUtilsTestCase.sbjct3_gender,
                         age=DatabaseUtilsTestCase.sbjct3_age,
                         handedness=DatabaseUtilsTestCase.sbjct3_handedness,
                         edinburgh_handedness_raw=DatabaseUtilsTestCase.sbjct3_edinburgh_handedness_raw,
                         ravens_iq_raw=DatabaseUtilsTestCase.sbjct3_ravens_iq_raw,
                         dataset_code=DatabaseUtilsTestCase.sbjct3_dataset_code,
                         file_path=DatabaseUtilsTestCase.sbjct3_file_path,
                         mmse=DatabaseUtilsTestCase.sbjct3_mmse)
        db.session.add(sbjct3)
        
        # insert test tract
        tract1 = Tract(code=DatabaseUtilsTestCase.tract1_code,
                       name=DatabaseUtilsTestCase.tract1_name,
                       file_path=DatabaseUtilsTestCase.tract1_file_path,
                       description=DatabaseUtilsTestCase.tract1_description)
        db.session.add(tract1)
        
        # insert subject metrics
        sbjct1_mets = SubjectTractMetrics(subject_id=DatabaseUtilsTestCase.sbjct1_subject_id,
                                     tract_code=DatabaseUtilsTestCase.tract1_code,
                                     mean_MD=0.5,
                                     std_MD=0.01,
                                     mean_FA=0.5,
                                     std_FA=0.01,
                                     volume=10)
        db.session.add(sbjct1_mets)
        sbjct2_mets = SubjectTractMetrics(subject_id=DatabaseUtilsTestCase.sbjct2_subject_id,
                                     tract_code=DatabaseUtilsTestCase.tract1_code,
                                     mean_MD=0.5,
                                     std_MD=0.01,
                                     mean_FA=0.5,
                                     std_FA=0.01,
                                     volume=10)
        db.session.add(sbjct2_mets)
        sbjct3_mets = SubjectTractMetrics(subject_id=DatabaseUtilsTestCase.sbjct3_subject_id,
                                     tract_code=DatabaseUtilsTestCase.tract1_code,
                                     mean_MD=0.5,
                                     std_MD=0.01,
                                     mean_FA=0.5,
                                     std_FA=0.01,
                                     volume=10)
        db.session.add(sbjct3_mets)
        
        db.session.commit()
        
        test_query = {
                        "TESTDATASET1": {
                                    "handedness": {"type": "checkbox", "values": ["R","L"]}
                                    }
                      }
        
        metrics = dbu.subject_tract_metrics(test_query, DatabaseUtilsTestCase.tract1_code)
        assert type(metrics) == np.ndarray
        assert metrics.shape == (3,5)
        assert np.sum(metrics) == 33.06
        
        
        
        
    
    