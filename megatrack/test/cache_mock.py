
class CacheMock(object):
    '''A mock of a memcached cache for unit testing. Exposes get and set methods which should act like 
    the real cache in a very simplified way.
    '''
    
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