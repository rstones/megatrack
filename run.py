from megatrack import application, db
import logging
from logging.handlers import TimedRotatingFileHandler

# configure logging, switches over to new log file every midnight
if not application.debug:
    handler = TimedRotatingFileHandler(application.config['LOG_FILE_PATH'], when='midnight')
    handler.setFormatter(logging.Formatter('%(asctime)s %(name)-12s %(levelname)-8s %(message)s'))
    application.logger.addHandler(handler)
    application.logger.setLevel(logging.INFO)

if __name__=='__main__':
    application.debug = application.config['FLASK_DEBUG']
    application.logger.info('Starting application...')
    db.create_all(app=application)
    application.run()