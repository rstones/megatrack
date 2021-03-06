'''
Created on 14 Sep 2017

@author: richard
'''
from megatrack.models import Tract, Subject, Dataset, Method, DatasetTracts, SubjectTractMetrics
import numpy as np

def get_dataset_select_info():
    '''Get all the datasets for select menu'''
    dataset_methods = DatasetTracts.query.with_entities(DatasetTracts.dataset_code, DatasetTracts.method_code).all()
    # get unique dataset/method combinations
    dataset_methods = set(dataset_methods)
    
    # construct list of dicts with all dataset info
    result = {}
    for dm in dataset_methods:
        try:
            dataset = result[dm[0]]
            dataset['methods'].append(dm[1])
        except KeyError:
            dataset = Dataset.query.filter(Dataset.code == dm[0]).first()
            result[dm[0]] = {"code": dm[0], "name": dataset.name, "query_params": dataset.query_params, "methods": [dm[1]]}
    
    return list(result.values())

def get_tract_select_info():
    '''Get tracts for select menu, grouped by the those attached to at least one dataset and those unattached.
    Ensures that a link is defined between each tract and the datasets it is available for in order to be included
    in the select menu.'''
    result = {}
    ignored_tracts = []
    
    tracts = Tract.query.all() # can order them in a certain way here
    dataset_method_tracts = DatasetTracts.query.with_entities(DatasetTracts.dataset_code,
                                                               DatasetTracts.tract_code,
                                                               DatasetTracts.method_code).all()
    
    if dataset_method_tracts:
        dataset_method_tracts = np.array(dataset_method_tracts)
        for tract in tracts:
            if tract.code in dataset_method_tracts[:,1]:
                # add a dict for this tract to result
                result[tract.code] = {"name": tract.name,
                                      "description": tract.description,
                                      "datasets": {}}
            
                # get the rows containing tract.code
                tract_idx = np.where(dataset_method_tracts[:,1] == tract.code)[0]
                dataset_methods = dataset_method_tracts[:,[0,2]][tract_idx]
                # loop through the returned rows and populate the datasets property of the tract dict
                for dm in dataset_methods:
                    try:
                        result[tract.code]['datasets'][dm[0]].append(dm[1])
                    except KeyError:
                        result[tract.code]['datasets'][dm[0]] = [dm[1]]
            else:
                ignored_tracts.append(tract.code)
            
    return result, ignored_tracts


def construct_subject_query_filter(dataset_constraints):
    ''' Constructs a list of SQL Alchemy BinaryExpressions for queries on subjects within a certain dataset.
    dataset_constraints is a dict which defines the type of constraint. The possible constraints 
    for each dataset are defined in Dataset.query_params field.'''
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
    '''Get a single tract based on the tract code'''
    return Tract.query.filter(Tract.code == tract_code).first()

def subjects_per_dataset(request_query):
    '''The number of subjects returned per dataset for the given query'''
    result = {"dataset":{}}
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key]['constraints'])
        dataset_filter.append(Subject.dataset_code == key)
        subject_ids = Subject.query.with_entities(Subject.subject_id).filter(*dataset_filter).all()          
        result['dataset'][key] = len(subject_ids)
    return result

def subject_id_dataset_file_path(request_query):
    '''Returns a list of tuples containing subject id and associated dataset code for the given query'''
    ids_file_paths = []
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key]['constraints'])
        dataset_filter.append(Subject.dataset_code == key)
        ids_file_paths += Subject.query.join(Dataset).with_entities(Subject.subject_id, Dataset.file_path).filter(*dataset_filter).all()
    return ids_file_paths

def density_map_file_path_data(request_query):
    '''Returns a list of lists containing subject id, the associated dataset file path and method code for the given query'''
    data = []
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key]['constraints'])
        dataset_filter.append(Subject.dataset_code == key)
        sbjct_data = Subject.query.join(Dataset).with_entities(Subject.subject_id, Dataset.file_path).filter(*dataset_filter).all()
        sbjct_data = np.array(sbjct_data)
        if len(sbjct_data) == 0: # in case there are no subjects returned for this dataset
            continue
        method_column = np.empty((sbjct_data.shape[0], 1), dtype=object)
        method_column.fill(request_query[key]['method'])
        data += np.append(sbjct_data, method_column, axis=1).tolist()
    return data

def subjects_to_download(request_query):
    subjects = []
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key]['constraints'])
        dataset_filter.append(Subject.dataset_code == key)
        subjects += Subject.query.with_entities(
                                                Subject.gender,
                                                Subject.age,
                                                Subject.edinburgh_handedness_raw,
                                                Subject.ravens_iq_raw
                                            ).filter(*dataset_filter).all()
    return subjects

def subject_tract_metrics(request_query, tract_code):
    '''Get the subject tract metrics for the subjects returned from the given query and the given tract code.'''
    subject_ids_methods = []
    for key in request_query:
        dataset_filter = construct_subject_query_filter(request_query[key]['constraints'])
        dataset_filter.append(Subject.dataset_code == key)
        ids = Subject.query.with_entities(Subject.subject_id).filter(*dataset_filter).all()
        subject_ids = np.array(ids).squeeze().tolist()
        method = request_query[key]['method']
        subject_ids_methods += [(sub_id, method) for sub_id in subject_ids]
        

#     subject_tract_metrics = SubjectTractMetrics.query.with_entities(
#                                                             SubjectTractMetrics.volume, SubjectTractMetrics.mean_FA, 
#                                                             SubjectTractMetrics.mean_MD, SubjectTractMetrics.std_FA,
#                                                             SubjectTractMetrics.std_MD
#                                                         ).filter(SubjectTractMetrics.tract_code == tract_code, \
#                                                              SubjectTractMetrics.subject_id.in_(subject_ids)).all()
    subject_tract_metrics = []
    # there must be a way to do this in a single query!
    for sm in subject_ids_methods:
        subject_tract_metrics += SubjectTractMetrics.query.with_entities(
                                                    SubjectTractMetrics.volume, SubjectTractMetrics.mean_FA, 
                                                    SubjectTractMetrics.mean_MD, SubjectTractMetrics.std_FA,
                                                    SubjectTractMetrics.std_MD
                                                ).filter(SubjectTractMetrics.tract_code == tract_code, \
                                                     SubjectTractMetrics.subject_id == sm[0], \
                                                     SubjectTractMetrics.method_code == sm[1]).all()
                                    
    subject_tract_metrics = np.array(subject_tract_metrics).astype(np.float)
    return subject_tract_metrics
    