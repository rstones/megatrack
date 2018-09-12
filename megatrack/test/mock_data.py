'''
Created on 26 Jul 2018

@author: richard
'''
import numpy as np
from nibabel.nifti1 import Nifti1Image

#### QUERY PARAM STRINGS ####

brc_atlas_females_query = 'BRC_ATLAS%5Bmethod%5D=DTI&BRC_ATLAS%5Bconstraints%5D%5Bgender%5D%5Btype%5D=checkbox&BRC_ATLAS%5Bconstraints%5D%5Bgender%5D%5Bvalues%5D%5B%5D=F'
brc_atlas_males_query = 'BRC_ATLAS%5Bmethod%5D=DTI&BRC_ATLAS%5Bconstraints%5D%5Bgender%5D%5Btype%5D=checkbox&BRC_ATLAS%5Bconstraints%5D%5Bgender%5D%5Bvalues%5D%5B%5D=M'
invalid_param_string = 'BRC_ATLA5Bgender%5D%5derD%5Bvalue%5DM'

##### Tracts ####

t1_code = 'AFL_ANT'
t1_name = 'Left Anterior AF'
t1_file_path ='Left_AF_anterior'
t1_description = 'This is a tract etc etc...'

t2_code = 'AFL_POST'
t2_name = 'Left Posterior AF'
t2_file_path = 'Left_Posterior_AF'
t2_description = 'This is a tract etc...'


#### Datasets ####

d1_code = 'BRC_ATLAS'
d1_name = 'BRC Atlas'
d1_file_path = 'brc_atlas'
d1_query_params = '{"test":"dataset1"}'

d2_code = 'TEST_DATASET2'
d2_name = 'Test Dataset 2'
d2_file_path = 'test_dataset_2'
d2_query_params = '{"test":"dataset2"}'


#### Methods ####

m1_code = 'DTI'
m1_name = 'Diffusion Tensor Imaging'
m1_description = ''

m2_code = 'SD'
m2_name = 'Spherical Deconvolution'
m2_description = ''

#### Subjects ####

s1_subject_id = 'BRCATLAS001'
s1_gender = 'M'
s1_age = 25
s1_handedness = 'R'
s1_edinburgh_handedness_raw = 100
s1_dataset_code = d1_code
s1_ravens_iq_raw = 60
s1_file_path = 'BRCATLASB001_MNI_'
s1_mmse = None

s2_subject_id = 'BRCATLAS002'
s2_gender = 'F'
s2_age = 45
s2_handedness = 'R'
s2_edinburgh_handedness_raw = 50
s2_dataset_code = d1_code
s2_ravens_iq_raw = 58
s2_file_path = 'BRCATLASB002_MNI_'
s2_mmse = None

s3_subject_id = 'BRCATLAS003'
s3_gender = 'M'
s3_age = 70
s3_handedness = 'L'
s3_edinburgh_handedness_raw = -70
s3_dataset_code = d1_code
s3_ravens_iq_raw = 49
s3_file_path = 'BRCATLASB003_MNI_'
s3_mmse = None

s4_subject_id = 'TESTDATASET004'
s4_gender = 'F'
s4_age = 35
s4_handedness = 'L'
s4_edinburgh_handedness_raw = -70
s4_dataset_code = d2_code
s4_ravens_iq_raw = 55
s4_file_path = 'TESTDATASETB004_MNI_'
s4_mmse = None

#### Neuroimaging data ####

affine = np.eye(4)
nifti_dim = (91,109,91)

template_filepath = 'mgtrk_atlas_template.nii.gz'
template_nifti = Nifti1Image(np.ones(nifti_dim, dtype=np.int16), affine)

s1_MD = Nifti1Image(0.5*np.ones(nifti_dim, dtype=np.int16), affine)
s1_FA = Nifti1Image(0.5*np.ones(nifti_dim, dtype=np.int16), affine)

s3_MD = Nifti1Image(1.5*np.ones(nifti_dim, dtype=np.int16), affine)
s3_FA = Nifti1Image(1.5*np.ones(nifti_dim, dtype=np.int16), affine)

s1_t1 = Nifti1Image(np.ones(nifti_dim, dtype=np.int16), affine)
s3_t1 = Nifti1Image(np.ones(nifti_dim, dtype=np.int16), affine)

empty_nifti = Nifti1Image(np.zeros(nifti_dim, dtype=np.int16), affine)

lesion_filepath = 'lesion.nii.gz'
test_lesion = Nifti1Image(np.ones(nifti_dim, dtype=np.int16), affine)




