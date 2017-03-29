from megatrack import app
import models
from flask_script import Manager,Server,Shell
from flask_migrate import Migrate,MigrateCommand

manager = Manager(app)

db = models.db
migrate = Migrate(app, db)
manager.add_command('db', MigrateCommand)

manager.add_command('runserver', Server())
manager.add_command('shell', Shell(make_context={app:app, db:db, models:models}))

if __name__=='__main__':
    manager.run()