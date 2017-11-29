'''
Created on 14 Sep 2017

@author: richard
'''
from megatrack.models import Tract, Subject, Dataset, DatasetTracts, SubjectTractMetrics
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

def get_tract(tract_code):
    return Tract.query.filter(Tract.code == tract_code).first()

def subjects_per_dataset(request_query):
    result = {"dataset":{}}
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key])
        dataset_filter.append(Subject.dataset_code == key)
        subject_ids = Subject.query.with_entities(Subject.subject_id).filter(*dataset_filter).all()          
        result['dataset'][key] = len(subject_ids)
    return result

def subject_id_dataset_file_path(request_query):
    ids_file_paths = []
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key])
        dataset_filter.append(Subject.dataset_code == key)
        ids_file_paths += Subject.query.join(Dataset).with_entities(Subject.subject_id, Dataset.file_path).filter(*dataset_filter).all()
    return ids_file_paths

def construct_subject_file_paths(request_query, data_file_path):
    results = {"dataset":{}}
    full_file_paths = []
        
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key])
        dataset_filter.append(Subject.dataset_code == key)
        subject_ids = Subject.query.with_entities(Subject.subject_id).filter(*dataset_filter).all()
        dataset_file_path = Dataset.query.with_entities(Dataset.file_path).filter(Dataset.file_path == key).first()[0]            
        for id in subject_ids:
            full_file_paths.append(data_file_path + dataset_file_path + '/full_brain_maps/mni/' + id[0])
        results['dataset'][key] = len(subject_ids)
        
    return results, full_file_paths

def subject_tract_metrics(request_query, tract_code):
    subject_ids = []
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key])
        dataset_filter.append(Subject.dataset_code == key)
        ids = Subject.query.with_entities(Subject.subject_id).filter(*dataset_filter).all()
        subject_ids += np.array(ids).squeeze().tolist()

    subject_tract_metrics = SubjectTractMetrics.query.with_entities(
                                                            SubjectTractMetrics.volume, SubjectTractMetrics.mean_FA, 
                                                            SubjectTractMetrics.mean_MD, SubjectTractMetrics.std_FA,
                                                            SubjectTractMetrics.std_MD
                                                        ).filter(SubjectTractMetrics.tract_code == tract_code, \
                                                             SubjectTractMetrics.subject_id.in_(subject_ids)).all()
                                    
    subject_tract_metrics = np.array(subject_tract_metrics).astype(np.float)
    return subject_tract_metrics
    