from megatrack import application, db
from megatrack.models import User
import sys, getopt, getpass

def main(argv):
    try:
        opts,args = getopt.getopt(argv, "u:", ["username"])
    except getopt.GetoptError:
        print('Usage: python scripts/create_new_user.py -u <user_name>')
        sys.exit(2)

    user_name = opts[0][1]
    
    password = getpass.getpass('Enter password: ')
    confirm_password = getpass.getpass('Confirm password: ')

    if password != confirm_password:
        print('The passwords did not match, please try again')
        sys.exit(1)

    user = User(user_name, password)
    db.session.add(user)
    db.session.commit()
    print('User ' + user_name + ' successfully created :)')
    sys.exit()

if __name__ == '__main__':
    db.create_all(app=application)
    application.app_context().push()
    main(sys.argv[1:])
