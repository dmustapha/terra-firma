#!/usr/bin/env python3
"""Terra Firma film plan: the voice is master, pictures follow it.

Reads the placed voice (build/voice.placed.json) and whisper word times (build/words.json, or a whisper JSON given
with --whisper), aligns every script word to a heard word, then solves each scene's picture timing from anchors
(word -> source second), holds (wallet-confirm cards over a frozen frame) and jump cuts. Speeds stay within
0.8x..3x; slower than 0.8x becomes 0.8x plus a hold of the landing frame. Writes remotion/src/plan.json and
build/anchors.json (the table verified later from the finished film).
Usage: plan.py [--whisper build/voice.json]
"""
import difflib, json, os, re, sys

V = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = f'{V}/build'
placed = json.load(open(f'{B}/voice.placed.json'))
wj = sys.argv[sys.argv.index('--whisper') + 1] if '--whisper' in sys.argv else f'{B}/voice.json'
heard = [dict(w=x['word'], s=x['start'], e=x['end']) for seg in json.load(open(wj))['segments'] for x in seg['words']]
norm = lambda s: re.sub(r"[^a-z0-9]", '', s.lower())

# ---------- 1. script words -> heard times ----------
WORDS = []  # per line: list of dict(w, s, e)
for p in placed:
    toks = p['text'].split(); s0, s1 = p['start'] - 0.4, p['start'] + p['length'] + 0.4
    hw = [h for h in heard if s0 <= h['s'] <= s1]
    sm = difflib.SequenceMatcher(a=[norm(t) for t in toks], b=[norm(h['w']) for h in hw], autojunk=False)
    t = [None] * len(toks)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): t[a + k] = (hw[b + k]['s'], hw[b + k]['e'])
    # unmatched words: spread between matched neighbours (or the line's placed edges)
    known = [(-1, (p['start'], p['start']))] + [(i, x) for i, x in enumerate(t) if x] + [(len(toks), (p['start'] + p['length'], p['start'] + p['length']))]
    for (i0, x0), (i1, x1) in zip(known, known[1:]):
        for i in range(i0 + 1, i1):
            f = (i - i0) / (i1 - i0); s = x0[1] + (x1[0] - x0[1]) * f; t[i] = (s, s + (x1[0] - x0[1]) / (i1 - i0))
    WORDS.append([dict(w=w, s=round(a, 3), e=round(b, 3), heard=bool(sm)) for w, (a, b) in zip(toks, t)])
json.dump(WORDS, open(f'{B}/words.json', 'w'), indent=0)

def W(line, word, occ=1, edge='s', off=0.0):
    n = 0
    for x in WORDS[line]:
        if norm(x['w']) == norm(word):
            n += 1
            if n == occ: return round(x[edge] + off, 3)
    raise SystemExit(f'word "{word}" #{occ} not in line {line}: {placed[line]["text"]}')
END = lambda line: round(placed[line]['start'] + placed[line]['length'], 3)
START = lambda line: placed[line]['start']

# ---------- 2. scenes ----------
TX = {'c1': '0x0dfe…04c0', 'c3': '0x9425…7108', 'c4': '0xea3f…20d3', 'c6': '0x4e26…3b35', 'c7': '0x379a…ea75',
      'c8': '0x5a0f…6f11', 'c9': '0x0d23…aa9d', 'c10': '0x2833…5717', 'c12': '0x81bf…9d11'}
def card(action, tx=None, step=None): return dict(action=action, tx=TX.get(tx) if tx else None, step=step)
a = lambda f, s: ('a', f, s)
cut = lambda s0, s1: ('cut', s0, s1)
hold = lambda s0, s1, d, c: ('hold', s0, s1, d, c)

T_HOME = START(3) - 0.35; T_MINE = END(4) - 0.15; T_FLY = START(22) - 0.25; T_PROOF = START(23) - 0.35
T_WHO = START(24) - 0.3; T_LIM = START(25) - 0.45; T_CLOSE = END(25) - 1.6; T_END = END(26) + 1.55

