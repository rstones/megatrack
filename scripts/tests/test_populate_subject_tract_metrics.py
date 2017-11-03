import unittest
import mock
from flask import Flask
import flask
from flask_testing import TestCase
from megatrack.models import db, AlchemyEncoder, Tract, Dataset, Subject, SubjectTractMetrics
import contextlib
import scripts.populate_subject_tract_metrics as pop_sub_tract_mets
from scripts.populate_subject_tract_metrics import calculate_metrics, run
from nibabel.nifti1 import Nifti1Image

@contextlib.contextmanager
def monkey_patch(module, fn_name, patch):
    unpatch = getattr(module, fn_name)
    setattr(module, fn_name, patch)
    try:
        yield
    finally:
        setattr(module, fn_name, unpatch)

class PopulateSubjectTractMetricsTestCase(TestCase):
    
    '''
    populate_subject_tract_metrics looks in subject, tract and dataset tables to get list of tracts available per subject
    then constructs the file paths to the density maps
    calculates some metrics and inserts them into the subject_tract_metrics table
    it needs to ignore subject+tracts that are already in subject_tract_metrics unless a full_refresh flag is set
    
    set up data in sqlite in memory database
    subject, tract, dataset and subject_tract_metrics tables
    
    monkey patch nib.load so don't need to access file system
    '''
    
    # test dataset data
    dataset_code = 'TEST_DATASET'
    dataset_name = 'Test Dataset'
    dataset_file_path = '/test/dataset/'
    dataset_query_params = '{"test": "dataset"}'
    
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
    
    # test tract data
    tract_code = 'AFL_ANT'
    tract_name = 'Left Anterior AF'
    tract_file_path = 'Left_AF_anterior'
    tract_description = 'This is a tract etc etc...'
    
    tract_nifti = Nifti1Image(np.ones((91,109,91), dtype=np.int16), np.eye(4))
    MD_nifti = Nifti1Image(np.ones((91,109,91), dtype=np.int16), np.eye(4))
    FA_nifti = Nifti1Image(np.ones((91,109,91), dtype=np.int16), np.eye(4))
    
    def create_app(self):
        app = Flask(__name__)
        app.config.from_object('config.TestConfig')
        app.json_encoder = AlchemyEncoder
        db.init_app(app)
        return app
    
    def setUp(self):
        db.create_all()
        
    def tearDown(self):
        db.session.remove()
        db.drop_all()
    
    def test_test(self):
        print('This is the test test')
        assert True
        
    def test_calculate_metrics(self):
        '''Test correct metrics are returned in a SubjectTractMetrics object from calculate_metrics'''
        
        # insert dataset
        dataset = Datatset(PopulateSubjectTractMetricsTestCase.dataset_code, PopulateSubjectTractMetricsTestCase.dataset_name,
                           PopulateSubjectTractMetricsTestCase.dataset_file_path, PopulateSubjectTractMetricsTestCase.dataset_query_params)
        #db.session.add(dataset)
        # insert subjects
        sbjct1 = Subject(subject_id=PopulateSubjectTractMetricsTestCase.sbjct1_subject_id,
                         gender=PopulateSubjectTractMetricsTestCase.sbjct1_gender,
                         age=PopulateSubjectTractMetricsTestCase.sbjct1_age,
                         handedness=PopulateSubjectTractMetricsTestCase.sbjct1_handedness,
                         edinburgh_handedness_raw=PopulateSubjectTractMetricsTestCase.sbjct1_edinburgh_handedness_raw,
                         ravens_iq_raw=PopulateSubjectTractMetricsTestCase.sbjct1_ravens_iq_raw,
                         dataset_code=PopulateSubjectTractMetricsTestCase.sbjct1_dataset_code,
                         file_path=PopulateSubjectTractMetricsTestCase.sbjct1_file_path,
                         mmse=PopulateSubjectTractMetricsTestCase.sbjct1_mmse)
        #db.session.add(sbjct1)
        sbjct2 = Subject(subject_id=PopulateSubjectTractMetricsTestCase.sbjct2_subject_id,
                         gender=PopulateSubjectTractMetricsTestCase.sbjct2_gender,
                         age=PopulateSubjectTractMetricsTestCase.sbjct2_age,
                         handedness=PopulateSubjectTractMetricsTestCase.sbjct2_handedness,
                         edinburgh_handedness_raw=PopulateSubjectTractMetricsTestCase.sbjct2_edinburgh_handedness_raw,
                         ravens_iq_raw=PopulateSubjectTractMetricsTestCase.sbjct2_ravens_iq_raw,
                         dataset_code=PopulateSubjectTractMetricsTestCase.sbjct2_dataset_code,
                         file_path=PopulateSubjectTractMetricsTestCase.sbjct2_file_path,
                         mmse=PopulateSubjectTractMetricsTestCase.sbjct2_mmse)
        #db.session.add(sbjct2)
        # insert tract
        tract = Tract(code=PopulateSubjectTractMetricsTestCase.tract_code,
                      name=PopulateSubjectTractMetricsTestCase.tract_name,
                      file_path=PopulateSubjectTractMetricsTestCase.tract_file_path,
                      description=PopulateSubjectTractMetricsTestCase.tract_description)
        #db.session.add(tract)
        
        def nib_load_patch(filepath):
            if 'Left_AF_anterior' in filepath:
                return PopulateSubjectTractMetricsTestCase.tract_nifti
            elif 'MD' in filepath:
                return PopulateSubjectTractMetricsTestCase.MD_nifti
            elif 'FA' in filepath:
                return PopulateSubjectTractMetricsTestCase.FA_nifti
            else:
                raise Exception('Unexpected filepath argument received for nib.load patch')

        
        with monkey_patch(pop_sub_tract_mets.nib, 'load', nib_load_patch):
            # call calculate_metrics with Subject and Tract objects
            # fields
            sbjct_trct_mtrcs = calculate_metrics(sbjct1, tract)
            assert sbjct_trct_mtrcs.subject_id == sbjct1.subject_id
            assert sbjct_trct_mtrcs.tract_code == tract.code
        
    
    def test_run(self):
        '''Integration test for run function inserting correct rows into database'''
        # insert dataset
        dataset = Datatset(PopulateSubjectTractMetricsTestCase.dataset_code, PopulateSubjectTractMetricsTestCase.dataset_name,
                           PopulateSubjectTractMetricsTestCase.dataset_file_path, PopulateSubjectTractMetricsTestCase.dataset_query_params)
        #db.session.add(dataset)
        # insert subjects
        sbjct1 = Subject(subject_id=PopulateSubjectTractMetricsTestCase.sbjct1_subject_id,
                         gender=PopulateSubjectTractMetricsTestCase.sbjct1_gender,
                         age=PopulateSubjectTractMetricsTestCase.sbjct1_age,
                         handedness=PopulateSubjectTractMetricsTestCase.sbjct1_handedness,
                         edinburgh_handedness_raw=PopulateSubjectTractMetricsTestCase.sbjct1_edinburgh_handedness_raw,
                         ravens_iq_raw=PopulateSubjectTractMetricsTestCase.sbjct1_ravens_iq_raw,
                         dataset_code=PopulateSubjectTractMetricsTestCase.sbjct1_dataset_code,
                         file_path=PopulateSubjectTractMetricsTestCase.sbjct1_file_path,
                         mmse=PopulateSubjectTractMetricsTestCase.sbjct1_mmse)
        #db.session.add(sbjct1)
        sbjct2 = Subject(subject_id=PopulateSubjectTractMetricsTestCase.sbjct2_subject_id,
                         gender=PopulateSubjectTractMetricsTestCase.sbjct2_gender,
                         age=PopulateSubjectTractMetricsTestCase.sbjct2_age,
                         handedness=PopulateSubjectTractMetricsTestCase.sbjct2_handedness,
                         edinburgh_handedness_raw=PopulateSubjectTractMetricsTestCase.sbjct2_edinburgh_handedness_raw,
                         ravens_iq_raw=PopulateSubjectTractMetricsTestCase.sbjct2_ravens_iq_raw,
                         dataset_code=PopulateSubjectTractMetricsTestCase.sbjct2_dataset_code,
                         file_path=PopulateSubjectTractMetricsTestCase.sbjct2_file_path,
                         mmse=PopulateSubjectTractMetricsTestCase.sbjct2_mmse)
        #db.session.add(sbjct2)
        # insert tract
        tract = Tract(code=PopulateSubjectTractMetricsTestCase.tract_code,
                      name=PopulateSubjectTractMetricsTestCase.tract_name,
                      file_path=PopulateSubjectTractMetricsTestCase.tract_file_path,
                      description=PopulateSubjectTractMetricsTestCase.tract_description)
        #db.session.add(tract)
        
        def nib_load_patch(filepath):
            if 'Left_AF_anterior' in filepath:
                return PopulateSubjectTractMetricsTestCase.tract_nifti
            elif 'MD' in filepath:
                return PopulateSubjectTractMetricsTestCase.MD_nifti
            elif 'FA' in filepath:
                return PopulateSubjectTractMetricsTestCase.FA_nifti
            else:
                raise Exception('Unexpected filepath argument received for nib.load patch')

        
        with monkey_patch(pop_sub_tract_mets.nib, 'load', nib_load_patch):
            # call calculate_metrics with Subject and Tract objects
            # fields
            sbjct_trct_mtrcs = run()
            assert SubjectTractMetrics.query.filter(SubjectTractMetrics.subject_id == sbjct1.subject_id).all()
        
        
        
        
        