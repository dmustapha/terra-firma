#!/usr/bin/env python3
"""Verify the FINISHED film: duration, stream format, loudness (final + voice/bed stems), em dashes in any on-screen
text, caption-vs-voice offsets, a frame every second (privacy scan sheets) and one frame per anchor word.
Usage: verify.py  (run with a Python that has Pillow, e.g. /usr/bin/python3)"""
import io, json, os, re, subprocess
from PIL import Image, ImageDraw
V = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = f'{V}/out/terra-firma-demo.mp4'; B = f'{V}/build'
run = lambda a: subprocess.run(a, capture_output=True, text=True)
rep = {}
rep['duration'] = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]).stdout)
rep['streams'] = run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,pix_fmt,color_range,width,height,r_frame_rate,profile,level', '-of', 'compact', OUT]).stdout.strip().splitlines()
def lufs(f, extra=[]):
    e = run(['ffmpeg', '-hide_banner', '-i', f, *extra, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', e); tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)
    return float(i[-1]), (float(tp[-1]) if tp else None)
def mean(f): return float(re.findall(r'mean_volume: (-?[\d.]+) dB', run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'volumedetect', '-f', 'null', '-']).stderr)[0])
rep['final_lufs'], rep['final_true_peak'] = lufs(OUT)
pl = json.load(open(f'{B}/voice.placed.json'))
# speech-only windows: compare voice and ducked bed only while he is talking
sel = '+'.join(f'between(t,{p["start"]:.2f},{p["start"] + p["length"]:.2f})' for p in pl)
for k in ('voice', 'bed'):
    f = f'{B}/mix/{k}.wav'; rep[f'{k}_lufs'] = lufs(f)[0]
    rep[f'{k}_mean_during_speech_db'] = float(re.findall(r'mean_volume: (-?[\d.]+) dB', run(['ffmpeg', '-hide_banner', '-i', f, '-af', f"aselect='{sel}',volumedetect", '-f', 'null', '-']).stderr)[0])
rep['voice_over_bed_db'] = round(rep['voice_mean_during_speech_db'] - rep['bed_mean_during_speech_db'], 1)
# em dashes in anything that can reach the screen
txt = open(f'{V}/remotion/src/plan.json').read() + ''.join(open(f'{V}/remotion/src/{p}').read() for p in ['Main.tsx', 'components/film.tsx', 'components/scenes.tsx'])
rep['em_dashes_on_screen'] = txt.count('\u2014') + txt.count('\u2013')
plan = json.load(open(f'{V}/remotion/src/plan.json')); words = json.load(open(f'{B}/words.json'))
first = {}
for line in words:
    for w in line: first.setdefault(round(w['s'], 3), w)
rep['caption_max_lead_ms'] = 0
heard = [w['s'] for line in words for w in line]
for c in plan['caps']:
    near = min(heard, key=lambda s: abs(s - c['t'])); rep['caption_max_lead_ms'] = max(rep['caption_max_lead_ms'], round(abs(near - c['t']) * 1000))
def frame(t):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', OUT, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    return Image.open(io.BytesIO(b)).convert('RGB')
def sheets(items, name, cols, w):
    h = w * 9 // 16; os.makedirs(f'{B}/verify', exist_ok=True)
    per = cols * cols
    for s in range(0, len(items), per):
        sh = Image.new('RGB', (cols * w, cols * h)); d = ImageDraw.Draw(sh)
        for j, (t, lab) in enumerate(items[s:s + per]):
            x, y = (j % cols) * w, (j // cols) * h; sh.paste(frame(t).resize((w, h)), (x, y))
            d.rectangle([x, y, x + 9 * len(lab) + 8, y + 16], fill='black'); d.text((x + 4, y + 3), lab, fill='yellow')
        sh.save(f'{B}/verify/{name}_{s // per:02d}.jpg', quality=80)
sheets([(t + 0.5, f'{t:.0f}s') for t in range(int(rep['duration']))], 'every1s', 5, 384)
anch = json.load(open(f'{B}/anchors.json'))
sheets([(a['t'] + 0.12, f"{a['t']:.2f} {a['word']}") for a in anch], 'anchors', 3, 640)
json.dump(rep, open(f'{B}/verify/report.json', 'w'), indent=1); print(json.dumps(rep, indent=1))