SCENES = [
  dict(id='hook', clip='card3fdb', keys=[a(0.0, 11.4), a(12.6, 21.8), a(T_HOME, 25.0)]),
  dict(id='home', clip='home', keys=[a(T_HOME, 0.6), a(W(3, 'never') - 0.2, 5.0), cut(5.0, 13.5), a(W(4, 'it') - 0.1, 19.0), a(T_MINE, 19.45)]),
  dict(id='trade', clip='v4', keys=[
    a(T_MINE, 2.9), a(W(5, 'mainnet', 1, 'e'), 3.3), a(W(6, 'uniswap'), 5.4),
    hold(8.5, 9.7, 0.95, card('buy WALLET through Uniswap', 'c1')), cut(9.8, 13.7),
    a(W(6, 'card'), 15.0), a(W(6, 'paid', 1, 'e') + 0.6, 16.6), a(W(6, 'nvda', 1, 'e') + 0.5, 17.3), a(W(7, 'that') - 0.3, 17.32), cut(17.32, 19.3), a(W(7, 'one'), 19.5), a(W(7, 'convert'), 23.2),
    a(W(8, 'two'), 25.8), hold(26.3, 27.3, 0.9, card('approve WALLET', step='signature 1 of 2')), cut(28.2, 29.7),
    a(W(8, 'sold') - 0.05, 31.1), hold(31.1, 32.1, 0.95, card('convert WALLET to NVDA', 'c3', 'signature 2 of 2')), cut(32.4, 34.7),
    a(W(8, 'jar'), 35.0), a(W(8, 'chainlink', 1, 'e'), 37.0), cut(39.4, 40.9), a(W(9, 'admin'), 41.4), a(W(9, 'out'), 45.5), a(W(9, 'streak'), 45.6),
    a(START(10) - 0.2, 49.6), a(W(11, 'any'), 54.4), a(W(11, 'ten'), 58.0), a(W(11, 'transaction'), 60.4), hold(62.4, 63.6, 0.95, card('buy PONS, 2% to NVDA', 'c4')), cut(63.7, 66.9),
    a(W(12, 'two'), 67.3), cut(67.8, 70.3), a(W(12, 'sell'), 71.0), a(W(12, 'way', 1, 'e'), 74.6), cut(74.6, 82.25),
    hold(82.3, 83.3, 0.85, card('approve + sell PONS, 2% to NVDA', 'c6')), cut(83.3, 90.4),
    a(W(13, 'wif'), 90.8), a(W(14, 'half'), 97.5), a(W(14, 'buys'), 98.0), a(W(14, 'never'), 98.6),
    hold(99.8, 101.0, 0.95, card('buy $WIF', 'c7')), cut(101.0, 106.45),
    a(W(15, 'stake'), 106.75), a(W(15, 'stock', 1, 'e'), 107.2), cut(107.4, 109.3), a(W(15, 'whichever'), 109.8),
    a(W(16, 'hundred'), 113.0), a(W(16, 'nvda'), 113.6), cut(114.0, 116.05),
    hold(116.1, 117.5, 0.95, card('approve + stake 100 $WIF', 'c8', 'approve 0xa63c…5077')), a(W(16, 'epoch'), 118.6), a(W(16, 'three'), 120.0),
    a(W(17, 'once'), 122.0), a(W(17, 'run'), 125.9), hold(126.6, 127.8, 0.95, card('run distribute', 'c9')),
    a(W(18, 'burns'), 130.8), a(W(18, 'stakers'), 132.6), a(W(19, 'mine'), 135.9),
    hold(136.6, 137.8, 0.9, card('claim to Jar', 'c10')), a(W(19, 'jar'), 138.3), cut(140.0, 143.6),
    a(W(20, 'mint'), 145.9), hold(146.25, 147.25, 0.8, card('approve 1 $WIF', step='signature 1 of 2')),
    hold(148.65, 149.65, 0.95, card('mint card, burns 1 $WIF', 'c12', 'signature 2 of 2')),
    a(W(20, 'chainlink', 1, 'e'), 152.3), a(W(21, 'leaderboard'), 155.3), a(W(21, 'jars'), 156.6), a(T_FLY, 157.6)]),
  dict(id='flywheel', clip='v4', keys=[a(T_FLY, 128.2), a(T_PROOF, 133.2)]),
  dict(id='proof', clip='v4', keys=[a(T_PROOF, 160.7), a(W(23, 'proof'), 161.4), a(W(23, 'proof') + 1.0, 162.4), cut(162.4, 169.4),
                                     a(W(23, 'recomputed'), 170.0), a(T_WHO, 172.6)]),
  dict(id='who', clip='board', keys=[a(T_WHO, 8.3), a(T_LIM, 8.85)]),
  dict(id='limits', clip='proof', keys=[a(T_LIM, 11.6), a(T_CLOSE, 11.6 + (T_CLOSE - T_LIM) * 1.0)]),
  dict(id='close', clip='home', keys=[a(T_CLOSE, 35.6), a(T_END, 41.6)]),
]

