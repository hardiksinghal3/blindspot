#!/bin/sh
cd "$(dirname "$0")" && python3 build.py $1 && google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1280,5040 --virtual-time-budget=4000 --screenshot=shots/final.png file://$PWD/${1:-final}.html 2>/dev/null
python3 -c "
from PIL import Image
im=Image.open('shots/final.png')
for i in range(7): im.crop((0,i*720,1280,(i+1)*720)).save(f'shots/f{i+1}.png')
import pypdf; print(len(pypdf.PdfReader('BlindSpot-demo.pdf').pages),'pages')"
