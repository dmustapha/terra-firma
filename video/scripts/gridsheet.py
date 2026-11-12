# full-res frames -> 2x2 sheets at half scale with a 100 px coordinate grid (full-res units), for placing callout rects
import sys, subprocess, io
from PIL import Image, ImageDraw
clips = '/Users/MAC/wif-hack/tf-v2/video/remotion/public/clips'
items = [a.split('@') for a in sys.argv[2:]]
def frame(c, t):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-ss', t, '-i', f'{clips}/{c}.mp4', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    return Image.open(io.BytesIO(b)).convert('RGB').resize((960, 540))
for s in range(0, len(items), 4):
    sh = Image.new('RGB', (1920, 1080)); d = ImageDraw.Draw(sh)
    for j, (c, t) in enumerate(items[s:s + 4]):
        x0, y0 = (j % 2) * 960, (j // 2) * 540; sh.paste(frame(c, t), (x0, y0))
        for g in range(0, 1920, 100):
            d.line([x0 + g / 2, y0, x0 + g / 2, y0 + 540], fill=(255, 0, 255) if g % 500 == 0 else (120, 0, 120), width=1)
            d.text((x0 + g / 2 + 2, y0 + 30), str(g), fill='yellow')
        for g in range(0, 1080, 100):
            d.line([x0, y0 + g / 2, x0 + 960, y0 + g / 2], fill=(255, 0, 255) if g % 500 == 0 else (120, 0, 120), width=1)
            d.text((x0 + 2, y0 + g / 2 + 2), str(g), fill='yellow')
        d.rectangle([x0, y0, x0 + 150, y0 + 16], fill='black'); d.text((x0 + 4, y0 + 3), f'{c}@{t}', fill='cyan')
    sh.save(f'{sys.argv[1]}_{s // 4:02d}.jpg', quality=85)
