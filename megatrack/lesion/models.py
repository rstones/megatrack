import datetime

from sqlalchemy.orm import validates

from megatrack import db

class LesionUpload(db.Model):
    lesion_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    upload_file_name = db.Column(db.String(255), unique=False, nullable=False)
    saved_file_name = db.Column(db.String(255), unique=True, nullable=False)
    dim_match = db.Column(db.String(1), unique=False, nullable=True)
    pixdim_match = db.Column(db.String(1), unique=False, nullable=True)
    RAS = db.Column(db.String(1), unique=False, nullable=True)
    upload_datetime = db.Column(db.DateTime, nullable=False)
    
    def __init__(self, upload_file_name, saved_file_name):
        self.upload_file_name = upload_file_name
        self.saved_file_name = saved_file_name
        self.upload_datetime = datetime.datetime.now()
        
    @validates('dim_match')
    def validates_dim_match(self, key, dim_match):
        if dim_match not in ['Y', 'N']:
            raise ValueError('LesionUpload:dim_match not Y or N')
        return dim_match
    
    @validates('pixdim_match')
    def validates_pixdim_match(self, key, pixdim_match):
        if pixdim_match not in ['Y', 'N']:
            raise ValueError('LesionUpload:pixdim_match not Y or N')
        return pixdim_match
    
    @validates('RAS')
    def validates_RAS(self, key, RAS):
        if RAS not in ['Y', 'N']:
            raise ValueError('LesionUpload:RAS not Y or N')
        return RAS