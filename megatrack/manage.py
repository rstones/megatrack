from megatrack import application, db, models
from flask_script import Manager,Server,Shell
from flask_migrate import Migrate,MigrateCommand

manager = Manager(application)

migrate = Migrate(application, db)
manager.add_command('db', MigrateCommand)

manager.add_command('runserver', Server())

def _make_context():
    return dict(app=application, db=db, models=models)

manager.add_command('shell', Shell(make_context=_make_context))

if __name__=='__main__':
    manager.run()