def solve(sc):
    segs, keys = [], sc['keys']; anchors = [i for i, k in enumerate(keys) if k[0] == 'a']
    for ia, ib in zip(anchors, anchors[1:]):
        A, Bk, mid = keys[ia], keys[ib], keys[ia + 1:ib]
        hold_f = sum(k[3] for k in mid if k[0] == 'hold'); jump = sum(k[2] - k[1] for k in mid if k[0] in ('cut', 'hold'))
        film = Bk[1] - A[1] - hold_f; src = Bk[2] - A[2] - jump
        if film <= 0.05: raise SystemExit(f'{sc["id"]}: no film time between {A} and {Bk} (holds {hold_f:.2f})')
        sp = src / film
        if sp > 3.05: raise SystemExit(f'{sc["id"]}: {sp:.2f}x between {A} and {Bk}: add a cut')
        spd = max(0.8, sp); f, s, join = A[1], A[2], 'cut' if not segs else 'cont'
        for k in list(mid) + [('end', None, Bk[2])]:
            if s < k[2] - 1e-6 if k[0] != 'end' else s < Bk[2] - 1e-6:
                tgt = k[1] if k[0] != 'end' else Bk[2]; d = (tgt - s) / spd
                segs.append(dict(clip=sc['clip'], f0=f, f1=f + d, s0=s, speed=round(spd, 4), join=join)); f += d; s = tgt; join = 'cont'
            if k[0] == 'cut': s = k[2]; join = 'cut'
            if k[0] == 'hold':
                segs.append(dict(clip=sc['clip'], f0=f, f1=f + k[3], s0=k[1] - 0.05, speed=0, join=join, card=k[4])); f += k[3]; s = k[2]; join = 'cut'
        if f < Bk[1] - 1e-3: segs.append(dict(clip=sc['clip'], f0=f, f1=Bk[1], s0=Bk[2] - 0.04, speed=0, join='cont'))
    for x in segs: x['scene'] = sc['id']
    return segs

SEGS = []
for s in (s for sc in SCENES for s in solve(sc)):
    # a sliver under 0.1 s reads as a flicker: give its time to the shot before it (same scene only)
    if s['f1'] - s['f0'] < 0.1 and SEGS and SEGS[-1]['scene'] == s['scene'] and not s.get('card'): SEGS[-1]['f1'] = s['f1']; continue
    if SEGS and SEGS[-1]['scene'] == s['scene'] and SEGS[-1]['f1'] - SEGS[-1]['f0'] < 0.1 and not SEGS[-1].get('card'):
        s['f0'] = SEGS[-1]['f0']; s['join'] = SEGS[-1]['join']; SEGS.pop()
    SEGS.append(s)
for x in SEGS:
    x['f0'], x['f1'], x['s0'] = round(x['f0'], 3), round(x['f1'], 3), round(x['s0'], 3)
    sp = x['speed']; x['tag'] = (f'{round(sp * 2) / 2:g}x' if sp >= 1.45 and x['f1'] - x['f0'] >= 0.45 else None)

# frozen frames are pre-extracted stills (a held video frame in Remotion drifts; a PNG cannot)
import subprocess
FZ = f'{V}/remotion/public/freeze'; os.makedirs(FZ, exist_ok=True)
for x in SEGS:
    if x['speed'] == 0:
        x['img'] = f"freeze/{x['clip']}_{int(round(x['s0'] * 1000))}.png"
        if not os.path.exists(f"{V}/remotion/public/{x['img']}"):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f"{x['s0']:.3f}", '-i', f"{V}/remotion/public/clips/{x['clip']}.mp4", '-frames:v', '1', f"{V}/remotion/public/{x['img']}"], check=True)

