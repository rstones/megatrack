import os
import megatrack
import numpy as np
import json
import unittest

class MegatrackTestCase(unittest.TestCase):
    
    def setUp(self):
        megatrack.app.config['TESTING'] = True
        self.app = megatrack.app.test_client()
    
    def tearDown(self):
        pass
    
    def test_index(self):
        rv = self.app.get('/')
        assert b'Home page' in rv.get_data()
    
    def test_about(self):
        rv = self.app.get('/about')
        assert b'About page' in rv.get_data()
    
    def test_get_template(self):
        rv = self.app.get('/get_template')
        template_data = np.load('data/compact_template_data.npz')['template_data']
        assert json.dumps(template_data.tolist()) == rv.get_data()
        assert rv.mimetype == "application/json"
    
if __name__ == '__main__':
    unittest.main()