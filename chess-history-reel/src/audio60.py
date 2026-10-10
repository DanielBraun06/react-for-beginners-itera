"""Score + sound design for the 60-second cut (no voice-over). 120 BPM, key of D; section cuts land on 2-second bars.
Writes <out>/score60.wav (master, -14 LUFS)."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sfxlib import *  # noqa: F401,F403  (synth voices, buses, mastering)

music, sfx, amb = Bus(), Bus(), Bus()
BEAT = 0.5

# ------------------------------------------------------------------ extra voices
def pluck_synth(freq, d=0.45, cutoff=2400, decay=0.18, detune=0.004):
    t = tt(d); y = saw(freq * (1 - detune), t) + saw(freq * (1 + detune), t)
    return lp(y, cutoff, 2) * np.exp(-t / decay) * np.clip(t / 0.003, 0, 1)
def bass_synth(freq, d=0.45, cutoff=600):
    t = tt(d); y = saw(freq, t) + 0.6 * np.sin(2 * np.pi * freq * 0.5 * t)
    return np.tanh(lp(y, cutoff, 2) * 1.6) * np.exp(-t / 0.22) * np.clip(t / 0.004, 0, 1)
def clock_tick(hi=True):
    d = 0.09; t = tt(d); f = 2600 if hi else 1900
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.01) + bp(noise(d), 1500, 7000) * np.exp(-t / 0.004) * 0.8)
def ratchet(d=0.5, n=14):
    y = np.zeros(int(d * SR))
    for k in range(n):
        u = k / (n - 1); st = d * (1 - (1 - u) ** 1.6) * 0.9
        c = clock_tick(k % 2 == 0) * (0.5 + 0.5 * u); i = int(st * SR); j = min(len(y), i + len(c)); y[i:j] += c[:j - i]
    return y
def glitch_burst(d=0.45, seed=0):
    r = np.random.default_rng(seed); y = np.zeros(int(d * SR)); i = 0
    while i < len(y):
        L = int(r.uniform(0.01, 0.05) * SR); kind = r.integers(0, 3); tq = np.arange(L) / SR
        if kind == 0: seg = np.sign(np.sin(2 * np.pi * r.uniform(200, 2400) * tq)) * 0.6
        elif kind == 1: seg = r.standard_normal(L) * 0.7
        else: seg = np.zeros(L)
        step = int(r.integers(1, 12)); seg = np.repeat(seg[::step], step)[:L]  # sample-rate crush
        y[i:i + L] = seg[:len(y) - i]; i += L
    return hp(y, 120) * np.linspace(1, 0.6, len(y))
def tape_stop(d=0.5, f0=220):
    t = tt(d); f = f0 * (1 - t / d) ** 1.5 + 5
    return (saw(f, t) * 0.5 + lp(noise(d), 800) * 0.3) * (1 - t / d)
def data_blip(f):
    d = 0.06; t = tt(d); return np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t / 0.015) * 0.5
def ding(f=1760, d=1.2):
    return additive(f, d, [1, 2.76, 5.4], [0.5, 0.25, 0.1], [1, 0.4, 0.15])
def scribble(d, seed=4):
    r = np.random.default_rng(seed); n = r.standard_normal(int(d * SR)); t = tt(d)
    mod = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 7 * t + 3 * np.sin(2 * np.pi * 1.3 * t)))
    return bp(n, 2500, 7000) * mod * 0.6 + bp(n, 600, 1500) * 0.15
def chord(notes): return [midi(n) for n in notes]

# ================================================================== HOOK 0 – 3.85
sfx.add(braam(3.2, 38), 0.02, -4)
sfx.add(sub_boom(2.0, 55, 26), 0.02, -4)
sfx.add(hit(1.4, 1.0, 0.5, 0.7), 0.25, -6)                         # 1500 РОКІВ
sfx.add(whoosh(0.45, 300, 5000), 0.62, -12, 0.4)
sfx.add(hit(1.0, 0.7, 0.3, 0.6), 0.95, -9)                         # ІСТОРІЇ ШАХІВ
sfx.add(whoosh(0.4, 400, 3000), 1.45, -14, -0.3)                   # ЗА 60 СЕКУНД
sfx.add(tick(1500), 1.6, -16)
for k, tb in enumerate(np.arange(1.0, 3.45, 0.25)):                 # clock-tick foreshadow, accelerating feel
    sfx.add(clock_tick(k % 2 == 0), tb, -24 + k * 0.8, (-1) ** k * 0.3)
for tb in (1.0, 2.0, 3.0): music.add(sub_boom(0.6, 70, 40) * 0.6, tb, -10)
sfx.add(riser(1.4, 250, 2600), 2.45, -12)
sfx.add(whoosh(0.42, 4000, 250, 0.3), 3.43, -10)                   # queen sucked into a dot
sfx.add(pop(1400, 900, 0.1), 3.83, -14)
amb.add(fire_crackle(3.9, 10), 0.0, -24)

# ================================================================== INDIA 3.85 – 12.07
sfx.add(sub_boom(2.4, 60, 30), 3.85, -3)
sfx.add(whoosh(1.0, 200, 2500, 0.3), 3.8, -9)
sfx.add(shimmer_sweep(1.4), 3.9, -15)
Sa = midi(50)
tp = 3.9
while tp < 12.0:
    for k, f in enumerate([Sa * 0.75, Sa, Sa, Sa / 2]): music.add(tanpura(f, 3.2), tp + k * 0.5, -15, -0.3 + 0.2 * k)
    tp += 2.0
groove = ['ge', 'na', 'na', 'ge', 'na', 'ge', 'na', 'na']
for i, tb in enumerate(np.arange(4.0, 11.75, 0.25)):
    g = groove[i % 8]
    if g == 'ge': music.add(tabla_ge(), tb, -11, -0.1)
    music.add(tabla_na(420 if i % 2 else 470), tb, -17 if g == 'ge' else -14, 0.15)
mel = [(0, 0.0, 0.5), (1, 0.5, 0), (4, 0.75, 0), (5, 1.0, 0.3), (7, 1.5, 0), (8, 2.0, 0.6), (7, 2.5, 0), (5, 2.75, 0), (4, 3.0, -0.4), (1, 3.5, 0), (0, 3.75, 0)]
for ph, base in ((4.0, 62), (8.0, 62)):
    for st, tm, bend in mel:
        if ph == 8.0 and tm > 3.0: continue
        music.add(sitar(midi(base + st + (12 if ph == 8.0 and tm in (2.0, 2.5) else 0)), 1.6, bend * 0.03), ph + tm, -13, 0.35)
music.add(sitar(midi(74), 2.4, 0.04), 11.0, -12, 0.2)
sfx.add(tick(1800), 4.15, -16); sfx.add(whoosh(0.3, 800, 5000), 4.12, -18, -0.5)
for i in range(5): sfx.add(tick(1100 + i * 120, 0.06), 4.25 + i * 0.06, -20, (i - 2) * 0.2)
sfx.add(hit(1.0, 0.5, 0.15, 0.4), 4.35, -12)
sfx.add(whoosh(0.4, 600, 2500), 5.0, -20)
sfx.add(elephant_call(1.1), 6.1, -20, 0.5)
amb.add(wind(8.3, 3, 300, 1200), 3.85, -26)
for k in range(9): amb.add(tick(4200 + 300 * (k % 4), 0.05) * 0.5, 4.4 + k * 0.83, -30, 0.6 - 0.15 * k)
for i in range(9): sfx.add(tick(1500 + i * 60, 0.05), 7.0 + i * 0.04, -20)
sfx.add(hit(1.2, 0.7, 0.4, 0.5), 7.02, -9)
sfx.add(whoosh(0.35, 500, 3000), 7.45, -20)
for i in range(4): sfx.add(wood_clack(0.3, 1.0 + i * 0.08), 8.0 + i * 0.25, -11, -0.45 + i * 0.3)
sfx.add(whoosh(0.35, 500, 3000), 9.55, -20)
sfx.add(riser(0.7, 300, 2500), 11.1, -14)
for i, (f0, f1) in enumerate([(300, 5000), (500, 7000), (200, 3000)]):
    sfx.add(whoosh(0.5, f0, f1, 0.55), 11.72 + i * 0.06, -8 + (-2 if i == 1 else 0), -0.8 + i * 0.8)
sfx.add(sub_boom(1.4, 70, 35), 12.07, -6)

# ================================================================== PERSIA 12.07 – 22.0
dr_t = tt(10.0); drone = (saw(midi(38), dr_t) + saw(midi(38) * 1.004, dr_t) + 0.5 * saw(midi(45), dr_t))
drone = lp(drone, 500) * np.clip(dr_t / 0.6, 0, 1) * np.clip((10.0 - dr_t) / 0.4, 0, 1)
music.add(drone, 12.0, -19)
hij = [62, 63, 66, 67, 69, 70, 72, 74]
seq = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 7, 6, 4, 5, 2, 3, 1, 2, 0, 0, 2, 4, 2, 5, 4, 7, 6, 4, 2, 1, 0]
for k, s_ in enumerate(seq):
    tn = 12.0 + k * 0.25
    if tn > 15.7: break
    music.add(santur(midi(hij[s_]), 1.6), tn, -14 - (3 if k % 2 else 0), 0.3 * np.sin(k))
pt, k = 12.0, 0
while pt < 15.75:
    music.add(daf(k % 4 in (0, 3)), pt, -9 if k % 4 in (0, 3) else -13, -0.1)
    pt += 0.25 if k % 4 in (1, 2) else 0.5; k += 1
for k in range(12): amb.add(camel_bell(1350 + 120 * (k % 3), 0.9), 12.3 + k * 0.8 + 0.1 * np.sin(k), -29, -0.6)
amb.add(wind(10, 7, 400, 2500), 12.0, -28)
sfx.add(tick(1800), 12.2, -16); sfx.add(whoosh(0.3, 800, 5000), 12.18, -18, 0.5)
for i in range(6): sfx.add(tick(1000 + i * 120, 0.06), 12.3 + i * 0.06, -20, (i - 2.5) * 0.2)
sfx.add(whoosh(0.4, 600, 4000), 13.25, -14); sfx.add(hit(1.2, 0.8, 0.4, 0.6), 13.5, -8)   # ШАТРАНДЖ
sfx.add(whoosh(0.35, 500, 3000), 13.85, -20)
# ШАХ / МАТ
sfx.add(reverse_swell(0.5), 15.5, -12)
sfx.add(whoosh(0.3, 3000, 500), 15.75, -16)
sfx.add(hit(1.6, 1.2, 0.6, 0.8), 16.0, -3); sfx.add(sub_boom(1.6, 60, 28), 16.0, -5); music.add(daf(True), 16.0, -6)
sfx.add(hit(1.8, 1.3, 0.8, 0.8), 16.5, -2); sfx.add(sub_boom(2.0, 55, 25), 16.5, -4); music.add(daf(True), 16.5, -5)
music.add(santur(midi(50), 2.0), 16.5, -12); music.add(santur(midi(57), 2.0), 16.5, -14)
sfx.add(whoosh(0.3, 600, 3000), 16.9, -20)
sfx.add(whoosh(0.3, 3000, 500), 18.12, -16)
# ferz demo
sfx.add(whoosh(0.4, 400, 3000), 18.2, -13)
music.add(pad(chord([50, 53, 57]), 3.3, 0.4, 0.6, 1200), 18.25, -20)
for k, n in enumerate([62, 66, 69, 70, 69, 66]): music.add(santur(midi(n), 1.4), 18.5 + k * 0.5, -17, 0.4 * np.sin(k))
sfx.add(wood_clack(0.4, 0.95), 18.78, -6)
for i in range(4): sfx.add(pop(1100 + i * 140, 700 + i * 100, 0.14), 19.3 + i * 0.2, -11, (-0.5, 0.5, 0.5, -0.5)[i])
sfx.add(whoosh(0.3, 1000, 5000), 19.9, -14); sfx.add(hit(0.8, 0.4, 0.2, 0.4), 20.0, -12)
sfx.add(wood_clack(0.4, 1.05), 20.88, -7, 0.4)
sfx.add(riser(0.55, 200, 2500), 21.4, -8)
sfx.add(whoosh(0.55, 150, 2000, 0.85), 21.4, -8)

# ================================================================== ROUTE 22.0 – 28.0
NODES = [22.35, 23.05, 23.75, 24.45, 25.15]
music.add(sub_boom(1.6, 60, 30), 22.0, -8)
# hybrid pulse: plucked ostinato in D Hijaz on 8ths + tabla/daf light
ost = [50, 57, 62, 57, 51, 57, 62, 57]
for i, tb in enumerate(np.arange(22.0, 27.75, 0.25)):
    n = ost[i % 8] + (2 if 24.0 <= tb < 25.0 else 0) - (2 if 25.0 <= tb < 26.0 else 0)
    music.add(pluck_synth(midi(n), 0.35, 1600 + 800 * ((tb - 22) / 6)), tb, -19 + (2 if i % 4 == 0 else 0), 0.3 * np.sin(i))
    if i % 2 == 0: music.add(bass_synth(midi(38), 0.4), tb, -16)
for i, tb in enumerate(np.arange(22.0, 25.9, 0.5)):
    music.add(daf(i % 2 == 0), tb, -12 if i % 2 == 0 else -15)
for k, tn in enumerate(NODES):
    sfx.add(ding(midi(86 + [0, 3, 5, 7, 10][k]), 1.4), tn, -14, (-0.4, 0.4, -0.4, 0.4, -0.4)[k])
    sfx.add(pop(900, 500, 0.15), tn, -12)
    sfx.add(hit(0.6, 0.3, 0.2, 0.3), tn, -16)
    music.add(santur(midi([62, 66, 69, 74, 78][k]), 1.6), tn, -14)
sfx.add(scribble(2.85), 22.35, -20, 0.1)                            # pen drawing the route
for k in range(4): sfx.add(whoosh(0.7, 500, 2500, 0.5), NODES[k] + 0.0, -22, (-1) ** k * 0.5)
sfx.add(whoosh(0.7, 2500, 300, 0.4), 25.25, -12)                    # zoom out
sfx.add(reverse_swell(0.4), 25.55, -14)
sfx.add(hit(1.2, 0.8, 0.5, 0.6), 25.95, -8)                         # fun fact card
music.add(pad(chord([50, 54, 57, 62]), 1.9, 0.1, 0.5, 2000), 25.95, -17)
sfx.add(whoosh(0.3, 600, 3000), 26.05, -18)
sfx.add(pop(500, 250, 0.25), 26.3, -9)                              # bishop pops in
sfx.add(whoosh(0.4, 300, 5000), 26.4, -14); sfx.add(hit(0.8, 0.5, 0.3, 0.4), 26.45, -12)
sfx.add(whoosh(0.3, 600, 3000), 26.85, -22)
sfx.add(riser(0.9, 200, 3000), 27.1, -9)

# ================================================================== EUROPE 28.0 – 38.0
sfx.add(thunder(4.5), 27.98, -5)
sfx.add(sub_boom(2.5, 50, 24), 28.0, -5)
amb.add(wind(10, 11, 150, 700), 28.0, -22)
music.add(church_bell(196, 5.5), 28.2, -12, -0.2)
music.add(choir(chord([50, 53, 57, 62]), 3.2, 1.0, 0.8), 28.1, -17)
sfx.add(tick(1800), 28.15, -16)
for i in range(6): sfx.add(tick(1000 + i * 120, 0.06), 28.25 + i * 0.06, -20, (i - 2.5) * 0.2)
sfx.add(sword_ring(1.6), 28.25, -13, 0.2)
sfx.add(whoosh(0.4, 600, 2500), 28.75, -20)
for k, tb in enumerate(np.arange(29.0, 31.0, 0.5)): music.add(timpani(73, 1.2), tb, -11 + (k % 2) * -3)
for k, tb in enumerate(np.arange(29.0, 31.0, 0.25)): music.add(pluck_synth(midi([38, 45, 50, 45][k % 4]), 0.3, 900), tb, -20)
sfx.add(reverse_swell(0.45), 30.55, -13)
sfx.add(hit(1.6, 1.0, 0.7, 0.6), 31.0, -4)                          # XV
music.add(church_bell(147, 5.0), 31.0, -8)
music.add(choir(chord([46, 50, 53, 58]), 2.6, 0.4, 0.6), 31.0, -16)
sfx.add(sweep_filter(noise(0.7), 500, 6000, 0.5) * np.hanning(int(0.7 * SR)) * 0.6, 31.25, -15)
sfx.add(whoosh(0.35, 400, 3000), 31.65, -17)
roll_t, k = 31.9, 0
while roll_t < 33.55:
    u = (roll_t - 31.9) / 1.65
    music.add(timpani(82, 0.8), roll_t, -20 + 13 * u, (-1) ** k * 0.2)
    roll_t += 0.16 * (1 - 0.7 * u); k += 1
sfx.add(riser(1.7, 200, 3000), 31.9, -7)
sfx.add(whoosh(0.5, 200, 2500), 32.95, -12)
sfx.add(whoosh(0.35, 400, 3000), 33.05, -16)
sfx.add(hit(2.2, 1.4, 1.0, 1.0), 33.6, -1); sfx.add(sub_boom(3.0, 50, 22), 33.6, -3)       # climax
music.add(brass(chord([50, 54, 57, 62]), 2.6), 33.6, -8)
music.add(choir(chord([50, 54, 57, 62, 66]), 4.0, 0.08, 1.2), 33.6, -12)
music.add(church_bell(294, 3.5), 33.6, -12, 0.3)
sfx.add(shimmer_sweep(1.8), 33.6, -9)
sfx.add(whoosh(0.8, 2000, 300, 0.15), 33.6, -10)
for i in range(8): sfx.add(whoosh(0.4, 900, 6000, 0.2), 33.6 + i * 0.02, -22, -1 + i / 3.5)
sfx.add(tick(1400), 34.2, -14)
sfx.add(whoosh(0.35, 500, 3000), 35.05, -18)
for k, tb in enumerate(np.arange(35.5, 37.75, 0.5)): music.add(timpani(73, 1.0), tb, -14); music.add(brass(chord([50, 57]), 0.45), tb, -22)
music.add(choir(chord([47, 50, 54, 59]), 2.0, 0.3, 0.5), 35.6, -17)
sfx.add(riser(0.6, 400, 4000), 37.35, -10)
sfx.add(hit(1.6, 0.9, 0.5, 0.8), 37.97, -5)

# ================================================================== MODERN 38.0 – 46.0
YEARS = [38.15, 40.75, 43.35]
prog_chords = [(38.0, [50, 53, 57]), (40.75, [46, 50, 53]), (43.35, [45, 49, 52])]   # Dm → Bb → A
for i, tb in enumerate(np.arange(38.0, 45.75, 0.25)):
    sfx.add(clock_tick(i % 2 == 0), tb, -19 if i % 2 == 0 else -22, (-0.35, 0.35)[i % 2])     # tick-tock = the groove
    ch = [c for (st, c) in prog_chords if tb >= st][-1]
    music.add(pluck_synth(midi(ch[[0, 1, 2, 1][i % 4]] + 12), 0.4, 1800, 0.16), tb, -18, 0.25 * np.sin(i * 0.7))
    if i % 2 == 0: music.add(bass_synth(midi(ch[0] - 12), 0.45, 500), tb, -14)
for i, tb in enumerate(np.arange(38.0, 45.75, 0.5)):
    music.add(kick(), tb, -12 if i % 2 == 0 else -16)
for st, ch in prog_chords: music.add(pad(chord(ch), 2.8, 0.3, 0.6, 1400), st, -20)
for k, ty in enumerate(YEARS):
    sfx.add(wood_clack(0.4, 0.8), ty, -5, (-0.3, 0.3, -0.3)[k])                 # clock button slam
    sfx.add(ratchet(0.55), ty + 0.02, -12)                                         # odometer rolls
    sfx.add(ding(midi(81 + [0, 2, 4][k]), 1.5), ty + 0.55, -16)
    sfx.add(sub_boom(1.0, 70, 35), ty, -10)
    sfx.add(whoosh(0.4, 300, 5000), ty + 0.2, -15); sfx.add(hit(0.8, 0.5, 0.3, 0.4), ty + 0.25, -13)
    sfx.add(whoosh(0.3, 600, 3000), ty + 0.55, -22)
amb.add(lp(noise(8), 300) * 0.3, 38.0, -30)                                       # hall room tone
sfx.add(riser(0.8, 300, 4000), 45.0, -12)
sfx.add(glitch_burst(0.5, 3), 45.75, -12); sfx.add(tape_stop(0.45), 45.75, -14)

# ================================================================== DIGITAL 46.0 – 54.0
dig_chords = [(46.0, [50, 53, 57]), (48.0, [46, 50, 53]), (50.4, [48, 52, 55]), (52.0, [50, 54, 57])]  # Dm Bb | C D
for i, tb in enumerate(np.arange(46.0, 53.75, 0.125)):
    ch = [c for (st, c) in dig_chords if tb >= st][-1]
    music.add(pluck_synth(midi(ch[[0, 1, 2, 1, 2, 0, 1, 2][i % 8]] + 24), 0.18, 3500, 0.07, 0.002), tb, -22 + (2 if i % 4 == 0 else 0), 0.5 * np.sin(i * 0.9))
for i, tb in enumerate(np.arange(46.0, 53.75, 0.25)):
    ch = [c for (st, c) in dig_chords if tb >= st][-1]
    music.add(bass_synth(midi(ch[0] - 12), 0.24, 800), tb, -14 if i % 2 else -16)
    if i % 2: music.add(hp(noise(0.08), 7000) * np.exp(-tt(0.08) / 0.02), tb, -22, 0.3)
for i, tb in enumerate(np.arange(46.0, 53.75, 0.5)): music.add(kick(), tb, -8)
for st, ch in dig_chords: music.add(pad(chord(ch), 2.6, 0.2, 0.4, 2400), st, -21)
r_ = np.random.default_rng(12)
for _ in range(30): sfx.add(data_blip(r_.choice([1760, 2350, 2640, 3520])), r_.uniform(46.2, 50.2), -28, r_.uniform(-0.8, 0.8))
sfx.add(glitch_burst(0.4, 7), 46.12, -10); sfx.add(hit(1.2, 0.9, 0.6, 0.6), 46.15, -5)       # 1997
sfx.add(whoosh(0.35, 400, 3000), 46.7, -16)
sfx.add(whoosh(0.4, 300, 5000), 47.2, -14); sfx.add(hit(0.8, 0.5, 0.3, 0.4), 47.3, -12)
sfx.add(tick(1400), 47.9, -15)
sfx.add(glitch_burst(0.3, 9), 50.3, -12); sfx.add(hit(1.2, 0.8, 0.5, 0.6), 50.45, -6)        # СЬОГОДНІ
sfx.add(whoosh(0.4, 300, 5000), 50.9, -14); sfx.add(hit(0.8, 0.5, 0.3, 0.4), 51.0, -12)
sfx.add(whoosh(0.3, 600, 3000), 51.55, -20)
# every popping dot = a player: pentatonic pops following the visual timing
r2 = np.random.default_rng(41)
dot_times = sorted(50.6 + (r2.random(255) ** 0.6) * 2.6)
penta = [74, 76, 78, 81, 83, 86, 88, 90, 93]
for k, td in enumerate(dot_times[::3]):
    sfx.add(pop(midi(penta[k % len(penta)]) * 1.0, midi(penta[k % len(penta)]) * 0.8, 0.09), td, -24, np.sin(k) * 0.7)
sfx.add(riser(0.8, 400, 4500), 53.2, -10)
sfx.add(hit(1.6, 0.9, 0.5, 0.8), 53.98, -5)

# ================================================================== CTA 54.0 – 60.0
music.add(pad(chord([50, 57, 62, 66, 69]), 3.2, 0.25, 0.8, 2200), 54.0, -15)
music.add(pad(chord([47, 54, 59, 62, 66]), 3.0, 0.4, 1.2, 2200), 57.0, -15)
for k, kb in enumerate(np.arange(54.5, 59.0, 0.5)):
    music.add(kick(), kb, -11 if k % 2 == 0 else -14)
    if k % 2: music.add(hp(noise(0.12), 6000) * np.exp(-tt(0.12) / 0.03), kb, -22, 0.3)
for i, tb in enumerate(np.arange(54.0, 58.9, 0.25)):
    music.add(pluck_synth(midi([62, 66, 69, 74][i % 4] + (0 if tb < 57 else -3)), 0.3, 2600, 0.12), tb, -22, 0.4 * np.sin(i))
amb.add(fire_crackle(6.0, 8, 9), 54.0, -26)
sfx.add(shimmer_sweep(1.2), 54.0, -12)
sfx.add(whoosh(0.35, 400, 3000), 54.08, -14)
sfx.add(whoosh(0.4, 300, 5000), 54.4, -12); sfx.add(hit(0.8, 0.5, 0.2, 0.4), 54.45, -12)
sfx.add(pop(600, 250, 0.25), 54.4, -8)
sfx.add(sweep_filter(noise(0.75), 400, 5000, 0.4) * np.hanning(int(0.75 * SR)) * 0.6, 54.5, -16, 0.4)
for i, ch in enumerate('@daniil_chess'): sfx.add(key_click(), 55.25 + i * 0.75 / 13 + 0.01 * np.sin(i * 3), -14, 0.3 * np.sin(i))
sfx.add(whoosh(0.3, 600, 3000), 56.05, -20)
sfx.add(pop(800, 300, 0.22), 57.02, -6); sfx.add(hit(0.9, 0.5, 0.3, 0.4), 57.02, -11)
sfx.add(key_click(), 57.85, -6); sfx.add(pop(1300, 1100, 0.1), 57.85, -12)
for k, (n, dt) in enumerate([(86, 0.0), (93, 0.09), (98, 0.18)]):
    sfx.add(additive(midi(n), 1.2, [1, 2, 3], [.5, .3, .2], [1, .3, .1]), 57.9 + dt, -14, 0.2 * k)
sfx.add(sparkle(1.2, 30), 57.85, -15)
sfx.add(shimmer_sweep(0.9), 58.3, -16)
music.add(church_bell(294, 3.0), 58.9, -16)                         # last ring-out
music.add(pad(chord([50, 57, 62, 66]), 1.5, 0.05, 1.3, 1800), 58.95, -16)

# ================================================================== mix
ir_big = reverb_ir(2.6, 0.03, 5500, 5); ir_room = reverb_ir(0.6, 0.01, 7000, 6)
music.b = reverb(music.b, ir_big, 0.32)
sfx.b = reverb(sfx.b, ir_big, 0.16)
amb.b = reverb(amb.b, ir_room, 0.2)
music_n = music.b / (np.max(np.abs(music.b)) + 1e-9)
full = music_n * db(-4) + sfx.b * db(-5) + amb.b * db(8)
out = master(full)
n = int(1.2 * SR); out[-n:] *= np.linspace(1, 0, n)[:, None] ** 1.5      # gentle tail over the last 1.2 s
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '../output')
write(os.path.join(dst, 'score60.wav'), out)
if '--stems' in sys.argv:
    for nm, b in (('music', music_n * db(-4)), ('sfx', sfx.b * db(-5)), ('amb', amb.b * db(8))):
        r = [20 * np.log10(np.sqrt(np.mean(b[int(a * SR):int((a + 2) * SR)] ** 2)) + 1e-9) for a in range(0, 60, 2)]
        print(nm.ljust(6), ' '.join(f'{x:5.0f}' for x in r))
print('done')
