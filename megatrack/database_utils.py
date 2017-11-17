'''
Created on 14 Sep 2017

@author: richard
'''
from megatrack.models import Tract, Subject, Dataset, DatasetTracts
import numpy as np

def get_dataset_select_info():
    return Dataset.query.all()

def get_tract_select_info():
    result = {}
    ignored_tracts = []
    
    tracts = Tract.query.all() # can order them in a certain way here
    dataset_tracts = DatasetTracts.query.with_entities(DatasetTracts.dataset_code, DatasetTracts.tract_code).all()
    
    if dataset_tracts:
        dataset_tracts = np.array(dataset_tracts)
        for tract in tracts:
            if tract.code in dataset_tracts[:,1]:
                dataset_idx = np.where(dataset_tracts[:,1] == tract.code)[0]
                result[tract.code] = {"name": tract.name,
                                       "description": tract.description,
                                       "datasets": dataset_tracts[:,0][dataset_idx].tolist()}
            else:
                ignored_tracts.append(tract.code)
            
    return result, ignored_tracts


def construct_subject_query_filter(dataset_constraints):
    dataset_filter = []
    for constraint_field in dataset_constraints:
        constraint_info = dataset_constraints[constraint_field]
        if constraint_info['type'] == 'radio':
            dataset_filter.append(getattr(Subject, constraint_field) == constraint_info['value'])
        elif constraint_info['type'] == 'range':
            dataset_filter.append(getattr(Subject, constraint_field) >= constraint_info['min'])
            dataset_filter.append(getattr(Subject, constraint_field) <= constraint_info['max'])
        elif constraint_info['type'] == 'checkbox':
            dataset_filter.append(getattr(Subject, constraint_field).in_(constraint_info['values']))
        else:
            # maybe just want to warn here and carry on with next constraint?
            raise ValueError('Unexpected query type "' + constraint_info['type'] + '" received from client!')
    return dataset_filter

def construct_subject_file_paths(request_query, data_file_path):
    results = {"dataset":{}}
    full_file_paths = []
        
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key])
        dataset_filter.append(Subject.dataset_code == key)
        subject_file_paths = Subject.query.with_entities(Subject.file_path).filter(*dataset_filter).all()
        dataset_file_path = Dataset.query.with_entities(Dataset.file_path).filter(Dataset.file_path == key).first()[0]            
        for path in subject_file_paths:
            full_file_paths.append(data_file_path + dataset_file_path + '/full_brain_maps/mni/' + path[0][:-5])
        results['dataset'][key] = len(subject_file_paths)
        
    return results, full_file_paths
    