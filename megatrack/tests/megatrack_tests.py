import os
import json
import unittest
import megatrack
import megatrack.models as models
import tempfile

'''
Try using an application factory to create an app which takes a config file for production or testing purposes
http://flask.pocoo.org/docs/0.12/patterns/appfactories/

Ideally I want to use as close as possible to production config for testing (mysql). So use local test db with Tract and
Subject tables in which I can setup and tear down data for unit testing
Then have a staging db where the data reflects what we would have in production.
'''

class MegatrackTestCase(unittest.TestCase):
    
    def init_db(self):
        self.db.create_all()
    
    def setUp(self):
        megatrack.app.config['TESTING'] = True
        megatrack.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app = megatrack.app.test_client()
        self.db = models.db
    
    def tearDown(self):
        #os.close(self.db)
        #os.unlink(megatrack.app.config['SQLALCHEMY_DATABASE_URI'])
        pass
    
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