'''
Created on 13 Sep 2017

@author: richard
'''
import os

def construct_cache_key(query_string):
    # remove file_type=.nii.gz if its there as its only used to load tracts from XTK javascript lib
    del_idx = query_string.find('&file_type')
    if del_idx > 0:
        query_string = query_string[:del_idx]
    return query_string

def add_to_cache_dict(current_dict, items_to_add):
    if current_dict:
        current_dict.update(items_to_add)
    else:
        current_dict = items_to_add
    return current_dict

def check_valid_filepaths_in_cache(cached_data, *args):
    '''cached_data is the cache dict
    *args are the dict keys for file paths to check'''
    for arg in args:
        try:
            if not cached_data[arg] or not os.path.isfile(cached_data[arg]):
                return False
        except KeyError:
            return False
    return True

def check_items_in_cache(cached_data, *args):
    for arg in args:
        try:
            if not cached_data[arg]:
                return False
        except KeyError:
            return False
    return True
        