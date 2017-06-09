from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import validates

db = SQLAlchemy()

from flask import json
from sqlalchemy.ext.declarative.api import DeclarativeMeta

# json encoder for SQLAlchemy objects
class AlchemyEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o.__class__, DeclarativeMeta):
            data = {}
            fields = o.__json__() if hasattr(o, '__json__') else dir(o)
            for field in [f for f in fields if not f.startswith('_') and f not in ['metadata', 'query', 'query_class']]:
                value = o.__getattribute__(field)
                try:
                    json.dumps(value)
                    data[field] = value
                except TypeError:
                    data[field] = None
            return data
        return json.JSONEncoder.default(self, o)

class Subject(db.Model):
    '''
    Doc string
    '''
    subject_id = db.Column(db.String(12), primary_key=True) # unique id, having different format depending on dataset
    dataset_code = db.Column(db.String(12), db.ForeignKey('dataset.code'), nullable=False) # code for the dataset this subject belongs to
    age = db.Column(db.Integer, nullable=False) # check, 0 < age < 100?
    gender = db.Column(db.String(1), nullable=False) # add check, takes values M and F
    handedness = db.Column(db.String(1)) # takes values R,L,A
    ravens_iq_raw = db.Column(db.Integer) # check, 0 < iq < 60?
    mmse = db.Column(db.Integer) # 0 < mmse < 30
    file_path = db.Column(db.String(20), unique=True, nullable=False) # directory containing data for this subject
    
    age_min = 18
    age_max = 100
    ravens_iq_raw_min = 0
    ravens_iq_raw_max = 60
    mmse_min = 0
    mmse_max = 30
    
    def __init__(self, subject_id, dataset_code, age, gender, handedness, ravens_iq_raw, mmse, file_path):
        self.subject_id = subject_id
        self.dataset_code = dataset_code
        self.age = age
        self.gender = gender
        self.handedness = handedness
        self.ravens_iq_raw = ravens_iq_raw
        self.mmse = mmse
        self.file_path = file_path
        
    def __repr__(self):
        return '<Subject %r>'  % self.subject_id
    
    @validates('age')
    def validate_age(self, key, age):
        if not Subject.age_min <= age <= Subject.age_max:
            print(age)
            raise ValueError('Subject:age is outside validation range ['+str(Subject.age_min)+','+str(Subject.age_max)+']')
        return age
        
    @validates('gender')
    def validate_gender(self, key, gender):
        if not gender in ['M','F']:
            raise ValueError('Subject:gender not either M or F')
        return gender
    
    @validates('handedness')
    def validate_handedness(self, key, handedness):
        if handedness and handedness not in ['R', 'L']:
            raise ValueError('Subject:handedness not R or L')
        return handedness
        
    @validates('ravens_iq_raw')
    def validate_ravens_iq_raw(self, key, ravens_iq_raw):
        if ravens_iq_raw and not Subject.ravens_iq_raw_min <= ravens_iq_raw <= Subject.ravens_iq_raw_max:
            raise ValueError('Subject:ravens_iq_raw is outside validation range [0,60]')
        return ravens_iq_raw
    
    @validates('mmse')
    def validate_mmse(self, key, mmse):
        if mmse and not Subject.mmse_min <= mmse <= Subject.mmse_max:
            raise ValueError('Subject:mmse is validation range ['+str(Subject.mmse_min)+','+str(Subject.mmse_max)+']')
        return mmse

class Tract(db.Model):
    '''Populate frontend tract select from this table so adding new tracts only requires
    changes to data and not frontend as well.'''
    #id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), primary_key=True) # eg. CINGL
    name = db.Column(db.String(20), unique=True, nullable=False) # eg. Cingulum (L)
    file_path = db.Column(db.String(20), unique=True, nullable=False) # subdirectory within subject directory for this tract, eg. Left_Cingulum
    
    def __init__(self, code, name, file_path):
        self.code = code
        self.name = name
        self.file_path = file_path
        
    def __repr__(self):
        return '<Tract %r>' % self.name
    
    def __json__(self):
        return ['code', 'name']
    
class Dataset(db.Model):
    '''Model to store file path for each tractography dataset.'''
    #id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(12), primary_key=True) # eg. BRC or BRC_ATLAS
    name = db.Column(db.String(20), unique=True, nullable=False)
    file_path = db.Column(db.String(20), unique=True, nullable=False) # eg. brc_atlas
    query_params = db.Column(db.String(1000))
    
    def _init_(self, code, file_path):
        self.code = code
        self.file_path = file_path
        
    def __repr__(self):
        return '<Dataset %r>' % self.code
    
    def __json__(self):
        return ['code', 'name', 'query_params']
        
        