from megatrack import application, db
from megatrack.models import Subject, Tract, Dataset, SubjectTractMetrics, DatasetTracts
from multiprocessing import Pool
import nibabel as nib
import numpy as np
import numpy.ma as ma
import sys

'''
Script to populate the subject_tract_metrics table

- if full_refresh is True

- Get all available subjects + all available tracts

- delete all from subject_tract_metrics

- else

- get all subjects + tracts that don't appear together in subject_tract_metrics

- then

- loop through each subject, loop through each tract, check the tract is available for the dataset the subject belongs to
 (maybe can check this during the db query, but need to define which tracts are available for which dataset), calculate metrics and insert

- handle cases where nii.gz files (density maps, MD, FA) aren't available even though subject and tract are in the DB

'''

full_refresh = True

def get_data():
    subjects = Subject.query.join(Dataset).with_entities(Subject.subject_id, Dataset.file_path, Dataset.code).all()
    tracts = Tract.query.with_entities(Tract.code, Tract.file_path).all()
    sbjct_trct_mtrcs = np.array(SubjectTractMetrics.query.with_entities(SubjectTractMetrics.subject_id, SubjectTractMetrics.tract_code).all())
    return subjects, tracts, sbjct_trct_mtrcs

def calculate_metrics(subject, tract):
    subject_id = subject[0]
    dataset_file_path = subject[1]
    tract_code = tract[0]
    tract_file_path = tract[1]
    print(f'Calculating metrics for subject {subject_id} and tract {tract_code}')
    
    try:
        MD = nib.load(f'data/{dataset_file_path}/full_brain_maps/native/{subject_id}_Native_MD.nii.gz').get_data()
        FA = nib.load(f'data/{dataset_file_path}/full_brain_maps/native/{subject_id}_Native_FA.nii.gz').get_data()
    except FileNotFoundError:
        print(f'Couldn\'t find maps for dataset {dataset_file_path} and subject file path {subject_file_path}')
    
    fp = f'data/{dataset_file_path}/{tract_file_path}/native/{subject_id}_Native_{tract_code}.nii.gz'
    tract_data = nib.load(fp).get_data()
    if np.any(tract_data.nonzero()):
        
        masked_MD = ma.masked_where(tract_data == 0, MD)
        av_MD = ma.average(masked_MD, weights=tract_data)
        av_MD = 0 if np.isnan(av_MD) else av_MD
        std_MD = np.sqrt(ma.average((masked_MD-av_MD)**2, weights=tract_data)) # weighted std
        std_MD = 0 if np.isnan(std_MD) else std_MD
        
        masked_FA = ma.masked_where(tract_data == 0, FA)
        av_FA = ma.average(masked_FA, weights=tract_data)
        av_FA = 0 if np.isnan(av_FA) else av_FA
        std_FA = np.sqrt(ma.average((masked_FA-av_FA)**2, weights=tract_data)) # weighted std
        std_FA = 0 if np.isnan(std_FA) else std_FA
        
        volume = np.count_nonzero(tract_data) * 8.e-3
    else:
        av_MD = std_MD = av_FA = std_FA = volume = 0
    return SubjectTractMetrics(subject_id, tract_code, float(av_MD), float(std_MD), float(av_FA), float(std_FA), float(volume))

def run():

    if full_refresh:
        num_rows_deleted = SubjectTractMetrics.query.delete()
        response = input(f'{num_rows_deleted} rows will be deleted from subject_tract_metrics for a full refresh. Continue? [Y/n] ')
        if response in ['Y', 'y']:
            db.session.commit()
            print(f'{num_rows_deleted} rows deleted')
        else:
            sys.exit('Exiting script as full refresh was cancelled')
    
    print('Calculating new subject tract metrics...')
    subjects, tracts, sbjct_trct_mtrcs = get_data()
    
    for subject in subjects:
        for tract in tracts:
            dataset_tracts = DatasetTracts.query.filter(DatasetTracts.dataset_code==subject[2], DatasetTracts.tract_code==tract[0]).all()
            if (not full_refresh and (subject[0] in sbjct_trct_mtrcs[:,0] and tract[0] in sbjct_trct_mtrcs[:,1])) \
                    or not dataset_tracts:
                continue
            subject_tract_metrics = calculate_metrics(subject, tract)
            db.session.add(subject_tract_metrics)
    db.session.commit()


if __name__ == '__main__':
    db.create_all(app=application)
    application.app_context().push()
    run()