# ---------- 3. callouts (rect in 1920x1080 source pixels), zooms, captions ----------
def C(t, d, rect, label, sub=None, place='below', zoom=None): return dict(t=round(t, 3), d=d, rect=rect, label=label, sub=sub, place=place, zoom=zoom)
CALLS = [
  C(W(5, 'own') - 0.2, 2.2, [1540, 8, 168, 56], 'my wallet, live on mainnet', 'Robinhood Chain', 'left'),
  C(W(6, 'uniswap') - 0.35, 1.5, [216, 842, 990, 56], 'swapped through Uniswap', None, 'above'),
  C(W(6, 'paid'), 1.3, [1186, 370, 62, 82], 'paid', '$1 of WALLET', 'below', 1.12),
  C(W(6, 'worth'), 1.4, [1384, 370, 172, 82], 'worth now', '$0.60', 'below', 1.12),
  C(W(6, 'nvda'), 1.6, [890, 448, 346, 82], 'same dollars in NVDA', 'priced at the Chainlink round of each buy', 'below', 1.12),
  C(W(7, 'coming') - 0.2, 1.6, [226, 446, 1468, 54], 'down 51%, not coming back', None, 'above'),
  C(W(8, 'nvda') - 0.1, 2.6, [216, 440, 1488, 60], 'NVDA Stock Tokens, in my Jar', 'minimum set from Chainlink before I sign', 'below', 1.1),
  C(W(9, 'admin') - 0.2, 1.9, [176, 160, 580, 190], 'ownerless contract', 'no admin key', 'right'),
  C(W(9, 'out'), 1.1, [1532, 686, 152, 52], 'withdraw any time', None, 'above', 1.12),
  C(W(9, 'streak') - 0.3, 1.3, [1440, 150, 160, 95], 'saving streak', None, 'below', 1.12),
  C(W(11, 'slice') - 0.1, 2.2, [240, 548, 940, 46], 'keep a slice, 0 to 10%', 'chosen per trade', 'above', 1.1),
  C(W(11, 'same') - 0.2, 1.8, [216, 794, 990, 100], 'the slice buys NVDA in the same transaction', None, 'above'),
  C(W(12, 'two') - 0.15, 1.6, [990, 205, 186, 100], '2% slice', '0.00007601 NVDA went to my Jar', 'left', 1.1),
  C(W(12, 'sell') - 0.1, 1.2, [920, 330, 290, 60], 'Sell, same 2% slice', None, 'below'),
  C(W(13, 'wif') - 0.3, 0.9, [236, 744, 700, 56], '$WIF', 'buy only: Terra Firma never sells it', 'above'),
  C(W(14, 'half') - 0.15, 2.0, [230, 798, 600, 44], '0.5% fee, every trade', 'it builds the $WIF burn', 'above', 1.12),
  C(W(14, 'buys') - 0.25, 1.9, [934, 152, 146, 42], 'buy only', 'the router refuses any $WIF sell', 'below', 1.15),
  C(W(15, 'real'), 1.6, [515, 165, 480, 92], 'paid in real stock', None, 'below', 1.08),
  C(W(15, 'whichever') - 0.1, 1.2, [176, 440, 140, 300], 'pick your stock', 'NVDA, TSLA, GOOGL, SNDK, SPY, QQQ', 'right'),
  C(W(16, 'pick') - 0.1, 1.3, [968, 790, 84, 74], 'NVDA', None, 'above', 1.15),
  C(W(16, 'epoch') - 0.3, 2.0, [966, 376, 170, 108], 'activating 100', 'earns from epoch 25, not now', 'below', 1.12),
  C(W(16, 'ten') - 0.1, 3.3, [1290, 218, 410, 28], '10,000 staked: 0.3% fee', 'instead of 0.5%', 'below', 1.18),
  C(W(17, 'run') - 0.3, 1.1, [970, 346, 766, 60], 'anyone can run it', 'once an hour', 'below'),
  C(W(18, 'burns') - 0.25, 1.9, [180, 914, 770, 42], 'Epoch 23 paid out', '11.36 $WIF burned', 'above', 1.25),
  C(W(18, 'stakers') - 0.4, 1.8, [968, 486, 768, 42], 'other half: stock for stakers', None, 'below'),
  C(W(19, 'mine') - 0.1, 1.2, [1326, 200, 372, 72], 'my reward', None, 'below', 1.1),
  C(W(19, 'jar') - 0.1, 1.5, [216, 870, 1488, 54], 'claimed into my Jar', None, 'above'),
  C(W(20, 'mint') - 0.2, 1.3, [636, 476, 336, 60], 'Mint this card', 'burns 1 $WIF', 'below', 1.12),
  C(W(20, 'chainlink', 1, 'e') - 0.6, 2.0, [640, 556, 334, 50], 'minted onchain, 1 $WIF burned', 'numbers checked against Chainlink', 'right', 1.12),
  C(W(21, 'jars') - 0.25, 1.4, [724, 276, 466, 640], 'biggest Jars', None, 'right'),
  C(W(23, 'proof') - 0.2, 1.8, [326, 676, 140, 72], '22.43 $WIF burned', 'read live from Robinhood Chain', 'right'),
  C(W(23, 'recomputed') - 0.2, 2.2, [182, 530, 770, 190], 'recompute any card onchain', None, 'right'),
]
for c in CALLS: c['rect'] = list(c['rect'])

