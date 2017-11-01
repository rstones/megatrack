from megatrack import application, db
from megatrack.models import Subject, Tract, Dataset, SubjectTractMetrics
from multiprocessing import Pool
import nibabel as nib
import numpy as np
import numpy.ma as ma

db.create_all(app=application)
application.app_context().push()


'''
Script to populate the subject_tract_metrics table

- Get available subjects + get available tracts

- if full_refresh is True

- delete all from subject_tract_metrics

- loop through each subject, loop through each tract available for that dataset, calculate metrics and insert

- else

- get current subject_tract_metrics

- loop through each subject, loop through each tract available for that dataset,
if subject-tract pair not in subject_tract_metrics calculate metrics and insert

- handle cases where nii.gz files (density maps, MD, FA) aren't available even though subject and tract are in the DB

'''




full_refresh = False

# get subjects
subjects = Subject.query.join(Dataset).with_entities(Subject.subject_id, Subject.file_path, Dataset.file_path).all()

# get tracts
tracts = Tract.query.with_entities(Tract.code, Tract.file_path).all()

# get dataset file paths
#dataset_file_paths = Dataset.query.with_entities(Dataset.dataset_code, Dataset.file_path).all()

def calculate_metrics(subject, tract):
    subject_id = subject[0]
    print('Calculating metrics for subject ' + subject_id)
    subject_file_path = subject[1]
    dataset_file_path = subject[2]
    try:
        MD = nib.load('data/'+dataset_file_path + '/full_brain_maps/'+subject_file_path[:-5]+'_MD.nii.gz').get_data()
        FA = nib.load('data/'+dataset_file_path+'/full_brain_maps/'+subject_file_path[:-5]+'_FA.nii.gz').get_data()
    except FileNotFoundError:
        print('Couldn\'t find maps for dataset ' + dataset_file_path + ' and subject file path ' + subject_file_path)
    tract_code = tract[0]
    tract_file_path = tract[1]
    subject_tract_metric = []# SubjectTractMetrics.query.filter(SubjectTractMetrics.subject_id == subject_id and SubjectTractMetrics.tract_code == tract_code).first()
    if subject_tract_metric and not total_refresh:
        print('Metrics already exist')
        print(subject_tract_metric)
        continue
    tract_data = nib.load('data/'+dataset_file_path+'/'+tract_file_path+'/'+subject_file_path+tract_file_path[tract_file_path.index('_')+1:]+'_2mm.nii.gz').get_data()
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


for subject in subjects:
    for tract in tracts:
        subject_tract_metrics = calculate_metrics(subject, tract)
        db.session.add(subject_tract_metrics)
db.session.commit()


# use multiprocessing lib to map function to workers


# for each subject, loop over tracts available in their dataset

# load the individual MD/FA maps

# check if there is already an entry in SubjectTractMetrics for this subject/tract combination (possibly override this with a flag if a complete refresh is required)

# if no entry in SubjectTractMetrics...

# load tract density map

# calculate mean/std MD, mean/std FA and volume using the subject's individual MD/FA maps and and tract density maps

# insert row per subject per tract in SubjectTractMetrics table 
