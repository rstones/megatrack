from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from .alchemy_encoder import AlchemyEncoder
from werkzeug.contrib.cache import RedisCache
from redis.lock import Lock
from flask_bcrypt import Bcrypt
from flask_assets import Environment, Bundle

# set up application
application = Flask(__name__)
application.config.from_envvar('APP_CONFIG')
application.json_encoder = AlchemyEncoder
application.cache = RedisCache(application.config['REDIS_HOST'],
                               application.config['REDIS_PORT'], \
                               default_timeout=application.config['CACHE_TIMEOUT'])
application.cache_lock = Lock(application.cache._client,
                              'mgtrk_worker_lock',
                              timeout=0.2,
                              blocking_timeout=0.2)

# set up authentication
bcrypt = Bcrypt(application)

# bundle js and css code
assets = Environment(application)

js = Bundle('js/core/*', filters='rjsmin', output='js/core/mgtrk-core.min.js')
assets.register('core-js', js)

css = Bundle('css/core/*', filters='cssmin', output='css/core/mgtrk-core.min.css')
assets.register('core-css', css)

# switch off bundling if app is in debug mode
assets.debug = application.config['FLASK_DEBUG']

# set up database
db = SQLAlchemy()
db.init_app(application)

# import blueprint with routes after application is set up
from megatrack.views import megatrack
application.register_blueprint(megatrack, url_prefix='/megatrack')

from megatrack.lesion.views import lesion
application.register_blueprint(lesion, url_prefix='/megatrack')

from megatrack.admin.views import admin
application.register_blueprint(admin, url_prefix='/megatrack')

# import models after application is set up
import megatrack.models
import megatrack.lesion.models
import megatrack.admin.models