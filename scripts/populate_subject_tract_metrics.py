from megatrack import application, db
from megatrack.models import Subject, Tract, Dataset, SubjectTractMetrics
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

full_refresh = False

def get_data():
    subjects = Subject.query.join(Dataset).with_entities(Subject.subject_id, Subject.file_path, Dataset.file_path).all()
    tracts = Tract.query.with_entities(Tract.code, Tract.file_path).all()
    sbjct_trct_mtrcs = np.array(SubjectTractMetrics.query.with_entities(SubjectTractMetrics.subject_id, SubjectTractMetrics.tract_code).all())
    return subjects, tracts, sbjct_trct_mtrcs

def calculate_metrics(subject, tract):
    subject_id = subject[0]
    print('Calculating metrics for subject ' + subject_id)
    subject_file_path = subject[1]
    dataset_file_path = subject[2]
    try:
        MD = nib.load('data/'+dataset_file_path + '/full_brain_maps/native/'+subject_file_path[:-5]+'_MD.nii.gz').get_data()
        FA = nib.load('data/'+dataset_file_path+'/full_brain_maps/native/'+subject_file_path[:-5]+'_FA.nii.gz').get_data()
    except FileNotFoundError:
        print('Couldn\'t find maps for dataset ' + dataset_file_path + ' and subject file path ' + subject_file_path)
    tract_code = tract[0]
    tract_file_path = tract[1]

    tract_data = nib.load('data/'+dataset_file_path+'/'+tract_file_path+'/native/'+subject_file_path+tract_file_path[tract_file_path.index('_')+1:]+'_2mm.nii.gz').get_data()
    masked_MD = ma.masked_where(tract_data == 0, MD)
    mean_MD = ma.mean(masked_MD)
    mean_MD = 0 if np.isnan(mean_MD) else mean_MD
    std_MD = ma.std(masked_MD)
    std_MD = 0 if np.isnan(std_MD) else std_MD
    masked_FA = ma.masked_where(tract_data == 0, FA)
    mean_FA = ma.mean(masked_FA)
    mean_FA = 0 if np.isnan(mean_FA) else mean_FA
    std_FA = ma.std(masked_FA)
    std_FA = 0 if np.isnan(std_FA) else std_FA
    volume = np.count_nonzero(tract_data) * 8.e-3
    return SubjectTractMetrics(subject_id, tract_code, float(mean_MD), float(std_MD), float(mean_FA), float(std_FA), float(volume))

def run():

    if full_refresh:
        num_rows_deleted = SubjectTractMetrics.query.delete()
        response = input(str(num_rows_deleted) + ' will be deleted from subject_tract_metrics for a full refresh. Continue? [Y/n]')
        if response in ['Y', 'y']:
            db.session.commit()
            print(str(num_rows_deleted) + ' rows deleted')
        else:
            sys.exit('Exiting script as full refresh was cancelled')
    
    print('Calculating new subject tract metrics...')
    subjects, tracts, sbjct_trct_mtrcs = get_data()
    print(subjects)
    for subject in subjects:
        for tract in tracts:
            if not full_refresh and (subject[0] in sbjct_trct_mtrcs[:,0] and tract[0] in sbjct_trct_mtrcs[:,1]):
                continue
            subject_tract_metrics = calculate_metrics(subject, tract)
            db.session.add(subject_tract_metrics)
    db.session.commit()


if __name__ == '__main__':
    db.create_all(app=application)
    application.app_context().push()
    run()
