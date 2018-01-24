from flask import Flask
from flask_sqlalchemy import SQLAlchemy
#from .models import db, AlchemyEncoder
from .alchemy_encoder import AlchemyEncoder
from werkzeug.contrib.cache import MemcachedCache, RedisCache
from flask_bcrypt import Bcrypt

# set up application
application = Flask(__name__)
application.config.from_object('config.BaseConfig')
application.json_encoder = AlchemyEncoder
application.cache = RedisCache(application.config['REDIS_HOST'], application.config['REDIS_PORT'], \
                               default_timeout=application.config['CACHE_TIMEOUT'])

# set up authentication
bcrypt = Bcrypt(application)

# set up database
db = SQLAlchemy()
db.init_app(application)

# import blueprint with routes after application is set up
from .views import megatrack
application.register_blueprint(megatrack, url_prefix='/megatrack')

# import models after application is set up
from megatrack import models