#!/usr/bin/env python3
"""Terra Firma voice: voicebooth assemble.py chain (trim, high-pass 80 Hz, denoise, de-ess, session match, clarity EQ,\ncompression, -16 LUFS), placed on cues, written as a voice-only WAV + placements JSON. Usage: voice_assemble.py <videoDir> <out.wav>"""

import json, os, subprocess, sys, tempfile

def run(a): subprocess.run(a, check=True)
def dur(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)

proj = os.path.abspath(sys.argv[1]); out = sys.argv[2]
cues = json.load(open(f'{proj}/voice/cues.json')); sel = json.load(open(f'{proj}/voice/selection.json'))
D = cues['end']; tmp = tempfile.mkdtemp()
import numpy as np
SR = 16000
def pcm(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32)
def f0(x):
    fr, hop, out = 640, 160, []
    for i in range(0, len(x) - fr, hop):
        w = x[i:i + fr] - x[i:i + fr].mean()
        if np.sqrt((w * w).mean()) < 0.01: continue
        ac = np.correlate(w, w, 'full')[fr - 1:]; lo, hi = SR // 300, SR // 70; k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.45 * ac[0]: out.append(SR / k)
    return float(np.median(out)) if out else None
BANDS = [120, 250, 500, 1000, 2000, 4000, 7000]
def bands(x):
    spec = np.zeros(1025)
    for i in range(0, len(x) - 2048, 1024): spec += np.abs(np.fft.rfft(x[i:i + 2048] * np.hanning(2048))) ** 2
    fr = np.fft.rfftfreq(2048, 1 / SR)
    return np.array([10 * np.log10(spec[(fr >= b / 1.41) & (fr < b * 1.41)].sum() + 1e-12) for b in BANDS]) - 10 * np.log10(spec.sum() + 1e-12)
clamp = lambda v, a, b: max(a, min(b, v))
MATCH = '--no-match' not in sys.argv
MUSIC = float(sys.argv[sys.argv.index('--music') + 1]) if '--music' in sys.argv else -27  # music bed LUFS; voice is -16
# pass 1: trim and clean each kept take, measure pitch, pace and tone
lines = []
for k, line in enumerate(cues['lines']):
    f = sel.get(str(k))
    if not f: print(f'line {k + 1}: no take kept; skipped'); continue
    w = f'{tmp}/c{k:02d}.wav'
    run(['ffmpeg', '-v', 'error', '-y', '-i', f'{proj}/voice/takes/{f}', '-af',
         'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse,'
         'highpass=f=80,afftdn=nf=-25,deesser=i=0.4', '-ar', '48000', '-ac', '1', w])
    x = pcm(w); lines.append(dict(k=k, line=line, w=w, f0=f0(x), wps=len(line['text'].split()) / (len(x) / SR), bands=bands(x)))
# pass 2: pull every line toward the session's median voice (pitch within 1.5 semitones, pace within 8%, tone within 4 dB per band)
F = np.median([l['f0'] for l in lines if l['f0']]); W = np.median([l['wps'] for l in lines]); B = np.mean([l['bands'] for l in lines], axis=0)
# clarity: a phone or laptop mic at distance loses the 2-7 kHz band that carries consonants, so the read sounds muffled.
# Pull the session's average tone toward the long-term average speech spectrum (same 7 bands, relative to total).
LTASS = np.array([-7, -5, -5, -8, -12, -16, -21])
B = B + np.clip((LTASS - LTASS.mean()) - (B - B.mean()), -9, 9)
print('clarity EQ (dB per band):', ' '.join(f'{b}:{g:+.1f}' for b, g in zip(BANDS, np.clip((LTASS - LTASS.mean()) - (np.mean([l['bands'] for l in lines], axis=0) - np.mean([l['bands'] for l in lines])), -9, 9))))
placed, t_free = [], 0.0
for l in lines:
    k, line, w = l['k'], l['line'], f'{tmp}/l{l["k"]:02d}.wav'; fx = []
    if MATCH:
        r = clamp(F / l['f0'], 2 ** (-1.5 / 12), 2 ** (1.5 / 12)) if l['f0'] else 1.0; t = clamp(W / l['wps'], 0.92, 1.08)
        fx = [f'asetrate={48000 * r:.1f}', 'aresample=48000', f'atempo={t / r:.4f}'] + [f'equalizer=f={b}:t=o:w=1:g={clamp(g, -10, 10):.1f}' for b, g in zip(BANDS, B - l['bands'])]
        print(f'line {k + 1}: pitch {l["f0"] or 0:.0f}->{(l["f0"] or 0) * r:.0f} Hz, pace {l["wps"]:.2f}->{l["wps"] * t:.2f} w/s')
    run(['ffmpeg', '-v', 'error', '-y', '-i', l['w'], '-af', ','.join(fx + ['acompressor=threshold=-20dB:ratio=3:attack=8:release=120', 'loudnorm=I=-16:TP=-1.5:LRA=7']), '-ar', '48000', '-ac', '1', w])
    start = max(line['t'], t_free + 0.25); length = dur(w); t_free = start + length
    placed.append((w, start)); print(f'line {k + 1}: at {start:.2f}s for {length:.2f}s' + ('  (runs late)' if start > line['t'] + .05 else ''))
if not placed: sys.exit('no takes kept')
ins, filt = [], []
for j, (w, s) in enumerate(placed): ins += ['-i', w]; filt.append(f'[{j}:a]adelay={int(round(s * 1000))}:all=1[d{j}]')
run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(filt) + ';' + ''.join(f'[d{j}]' for j in range(len(placed))) + f'amix=inputs={len(placed)}:normalize=0,apad,atrim=0:{D}[v]', '-map', '[v]', '-ar', '48000', out])
json.dump([dict(k=l['k'], start=round(s, 3), length=round(dur(w), 3), text=l['line']['text']) for l, (w, s) in zip(lines, placed)], open(out.replace('.wav', '.placed.json'), 'w'), indent=1)
print('wrote', out)
