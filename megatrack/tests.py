from flask import Flask
import unittest
from flask_testing import TestCase
from .models import db, AlchemyEncoder, Tract
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
        resp = self.client.get('/')
        assert b'Home page' in resp.get_data()
    
    def test_about(self):
        resp = self.client.get('/about')
        assert b'About page' in resp.get_data()
    
    def test_get_template(self):
        resp = self.client.get('/get_template')
        assert resp.mimetype == 'application/octet-stream'
        assert resp.headers.get('Content-Disposition') == 'attachment; filename=Template_T1_2mm_new.nii.gz'
        assert resp.headers.get('Content-Length') == '1439379'
        
    def test_populate_tract_select(self):
        # insert test tract
        code = 'CINGL'; name = 'Left Cingulum'; file_path ='/CINGL'
        cingL = Tract(code=code, name=name, file_path=file_path)
        db.session.add(cingL)
        db.session.commit()
        # get response
        resp = self.client.get('/tract_select')
        # test response
        assert resp.mimetype == 'application/json'
        assert bytes('"code": "'+code+'"', 'utf-8') in resp.get_data()
        assert bytes('"name": "'+name+'"', 'utf-8') in resp.get_data()
        assert bytes('"file_path": "'+file_path+'"', 'utf-8') not in resp.get_data() # we don't want to expose file paths

if __name__ == '__main__':
    unittest.main()