PROPER = [('robinhood chain', 'Robinhood Chain'), ('terra firma', 'Terra Firma'), ('stock tokens', 'Stock Tokens'), ('nvda', 'NVDA'),
          ('chainlink', 'Chainlink'), ('uniswap', 'Uniswap'), ('pons', 'PONS'), ('wif', '$WIF')]
def proper(t):
    for a_, b_ in PROPER: t = re.sub(r'\b' + a_ + r'\b', b_, t)
    return t
JOIN = {'and', 'so', 'that', 'then', 'which', 'after', 'in', 'at', 'to', 'next', 'it', 'or', 'with'}
def split_long(g, ws):
    if len(g) <= 10: return [g]
    mid = len(g) // 2
    cand = sorted(range(max(3, mid - 3), min(len(g) - 2, mid + 4)), key=lambda k: (re.sub(r'[^a-z]', '', ws[g[k]]['w'].lower()) not in JOIN, abs(k - mid)))
    k = cand[0] if cand else mid
    return split_long(g[:k], ws) + split_long(g[k:], ws)
def chunks(line):
    ws = WORDS[line]; out, cur = [], []
    for i, x in enumerate(ws):
        cur.append(i)
        if (x['w'][-1] in ',.' and len(cur) >= 4) or i == len(ws) - 1: out.append(cur); cur = []
    if len(out) > 1 and len(out[-1]) <= 2: tail = out.pop(); out[-1] = out[-1] + tail
    out = [h for g in out for h in split_long(g, ws)]
    caps = []
    for g in out:
        text = proper(' '.join(ws[i]['w'] for i in g).rstrip(','))
        caps.append(dict(t=round(max(0.0, ws[g[0]]['s'] - 0.08), 3), e=round(ws[g[-1]]['e'] + 0.15, 3), text=text))
    for k in range(len(caps) - 1): caps[k]['e'] = min(caps[k]['e'], caps[k + 1]['t'])
    return caps
CAPS = [c for l in range(len(WORDS)) for c in chunks(l)]
for c in CAPS:  # whisper put this onset early (reviewed against the voice envelope)
    if c['text'].startswith('and the other half'): c['t'] = round(c['t'] + 0.28, 3)

hook = dict(paid=W(1, 'thousands'), gone=W(1, 'gone'), nvda=W(2, 'nvda'), there=W(2, 'there', 1, 'e'))
title = dict(t=W(3, 'terra') - 0.25, d=3.0)
labels = dict(t=W(4, 'it') - 0.2, end=T_MINE)
fly = dict(t0=T_FLY, t1=T_PROOF, bought=W(22, 'bought'), burned=W(22, 'burned'), holding=W(22, 'holding'), paid=W(22, 'paid'), stock=W(22, 'stock', 1, 'e'))
who = dict(traders=W(24, 'trading') - 0.2, holders=W(24, 'wif') - 0.2, end=T_LIM)
limits = dict(t=W(25, 'only') - 0.2, end=T_CLOSE)
close = dict(t=T_CLOSE, end=T_END)
WIPES = []  # no strata wipes: every chapter change is a soft 12-frame crossfade (the tricolour bands read as a flag)
# 'left on the table' on the WALLET card: the app floors $0.62 to $0 (display bug, fixed in the app separately);
# cover that one number with the exact value from the ledger on screen: In NVDA $1.22 minus today $0.60 = $0.62
PATCHES = [dict(f0=x['f0'], f1=x['f1'], rect=[884, 618, 330, 132], text='$0.62') for x in SEGS if x['clip'] == 'v4' and 14.99 <= x['s0'] < 17.33]
SEGS[0]['join'] = 'cont'  # frame 0 is the finished card, no fade-in (X thumbnail)
prev = None
for x in SEGS:  # chapter changes without a strata wipe get a soft crossfade
    if prev and x['scene'] != prev['scene'] and not any(abs(x['f0'] - w) < 0.05 for w in WIPES): x['join'] = 'xfade'
    prev = x
