from megatrack import app, db

if __name__=='__main__':
    app.debug = app.config['FLASK_DEBUG']
    db.create_all(app=app)
    app.run()