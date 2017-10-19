'''
Created on 14 Sep 2017

@author: richard
'''
import unittest
import mock
import megatrack.cache_utils as cu

class CacheUtilsTestCase(unittest.TestCase):
    
    query_string_clean = 'BRC_ATLAS%5Bgender%5D%5Btype%5D=checkbox&BRC_ATLAS' \
                                +'%5Bgender%5D%5Bvalues%5D%5B%5D=M&BRC_ATLAS%5Bgender%5D%5Bvalues%5D%5B%5D=F'
                                
    query_string_dirty = 'BRC_ATLAS%5Bgender%5D%5Btype%5D=checkbox&BRC_ATLAS' \
                                +'%5Bgender%5D%5Bvalues%5D%5B%5D=M&BRC_ATLAS%5Bgender%5D%5Bvalues%5D%5B%5D=F&file_type=.nii.gz'
        
    def test_construct_cache_key(self):
        '''Tests that ending &file_type is removed'''
        cache_key = cu.construct_cache_key(self.query_string_dirty)
        assert cache_key == self.query_string_clean
        
        cache_key = cu.construct_cache_key(self.query_string_clean)
        assert cache_key == self.query_string_clean
    
    def test_add_to_cache_dict(self):
        '''Tests adding single and multiple new key value pair to dict'''
        cached_data = {'key1': 'value1'}
        cached_data = cu.add_to_cache_dict(cached_data, {'key2':'value2'})
        assert cached_data['key1'] == 'value1'
        assert cached_data['key2'] == 'value2'
        assert len(cached_data.keys()) == 2
        
        cached_data = {'key1': 'value1'}
        cached_data = cu.add_to_cache_dict(cached_data, {'key2':'value2', 'key3':'value3'})
        assert cached_data['key1'] == 'value1'
        assert cached_data['key2'] == 'value2'
        assert cached_data['key3'] == 'value3'
        assert len(cached_data.keys()) == 3
    
    def test_add_to_cache_dict_empty(self):
        '''Test adding new key value pairs to empty dict'''
        cached_data = {}
        cached_data = cu.add_to_cache_dict(cached_data, {'key1':'value1'})
        assert cached_data['key1'] == 'value1'
        assert len(cached_data.keys()) == 1
    
    def test_add_to_cache_dict_update(self):
        '''Test updating key value pairs that already exist in the dict'''
        cached_data = {'key1': 'value1'}
        cached_data = cu.add_to_cache_dict(cached_data, {'key1':'test_value', 'key2':'value2'})
        assert cached_data['key1'] == 'test_value'
        assert cached_data['key2'] == 'value2'
        assert len(cached_data.keys()) == 2
    
    def test_check_valid_filepaths_in_cache(self):
        '''Tests that values related to the provided keys are valid filepaths on the system'''
        cached_data = {'key1': '../valid_filepath'}
        
        # monkey patch isfile method to avoid using filesystem
        unpatch = getattr(cu.os.path, 'isfile')
        setattr(cu.os.path, 'isfile', lambda path : path == 'valid_filepath')
        is_valid_file = cu.check_valid_filepaths_in_cache(cached_data, 'key1')
        assert is_valid_file
        setattr(cu.os.path, 'isfile', unpatch)
        
    
    def test_check_valid_filepaths_in_cache_invalid(self):
        '''Test invalid filepaths return False'''
        cached_data = {'key1': '../invalid_filepath'}
        unpatch = getattr(cu.os.path, 'isfile')
        setattr(cu.os.path, 'isfile', lambda path : path == 'valid_filepath')
        is_valid_file = cu.check_valid_filepaths_in_cache(cached_data, 'key1')
        assert not is_valid_file
        setattr(cu.os.path, 'isfile', unpatch)
    
    
    
    
    