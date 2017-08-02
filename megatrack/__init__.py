# from flask import Flask
# app = Flask(__name__)

# from megatrack.application import create_app
# app = create_app('../config.py')
#  
# import megatrack.views

from flask import Flask
from .models import db, AlchemyEncoder
from .views import megatrack

application = Flask(__name__)
application.config.from_object('config.BaseConfig')
# '''The environment variable MEGATRACK_CONFIG must be set and point to a configuration file path
# relative to megatrack package.'''
# app.config.from_envvar('MEGATRACK_CONFIG')
application.json_encoder = AlchemyEncoder

db.init_app(application)
application.register_blueprint(megatrack)