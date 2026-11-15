#!/bin/sh
cd "$(dirname "$0")" && python3 build.py && mkdir -p view && google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1280,5040 --virtual-time-budget=4000 --screenshot=view/all.png file://$PWD/deck.html 2>/dev/null
python3 -c "
from PIL import Image
im=Image.open('view/all.png')
for i in range(7): im.crop((0,i*720,1280,(i+1)*720)).save(f'view/{i+1}.png')
import pypdf; print(len(pypdf.PdfReader('BlindSpot.pdf').pages),'pages')"
