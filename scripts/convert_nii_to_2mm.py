#!/usr/bin/python

import subprocess
import sys
import os

directory = sys.argv[1]

for filename in os.listdir(directory):
    if "_2mm.nii.gz" in filename:
        continue;
    elif ".nii.gz" in filename:
        s = filename.rsplit('.')
        newfilename = s[0]+'_2mm.'+s[1]+'.'+s[2]
	cmd = 'flirt -interp trilinear -in '+directory+'/'+filename+' -ref '+directory+'/'+filename+' -out '+directory+'/'+newfilename+' -applyisoxfm 2'
	print cmd
        os.system(cmd)
	
