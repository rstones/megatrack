from flask import Flask
import flask
import unittest
import mock
from flask_testing import TestCase
from megatrack.models import Tract, Dataset, Subject, User
from megatrack.views import megatrack
import megatrack.views as views
from megatrack import db

class AdminTestCase(TestCase):
    
    def create_app(self):
        app = Flask(__name__, template_folder='../templates')
        app.config.from_object('config.TestConfig')
        #app.json_encoder = AlchemyEncoder
        #app.cache = CacheMock()
        db.init_app(app)
        app.register_blueprint(megatrack)
        return app
    
    def setUp(self):
        db.create_all()
        
    def tearDown(self):
        db.session.remove()
        db.drop_all()
        #self.app.cache.flush()
        
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
        resp = self.client.post('/login', data={'username': test_user_name, 'password': test_password})
        assert resp.status_code == 200
        assert b'Successfully logged in!' in resp.get_data()
        
        # test incorrect log in credentials
        resp = self.client.post('/login', data={'username': test_user_name, 'password': test_password+'asdfas'})
        assert resp.status_code == 404
        assert b'User does not exist or incorrect password used. Please try again.' in resp.get_data()
        
        
        
        