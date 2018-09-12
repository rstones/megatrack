from flask import Flask
import flask
import unittest
import mock
import json
from flask_testing import TestCase
from megatrack.admin.models import User
from megatrack.models import Tract, Dataset, Subject
from megatrack.alchemy_encoder import AlchemyEncoder
from megatrack.views import megatrack
from megatrack.admin.views import admin
from megatrack import views
from megatrack.admin import views as admin_views
from megatrack import db

class AdminTestCase(TestCase):
    
    def create_app(self):
        app = Flask(__name__, template_folder='../templates')
        app.config.from_object('config.TestConfig')
        app.json_encoder = AlchemyEncoder
        #app.cache = CacheMock()
        db.init_app(app)
        app.register_blueprint(megatrack)
        app.register_blueprint(admin)
        return app
    
    def setUp(self):
        db.create_all()
        
    def tearDown(self):
        db.session.remove()
        db.drop_all()
        #self.app.cache.flush()
        
    def setup_users(self):
        # valid user
        user_name = 'test'
        password = 'password'
        test_user1 = User(user_name, password)
        db.session.add(test_user1)
        
        # invalid user (not in database, we just want the token generated with an invalid user_id)
        user_name = 'test2'
        password = 'password'
        test_user2 = User(user_name, password)
        
        db.session.commit()
        
        return test_user1, test_user2
    
    def setup_datasets(self):
        dataset1_code = 'TEST_DATASET1'
        dataset1_name = 'Test Dataset 1'
        dataset1_file_path = '/test/dataset1'
        dataset1_query_params = '{"query": "params"}'
        dataset1 = Dataset(dataset1_code, dataset1_name, dataset1_file_path, dataset1_query_params)
        db.session.add(dataset1)
        
        dataset2_code = 'TEST_DATASET2'
        dataset2_name = 'Test Dataset 2'
        dataset2_file_path = '/test/dataset2'
        dataset2_query_params = '{"query": "params"}'
        dataset2 = Dataset(dataset2_code, dataset2_name, dataset2_file_path, dataset2_query_params)
        db.session.add(dataset2)
        
        db.session.commit()
        
        return dataset1, dataset2
        
    def test_admin(self):
        resp  = self.client.get('/admin')
        assert b'Admin' in resp.get_data()
        
    def test_login(self):
        
        test_user_name = 'test_user'
        test_password = 'password'
        
        user = User(test_user_name, test_password)
        db.session.add(user)
        db.session.commit()
        
        # test correct log in credentials
        resp = self.client.post('/admin/login', data={'username': test_user_name, 'password': test_password})
        assert resp.status_code == 200
        assert b'Successfully logged in!' in resp.get_data()
        
        # test incorrect log in credentials
        resp = self.client.post('/admin/login', data={'username': test_user_name, 'password': test_password+'asdfas'})
        assert resp.status_code == 404
        assert b'User does not exist or incorrect password used. Please try again.' in resp.get_data()
        
        
    def test_modify_datasets_GET(self):
        
        # set up the data
        dataset1, dataset2 = self.setup_datasets()
        test_user1, test_user2 = self.setup_users()
        
        # generate an auth token
        valid_token = test_user1.encode_auth_token(test_user1.user_id)
        invalid_token = test_user2.encode_auth_token(test_user2.user_id)
        
        # send request to client for valid user
        resp = self.client.get('/admin/datasets', headers={'Authorization': 'Bearer ' + valid_token.decode()})
        data = json.loads(resp.get_data())
        assert resp.status_code == 200
        assert 'Success' in data['message']
        assert len(data['datasets']) == 2
        
        # send request to client for invalid user
        resp = self.client.get('/admin/datasets', headers={'Authorization': 'Bearer ' + invalid_token.decode()})
        data = resp.get_data()
        assert resp.status_code == 401
        assert b'Invalid' in data
        
        # send request to client without Authorization header
        resp = self.client.get('/admin/datasets')
        data = resp.get_data()
        assert resp.status_code == 401
        assert b'No authentication' in data
        
    
    def test_modify_datasets_POST(self):
        # setup data
        dataset1, dataset2 = self.setup_datasets()
        test_user1, test_user2 = self.setup_users()
        # generate auth token
        valid_token = test_user1.encode_auth_token(test_user1.user_id)
        invalid_token = test_user2.encode_auth_token(test_user2.user_id)
        
        # dataset to create
        code = 'NEW_TEST_DATASET'
        name = 'New Test Dataset'
        file_path = 'new/test/dataset/'
        query_params = '{"query": "params"}' 
        
        # test authenticated insert
        resp = self.client.post(
                        '/admin/datasets',
                        headers={'Authorization': 'Bearer ' + valid_token.decode()},
                        data={'code':code, 'name':name, 'filePath':file_path, 'queryParams':query_params}
                    )
        data = resp.get_data()
        assert resp.status_code == 201
        assert b'success' in data
        dataset = Dataset.query.filter(Dataset.code == code).first()
        assert dataset is not None
        
        # test invalid authentication
        resp = self.client.post(
                        '/admin/datasets',
                        headers={'Authorization': 'Bearer ' + invalid_token.decode()},
                        data={'code':code, 'name':name, 'filePath':file_path, 'queryParams':query_params}
                    )
        data = resp.get_data()
        assert resp.status_code == 401
        assert b'Invalid' in data
        assert Dataset.query.filter(Dataset.code == name).first() is None
        
        # test case where dataset code already exists
        resp = self.client.post(
                        '/admin/datasets',
                        headers={'Authorization': 'Bearer ' + valid_token.decode()},
                        data={'code':dataset1.code, 'name':name, 'filePath':file_path, 'queryParams':query_params}
                    )
        data = resp.get_data()
        assert resp.status_code == 500
        assert b'error' in data
        
    def test_modify_datasets_PUT(self):
        
        # setup data
        dataset1, dataset2 = self.setup_datasets()
        test_user1, test_user2 = self.setup_users()
        # generate auth token
        valid_token = test_user1.encode_auth_token(test_user1.user_id)
        invalid_token = test_user2.encode_auth_token(test_user2.user_id)
        
        dataset1_name_updated = 'New Dataset 1 Name'
        
        # test valid authentication
        resp = self.client.put(
                        '/admin/datasets',
                        headers={'Authorization': 'Bearer ' + valid_token.decode()},
                        data={'code':dataset1.code, 'name':dataset1_name_updated,
                              'filePath':dataset1.file_path, 'queryParams':dataset1.query_params}
                    )
        data = resp.get_data()
        assert resp.status_code == 200
        assert b'success' in data
        dataset = Dataset.query.filter(Dataset.code == dataset1.code).first()
        assert dataset is not None
        assert dataset.name == dataset1_name_updated
        
        # test invalid authentication
        resp = self.client.put(
                        '/admin/datasets',
                        headers={'Authorization': 'Bearer ' + invalid_token.decode()},
                        data={'code':dataset1.code, 'name':dataset1_name_updated,
                              'filePath':dataset1.file_path, 'queryParams':dataset1.query_params}
                    )
        data = resp.get_data()
        assert resp.status_code == 401
        assert b'Invalid' in data
        dataset = Dataset.query.filter(Dataset.code == dataset1.code).first()
        assert dataset is not None
        assert dataset.name == dataset1.name
        
        # test update sent where record doesn't exist
        new_dataset_code = 'NEW_DATASET_CODE'
        new_dataset_name = 'New Dataset'
        new_dataset_file_path = 'new/dataset/'
        new_dataset_query_params = '{"new": "params"}'
        
        resp = self.client.put(
                        '/admin/datasets',
                        headers={'Authorization': 'Bearer ' + valid_token.decode()},
                        data={'code':new_dataset_code, 'name':new_dataset_name,
                              'filePath':new_dataset_file_path, 'queryParams':new_dataset_query_params}
                    )
        data = resp.get_data()
        assert resp.status_code == 500
        assert b'error' in data
        dataset = Dataset.query.filter(Dataset.code == new_dataset_code).first()
        assert dataset is None
        
    def test_modify_datasets_DELETE(self):
        
        # setup data
        dataset1, dataset2 = self.setup_datasets()
        test_user1, test_user2 = self.setup_users()
        # generate auth token
        valid_token = test_user1.encode_auth_token(test_user1.user_id)
        invalid_token = test_user2.encode_auth_token(test_user2.user_id)
        
        # test valid authentication
        resp = self.client.delete(
                        '/admin/datasets?code='+dataset1.code,
                        headers={'Authorization': 'Bearer ' + valid_token.decode()}
                    )
        data = resp.get_data()
        print("STATUS CODE:", resp.status_code)
        assert resp.status_code == 200
        assert b'success' in data
        dataset = Dataset.query.filter(Dataset.code == dataset1.code).first()
        assert dataset is None
        
        # test invalid authentication
        resp = self.client.put(
                        '/admin/datasets?code='+dataset2.code,
                        headers={'Authorization': 'Bearer ' + invalid_token.decode()}
                    )
        data = resp.get_data()
        assert resp.status_code == 401
        assert b'Invalid' in data
        dataset = Dataset.query.filter(Dataset.code == dataset2.code).first()
        assert dataset is not None
        
        # test attempted delete of record that doesn't exist
        resp = self.client.delete(
                        '/admin/datasets?code=TEST_DATASET_CODE',
                        headers={'Authorization': 'Bearer ' + valid_token.decode()}
                    )
        data = resp.get_data()
        assert resp.status_code == 500
        assert b'error' in data
    
    def test_modify_tracts_GET(self):
        pass
    
    def test_modify_tracts_POST(self):
        pass
        
    def test_modify_tracts_PUT(self):
        pass
        
    def test_modify_tracts_DELETE(self):
        pass
    
            