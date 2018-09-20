#!/usr/bin/env python

import sys
import os
import argparse

from future import standard_library
standard_library.install_aliases()
import subprocess

import nibabel as nib
import numpy as np

""" Script to convert 1mm voxel niftis to 2mm voxel using the fsl
tool flirt. Niftis that don't have 1mm voxel size are ignored.

Script args:
    target_dir    The directory containing nifti files to convert.
    -k            Optional flag indicating to keep the existing 
                    1mm voxel files rather than overwriting them.
                    
"""

# assign raw_input to input if running with python 2
try:
    input = raw_input
except NameError:
    pass

parser = argparse.ArgumentParser()
parser.add_argument('target_dir',
                    help='Relative path to the directory containing niftis to convert.')
parser.add_argument('-k',
                    help=('Don\'t overwrite the 1mm niftis with 2mm ones. ',
                         'Append \'2mm\' to the converted filenames'),
                    action='store_true')
args = parser.parse_args()

if not args.k:
    print('Continuing will convert all 1mm voxel niftis in {td}'.format(td=args.target_dir),
          'to 2mm niftis, overwriting the 1mm niftis in the process.',
          'Do you wish to continue? [y/n]')
    cont = input('> ')
    if cont.lower() in ['n', 'no', '']:
        print('Use the flag -k to keep the 1mm niftis after conversion.')
        sys.exit(0)
    else:
        pass
    
def construct_cmd(target_dir, filename_in, filename_out):
    return 'flirt -interp trilinear -in {td}/{fnin} '.format(td=target_dir, fnin=filename_in) \
            + '-ref {td}/{fnin} -out {td}/{fnout} '.format(td=target_dir, fnin=filename_in, fnout=filename_out) \
            + '-applyisoxfm 2'

for filename in os.listdir(args.target_dir):
    if '.nii.gz' in filename:
        header = nib.load(args.target_dir + '/' + filename).header
        pixdim = header.get('pixdim')
        if pixdim is not None and np.all(pixdim[1:4] == 1):
            if not args.k:
                # overwrite the existing 1mm nifti
                cmd = construct_cmd(args.target_dir, filename, filename)
            else:
                # construct a new filename for the 2mm nifti
                s = filename.rsplit('.', maxsplit=2)
                newfilename = s[0] + '_2mm.' + s[1] + '.' + s[2]
                cmd = construct_cmd(args.target_dir, filename, newfilename)
            print('Converting {fn}...'.format(fn=filename))
            subprocess.check_call(cmd, shell=True)
        else:
            print('Ignoring {fn}'.format(fn=filename))
        
        
        
        
        
        
        
        
        
        
        
        