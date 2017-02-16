import os
import megatrack
import unittest

class MegatrackTestCase(unittest.TestCase):
    
    def setUp(self):
        print('Setting up...')
        megatrack.app.config['TESTING'] = True
        self.app = megatrack.app.test_client()
    
    def tearDown(self):
        print('Tearing down...')
    
    def test_index(self):
        print('Testing index...')
        self.assertTrue(True)
    
    def test_about(self):
        pass
    
    def test_get_template(self):
        pass
    
if __name__ == '__main__':
    unittest.main()