plan = dict(patches=PATCHES, total=round(T_END, 3), segs=SEGS, calls=CALLS, caps=CAPS, hook=hook, title=title, labels=labels, fly=fly, who=who,
            limits=limits, close=close, wipes=[round(w, 3) for w in WIPES])
json.dump(plan, open(f'{V}/remotion/src/plan.json', 'w'), indent=1)

ANCH = [('real wallet', W(0, 'real'), 'card3fdb reveal: This wallet turned $18,421 into $0.35'),
        ('gone', W(1, 'gone'), 'count-up NOW $0.35'), ('nvda (hook)', W(2, 'nvda'), 'count-up IN NVDA $16,972'),
        ('terra firma', W(3, 'terra'), 'title plate over home hero'), ('it shows you yours', W(4, 'shows'), 'system labels on sediment/sieve/bedrock'),
        ('own wallet', W(5, 'own'), 'connected wallet chip 0x7204..05aa'), ('uniswap', W(6, 'uniswap'), 'Buy WALLET clicked'),
        ('my card shows', W(6, 'card'), 'card reveal: You turned $1 into $0.60'), ('nvda (card)', W(6, 'nvda'), 'In NVDA: $1 ringed'),
        ('convert it', W(7, 'convert'), 'Fix it: convert to NVDA'), ('two signatures', W(8, 'signatures'), 'wallet card: approve WALLET'),
        ('sold', W(8, 'sold'), 'wallet card: convert WALLET to NVDA'), ('jar (convert)', W(8, 'jar'), 'Done. You own 0.003688 NVDA'),
        ('admin key', W(9, 'admin'), 'Jar: ownerless contract'), ('take it out', W(9, 'out'), 'Withdraw ringed'), ('saving streak', W(9, 'streak'), '1 day streak ringed'),
        ('keep a slice', W(11, 'slice'), 'slice slider'), ('ten percent', W(11, 'ten'), 'slider at 2.0% (range 0-10%)'),
        ('two percent', W(12, 'two'), '2.0% + 0.00007601 NVDA to Jar'), ('sell', W(12, 'sell'), 'Sell tab active'),
        ('wif comes in', W(13, 'wif'), '$WIF row, buy only'), ('half percent fee', W(14, 'half'), 'fee line 0.5%'),
        ('only ever buys wif', W(14, 'buys'), '$WIF buy only badge'), ('stake wif', W(15, 'stake'), 'Stake $WIF. Earn real stock.'),
        ('pick nvda', W(16, 'nvda'), 'NVDA reward stock'), ('full epoch', W(16, 'epoch'), 'activating 100, earns from epoch 25'),
        ('point three percent', W(16, 'three'), '0.3% fee line ringed'), ('run the fee pool', W(17, 'run'), 'Run distribute'),
        ('burns it', W(18, 'burns'), 'Epoch 23 paid out: 11.36 $WIF burned'), ('stakers', W(18, 'stakers'), 'Distributed. The burn and staker stream are onchain.'),
        ('into my jar', W(19, 'jar'), 'Claimed. The reward stock is in your Jar.'), ('mint your card', W(20, 'mint'), 'Mint this card, burns 1 $WIF'),
        ('chainlink (mint)', W(20, 'chainlink'), 'Minted onchain. 1 $WIF burned.'), ('leaderboard', W(21, 'leaderboard'), 'Who got buried. Who hit bedrock.'),
        ('bought on every trade', W(22, 'bought'), 'flywheel: trade fee -> buys $WIF'), ('proof page', W(23, 'proof'), 'Proof: Don\'t trust the core'),
        ('recomputed', W(23, 'recomputed'), 'Recompute a card'), ('that\'s terra firma', W(26, 'terra'), 'close plate')]
json.dump([dict(word=w, t=round(t, 3), intended=s) for w, t, s in ANCH], open(f'{B}/anchors.json', 'w'), indent=1)
print('total', plan['total'], 'segs', len(SEGS), 'caps', len(CAPS))
for x in SEGS: print(f"{x['scene']:8} {x['f0']:7.2f}-{x['f1']:7.2f} src {x['s0']:7.2f} x{x['speed']:.2f} {x['join']:4} {x.get('tag') or ''} {('CARD ' + x['card']['action']) if x.get('card') else ''}")
