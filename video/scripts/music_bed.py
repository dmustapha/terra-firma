#!/usr/bin/env python3
"""Music bed with real ducking: -7 dB under every spoken line (150 ms attack before the line, 400 ms release after),
a +2 dB lift on the flywheel and +3 dB on the end card, 120 Hz high-pass, 1.5 s fade in, 4 s fade out.
Usage: music_bed.py <music.mp3> <duration_s> <out.wav>"""
import json, os, subprocess, sys
import numpy as np
V = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SR = 48000
src, D, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-t', str(D), '-af', 'highpass=f=120:poles=2', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).reshape(-1, 2).copy(); n = len(x); t = np.arange(n) / SR
placed = json.load(open(f'{V}/build/voice.placed.json')); plan = json.load(open(f'{V}/remotion/src/plan.json'))
duck = np.zeros(n)  # 0 = full bed, 1 = fully ducked
for p in placed:
    a, b = p['start'], p['start'] + p['length']
    duck = np.maximum(duck, np.clip(np.minimum((t - (a - 0.15)) / 0.15, 1 - (t - b) / 0.4), 0, 1))
db = -7.0 * duck
f = plan['fly']; db += 2.0 * np.clip(np.minimum((t - f['t0']) / 0.5, (f['t1'] - t) / 0.5), 0, 1)
c = plan['close']; db += 3.0 * np.clip((t - c['t']) / 0.6, 0, 1)
g = 10 ** (db / 20) * np.clip(t / 1.5, 0, 1) * np.clip((D - t) / 4.0, 0, 1)
y = (x * g[:, None]).astype(np.float32)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', out], input=y.tobytes(), check=True)
print('bed written', out, f'{n / SR:.2f}s')
