from megatrack import application, db

if __name__=='__main__':
    application.debug = application.config['FLASK_DEBUG']
    db.create_all(app=application)
    application.run()