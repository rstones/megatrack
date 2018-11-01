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
    STAGED = 'STAGED'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETE = 'COMPLETE'
    FAILED = 'FAILED'

    def __init__(self, cache, lock):
        self._cache = cache
        self._lock = lock
        
    def get(self, key):
        '''Get a value from the cache after acquiring a lock.
         
        Return None if lock cannot be acquired or the value does not exist in cache'''
        value = None
        if self._lock.acquire():
            try:
                value = self._cache.get(key)
            finally:
                self._lock.release()
                 
        return value
     
    def set(self, key, value):
        '''Set a key-value pair in the cache after acquiring a lock'''
        result = None
        if self._lock.acquire():
            try:
                result = self._cache.set(key, value)
            finally:
                self._lock.release()
                 
        return result

    def add_job_locked(self, key, job_key):
        '''Adds a job to the cache with status STAGED (if it doesn't already exist)
        and returns code PROCEED. If the job already exists it will return the
        status of the job. If a lock cannot be acquired or updating the key fails
        None will be returned.
        
        The code PROCEED indicates to go ahead and perform work for the newly
        added job. Returning a STAGED status could be from a job created by
        another worker that is not yet IN_PROGRESS.
        
        The worker should set the job status to IN_PROGRESS after the PROCEED code
        is obtained.'''
        if self._lock.acquire():
            try:
                jobs = self._cache.get(key)
                if jobs:
                    # jobs exists for this key
                    job = jobs.get(job_key)
                    if job:
                        # job exists already so return status
                        return job['status']
                    else:
                        # create job
                        jobs[job_key] = {'status': self.STAGED, 'result': ''}
                        success = self._cache.set(key, jobs)
                        return 'PROCEED' if success else None
                else:
                    # no jobs exist yet for this key
                    success = self._cache.set(key, {
                                    job_key: {'status': self.STAGED, 'result': ''}
                                })
                    return 'PROCEED' if success else None
            finally:
                self._lock.release()
        else:
            return None # could not acquire lock
        
    def add_job(self, key, job_key):
        '''Adds a job to the cache with status IN_PROGRESS. If the job already
        exists no action is taken.
        
        Return True if job successfully added.'''
        if self._lock.acquire():
            try:
                jobs = self._cache.get(key)
                if jobs:
                    # jobs already exist for this key
                    job = jobs.get(job_key)
                    if job and job['status'] != self.FAILED:
                        # job already exists
                        return True
                    else:
                        # create job
                        jobs[job_key] = {'status': self.IN_PROGRESS, 'result': ''}
                        return self._cache.set(key, jobs)
                else:
                    # no jobs exist yet for this key
                    return self._cache.set(key, {
                                job_key: {'status': self.IN_PROGRESS, 'result': ''}
                            })
            finally:
                self._lock.release()
        else:
            return None # could not add job or check if it already exists
        
    def restart_job(self, key, job_key):
        raise NotImplementedError
    
    def job_in_progress(self, key, job_key):
        '''Sets job status to IN_PROGRESS if it exists and returns True. If lock
        could not be acquired or updating key failed then returns False. A KeyError
        is raised if the key or job_key do not exist in the cache.''' 
        if self._lock.acquire():
            try:
                jobs = self._cache.get(key)
                if jobs:
                    job = jobs.get(job_key)
                    if job:
                        job['status'] = self.IN_PROGRESS
                        return self._cache.set(key, jobs)
                    else:
                        raise KeyError(f'Job {job_key} does not exist for key {key}.')
                else:
                    raise KeyError(f'No jobs in cache for key {key}.')
            finally:
                self._lock.release()
        else:
            return False
    
    def job_complete(self, key, job_key, result):
        '''Sets job status to COMPLETE and updates the result of that job even if the
        job status was previously COMPLETE. If the job doesn't exist a KeyError
        if raised. '''
        if self._lock.acquire():
            try:
                jobs = self._cache.get(key)
                if jobs:
                    job = jobs.get(job_key)
                    if job:
                        job['status'] = self.COMPLETE
                        job['result'] = result
                        jobs[job_key] = job
                        return self._cache.set(key, jobs)
                    else:
                        raise KeyError(f'Job {job_key} does not exist for key {key}.')
                else:
                    raise KeyError(f'No jobs in cache for key {key}.')
            finally:
                self._lock.release()
        else:
            return None # could not update job status or check that it exists
            
    
    def job_failed(self, key, job_key, err_msg=''):
        if self._lock.acquire():
            try:
                jobs = self._cache.get(key)
                if jobs:
                    job = jobs.get(job_key)
                    if job and job['status'] == self.IN_PROGRESS:
                        job['status'] = self.FAILED
                        job['error_message'] = err_msg
                        jobs[job_key] = job
                        return self._cache.set(key, jobs)
                    elif job and job['status'] in [self.COMPLETE, self.FAILED]:
                        return
                    else:
                        raise KeyError(f'Job {job_key} does not exist for key {key}.')
                else:
                    raise KeyError(f'No jobs in cache for key {key}.')
            finally:
                self._lock.release()
        else:
            return None # could not update job status or check that it exists
                
    
    def job_status(self, key, job_key):
        jobs = self._cache.get(key)
        if jobs:
            job = jobs.get(job_key)
            if job:
                return job.get('status')
        

    def job_result(self, key, job_key):
        jobs = self._cache.get(key)
        if jobs:
            job = jobs.get(job_key)
            if job and job.get('status') == self.COMPLETE:
                return job.get('result')
            
    def remove_job(self, key, job_key):
        if self._lock.acquire():
            try:
                jobs = self._cache.get(key)
                if jobs:
                    jobs.pop(job_key, None)
                    return self._cache.set(key, jobs)
            finally:
                self._lock.release()
        else:
            return None # could not acquire lock

    def poll_cache(self, key, job_key, timeout, wait):
        start = datetime.datetime.now()
        while self.job_status(key, job_key) == self.IN_PROGRESS \
                and datetime.datetime.now() - start < datetime.timedelta(seconds=timeout):
            time.sleep(wait)
    