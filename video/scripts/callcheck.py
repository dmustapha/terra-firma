# draw every callout rect on the source frame it lands on (before rendering), tiled 3x3 for a quick look
import io, json, subprocess, sys
from PIL import Image, ImageDraw
V = '/Users/MAC/wif-hack/tf-v2/video'; P = json.load(open(f'{V}/remotion/src/plan.json'))
def src_at(t):
    for s in P['segs']:
        if s['f0'] <= t < s['f1']: return s['clip'], (s['s0'] if s['speed'] == 0 else s['s0'] + (t - s['f0']) * s['speed'])
items = []
for i, c in enumerate(P['calls']):
    clip, st = src_at(c['t'] + 0.5)
    b = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{st:.3f}', '-i', f'{V}/remotion/public/clips/{clip}.mp4', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    im = Image.open(io.BytesIO(b)).convert('RGB'); d = ImageDraw.Draw(im); x, y, w, h = c['rect']
    d.rectangle([x, y, x + w, y + h], outline=(255, 0, 255), width=6); d.rectangle([0, 0, 1100, 60], fill='black'); d.text((10, 10), f"{i} {c['label']} @{c['t']:.1f} {clip} {st:.2f}", fill='yellow')
    items.append(im.resize((640, 360)))
for s in range(0, len(items), 9):
    sh = Image.new('RGB', (1920, 1080))
    for j, im in enumerate(items[s:s + 9]): sh.paste(im, ((j % 3) * 640, (j // 3) * 360))
    sh.save(f'{V}/build/verify_calls_{s // 9}.jpg', quality=85)
print(len(items))
