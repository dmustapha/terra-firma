#!/usr/bin/env python3
"""Write video/STORYBOARD.md from the solved plan: per narration line, its film window, the source spans on screen,
speeds, wallet cards and the callouts that land inside it."""
import json, os
V = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
plan = json.load(open(f'{V}/remotion/src/plan.json')); placed = json.load(open(f'{V}/build/voice.placed.json'))
mmss = lambda t: f'{int(t // 60)}:{t % 60:05.2f}'
SRC = {'v4': 'rough_cut_v4', 'card3fdb': 'extra/card3fdb', 'home': 'extra/home', 'board': 'extra/board', 'proof': 'extra/proof'}
out = ['# STORYBOARD: Terra Firma demo film', '',
       f"Runtime {mmss(plan['total'])} ({plan['total']:.2f} s), 1920x1080, 30 fps. Generated from remotion/src/plan.json by scripts/storyboard.py.",
       'Voice is master: each row is one narration line at its placed time; the picture spans under it were solved from the anchors in build/anchors.json.',
       f"Chapter wipes (strata) at: {', '.join(mmss(w) for w in plan['wipes'])}.", '',
       '| # | film | line | picture (source s, speed) | wallet cards | callouts / overlays |', '|---|---|---|---|---|---|']
bounds = [p['start'] for p in placed[1:]] + [plan['total']]
t0 = 0.0
for i, p in enumerate(placed):
    t1 = bounds[i]
    segs = [s for s in plan['segs'] if s['f1'] > t0 + 0.01 and s['f0'] < t1 - 0.01]
    pic = '; '.join(f"{SRC[s['clip']]} {s['s0']:.1f}" + (' hold' if s['speed'] == 0 else f" x{s['speed']:.2f}") for s in segs if not s.get('card'))
    cards = '; '.join(f"{s['card']['action']}" + (f" {s['card']['tx']}" if s['card'].get('tx') else '') for s in segs if s.get('card'))
    calls = '; '.join(c['label'] for c in plan['calls'] if t0 <= c['t'] < t1 and c['label'])
    out.append(f"| {i + 1} | {mmss(p['start'])} | {p['text']} | {pic} | {cards} | {calls} |"); t0 = t1
out += ['', 'Overlays outside the table: hook count-up (0:00 to the first wipe), title plate on "terra firma", system labels on the home bands, the $WIF flywheel (line 23), who-it\'s-for chips (line 25), the limits chip (line 26), the close plate with seal, tagline, terrafirma-wif.vercel.app and github.com/dmustapha/terra-firma.']
open(f'{V}/STORYBOARD.md', 'w').write('\n'.join(out) + '\n'); print('wrote STORYBOARD.md')
