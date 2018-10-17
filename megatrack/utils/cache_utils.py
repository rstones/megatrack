'''
Created on 13 Sep 2017

@author: richard
'''
import os
import datetime
import time

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



class JobCache(object):
    """"Wraps cache and lock instances to provide some helper functions to
    implement jobs having different statuses. Stores the result of completed
    jobs.
    
    The default timeout for the lock is set at time of instantiation.
    """
    
    # job statuses
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETE = 'COMPLETE'
    FAILED = 'FAILED'

    def __init__(self, cache, lock):
        self._cache = cache
        self._lock = lock
        
    def get(self, key):
        '''Get a value from the cache after acquiring a lock'''
        if self._lock.acquire():
            value = self._cache.get(key)
            self._lock.release()
            return value
        else:
            return None # need to think more about what to do here
    
    def set(self, key, value):
        '''Set a key-value pair in the cache after acquiring a lock'''
        if self._lock.acquire():
            result = self._cache.set(key, value)
            self._lock.release()
            return result
        else:
            return False # need to think more about what to do here
        
    def add_job(self, key, job_key):
        '''Adds a job to the cache with status IN_PROGRESS. If the job already
        exists no action is taken.
        
        Return True if job successfully added.'''
        
        jobs = self.get(key)
        if jobs:
            # jobs already exist for this key
            job = jobs.get(job_key)
            if job and job['status'] != self.FAILED:
                # job already exists
                return True
            else:
                # create job
                jobs[job_key] = {'status': self.IN_PROGRESS, 'result': ''}
                return self.set(key, jobs)
        else:
            # no jobs exist yet for this key
            return self.set(key, {
                        job_key: {'status': self.IN_PROGRESS, 'result': ''}
                    })
        
    def restart_job(self, key, job_key):
        raise NotImplementedError
    
    def job_complete(self, key, job_key, result):
        '''Sets job status to COMPLETE and updates the result of that job even if the
        job status was previously COMPLETE. If the job doesn't exist a KeyError
        if raised. '''
        
        jobs = self.get(key)
        if jobs:
            job = jobs.get(job_key)
            if job:
                job['status'] = self.COMPLETE
                job['result'] = result
                jobs[job_key] = job
                return self.set(key, jobs)
            else:
                raise KeyError(f'Job {job_key} does not exist for key {key}.')
        else:
            raise KeyError(f'No jobs in cache for key {key}.')
            
    
    def job_failed(self, key, job_key, err_msg=''):
        jobs = self.get(key)
        if jobs:
            job = jobs.get(job_key)
            if job and job['status'] == self.IN_PROGRESS:
                job['status'] = self.FAILED
                job['error_message'] = err_msg
                jobs[job_key] = job
                return self.set(key, jobs)
            elif job and job['status'] in [self.COMPLETE, self.FAILED]:
                return
            else:
                raise KeyError(f'Job {job_key} does not exist for key {key}.')
        else:
            raise KeyError(f'No jobs in cache for key {key}.')
                
    
    def job_status(self, key, job_key):
        jobs = self.get(key)
        if jobs:
            job = jobs.get(job_key)
            if job:
                return job.get('status')
        

    def job_result(self, key, job_key):
        jobs = self.get(key)
        if jobs:
            job = jobs.get(job_key)
            if job and job.get('status') == self.COMPLETE:
                return job.get('result')
            
    def remove_job(self, key, job_key):
        jobs = self.get(key)
        if jobs:
            jobs.pop(job_key, None)
            return self.set(key, jobs)

    def poll_cache(self, key, job_key, timeout, wait):
        start = datetime.datetime.now()
        while self.job_status(key, job_key) == self.IN_PROGRESS \
                and datetime.datetime.now() - start < datetime.timedelta(seconds=timeout):
            time.sleep(wait)
    