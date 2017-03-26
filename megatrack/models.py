'''
Created on 23 Mar 2017

@author: richard
'''
from megatrack import app
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import validates

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://megatrack:megatrack@localhost:3306/megatracktest'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Subject(db.Model):
    id = db.Column(db.Integer, primary_key=True) # need unique id to distinguish subjects from different datasets
    atlas_id = db.Column(db.String(12), unique=True) # would have different format depending on dataset
    age = db.Column(db.Integer) # check, 0 < age < 100?
    gender = db.Column(db.String(1)) # add check, takes values M and F
    iq = db.Column(db.Integer) # check, 0 < iq < 200?
    brc_atlas = db.Column(db.String(1)) # flag to indicate membership of BRC atlas dataset, Y or empty
    file_path = db.Column(db.String(20), unique=True) # directory containing data for this subject
    
    def __init__(self, atlas_id, age, gender, iq, file_path):
        self.atlas_id = atlas_id
        self.age = age
        self.gender = gender
        self.iq = iq
        self.file_path = file_path
        
    def __repr__(self):
        return '<Subject %r>'  % self.atlas_id
    
    @validates('age')
    def validate_age(self, key, age):
        if not 0 < age < 120:
            raise ValueError('Subject:Age is outside validation range [0,120]')
        return age
        
    @validates('gender')
    def validate_gender(self, key, gender):
        if not gender in ['M','F']:
            raise ValueError('Subject:Gender not either M or F')
        return gender
        
    @validates('iq')
    def validate_iq(self, key, iq):
        if not 0 < iq < 200:
            raise ValueError('Subject:IQ is outside validation range [0,200]')
        return iq

class Tract(db.Model):
    '''Populate frontend tract select from this table so adding new tracts only requires
    changes to data and not frontend as well.'''
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True) # eg. CingL
    name = db.Column(db.String(20), unique=True) # eg. Left Cingulum
    file_path = db.Column(db.String(20), unique=True) # subdirectory within subject directory for this tract
    
    def __init__(self, code, name, file_path):
        self.code = code
        self.name = name
        self.file_path = file_path
        
    def __repr__(self):
        return '<Tract %r>' % self.name