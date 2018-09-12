'''
Created on 7 Sep 2017

@author: richard
'''
import unittest

import flask
from flask import Flask, json, current_app
from flask_testing import TestCase
from nibabel import Nifti1Image, Nifti1Header
from werkzeug.datastructures import FileStorage, Headers
from flask_assets import Environment, Bundle
from werkzeug.wrappers import Response

from megatrack.models import db, Tract, Dataset, DatasetTracts, Subject
from megatrack.lesion.models import LesionUpload
from megatrack.alchemy_encoder import AlchemyEncoder
from megatrack.views import megatrack
from megatrack.lesion.views import lesion
from megatrack import views
from megatrack.utils import data_utils as du
from megatrack.test.cache_mock import CacheMock
from megatrack.test.monkey_patch import monkey_patch
from megatrack.test.mock_data import *
        
class MegatrackTestCase(TestCase):
    
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
        tract = Tract(code=t1_code,
                      name=t1_name,
                      file_path=t1_file_path,
                      description=t1_description)
        db.session.add(tract)
        
        # insert dataset tracts
        dataset_tract = DatasetTracts(d1_code, m1_code, t1_code)
        db.session.add(dataset_tract)
        
        db.session.commit()
        
        # get response
        resp = self.client.get('/tract_select')
        # test response
        assert resp.mimetype == 'application/json'
        data = json.loads(resp.get_data())
        assert data[t1_code]
        assert data[t1_code]['name'] == t1_name
        assert isinstance(data[t1_code]['datasets'], dict)
        assert len(data[t1_code]['datasets'][d1_code]) == 1
        assert data[t1_code]['datasets'][d1_code][0] == m1_code
        assert bytes(t1_file_path, 'utf-8') not in resp.get_data() # we don't want to expose file paths
        
    def test_populate_tract_select_multiple_tracts(self):
        # insert test tracts
        t1 = Tract(code=t1_code, name=t1_name, file_path=t1_file_path, description=t1_description)
        db.session.add(t1)
        
        t2 = Tract(code=t2_code, name=t2_name, file_path=t2_file_path, description=t2_description)
        db.session.add(t2)
        
        # insert dataset tracts
        dt1 = DatasetTracts(d1_code, m1_code, t1_code)
        db.session.add(dt1)
        
        dt2 = DatasetTracts(d1_code, m2_code, t1_code)
        db.session.add(dt2)
        
        dt3 = DatasetTracts(d2_code, m1_code, t1_code)
        db.session.add(dt3)
        
        dt4 = DatasetTracts(d2_code, m1_code, t2_code)
        db.session.add(dt4)
        
        db.session.commit()
        
        resp = self.client.get('/tract_select')
        # test response
        assert resp.mimetype == 'application/json'
        data = json.loads(resp.get_data())
        assert data[t1_code]
        assert data[t1_code]['name'] == t1_name
        assert isinstance(data[t1_code]['datasets'], dict)
        assert data[t1_code]['datasets'][d1_code]
        assert len(data[t1_code]['datasets'][d1_code]) == 2
        assert m1_code in data[t1_code]['datasets'][d1_code]
        assert m2_code in data[t1_code]['datasets'][d1_code]
        assert data[t1_code]['datasets'][d2_code]
        assert len(data[t1_code]['datasets'][d2_code]) == 1
        assert data[t1_code]['datasets'][d2_code][0] == m1_code
        assert data[t2_code]
        assert data[t2_code]['name'] == t2_name
        assert isinstance(data[t2_code]['datasets'], dict)
        assert data[t2_code]['datasets'][d2_code]
        assert len(data[t2_code]['datasets'][d2_code]) == 1
        assert data[t2_code]['datasets'][d2_code][0] == m1_code
        
    def test_populate_tract_select_no_data(self):
        resp = self.client.get('/tract_select')
        assert resp.mimetype == 'application/json'
        data = json.loads(resp.get_data())
        assert not data
        
    def test_populate_dataset_select(self):
        
        d1 = Dataset(code=d1_code, name=d1_name, file_path=d1_file_path, query_params=d1_query_params)
        db.session.add(d1)
        
        d2 = Dataset(code=d2_code, name=d2_name, file_path=d2_file_path, query_params=d2_query_params)
        db.session.add(d2)
        
        dt1 = DatasetTracts(dataset_code=d1_code, method_code=m1_code, tract_code=t1_code)
        db.session.add(dt1)
        
        dt2 = DatasetTracts(dataset_code=d1_code, method_code=m2_code, tract_code=t1_code)
        db.session.add(dt2)
        
        dt3 = DatasetTracts(dataset_code=d2_code, method_code=m1_code, tract_code=t1_code)
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
        assert data[0]['code'] == d1_code or data[1]['code'] == d1_code
        assert data[0]['code'] == d2_code or data[1]['code'] == d2_code
        assert len(data[0]['methods']) == 2 if data[0]['code'] == d1_code else len(data[0]['methods']) == 1
        assert len(data[1]['methods']) == 2 if data[0]['code'] != d1_code else len(data[1]['methods']) == 1
        assert bytes(d1_file_path, 'utf-8') not in resp.get_data()
        assert bytes(d2_file_path, 'utf-8') not in resp.get_data()
        
    def test_populate_dataset_select_no_data(self):
        # get response
        resp = self.client.get('/dataset_select')
        # test response
        assert resp.mimetype == 'application/json'
        data = json.loads(resp.get_data())
        assert not data
        
    def test_query_report(self):
        
        s1 = Subject(subject_id=s1_subject_id,
                     gender=s1_gender,
                     age=s1_age,
                     handedness=s1_handedness,
                     edinburgh_handedness_raw=s1_edinburgh_handedness_raw,
                     ravens_iq_raw=s1_ravens_iq_raw,
                     dataset_code=s1_dataset_code,
                     file_path=s1_file_path,
                     mmse=s1_mmse)
        db.session.add(s1)
        
        s2 = Subject(subject_id=s2_subject_id,
                     gender=s2_gender,
                     age=s2_age,
                     handedness=s2_handedness,
                     edinburgh_handedness_raw=s2_edinburgh_handedness_raw,
                     ravens_iq_raw=s2_ravens_iq_raw,
                     dataset_code=s2_dataset_code,
                     file_path=s2_file_path,
                     mmse=s2_mmse)
        db.session.add(s2)
        
        s3 = Subject(subject_id=s3_subject_id,
                     gender=s3_gender,
                     age=s3_age,
                     handedness=s3_handedness,
                     edinburgh_handedness_raw=s3_edinburgh_handedness_raw,
                     ravens_iq_raw=s3_ravens_iq_raw,
                     dataset_code=s3_dataset_code,
                     file_path=s3_file_path,
                     mmse=s3_mmse)
        db.session.add(s3)
        
        s4 = Subject(subject_id=s4_subject_id,
                     gender=s4_gender,
                     age=s4_age,
                     handedness=s4_handedness,
                     edinburgh_handedness_raw=s4_edinburgh_handedness_raw,
                     ravens_iq_raw=s4_ravens_iq_raw,
                     dataset_code=s4_dataset_code,
                     file_path=s4_file_path,
                     mmse=s4_mmse)
        db.session.add(s4)
        
        db.session.commit()
        
        assert not current_app.cache.get(brc_atlas_females_query) # cache should be empty before request
        
        # initial request
        resp = self.client.get(f'/query_report?{brc_atlas_females_query}')
        data = json.loads(resp.get_data())
        
        assert isinstance(data, dict)
        assert isinstance(data['dataset'], dict)
        assert len(data['dataset'].keys()) == 1
        assert list(data['dataset'].keys())[0] == d1_code
        assert int(data['dataset'][d1_code]) == 1 # query string is for females in BRC_ATLAS dataset
        
        assert current_app.cache.get(brc_atlas_females_query) # data now cached after request
        
        # make another request, should get same result but getting data from the cache
        resp = self.client.get(f'/query_report?{brc_atlas_females_query}')
        data = json.loads(resp.get_data())
        
        assert isinstance(data, dict)
        assert isinstance(data['dataset'], dict)
        assert len(data['dataset'].keys()) == 1
        assert list(data['dataset'].keys())[0] == d1_code
        assert int(data['dataset'][d1_code]) == 1 # query string is for females in BRC_ATLAS dataset
        assert current_app.cache.get(brc_atlas_females_query) # data now cached after request
        
    def test_query_report_no_subjects(self):
        # add only male subjects to database
        s1 = Subject(subject_id=s1_subject_id,
                     gender=s1_gender,
                     age=s1_age,
                     handedness=s1_handedness,
                     edinburgh_handedness_raw=s1_edinburgh_handedness_raw,
                     ravens_iq_raw=s1_ravens_iq_raw,
                     dataset_code=s1_dataset_code,
                     file_path=s1_file_path,
                     mmse=s1_mmse)
        db.session.add(s1)
        
        s3 = Subject(subject_id=s3_subject_id,
                     gender=s3_gender,
                     age=s3_age,
                     handedness=s3_handedness,
                     edinburgh_handedness_raw=s3_edinburgh_handedness_raw,
                     ravens_iq_raw=s3_ravens_iq_raw,
                     dataset_code=s3_dataset_code,
                     file_path=s3_file_path,
                     mmse=s3_mmse)
        db.session.add(s3)
        
        s4 = Subject(subject_id=s4_subject_id,
                     gender=s4_gender,
                     age=s4_age,
                     handedness=s4_handedness,
                     edinburgh_handedness_raw=s4_edinburgh_handedness_raw,
                     ravens_iq_raw=s4_ravens_iq_raw,
                     dataset_code=s4_dataset_code,
                     file_path=s4_file_path,
                     mmse=s4_mmse)
        db.session.add(s4)
        
        db.session.commit()
        
        # query for female subjects in BRC_ATLAS dataset
        resp = self.client.get(f'/query_report?{brc_atlas_females_query}')
        data = json.loads(resp.get_data())
        
        assert isinstance(data, dict)
        assert isinstance(data['dataset'], dict)
        assert len(data['dataset'].keys()) == 1
        assert list(data['dataset'].keys())[0] == d1_code
        assert int(data['dataset'][d1_code]) == 0
        
    def test_query_report_invalid_query(self):        
        resp = self.client.get(f'/query_report?{invalid_param_string}')
        self.assert400(resp)
        
    def test_query_report_nonexistent_dataset(self):
        # only add subject from TESTDATASET
        s4 = Subject(subject_id=s4_subject_id,
                     gender=s4_gender,
                     age=s4_age,
                     handedness=s4_handedness,
                     edinburgh_handedness_raw=s4_edinburgh_handedness_raw,
                     ravens_iq_raw=s4_ravens_iq_raw,
                     dataset_code=s4_dataset_code,
                     file_path=s4_file_path,
                     mmse=s4_mmse)
        db.session.add(s4)
        
        db.session.commit()
        
        # query for females in BRC_ATLAS
        resp = self.client.get(f'/query_report?{brc_atlas_females_query}')
        data = json.loads(resp.get_data())
        
        assert isinstance(data, dict)
        assert isinstance(data['dataset'], dict)
        assert len(data['dataset'].keys()) == 1
        assert list(data['dataset'].keys())[0] == d1_code
        assert int(data['dataset'][d1_code]) == 0
        
    def test_generate_mean_maps(self):
        s1 = Subject(subject_id=s1_subject_id,
                     gender=s1_gender,
                     age=s1_age,
                     handedness=s1_handedness,
                     edinburgh_handedness_raw=s1_edinburgh_handedness_raw,
                     ravens_iq_raw=s1_ravens_iq_raw,
                     dataset_code=s1_dataset_code,
                     file_path=s1_file_path,
                     mmse=s1_mmse)
        db.session.add(s1)
        
        s2 = Subject(subject_id=s2_subject_id,
                     gender=s2_gender,
                     age=s2_age,
                     handedness=s2_handedness,
                     edinburgh_handedness_raw=s2_edinburgh_handedness_raw,
                     ravens_iq_raw=s2_ravens_iq_raw,
                     dataset_code=s2_dataset_code,
                     file_path=s2_file_path,
                     mmse=s2_mmse)
        db.session.add(s2)
        
        s3 = Subject(subject_id=s3_subject_id,
                     gender=s3_gender,
                     age=s3_age,
                     handedness=s3_handedness,
                     edinburgh_handedness_raw=s3_edinburgh_handedness_raw,
                     ravens_iq_raw=s3_ravens_iq_raw,
                     dataset_code=s3_dataset_code,
                     file_path=s3_file_path,
                     mmse=s3_mmse)
        db.session.add(s3)
        
        s4 = Subject(subject_id=s4_subject_id,
                     gender=s4_gender,
                     age=s4_age,
                     handedness=s4_handedness,
                     edinburgh_handedness_raw=s4_edinburgh_handedness_raw,
                     ravens_iq_raw=s4_ravens_iq_raw,
                     dataset_code=s4_dataset_code,
                     file_path=s4_file_path,
                     mmse=s4_mmse)
        db.session.add(s4)
        
        d1 = Dataset(code=d1_code, name=d1_name, file_path=d1_file_path, query_params=d1_query_params)
        db.session.add(d1)
        
        d2 = Dataset(code=d2_code, name=d2_name, file_path=d2_file_path, query_params=d1_query_params)
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
                return template_nifti
            elif s1_subject_id in file_path:
                return s1_MD if 'MD' in file_path else s1_FA
            elif s3_subject_id in file_path:
                return s3_MD if 'MD' in file_path else s3_FA
            else:
                print('Unexpected file path passed to nib_load_path in test_views.test_generate_maps')
                print(file_path)
                return
            
        # assert the cache is empty for query string before response
        assert not current_app.cache.get(brc_atlas_males_query)
        
        # first request
        with monkey_patch(du.nib, 'save', nib_save_patch):
            with monkey_patch(du.nib, 'load', nib_load_patch):
                resp = self.client.get(f'/generate_mean_maps?{brc_atlas_males_query}')
        
        self.assertStatus(resp, 204)
        assert current_app.cache.get(brc_atlas_males_query) # check data has been cached
    
    def test_generate_mean_maps_invalid_query(self):
        resp = self.client.get(f'/generate_mean_maps?{invalid_param_string}')
        self.assert400(resp)

    def insert_tract_test_data(self):
        s1 = Subject(subject_id=s1_subject_id,
                     gender=s1_gender,
                     age=s1_age,
                     handedness=s1_handedness,
                     edinburgh_handedness_raw=s1_edinburgh_handedness_raw,
                     ravens_iq_raw=s1_ravens_iq_raw,
                     dataset_code=s1_dataset_code,
                     file_path=s1_file_path,
                     mmse=s1_mmse)
        db.session.add(s1)
        
        s2 = Subject(subject_id=s2_subject_id,
                     gender=s2_gender,
                     age=s2_age,
                     handedness=s2_handedness,
                     edinburgh_handedness_raw=s2_edinburgh_handedness_raw,
                     ravens_iq_raw=s2_ravens_iq_raw,
                     dataset_code=s2_dataset_code,
                     file_path=s2_file_path,
                     mmse=s2_mmse)
        db.session.add(s2)
        
        s3 = Subject(subject_id=s3_subject_id,
                     gender=s3_gender,
                     age=s3_age,
                     handedness=s3_handedness,
                     edinburgh_handedness_raw=s3_edinburgh_handedness_raw,
                     ravens_iq_raw=s3_ravens_iq_raw,
                     dataset_code=s3_dataset_code,
                     file_path=s3_file_path,
                     mmse=s3_mmse)
        db.session.add(s3)
        
        s4 = Subject(subject_id=s4_subject_id,
                     gender=s4_gender,
                     age=s4_age,
                     handedness=s4_handedness,
                     edinburgh_handedness_raw=s4_edinburgh_handedness_raw,
                     ravens_iq_raw=s4_ravens_iq_raw,
                     dataset_code=s4_dataset_code,
                     file_path=s4_file_path,
                     mmse=s4_mmse)
        db.session.add(s4)
        
        d1 = Dataset(d1_code, d1_name, d1_file_path, d1_query_params)
        db.session.add(d1)
        
        t1 = Tract(t1_code, t1_name, t1_file_path, t1_description)
        db.session.add(t1)
        
        t2 = Tract(t2_code, t2_name, t2_file_path, t2_description)
        db.session.add(t2)
        
        db.session.commit()
        
    def tract_test_response(self, tract_code, query_string):
        
        def nib_load_patch(file_path):
            if s1_subject_id in file_path:
                return s1_t1
            elif s3_subject_id in file_path:
                return s3_t1
            elif du.TEMPLATE_FILE_NAME in file_path:
                return template_nifti
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
        
        assert not current_app.cache.get(brc_atlas_males_query) # assert cache empty before request
        
        resp = self.tract_test_response(t1_code, brc_atlas_males_query)
        
        self.assert200(resp)            
        assert t1_code in file_path_to_test and 'nii.gz' in file_path_to_test
        assert current_app.cache.get(brc_atlas_males_query) # assert cache populated
        
        # test after caching some data
        resp = self.tract_test_response(t1_code, brc_atlas_males_query)
        self.assert200(resp)
        
    def test_get_tract_invalid_tract_code(self):
        
        self.insert_tract_test_data()
        
        resp = self.tract_test_response('invalid_tract_code', brc_atlas_males_query)
        self.assert400(resp)
            
    def test_get_tract_invalid_query(self):
        self.insert_tract_test_data()
        resp = self.tract_test_response(t1_code, invalid_param_string)
        self.assert400(resp)
        
    def test_get_tract_no_subjects(self):
        ''' Test behaviour when there are no subjects returned by the selected query. '''
        s2 = Subject(subject_id=s2_subject_id,
                     gender=s2_gender,
                     age=s2_age,
                     handedness=s2_handedness,
                     edinburgh_handedness_raw=s2_edinburgh_handedness_raw,
                     ravens_iq_raw=s2_ravens_iq_raw,
                     dataset_code=s2_dataset_code,
                     file_path=s2_file_path,
                     mmse=s2_mmse)
        db.session.add(s2)
        
        s4 = Subject(subject_id=s4_subject_id,
                     gender=s4_gender,
                     age=s4_age,
                     handedness=s4_handedness,
                     edinburgh_handedness_raw=s4_edinburgh_handedness_raw,
                     ravens_iq_raw=s4_ravens_iq_raw,
                     dataset_code=s4_dataset_code,
                     file_path=s4_file_path,
                     mmse=s4_mmse)
        db.session.add(s4)
        
        d1 = Dataset(d1_code, d1_name, d1_file_path, d1_query_params)
        db.session.add(d1)
        
        t1 = Tract(t1_code, t1_name, t1_file_path, t1_description)
        db.session.add(t1)
        
        t2 = Tract(t2_code, t2_name, t2_file_path, t2_description)
        db.session.add(t2)
        
        db.session.commit()
        
        resp = self.tract_test_response(t1_code, brc_atlas_males_query)
        
        self.assert404(resp)
        
    def test_get_tract_empty_density_map(self):
        ''' Sometimes a subject might not have a certain tract show up with tractography. So need
        to be able to handle an empty density map. '''
        self.insert_tract_test_data()
        
        def nib_load_patch(file_path):
            if s1_subject_id in file_path:
                return s1_t1
            elif s3_subject_id in file_path:
                return empty_nifti
            elif du.TEMPLATE_FILE_NAME in file_path:
                return template_nifti
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
                    resp = self.client.get(f'tract/{t1_code}?{brc_atlas_males_query}&file_type=.nii.gz')
                    
        self.assert200(resp)
        assert t1_code in file_path_to_test and 'nii.gz' in file_path_to_test


if __name__ == '__main__':
    unittest.main()