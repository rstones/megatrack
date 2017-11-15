'''
Created on 15 Nov 2017

@author: richard
'''
import unittest
from flask_testing import TestCase
import mock
import numpy as np
import megatrack.database_utils as dbu
from megatrack.models import db, AlchemyEncoder, Tract, Dataset, Subject, DatasetTracts
from flask import Flask
from megatrack.views import megatrack

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
        
    def test_get_tract_select_info(self):
        
        # insert 3 test tracts
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
        
    def test_construct_subject_file_paths(self):
        assert False
        
    def test_construct_subject_query_filter(self):
        '''Test subject_query_filter returns correct length list or returns ValueError'''
        test_query = {
                        "BRC_ATLAS": {
                                    "gender": {"type": "radio", "value": "M"},
                                    "age": {"type": "range", "min": "20", "max": "40"}
                                    }
                      }
        query_filter = dbu.construct_subject_query_filter(test_query['BRC_ATLAS'])
        assert len(query_filter) == 3 # 1 constraint for radio, 2 constraints for range
        
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
        
        
        
        
        
    
    