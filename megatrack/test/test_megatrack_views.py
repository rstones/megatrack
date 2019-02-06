'''
Created on 7 Sep 2017

@author: richard
'''
import unittest

import flask
from flask import Flask, json, current_app
from flask_testing import TestCase
from nibabel import Nifti1Image, Nifti1Header
import numpy as np
from werkzeug.datastructures import FileStorage, Headers
from flask_assets import Environment, Bundle
from werkzeug.wrappers import Response

from megatrack.models import db, Tract, Dataset, DatasetTracts, Subject, SubjectTractMetrics, CorticalLabel
from megatrack.lesion.models import LesionUpload
from megatrack.alchemy_encoder import AlchemyEncoder
from megatrack.views import megatrack
from megatrack.lesion.views import lesion
from megatrack import views
from megatrack.utils import data_utils as du
from megatrack.test.cache_mock import CacheMock, LockMock
from megatrack.test.monkey_patch import monkey_patch
from megatrack.test import mock_data as md
        
class MegatrackTestCase(TestCase):
    
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
    
    def test_index(self):
        resp = self.client.get('/')
        assert b'MegaTrack Atlas' in resp.get_data()
        
    def test_lesions(self):
        resp = self.client.get('/lesion')
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
        
        file_path_to_test = ''
        
        def send_file_patch(file_path, as_attachment=True, attachment_filename=None,
                            conditional=True, add_etags=True):
            '''Monkey patch flask.send_file with this function to create a
            response object without needing to load a file from file system'''
            nonlocal file_path_to_test
            file_path_to_test = file_path
            headers = Headers()
            headers.add('Content-Disposition', 'attachment', filename=attachment_filename)
            headers['Content-Length'] = 1431363
            return Response(mimetype='application/octet-stream', headers=headers)
        
        with monkey_patch(views, 'send_file', send_file_patch):
            resp = self.client.get('/get_template')
        
        assert file_path_to_test == f'../{current_app.config["DATA_FILE_PATH"]}' \
                                    f'/{du.TEMPLATE_FILE_NAME}'
        assert resp.mimetype == 'application/octet-stream'
        assert resp.headers.get('Content-Disposition') == f'attachment; ' \
                                                          f'filename={du.TEMPLATE_FILE_NAME}'
        assert resp.headers.get('Content-Length') == '1431363'
        
    def test_get_template_file_not_found(self):
        
        def send_file_patch(file_path, as_attachment=True, attachment_filename=None,
                            conditional=True, add_etags=True):
            '''Monkey patch flask.send_file with this function to
            generate FileNotFoundError'''
            file = open('fail.nii.gz', 'rb')
        
        with monkey_patch(views, 'send_file', send_file_patch):
            resp = self.client.get('/get_template')
            
        self.assert500(resp)
        
    def test_populate_tract_select_single_tract(self):
        # insert test tract
        tract = Tract(code=md.t1_code,
                      name=md.t1_name,
                      file_path=md.t1_file_path,
                      description=md.t1_description)
        db.session.add(tract)
        
        # insert dataset tracts
        dataset_tract = DatasetTracts(md.d1_code, md.m1_code, md.t1_code)
        db.session.add(dataset_tract)
        
        db.session.commit()
        
        # get response
        resp = self.client.get('/tract_select')
        # test response
        assert resp.mimetype == 'application/json'
        data = json.loads(resp.get_data())
        assert data[md.t1_code]
        assert data[md.t1_code]['name'] == md.t1_name
        assert isinstance(data[md.t1_code]['datasets'], dict)
        assert len(data[md.t1_code]['datasets'][md.d1_code]) == 1
        assert data[md.t1_code]['datasets'][md.d1_code][0] == md.m1_code
        assert bytes(md.t1_file_path, 'utf-8') not in resp.get_data() # we don't want to expose file paths
        
    def test_populate_tract_select_multiple_tracts(self):
        # insert test tracts
        t1 = Tract(code=md.t1_code, name=md.t1_name, file_path=md.t1_file_path, description=md.t1_description)
        db.session.add(t1)
        
        t2 = Tract(code=md.t2_code, name=md.t2_name, file_path=md.t2_file_path, description=md.t2_description)
        db.session.add(t2)
        
        # insert dataset tracts
        dt1 = DatasetTracts(md.d1_code, md.m1_code, md.t1_code)
        db.session.add(dt1)
        
        dt2 = DatasetTracts(md.d1_code, md.m2_code, md.t1_code)
        db.session.add(dt2)
        
        dt3 = DatasetTracts(md.d2_code, md.m1_code, md.t1_code)
        db.session.add(dt3)
        
        dt4 = DatasetTracts(md.d2_code, md.m1_code, md.t2_code)
        db.session.add(dt4)
        
        db.session.commit()
        
        resp = self.client.get('/tract_select')
        # test response
        assert resp.mimetype == 'application/json'
        data = json.loads(resp.get_data())
        assert data[md.t1_code]
        assert data[md.t1_code]['name'] == md.t1_name
        assert isinstance(data[md.t1_code]['datasets'], dict)
        assert data[md.t1_code]['datasets'][md.d1_code]
        assert len(data[md.t1_code]['datasets'][md.d1_code]) == 2
        assert md.m1_code in data[md.t1_code]['datasets'][md.d1_code]
        assert md.m2_code in data[md.t1_code]['datasets'][md.d1_code]
        assert data[md.t1_code]['datasets'][md.d2_code]
        assert len(data[md.t1_code]['datasets'][md.d2_code]) == 1
        assert data[md.t1_code]['datasets'][md.d2_code][0] == md.m1_code
        assert data[md.t2_code]
        assert data[md.t2_code]['name'] == md.t2_name
        assert isinstance(data[md.t2_code]['datasets'], dict)
        assert data[md.t2_code]['datasets'][md.d2_code]
        assert len(data[md.t2_code]['datasets'][md.d2_code]) == 1
        assert data[md.t2_code]['datasets'][md.d2_code][0] == md.m1_code
        
    def test_populate_tract_select_no_data(self):
        resp = self.client.get('/tract_select')
        assert resp.mimetype == 'application/json'
        data = json.loads(resp.get_data())
        assert not data
        
    def test_populate_dataset_select(self):
        
        d1 = Dataset(code=md.d1_code, name=md.d1_name, file_path=md.d1_file_path, query_params=md.d1_query_params)
        db.session.add(d1)
        
        d2 = Dataset(code=md.d2_code, name=md.d2_name, file_path=md.d2_file_path, query_params=md.d2_query_params)
        db.session.add(d2)
        
        dt1 = DatasetTracts(dataset_code=md.d1_code, method_code=md.m1_code, tract_code=md.t1_code)
        db.session.add(dt1)
        
        dt2 = DatasetTracts(dataset_code=md.d1_code, method_code=md.m2_code, tract_code=md.t1_code)
        db.session.add(dt2)
        
        dt3 = DatasetTracts(dataset_code=md.d2_code, method_code=md.m1_code, tract_code=md.t1_code)
        db.session.add(dt3)
        
        db.session.commit()

        # get response
        resp = self.client.get('/dataset_select')
        # test response
        assert resp.mimetype == 'application/json'
        data = json.loads(resp.get_data())
        assert isinstance(data, list)
        assert len(data) == 2
        assert isinstance(data[0], dict)
        assert data[0]['code'] == md.d1_code or data[1]['code'] == md.d1_code
        assert data[0]['code'] == md.d2_code or data[1]['code'] == md.d2_code
        assert len(data[0]['methods']) == 2 if data[0]['code'] == md.d1_code else len(data[0]['methods']) == 1
        assert len(data[1]['methods']) == 2 if data[0]['code'] != md.d1_code else len(data[1]['methods']) == 1
        assert bytes(md.d1_file_path, 'utf-8') not in resp.get_data()
        assert bytes(md.d2_file_path, 'utf-8') not in resp.get_data()
        
    def test_populate_dataset_select_no_data(self):
        # get response
        resp = self.client.get('/dataset_select')
        # test response
        assert resp.mimetype == 'application/json'
        data = json.loads(resp.get_data())
        assert not data
        
    def test_query_report(self):
        
        s1 = Subject(subject_id=md.s1_subject_id,
                     gender=md.s1_gender,
                     age=md.s1_age,
                     handedness=md.s1_handedness,
                     edinburgh_handedness_raw=md.s1_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s1_ravens_iq_raw,
                     dataset_code=md.s1_dataset_code,
                     file_path=md.s1_file_path,
                     mmse=md.s1_mmse)
        db.session.add(s1)
        
        s2 = Subject(subject_id=md.s2_subject_id,
                     gender=md.s2_gender,
                     age=md.s2_age,
                     handedness=md.s2_handedness,
                     edinburgh_handedness_raw=md.s2_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s2_ravens_iq_raw,
                     dataset_code=md.s2_dataset_code,
                     file_path=md.s2_file_path,
                     mmse=md.s2_mmse)
        db.session.add(s2)
        
        s3 = Subject(subject_id=md.s3_subject_id,
                     gender=md.s3_gender,
                     age=md.s3_age,
                     handedness=md.s3_handedness,
                     edinburgh_handedness_raw=md.s3_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s3_ravens_iq_raw,
                     dataset_code=md.s3_dataset_code,
                     file_path=md.s3_file_path,
                     mmse=md.s3_mmse)
        db.session.add(s3)
        
        s4 = Subject(subject_id=md.s4_subject_id,
                     gender=md.s4_gender,
                     age=md.s4_age,
                     handedness=md.s4_handedness,
                     edinburgh_handedness_raw=md.s4_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s4_ravens_iq_raw,
                     dataset_code=md.s4_dataset_code,
                     file_path=md.s4_file_path,
                     mmse=md.s4_mmse)
        db.session.add(s4)
        
        db.session.commit()
        
        # initial request
        resp = self.client.get(f'/query_report?{md.brc_atlas_females_query}')
        data = json.loads(resp.get_data())
        
        assert isinstance(data, dict)
        assert isinstance(data['dataset'], dict)
        assert len(data['dataset'].keys()) == 1
        assert list(data['dataset'].keys())[0] == md.d1_code
        assert int(data['dataset'][md.d1_code]) == 1 # query string is for females in BRC_ATLAS dataset
        
    def test_query_report_no_subjects(self):
        # add only male subjects to database
        s1 = Subject(subject_id=md.s1_subject_id,
                     gender=md.s1_gender,
                     age=md.s1_age,
                     handedness=md.s1_handedness,
                     edinburgh_handedness_raw=md.s1_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s1_ravens_iq_raw,
                     dataset_code=md.s1_dataset_code,
                     file_path=md.s1_file_path,
                     mmse=md.s1_mmse)
        db.session.add(s1)
        
        s3 = Subject(subject_id=md.s3_subject_id,
                     gender=md.s3_gender,
                     age=md.s3_age,
                     handedness=md.s3_handedness,
                     edinburgh_handedness_raw=md.s3_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s3_ravens_iq_raw,
                     dataset_code=md.s3_dataset_code,
                     file_path=md.s3_file_path,
                     mmse=md.s3_mmse)
        db.session.add(s3)
        
        s4 = Subject(subject_id=md.s4_subject_id,
                     gender=md.s4_gender,
                     age=md.s4_age,
                     handedness=md.s4_handedness,
                     edinburgh_handedness_raw=md.s4_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s4_ravens_iq_raw,
                     dataset_code=md.s4_dataset_code,
                     file_path=md.s4_file_path,
                     mmse=md.s4_mmse)
        db.session.add(s4)
        
        db.session.commit()
        
        # query for female subjects in BRC_ATLAS dataset
        resp = self.client.get(f'/query_report?{md.brc_atlas_females_query}')
        data = json.loads(resp.get_data())
        
        assert isinstance(data, dict)
        assert isinstance(data['dataset'], dict)
        assert len(data['dataset'].keys()) == 1
        assert list(data['dataset'].keys())[0] == md.d1_code
        assert int(data['dataset'][md.d1_code]) == 0
        
    def test_query_report_invalid_query(self):        
        resp = self.client.get(f'/query_report?{md.invalid_param_string}')
        self.assert400(resp)
        
    def test_query_report_nonexistent_dataset(self):
        # only add subject from TESTDATASET
        s4 = Subject(subject_id=md.s4_subject_id,
                     gender=md.s4_gender,
                     age=md.s4_age,
                     handedness=md.s4_handedness,
                     edinburgh_handedness_raw=md.s4_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s4_ravens_iq_raw,
                     dataset_code=md.s4_dataset_code,
                     file_path=md.s4_file_path,
                     mmse=md.s4_mmse)
        db.session.add(s4)
        
        db.session.commit()
        
        # query for females in BRC_ATLAS
        resp = self.client.get(f'/query_report?{md.brc_atlas_females_query}')
        data = json.loads(resp.get_data())
        
        assert isinstance(data, dict)
        assert isinstance(data['dataset'], dict)
        assert len(data['dataset'].keys()) == 1
        assert list(data['dataset'].keys())[0] == md.d1_code
        assert int(data['dataset'][md.d1_code]) == 0
        
    def test_generate_mean_maps(self):
        s1 = Subject(subject_id=md.s1_subject_id,
                     gender=md.s1_gender,
                     age=md.s1_age,
                     handedness=md.s1_handedness,
                     edinburgh_handedness_raw=md.s1_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s1_ravens_iq_raw,
                     dataset_code=md.s1_dataset_code,
                     file_path=md.s1_file_path,
                     mmse=md.s1_mmse)
        db.session.add(s1)
        
        s2 = Subject(subject_id=md.s2_subject_id,
                     gender=md.s2_gender,
                     age=md.s2_age,
                     handedness=md.s2_handedness,
                     edinburgh_handedness_raw=md.s2_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s2_ravens_iq_raw,
                     dataset_code=md.s2_dataset_code,
                     file_path=md.s2_file_path,
                     mmse=md.s2_mmse)
        db.session.add(s2)
        
        s3 = Subject(subject_id=md.s3_subject_id,
                     gender=md.s3_gender,
                     age=md.s3_age,
                     handedness=md.s3_handedness,
                     edinburgh_handedness_raw=md.s3_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s3_ravens_iq_raw,
                     dataset_code=md.s3_dataset_code,
                     file_path=md.s3_file_path,
                     mmse=md.s3_mmse)
        db.session.add(s3)
        
        s4 = Subject(subject_id=md.s4_subject_id,
                     gender=md.s4_gender,
                     age=md.s4_age,
                     handedness=md.s4_handedness,
                     edinburgh_handedness_raw=md.s4_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s4_ravens_iq_raw,
                     dataset_code=md.s4_dataset_code,
                     file_path=md.s4_file_path,
                     mmse=md.s4_mmse)
        db.session.add(s4)
        
        d1 = Dataset(code=md.d1_code, name=md.d1_name, file_path=md.d1_file_path, query_params=md.d1_query_params)
        db.session.add(d1)
        
        d2 = Dataset(code=md.d2_code, name=md.d2_name, file_path=md.d2_file_path, query_params=md.d1_query_params)
        db.session.add(d2)
        
        db.session.commit()
        
        self.saved_file_path = ''
        self.saved_img = None
        
        def nib_save_patch(img, file_path):
            self.saved_file_path = file_path
            self.saved_img = img
            data = img.get_data()
            assert np.all(data == 1.)
        
        def nib_load_patch(file_path):
            if du.TEMPLATE_FILE_NAME in file_path:
                return md.template_nifti
            elif md.s1_subject_id in file_path:
                return md.s1_MD if 'MD' in file_path else md.s1_FA
            elif md.s3_subject_id in file_path:
                return md.s3_MD if 'MD' in file_path else md.s3_FA
            else:
                print('Unexpected file path passed to nib_load_path in test_views.test_generate_maps')
                print(file_path)
                return
            
        # assert the cache is empty for query string before response
        assert not current_app.cache.get(md.brc_atlas_males_query)
        
        # first request
        with monkey_patch(du.nib, 'save', nib_save_patch):
            with monkey_patch(du.nib, 'load', nib_load_patch):
                resp = self.client.get(f'/generate_mean_maps?{md.brc_atlas_males_query}')
        
        self.assertStatus(resp, 204)
        assert current_app.cache.get(md.brc_atlas_males_query) # check data has been cached
    
    def test_generate_mean_maps_invalid_query(self):
        resp = self.client.get(f'/generate_mean_maps?{md.invalid_param_string}')
        self.assert400(resp)

    def insert_tract_test_data(self):
        s1 = Subject(subject_id=md.s1_subject_id,
                     gender=md.s1_gender,
                     age=md.s1_age,
                     handedness=md.s1_handedness,
                     edinburgh_handedness_raw=md.s1_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s1_ravens_iq_raw,
                     dataset_code=md.s1_dataset_code,
                     file_path=md.s1_file_path,
                     mmse=md.s1_mmse)
        db.session.add(s1)
        
        s2 = Subject(subject_id=md.s2_subject_id,
                     gender=md.s2_gender,
                     age=md.s2_age,
                     handedness=md.s2_handedness,
                     edinburgh_handedness_raw=md.s2_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s2_ravens_iq_raw,
                     dataset_code=md.s2_dataset_code,
                     file_path=md.s2_file_path,
                     mmse=md.s2_mmse)
        db.session.add(s2)
        
        s3 = Subject(subject_id=md.s3_subject_id,
                     gender=md.s3_gender,
                     age=md.s3_age,
                     handedness=md.s3_handedness,
                     edinburgh_handedness_raw=md.s3_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s3_ravens_iq_raw,
                     dataset_code=md.s3_dataset_code,
                     file_path=md.s3_file_path,
                     mmse=md.s3_mmse)
        db.session.add(s3)
        
        s4 = Subject(subject_id=md.s4_subject_id,
                     gender=md.s4_gender,
                     age=md.s4_age,
                     handedness=md.s4_handedness,
                     edinburgh_handedness_raw=md.s4_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s4_ravens_iq_raw,
                     dataset_code=md.s4_dataset_code,
                     file_path=md.s4_file_path,
                     mmse=md.s4_mmse)
        db.session.add(s4)
        
        d1 = Dataset(md.d1_code, md.d1_name, md.d1_file_path, md.d1_query_params)
        db.session.add(d1)
        
        t1 = Tract(md.t1_code, md.t1_name, md.t1_file_path, md.t1_description)
        db.session.add(t1)
        
        t2 = Tract(md.t2_code, md.t2_name, md.t2_file_path, md.t2_description)
        db.session.add(t2)
        
        db.session.commit()
        
    def tract_test_response(self, tract_code, query_string):
        
        def nib_load_patch(file_path):
            if md.s1_subject_id in file_path:
                return md.s1_t1
            elif md.s3_subject_id in file_path:
                return md.s3_t1
            elif du.TEMPLATE_FILE_NAME in file_path:
                return md.template_nifti
            else:
                raise ValueError('Invalid file path passed to nib_load_patch in test_views.')
        
        def nib_save_patch(img, file_path):
            pass
        
        def send_file_patch(file_path, as_attachment=True, attachment_filename=None, conditional=True, add_etags=True):
            '''Monkey patch flask.send_file with this function to create a response object without needing
            to load a file from file system'''
            global file_path_to_test
            file_path_to_test = file_path
            headers = Headers()
            headers.add('Content-Disposition', 'attachment', filename=attachment_filename)
            return Response(mimetype='application/octet-stream', headers=headers)
        
        with monkey_patch(views, 'send_file', send_file_patch):
            with monkey_patch(du.nib, 'load', nib_load_patch):
                with monkey_patch(du.nib, 'save', nib_save_patch):
                    resp = self.client.get(f'tract/{tract_code}?{query_string}&file_type=.nii.gz')
                    
        return resp

    def test_get_tract(self):
        
        self.insert_tract_test_data()
        
        assert not current_app.cache.get(md.brc_atlas_males_query) # assert cache empty before request
        
        resp = self.tract_test_response(md.t1_code, md.brc_atlas_males_query)
        
        self.assert200(resp)   
        assert md.t1_code in file_path_to_test and 'nii.gz' in file_path_to_test
        assert current_app.cache.get(md.brc_atlas_males_query) # assert cache populated
        
        # test after caching some data
        resp = self.tract_test_response(md.t1_code, md.brc_atlas_males_query)
        self.assert200(resp)
        
    def test_get_tract_invalid_tract_code(self):
        
        self.insert_tract_test_data()
        
        resp = self.tract_test_response('invalid_tract_code', md.brc_atlas_males_query)
        self.assert400(resp)
            
    def test_get_tract_invalid_query(self):
        self.insert_tract_test_data()
        resp = self.tract_test_response(md.t1_code, md.invalid_param_string)
        self.assert400(resp)
        
    def test_get_tract_no_subjects(self):
        ''' Test behaviour when there are no subjects returned by the selected query. '''
        s2 = Subject(subject_id=md.s2_subject_id,
                     gender=md.s2_gender,
                     age=md.s2_age,
                     handedness=md.s2_handedness,
                     edinburgh_handedness_raw=md.s2_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s2_ravens_iq_raw,
                     dataset_code=md.s2_dataset_code,
                     file_path=md.s2_file_path,
                     mmse=md.s2_mmse)
        db.session.add(s2)
        
        s4 = Subject(subject_id=md.s4_subject_id,
                     gender=md.s4_gender,
                     age=md.s4_age,
                     handedness=md.s4_handedness,
                     edinburgh_handedness_raw=md.s4_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s4_ravens_iq_raw,
                     dataset_code=md.s4_dataset_code,
                     file_path=md.s4_file_path,
                     mmse=md.s4_mmse)
        db.session.add(s4)
        
        d1 = Dataset(md.d1_code, md.d1_name, md.d1_file_path, md.d1_query_params)
        db.session.add(d1)
        
        t1 = Tract(md.t1_code, md.t1_name, md.t1_file_path, md.t1_description)
        db.session.add(t1)
        
        t2 = Tract(md.t2_code, md.t2_name, md.t2_file_path, md.t2_description)
        db.session.add(t2)
        
        db.session.commit()
        
        resp = self.tract_test_response(md.t1_code, md.brc_atlas_males_query)
        
        self.assert404(resp)
        
    def test_get_tract_empty_density_map(self):
        ''' Sometimes a subject might not have a certain tract show up with tractography. So need
        to be able to handle an empty density map. '''
        self.insert_tract_test_data()
        
        def nib_load_patch(file_path):
            if md.s1_subject_id in file_path:
                return md.s1_t1
            elif md.s3_subject_id in file_path:
                return md.empty_nifti
            elif du.TEMPLATE_FILE_NAME in file_path:
                return md.template_nifti
            else:
                raise ValueError('Invalid file path passed to nib_load_patch in test_views.')
            
        def nib_save_patch(img, file_path):
            pass
        
        def send_file_patch(file_path, as_attachment=True, attachment_filename=None, conditional=True, add_etags=True):
            '''Monkey patch flask.send_file with this function to create a response object without needing
            to load a file from file system'''
            global file_path_to_test
            file_path_to_test = file_path
            headers = Headers()
            headers.add('Content-Disposition', 'attachment', filename=attachment_filename)
            return Response(mimetype='application/octet-stream', headers=headers)
        
        with monkey_patch(views, 'send_file', send_file_patch):
            with monkey_patch(du.nib, 'load', nib_load_patch):
                with monkey_patch(du.nib, 'save', nib_save_patch):
                    resp = self.client.get(f'tract/{md.t1_code}?{md.brc_atlas_males_query}&file_type=.nii.gz')
                    
        self.assert200(resp)
        assert md.t1_code in file_path_to_test and 'nii.gz' in file_path_to_test

    def test_get_dynamic_tract_info_no_subjects(self):
        ''' Test 404 returned when no subjects in query. '''
        
        s2 = Subject(subject_id=md.s2_subject_id,
                     gender=md.s2_gender,
                     age=md.s2_age,
                     handedness=md.s2_handedness,
                     edinburgh_handedness_raw=md.s2_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s2_ravens_iq_raw,
                     dataset_code=md.s2_dataset_code,
                     file_path=md.s2_file_path,
                     mmse=md.s2_mmse)
        db.session.add(s2)
        
        s4 = Subject(subject_id=md.s4_subject_id,
                     gender=md.s4_gender,
                     age=md.s4_age,
                     handedness=md.s4_handedness,
                     edinburgh_handedness_raw=md.s4_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s4_ravens_iq_raw,
                     dataset_code=md.s4_dataset_code,
                     file_path=md.s4_file_path,
                     mmse=md.s4_mmse)
        db.session.add(s4)
        
        d1 = Dataset(md.d1_code, md.d1_name, md.d1_file_path, md.d1_query_params)
        db.session.add(d1)
        
        t1 = Tract(md.t1_code, md.t1_name, md.t1_file_path, md.t1_description)
        db.session.add(t1)
        
        t2 = Tract(md.t2_code, md.t2_name, md.t2_file_path, md.t2_description)
        db.session.add(t2)
        
        db.session.commit()
        
        resp = self.client.get(f'/get_tract_info/{md.t1_code}/25?{md.brc_atlas_males_query}')
        self.assert404(resp)
    
    def test_get_static_tract_info_no_subjects(self):
        ''' Test 404 returned when no subjects in query. '''
        
        s2 = Subject(subject_id=md.s2_subject_id,
                     gender=md.s2_gender,
                     age=md.s2_age,
                     handedness=md.s2_handedness,
                     edinburgh_handedness_raw=md.s2_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s2_ravens_iq_raw,
                     dataset_code=md.s2_dataset_code,
                     file_path=md.s2_file_path,
                     mmse=md.s2_mmse)
        db.session.add(s2)
        
        s4 = Subject(subject_id=md.s4_subject_id,
                     gender=md.s4_gender,
                     age=md.s4_age,
                     handedness=md.s4_handedness,
                     edinburgh_handedness_raw=md.s4_edinburgh_handedness_raw,
                     ravens_iq_raw=md.s4_ravens_iq_raw,
                     dataset_code=md.s4_dataset_code,
                     file_path=md.s4_file_path,
                     mmse=md.s4_mmse)
        db.session.add(s4)
        
        d1 = Dataset(md.d1_code, md.d1_name, md.d1_file_path, md.d1_query_params)
        db.session.add(d1)
        
        t1 = Tract(md.t1_code, md.t1_name, md.t1_file_path, md.t1_description)
        db.session.add(t1)
        
        t2 = Tract(md.t2_code, md.t2_name, md.t2_file_path, md.t2_description)
        db.session.add(t2)
        
        db.session.commit()
        
        resp = self.client.get(f'/get_tract_info/{md.t1_code}?{md.brc_atlas_males_query}')
        self.assert404(resp)
        
    def test_download_tract(self):
        
        # need to mock tract probability map + mean maps
        # mock data in db
        # monkey_patch nib.load, nib.save (for json file, may as well cache it for
        #     downloads with same query but different tract)
        # monkey patch Flask.send_file? (will attempt to create zip file in memory though
        #     so hopefully won't need to do this)
        
        self.insert_tract_test_data()
        
        # insert subject_tract_metrics
        s1t1m = SubjectTractMetrics(md.s1_subject_id,
                                  md.m1_code,
                                  md.t1_code,
                                  0.5,
                                  0.05,
                                  0.5,
                                  0.05,
                                  3.)
        db.session.add(s1t1m)
        
        s3t1m = SubjectTractMetrics(md.s3_subject_id,
                                  md.m1_code,
                                  md.t1_code,
                                  0.5,
                                  0.05,
                                  0.5,
                                  0.05,
                                  3.)
        db.session.add(s3t1m)
        
        db.session.commit()
        
        # mock cached file paths and added completed jobs to the cache
        prob_map_file_path = f'{md.t1_code}_some_time.nii.gz'
        MD_file_path = 'MD_some_time.nii.gz'
        FA_file_path = 'FA_some_time.nii.gz'
        current_app.cache.set(md.brc_atlas_males_query, {
                                            md.t1_code: {
                                                'status': 'COMPLETE',
                                                'result': prob_map_file_path
                                            },
                                            'mean_maps': {
                                                'status': 'COMPLETE',
                                                'result': {
                                                    'MD': MD_file_path,
                                                    'FA': FA_file_path
                                                }
                                            }
                                        })
        
        def nib_load_patch(file_path):
            if file_path == prob_map_file_path:
                return md.s1_t1
            elif file_path == MD_file_path:
                return md.s1_MD
            elif file_path == FA_file_path:
                return md.sd_FA
            else:
                raise ValueError(f'Unexpected file path {file_path} passed to nib_load_patch!')
        
        def nib_save_patch(img, file_path):
            # pretend to do something with the nifti img
            pass
        
        with monkey_patch(du.nib, 'load', nib_load_patch), \
                monkey_patch(du.nib, 'save', nib_save_patch):
            resp = self.client.get(f'/download/tract/{md.t1_code}?{md.brc_atlas_males_query}')
            self.assert200(resp)
            
            # now unzip the file and check the query, subject data, metrics in the
            # json file
            # check the nifti file names in the zip archive 
            
    def test_download_tract_invalid_tract(self):
        pass
    
    def test_download_tract_invalid_query(self):
        pass
    
    def test_download_tract_tract_not_in_cache(self):
        pass
    
    def test_download_tract_mean_maps_not_in_cache(self):
        pass
    
    def test_get_cortical_map(self):
        cl1 = CorticalLabel('HCP', 'frontal lobe', 1, '0x00ff00')
        db.session.add(cl1)
        cl2 = CorticalLabel('HCP', 'parietal lobe', 2, '0xff0000')
        db.session.add(cl2)
        cl3 = CorticalLabel('HCP', 'occipital lobe', 3, '0x0000ff')
        db.session.add(cl3)
        cl4 = CorticalLabel('Brodman', 'occipital lobe', 1, '0xdd0f3e')
        db.session.add(cl4)
        db.session.commit()
        
        resp = self.client.get('/get_cortical_map/test')
        self.assert404(resp)
        assert b'No atlas with name' in resp.get_data()
    
    def test_get_cortical_labels(self):
        cl1 = CorticalLabel('HCP', 'frontal lobe', 1, '0x00ff00')
        db.session.add(cl1)
        cl2 = CorticalLabel('HCP', 'parietal lobe', 2, '0xff0000')
        db.session.add(cl2)
        cl3 = CorticalLabel('HCP', 'occipital lobe', 3, '0x0000ff')
        db.session.add(cl3)
        cl4 = CorticalLabel('Brodman', 'occipital lobe', 1, '0xdd0f3e')
        db.session.add(cl4)
        db.session.commit()
        
        resp = self.client.get('/get_cortical_labels/HCP')
        self.assert200(resp)
        data = json.loads(resp.get_data())
        assert len(data) == 3
        assert ['frontal lobe', 1, '0x00ff00'] in data
        assert ['parietal lobe', 2, '0xff0000'] in data
        assert ['occipital lobe', 3, '0x0000ff'] in data
        
        resp = self.client.get('/get_cortical_labels/test')
        self.assert404(resp)
        

if __name__ == '__main__':
    unittest.main()