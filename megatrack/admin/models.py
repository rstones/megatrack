import datetime

import jwt

from megatrack import db, bcrypt, application

class User(db.Model):
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_name = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    reg_date = db.Column(db.DateTime, nullable=False)
    
    def __init__(self, user_name, password):
        self.user_name = user_name
        self.password = bcrypt.generate_password_hash(password)
        self.reg_date = datetime.datetime.now()
        
    def __repr__(self):
        return '<User %r>' % self.user_name
        
    def encode_auth_token(self, user_id):
        try:
            payload = {
                'exp': datetime.datetime.now() + datetime.timedelta(days=0, seconds=60*60),
                'iat': datetime.datetime.now(),
                'sub': user_id
            }
            return jwt.encode(payload, application.config.get('SECRET_KEY'), algorithm='HS256')
        except Exception as e:
            print(e)
            return e
    
    @staticmethod
    def decode_auth_token(auth_token):
        try:
            payload = jwt.decode(auth_token, application.config.get('SECRET_KEY'))
            return payload['sub']
        except jwt.ExpiredSignatureError:
            return 'Signature expired. Please log in again.'
        except jwt.InvalidTokenError:
            return 'Invalid token. Please log in again.'