# from flask import Flask
# app = Flask(__name__)

# from megatrack.application import create_app
# app = create_app('../config.py')
#  
# import megatrack.views

from flask import Flask
from .models import db, AlchemyEncoder
from .views import megatrack
from werkzeug.contrib.cache import MemcachedCache

application = Flask(__name__)
application.config.from_object('config.BaseConfig')
application.json_encoder = AlchemyEncoder
application.cache = MemcachedCache(application.config['MEMCACHED_SERVERS'])

db.init_app(application)
application.register_blueprint(megatrack, url_prefix='/megatrack')