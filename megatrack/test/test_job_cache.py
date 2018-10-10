import unittest
from megatrack.utils.cache_utils import JobCache
from megatrack.test.cache_mock import CacheMock

class JobCacheTestCase(unittest.TestCase):
    
    TEST_KEY = 'test_key'
    JOB1_KEY = 'job1'
    JOB2_KEY = 'job2'
    
    def test_add_job(self):
        cache = CacheMock()
        job_cache = JobCache(cache)
        
        # test when no jobs in cache for key
        job_cache.add_job(self.TEST_KEY, self.JOB1_KEY)
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('status') == 'IN_PROGRESS'
        
        # test when jobs already exist for key but job doesn't exist
        job_cache.add_job(self.TEST_KEY, self.JOB2_KEY)
        assert cache.get(self.TEST_KEY).get(self.JOB2_KEY).get('status') == 'IN_PROGRESS'
        
        # test when completed job already exists (shouldn't change cached job)
        jobs = cache.get(self.TEST_KEY)
        jobs[self.JOB2_KEY]['status'] = 'COMPLETE'
        cache.set(self.TEST_KEY, jobs)
        job_cache.add_job(self.TEST_KEY, self.JOB2_KEY)
        assert cache.get(self.TEST_KEY).get(self.JOB2_KEY).get('status') == 'COMPLETE'
    
    def test_job_complete(self):
        cache = CacheMock()
        job_cache = JobCache(cache
                             )
        # test when job exists and is in progress
        cache.set(self.TEST_KEY, {
            self.JOB1_KEY: {
                'status': 'IN_PROGRESS',
                'result': ''
            }
        })
        job_cache.job_complete(self.TEST_KEY, self.JOB1_KEY, 'what a result!')
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('status') == 'COMPLETE'
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('result') == 'what a result!'
        
        # test when job exists and is already complete (do we overwrite result
        # if its different to that currently in the cache?)
        job_cache.job_complete(self.TEST_KEY, self.JOB1_KEY, 'a new result')
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('status') == 'COMPLETE'
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('result') == 'a new result'
        
        # test when job exists but has failed previously
        jobs = cache.get(self.TEST_KEY)
        jobs[self.JOB1_KEY]['status'] = 'FAILED'
        job_cache.job_complete(self.TEST_KEY, self.JOB1_KEY, 'a successful result')
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('status') == 'COMPLETE'
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('result') == 'a successful result'
        
        # test when the job doesn't exist (but some jobs do exist for key)
        self.assertRaises(KeyError, job_cache.job_complete, self.TEST_KEY, self.JOB2_KEY, 'result')
        
        # test when no jobs exist for key
        cache.flush()
        self.assertRaises(KeyError, job_cache.job_complete, self.TEST_KEY, self.JOB2_KEY, 'result')
    
    def test_job_failed(self):
        cache = CacheMock()
        job_cache = JobCache(cache)
        
        # test when job exists and is in progress
        cache.set(self.TEST_KEY, {
            self.JOB1_KEY: {
                'status': 'IN_PROGRESS',
                'result': ''
            }
        })
        job_cache.job_failed(self.TEST_KEY, self.JOB1_KEY)
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('status') == 'FAILED'
        
        # test when job exists and is already complete (shouldn't overwrite completed job)
        jobs = cache.get(self.TEST_KEY)
        jobs[self.JOB1_KEY]['status'] = 'COMPLETE'
        jobs[self.JOB1_KEY]['result'] = 'what a result!'
        job_cache.job_failed(self.TEST_KEY, self.JOB1_KEY)
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('status') == 'COMPLETE'
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('result') == 'what a result!'
        
        # test when job exists and is already failed
        cache.set(self.TEST_KEY, {
            self.JOB1_KEY: {
                'status': 'FAILED',
                'result': ''
            }
        })
        job_cache.job_failed(self.TEST_KEY, self.JOB1_KEY)
        assert cache.get(self.TEST_KEY).get(self.JOB1_KEY).get('status') == 'FAILED'
        
        # test when the job doesn't exist (but some jobs do exist for key)
        self.assertRaises(KeyError, job_cache.job_failed, self.TEST_KEY, self.JOB2_KEY)
        
        # test when no jobs exist for key
        cache.flush()
        self.assertRaises(KeyError, job_cache.job_failed, self.TEST_KEY, self.JOB2_KEY)
    
    def test_job_status(self):
        cache = CacheMock()
        job_cache = JobCache(cache)
        
        # test when job exists
        cache.set(self.TEST_KEY, {
            self.JOB1_KEY: {
                'status': 'IN_PROGRESS',
                'result': ''
            }
        })
        status = job_cache.job_status(self.TEST_KEY, self.JOB1_KEY)
        assert status == 'IN_PROGRESS'
        
        # test when job doesn't exist (but some jobs do exist for key)
        #self.assertRaises(KeyError, job_cache.job_status, self.TEST_KEY, self.JOB2_KEY)
        status = job_cache.job_status(self.TEST_KEY, self.JOB2_KEY)
        assert status is None
        
        # test when no jobs exist for key
        cache.flush()
        status = job_cache.job_status(self.TEST_KEY, self.JOB2_KEY)
        #self.assertRaises(KeyError, job_cache.job_status, self.TEST_KEY, self.JOB2_KEY)
        assert status is None