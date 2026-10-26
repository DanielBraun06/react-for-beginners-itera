"""Sound design + light score for "Навчу грати в шахи за 60 секунд". No voice, no samples: everything is synthesized.
Every piece landing, highlight cascade, beam and text hit is placed from cues.json (exported from script.js),
so the sound is frame-locked to the animation. 120 BPM grid from t=4.0, key of D minor.
Usage: python3 audio.py <outdir> [--part 2]  → <outdir>/score.wav or score2.wav (-14 LUFS, true peak ≈ -1.2 dBFS).
Part 2 («Ці 3 ходи…») reuses every voice; only the arrangement table below changes."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
_PART = sys.argv[sys.argv.index('--part') + 1] if '--part' in sys.argv else '1'
if _PART in ('5', '6'): os.environ['REEL_DUR'] = '35'   # parts 5–6 are 35 s loops
from sfxlib import *  # noqa: F401,F403

HERE = os.path.dirname(os.path.abspath(__file__))
PART = sys.argv[sys.argv.index('--part') + 1] if '--part' in sys.argv else '1'
CUES = json.load(open(os.path.join(HERE, 'cues.json' if PART == '1' else f'cues{PART}.json')))
music, sfx, amb = Bus(), Bus(), Bus()
r = np.random.default_rng(7)

# ------------------------------------------------------------------ voices
def pluck_synth(freq, d=0.45, cutoff=2400, decay=0.18, detune=0.004):
    t = tt(d); y = saw(freq * (1 - detune), t) + saw(freq * (1 + detune), t)
    return lp(y, cutoff, 2) * np.exp(-t / decay) * np.clip(t / 0.003, 0, 1)
def bass808(freq, d=0.9, drive=1.8):
    t = tt(d); f = freq * (1 + 1.5 * np.exp(-t / 0.02)); y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return np.tanh(y * drive) * np.exp(-t / 0.45) * np.clip(t / 0.003, 0, 1)
def hat(d=0.08, open_=False):
    t = tt(d); return hp(noise(d), 7000) * np.exp(-t / (0.06 if open_ else 0.012))
def snare(d=0.35):
    t = tt(d); body = np.sin(2 * np.pi * np.cumsum(180 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.07)
    return body * 0.6 + bp(noise(d), 1500, 8000) * np.exp(-t / 0.12)
def clap(d=0.3):
    t = tt(d); e = sum(np.exp(-np.clip(t - o, 0, None) / 0.008) * (t >= o) for o in (0, 0.011, 0.023)) + 0.5 * np.exp(-t / 0.09)
    return bp(noise(d), 900, 5000) * e
def clock_tick(hi=True):
    d = 0.09; t = tt(d); f = 2600 if hi else 1900
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.01) + bp(noise(d), 1500, 7000) * np.exp(-t / 0.004) * 0.8)
def blip(f, d=0.14):
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.045) * np.clip(t / 0.002, 0, 1)
def zap(d=0.5, f0=3200, f1=380):
    t = tt(d); u = t / d; f = f1 + (f0 - f1) * np.exp(-u * 5)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) + 0.4 * sweep_filter(noise(d), 6000, 900, 0.5) * np.exp(-t / 0.12)
    return y
def scrape(d):
    t = tt(d); y = bp(noise(d), 300, 2400) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.5
    return y + sub_boom(d, 70, 50) * 0.15
def ding(f=1760, d=1.2): return additive(f, d, [1, 2.76, 5.4], [0.5, 0.25, 0.1], [1, 0.4, 0.15])
def chord(notes): return [midi(n) for n in notes]

CLACK = {k: [wood_clack(0.4, p * (1 + 0.035 * j)) for j in (-1, 0, 1)] for k, p in
         dict(pawn=1.18, knight=1.0, bishop=1.06, rook=0.9, queen=0.95, king=0.84).items()}
def clack(piece, i=0): return CLACK.get(piece, CLACK['pawn'])[i % 3]
PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89]   # D minor pentatonic, rising with distance

# ------------------------------------------------------------------ cue-driven sound design
n_land = 0
for c in CUES:
    t, ty = c['t'], c['type']
    if ty == 'land':
        n_land += 1
        pan_ = float(r.uniform(-0.35, 0.35))
        if c.get('hard'):
            sfx.add(clack(c['piece']), t, -1, 0); sfx.add(hit(1.5, 1.0, 0.6, 0.8), t, -4); sfx.add(sub_boom(2.2, 64, 26), t, -2)
        else:
            g = -9 if c.get('soft') else -6
            if 4.0 < t < 6.5: g -= 2                                  # the 31-piece cascade
            sfx.add(clack(c['piece'], n_land), t, g, pan_)
            sfx.add(sub_boom(0.35, 120, 70) * 0.5, t, g - 6)
    elif ty == 'lift':
        sfx.add(whoosh(max(0.25, c['dur']), 500, 3500, 0.5), t, -22, 0.2)
    elif ty == 'slide':
        sfx.add(scrape(c['dur'] + 0.05), t, -15, -0.2); sfx.add(whoosh(c['dur'], 300, 2000, 0.6), t, -20)
    elif ty == 'capture':
        sfx.add(hit(1.0, 0.7, 0.8, 0.9), t, -6); sfx.add(whoosh(0.6, 3000, 400, 0.15), t + 0.02, -12, -0.5)
        sfx.add(sparkle(0.6, 18, 3000, 9000, 4), t, -16)
    elif ty == 'topple':
        sfx.add(whoosh(0.7, 200, 1200, 0.85), t, -14)
        sfx.add(clack('king', 0), t + 0.62, -2); sfx.add(sub_boom(1.6, 70, 30), t + 0.62, -4)
        for k, dt in enumerate([0.78, 0.9, 0.98]): sfx.add(clack('king', k) * 0.5, t + dt, -10 - 3 * k, 0.3)
        sfx.add(church_bell(147, 4.0), t + 0.62, -15)
    elif ty == 'blips':
        for k, d in enumerate(c['d']):
            f = midi(PENTA[min(int(round(d)), len(PENTA) - 1)] + (0 if c['kind'] == 'fill' else 12))
            sfx.add(blip(f), t + d * c['st'], -21 - 0.3 * k * (c['n'] > 10), float(np.sin(k * 1.7) * 0.5))
        if c['n'] > 4: sfx.add(shimmer_sweep(min(1.2, 0.3 + c['st'] * 8)), t, -24)
    elif ty == 'beam':
        sfx.add(zap(0.6), t, -11); sfx.add(riser(0.3, 800, 5000)[::-1], t - 0.02, -20)
    elif ty == 'slam':
        if c.get('big'):
            sfx.add(braam(2.4, 38), t, -10); sfx.add(sub_boom(2.0, 58, 26), t, -8); sfx.add(hit(1.5, 1.0, 0.6, 0.8), t, -9)
        else:
            sfx.add(hit(1.1, 0.8, 0.4, 0.6), t, -8); sfx.add(whoosh(0.32, 400, 5000, 0.85), t - 0.3, -15)
    elif ty == 'textUp':
        sfx.add(whoosh(0.35, 500, 4500, 0.7), t - 0.12, -17, float(r.uniform(-0.3, 0.3)))
    elif ty == 'plate':
        sfx.add(whoosh(0.3, 600, 6000, 0.6), t - 0.1, -14, 0.3); sfx.add(pop(700, 300, 0.18), t + 0.05, -14)
    elif ty == 'body':
        sfx.add(pop(1200, 800, 0.08), t, -24, 0.2)
    elif ty == 'label':
        sfx.add(tick(2400), t, -18)
    elif ty == 'strike':
        sfx.add(sweep_filter(noise(0.35), 1500, 7000, 0.4) * np.hanning(int(0.35 * SR)), t, -12, -0.3)
        sfx.add(hit(0.6, 0.3, 0.2, 0.5), t + 0.1, -16)
    elif ty == 'camWhoosh':
        d = max(0.3, min(1.3, c['dur']))
        if c.get('cut'): pass
        else: sfx.add(whoosh(d, 150, 3000, 0.55, 0.8), t, -10, -0.2); sfx.add(whoosh(d * 0.9, 300, 6000, 0.6), t + 0.05, -16, 0.4)
    elif ty == 'clearAll':
        sfx.add(whoosh(0.6, 200, 5000, 0.4), t - 0.05, -8); sfx.add(shimmer_sweep(1.0), t, -16)
    elif ty == 'preMate':
        sfx.add(whoosh(0.35, 300, 3000, 0.9), t, -8)
    elif ty == 'mate':
        sfx.add(braam(3.2, 38), t, -8); sfx.add(sub_boom(2.8, 55, 24), t, -6); sfx.add(hit(1.8, 1.0, 0.7, 0.9), t, -8)
        sfx.add(thunder(3.5), t, -18); sfx.add(church_bell(110, 5.0), t, -16)
    elif ty == 'timer':
        if 2.0 <= t < 59.9:
            g = -27 if t < 52 else -22
            sfx.add(clock_tick(int(c['s']) % 2 == 0), t, g + (6 if t < 4 else 0), 0.25)
    elif ty == 'rewind':
        tt_ = tt(0.5); f = 300 * 2 ** (tt_ / 0.5 * 3)
        sfx.add(np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.4 + 0.6 * (np.sin(2 * np.pi * 28 * tt_) > 0)) * np.hanning(len(tt_)), t, -18)
        sfx.add(whoosh(0.5, 4000, 300, 0.2)[::-1], t, -12, 0.3)
    elif ty == 'morph':
        sfx.add(pop(900 + 300 * r.uniform(), 400, 0.16), t, -10); sfx.add(sparkle(0.4, 10, 3000, 9000, int(t * 10)), t, -18)
        sfx.add(hit(0.5, 0.3, 0.5, 0.3), t, -16)
    elif ty == 'check':
        sfx.add(blip(midi(81)), t, -16, 0.3); sfx.add(pop(1500, 1200, 0.06), t, -20)
    elif ty == 'promote':
        sfx.add(sub_boom(2.4, 60, 26), t, -4); sfx.add(hit(1.4, 0.8, 0.8, 0.7), t, -6); sfx.add(shimmer_sweep(1.6), t, -12)
        sfx.add(choir(chord([62, 69, 74, 78]), 2.2, 0.05, 1.4), t, -20)
    elif ty == 'queenHit':
        sfx.add(hit(1.2, 0.9, 0.6, 0.6), t, -6); sfx.add(church_bell(220, 3.0), t, -15); sfx.add(braam(1.8, 45), t, -14)
    elif ty == 'ratchet':
        n = int(c['dur'] * 16)
        for i in range(n): sfx.add(clock_tick(i % 2 == 0), t + c['dur'] * (i / n) ** 0.8, -20 + 6 * i / n, 0.3 * np.sin(i))
    elif ty == 'counterHit':
        sfx.add(hit(1.0, 0.7, 0.5, 0.6), t, -8); sfx.add(ding(midi(86), 1.2), t, -16)
    elif ty == 'avatar':
        sfx.add(pop(600, 250, 0.25), t, -8); sfx.add(shimmer_sweep(1.0), t, -14); sfx.add(whoosh(0.4, 300, 5000), t - 0.3, -14)
    elif ty == 'type':
        for i in range(c['n']): sfx.add(key_click(), t + i * c['dur'] / c['n'] + 0.008 * np.sin(i * 3), -14, 0.3 * np.sin(i))
    elif ty == 'button':
        sfx.add(pop(800, 300, 0.22), t, -6); sfx.add(hit(0.9, 0.5, 0.3, 0.4), t, -12)
    elif ty == 'tap':
        sfx.add(key_click(), t, -5); sfx.add(pop(1300, 1100, 0.1), t, -12)
        for k, (n, dt) in enumerate([(86, 0.0), (90, 0.08), (93, 0.16), (98, 0.24)]): sfx.add(ding(midi(n), 1.2), t + 0.04 + dt, -16, 0.2 * k - 0.3)
        sfx.add(sparkle(1.2, 30), t, -16)

# ------------------------------------------------------------------ hook (0–4): tension before the beat
sfx.add(reverse_swell(0.35), -0.05, -12)
HAS_CTA = PART in ('1', '2', '3', '4')          # part 5 loops back into its hook instead of a CTA
BEAT0 = 3.0 if PART in ('5', '6') else 4.0             # where the 120 BPM grid starts
sfx.add(riser(1.6, 220, 3000), BEAT0 - 1.55, -12)
amb.add(wind(BEAT0 + 0.2, 3, 150, 700), 0.0, -14)
for k in range(int((BEAT0 - 0.3) / 0.5) + 1): music.add(sub_boom(0.7, 70, 40) * 0.6, 0.3 + k * 0.5, -14 + k * 0.6)   # heartbeat pulse

# ------------------------------------------------------------------ beat: 120 BPM from t=4.0
BEAT = 0.5
prog_ = [(50, [62, 65, 69]), (46, [62, 65, 70]), (53, [60, 65, 69]), (48, [60, 64, 67])]   # Dm Bb F C (bass, triad)
def bar_chord(tb): return prog_[int((tb - BEAT0) // 2.0) % 4]
SECTIONS = {   # (start, kind) — the beat engine below plays each kind differently
    '1': [(4, 'intro'), (14, 'lesson'), (37, 'check'), (43.5, 'build'), (46.05, 'drop'), (52, 'cta')],
    '5': [(3, 'lesson')],
    '6': [(3, 'lesson')],
    '4': [(4, 'intro'), (6.5, 'lesson'), (41, 'check'), (52, 'cta')],
    '3': [(4, 'intro'), (19.5, 'lesson'), (46.5, 'drop'), (52, 'cta')],
    '2': [(4, 'intro'), (13.2, 'check'), (20.0, 'lesson'), (35.0, 'build'), (37.9, 'drop'), (42.3, 'check'), (43.5, 'drop'), (52, 'cta')],
}[PART]
BUILD = {'1': (43.5, 45.75), '2': (35.0, 37.7), '3': (0, 0), '4': (0, 0), '5': (0, 0), '6': (0, 0)}[PART]
def section(tb):
    s = SECTIONS[0][1]
    for a, kind in SECTIONS:
        if tb >= a: s = kind
    return s
tb = BEAT0
while tb < DUR - 1.0:
    s = section(tb); k = int(round((tb - BEAT0) / BEAT)); bass, tri = bar_chord(tb)
    if s in ('intro', 'lesson', 'drop', 'cta'):
        music.add(kick(), tb, -9 if s != 'intro' or k % 2 == 0 else -14)
        music.add(hat(), tb + BEAT / 2, -22, 0.3)
        if s != 'intro' and k % 2 == 1: music.add(clap(), tb, -18, -0.1)
        if k % 4 == 0: music.add(bass808(midi(bass - 12), 1.6 if s == 'drop' else 1.0, 2.2 if s == 'drop' else 1.5), tb, -8 if s == 'drop' else -12)
        if s in ('lesson', 'cta') or (s == 'intro' and tb >= 6.0):
            for j in range(4):
                n = tri[[0, 1, 2, 1][j]] + (12 if j == 2 else 0)
                music.add(pluck_synth(midi(n), 0.3, 2400 if s == 'lesson' else 3000, 0.12), tb + j * BEAT / 4, -21, 0.4 * np.sin(k + j))
        if s == 'drop':
            music.add(hat(0.25, True), tb + BEAT / 2, -20, -0.3)
            for j in (1, 3): music.add(hat(), tb + j * BEAT / 4, -26, 0.4)
    elif s == 'check':
        if k % 2 == 0: music.add(kick(), tb, -10)
        if k % 4 == 0: music.add(bass808(midi(38), 1.8, 1.4), tb, -14)
        music.add(clock_tick(k % 2 == 0), tb + BEAT / 2, -26, 0.4)
    elif s == 'build':
        u = (tb - BUILD[0]) / (BUILD[1] - BUILD[0] + 0.3)
        rate = 2 if u < 0.5 else 4
        for j in range(rate):
            tt_ = tb + j * BEAT / rate
            if tt_ < BUILD[1]: music.add(snare(0.2), tt_, -24 + 10 * u, 0.1)
    tb += BEAT
# pads under sections
if PART == '1':
    music.add(pad(chord([38, 50, 53, 57]), 6.3, 1.5, 1.5, 700), 37.0, -26)                 # check: dark drone
    music.add(pad(chord([38, 45, 50, 53, 57]), 2.6, 0.2, 0.4, 1400), 43.4, -25)
    sfx.add(riser(2.2, 200, 4000), 43.55, -9)
    sfx.add(reverse_swell(0.6), 45.45, -10)
    for k, ch in enumerate([[50, 57, 62, 65], [46, 53, 58, 62], [53, 60, 65, 69]]):
        music.add(pad(chord(ch), 2.1, 0.1, 0.6, 1600), 46.05 + k * 2.0, -23)
elif PART == '4':
    music.add(pad(chord([38, 50, 53, 57]), 3.6, 0.4, 1.2, 900), 0.4, -26)
    music.add(pad(chord([38, 50, 53, 57, 62]), 10.8, 1.0, 1.5, 900), 41.0, -26)
elif PART == '3':
    sfx.add(riser(1.0, 300, 4000), 11.7, -12)
    music.add(pad(chord([38, 50, 53, 57]), 4.0, 0.3, 1.5, 800), 12.7, -24)
    for k, ch in enumerate([[50, 57, 62, 66], [46, 53, 58, 62], [55, 62, 67, 71]]):
        music.add(pad(chord(ch), 2.0, 0.1, 0.6, 1800), 46.5 + k * 2.0, -23)
else:
    music.add(pad(chord([38, 50, 53, 57]), 6.8, 1.0, 1.5, 700), 13.2, -26)                 # checklist: calm drone
    sfx.add(riser(2.6, 200, 4000), 35.1, -10)
    sfx.add(reverse_swell(0.6), 37.3, -10)
    for k, ch in enumerate([[50, 57, 62, 66], [55, 62, 67, 71]]):
        music.add(pad(chord(ch), 2.2, 0.1, 0.6, 1800), 37.9 + k * 2.0, -23)
    sfx.add(riser(1.1, 300, 5000), 42.4, -11)
    for k, ch in enumerate([[50, 57, 62, 66], [47, 54, 59, 62], [55, 62, 67, 71], [57, 64, 69, 73]]):
        music.add(pad(chord(ch), 2.1, 0.1, 0.6, 1800), 43.5 + k * 2.0, -23)
    amb.add(wind(8.0, 5, 100, 500), 43.5, -22)
if HAS_CTA:
    for k, ch in enumerate([[50, 57, 62, 66, 69], [55, 59, 62, 67], [47, 54, 59, 62, 66], [57, 61, 64, 69]]):   # CTA lifts to D major
        music.add(pad(chord(ch), 2.2, 0.3 if k else 0.8, 0.7, 2200), 52.0 + k * 2.0, -23)
    music.add(pad(chord([50, 57, 62, 66]), 1.6, 0.05, 1.4, 1800), 59.0, -22)
    music.add(church_bell(294, 2.5), 59.0, -18)
    amb.add(fire_crackle(8.0, 6, 9), 52.0, -30)
else:
    # loop seam: the last bar swells straight into the hook hit at t≈0.15
    sfx.add(reverse_swell(0.9), DUR - 0.9, -10)
    sfx.add(riser(1.4, 300, 4000), DUR - 1.4, -14)
if PART == '1': amb.add(wind(6.5, 5, 100, 500), 46.0, -20)

# ------------------------------------------------------------------ mix: duck music under big hits, gap before the mate
music_n = music.b / (np.max(np.abs(music.b)) + 1e-9)
duck = np.ones(len(music_n))
def gap(a, b, depth=0.0, rel=0.25):
    i, j, k = int(a * SR), int(b * SR), int((b + rel) * SR)
    duck[i:j] = np.minimum(duck[i:j], depth); duck[j:k] = np.minimum(duck[j:k], np.linspace(depth, 1, k - j))
for a_, b_ in {'1': [(45.8, 46.05)], '2': [(37.7, 37.9), (43.3, 43.5)], '3': [(12.45, 12.7)], '4': [], '5': [], '6': []}[PART]: gap(a_, b_, 0.0, 0.05)
for c in CUES:
    if c['type'] in ('slam', 'mate', 'promote', 'queenHit', 'counterHit') or (c['type'] == 'land' and c.get('hard')): gap(c['t'], c['t'] + 0.05, 0.45, 0.6)
ir_big = reverb_ir(2.4, 0.03, 6000, 5); ir_room = reverb_ir(0.5, 0.01, 7000, 6)
music_n = reverb(music_n * duck[:, None], ir_big, 0.22)
sfx.b = reverb(sfx.b, ir_room, 0.25)
sfx.b = reverb(sfx.b, ir_big, 0.1)
amb.b = reverb(amb.b, ir_room, 0.2)
MUSIC_DB = -10 if PART in ('5', '6') else -8   # the loop has fewer hits, so the beat sits a little lower
full = music_n * db(MUSIC_DB) + sfx.b * db(-3) + amb.b * db(0)
out = master(full)
if HAS_CTA: n = int(0.6 * SR); out[-n:] *= np.linspace(1, 0, n)[:, None] ** 1.5   # loops end at full level
dst = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else os.path.join(HERE, '../output')
os.makedirs(dst, exist_ok=True)
write(os.path.join(dst, 'score.wav' if PART == '1' else f'score{PART}.wav'), out)
if '--stems' in sys.argv:
    for nm, b in (('music', music_n * db(MUSIC_DB)), ('sfx', sfx.b * db(-3)), ('amb', amb.b)):
        rr = [20 * np.log10(np.sqrt(np.mean(b[int(a * SR):int((a + 2) * SR)] ** 2)) + 1e-9) for a in range(0, int(DUR), 2)]
        print(nm.ljust(6), ' '.join(f'{x:5.0f}' for x in rr))
print('done')
