#!/usr/bin/env python

import sys
import os
import argparse
import subprocess

import nibabel as nib
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('target_dir',
                    help='Relative path to the directory containing niftis to convert.')
parser.add_argument('-k',
                    help='Don\'t overwrite the 1mm niftis with 2mm ones. '
                         'Append \'2mm\' to the converted filenames',
                    action='store_true')
args = parser.parse_args()

if not args.k:
    print(f'Continuing will convert all 1mm voxel niftis in {args.target_dir}',
          f'to 2mm nifits, overwriting the 1mm niftis in the process.',
          'Do you wish to continue? [y/n]')
    cont = input('> ')
    if cont.lower() in ['n', 'no', '']:
        print('Use the flag -k to keep the 1mm niftis after conversion.')
        sys.exit(0)
    else:
        pass
    
def construct_cmd(target_dir, filename_in, filename_out):
    return (f'flirt  -interp trilinear -in {target_dir}/{filename_in} '
            f'-ref {target_dir}/{filename_in} -out {target_dir}/{filename_out} '
            f'-applyisoxfm 2')

for filename in os.listdir(args.target_dir):
    if '.nii.gz' in filename:
        header = nib.load(f'{args.target_dir}/{filename}').header
        pixdim = header.get('pixdim')
        if pixdim is not None and np.all(pixdim[1:4] == 1):
            if not args.k:
                # overwrite the existing 1mm nifti
                cmd = construct_cmd(args.target_dir, filename, filename)
            else:
                # construct a new filename for the 2mm nifti
                s = filename.rsplit('.', maxsplit=2)
                newfilename = f'{s[0]}_2mm.{s[1]}.{s[2]}'
                cmd = construct_cmd(args.target_dir, filename, newfilename)
            print(f'Converting {filename}...')
            subprocess.run(cmd, shell=True, check=True)
        else:
            print(f'Ignoring {filename}')
        
        
        
        
        
        
        
        
        
        
        
        