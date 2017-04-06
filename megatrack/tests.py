from flask import Flask
import unittest
from flask_testing import TestCase
from .models import db, AlchemyEncoder
from .views import megatrack
        
class MegatrackTestCase(TestCase):
    
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
    
    def test_index(self):
        resp = self.app.get('/')
        assert b'Home page' in resp.get_data()
    
    def test_about(self):
        resp = self.app.get('/about')
        assert b'About page' in resp.get_data()
    
    def test_get_template(self):
        resp = self.app.get('/get_template')
        assert resp.mimetype == 'application/octet-stream'
        assert resp.headers.get('Content-Disposition') == 'attachment; filename=Template_T1_2mm_new.nii.gz'
        assert resp.headers.get('Content-Length') == '1439379'
        
    def test_populate_tract_select(self):
        resp = self.app.get('/tract_select')
        assert resp.mimetype == 'application/json'

if __name__ == '__main__':
    unittest.main()