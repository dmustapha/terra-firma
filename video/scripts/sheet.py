# tile frames (named *_NNNN.jpg, extracted at a known fps from start t0) into labelled 4x4 sheets
import sys, glob
from PIL import Image, ImageDraw
src, out, fps, t0, step = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5]) if len(sys.argv) > 5 else 1
fs = sorted(glob.glob(src))[::step]
for s in range(0, len(fs), 16):
    sh = Image.new('RGB', (1920, 1080)); d = ImageDraw.Draw(sh)
    for j, f in enumerate(fs[s:s + 16]):
        n = int(f.rsplit('_', 1)[1].split('.')[0]); t = t0 + (n - 1) / fps
        im = Image.open(f).resize((480, 270)); x, y = (j % 4) * 480, (j // 4) * 270; sh.paste(im, (x, y))
        d.rectangle([x, y, x + 80, y + 22], fill='black'); d.text((x + 4, y + 4), f'{t:.1f}', fill='yellow')
    sh.save(f'{out}_{s // 16:02d}.jpg', quality=80)
