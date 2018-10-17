
class CacheMock(object):
    """A mock of a redis cache for unit testing. Exposes get and set methods
    which should act like the real cache in a very simplified way.
    """
    
    def __init__(self):
        self.__cache = {}
    
    def get(self, key):
        try:
            return self.__cache[key]
        except KeyError:
            return None
    
    def set(self, key, value, **kwargs):
        self.__cache[key] = value
    
    def flush(self):
        self.__cache = {}
        
    def get_cache(self):
        return self.__cache
    

    
class LockMock(object):
    """Mock of a lock for a redis cache for testing. Assumes lock is always
    acquired and released successfully since tests currently run in single
    process environment.
    """
    
    def acquire(self):
        return True
    
    def release(self):
        return True