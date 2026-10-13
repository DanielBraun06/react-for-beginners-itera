"""Synth + DSP library for the chess-history reel: every sound is generated with numpy/scipy, no samples."""
import json, os, sys, wave
import numpy as np
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
DUR = TL['duration']
N = int(DUR * SR) + SR  # 1s tail headroom
rng = np.random.default_rng(1234)

# ------------------------------------------------------------------ utils
def tt(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def sos(kind, f, order=2, q=None):
    if kind == 'bp':
        lo, hi = f
        return signal.butter(order, [max(lo, 20), min(hi, SR / 2 - 100)], 'bandpass', fs=SR, output='sos')
    return signal.butter(order, min(f, SR / 2 - 100), kind, fs=SR, output='sos')
def lp(x, f, o=2): return signal.sosfilt(sos('low', f, o), x)
def hp(x, f, o=2): return signal.sosfilt(sos('high', f, o), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(sos('bp', (lo, hi), o), x)
def peq(x, f0, gain_db, q=1.0):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return signal.lfilter(b, a, x)
def env_exp(d, decay, attack=0.002):
    t = tt(d); e = np.exp(-t / decay); a = np.clip(t / max(attack, 1e-4), 0, 1); return e * a
def sweep_filter(x, f0, f1, bw=0.6, curve=None, block=256):
    """time-varying bandpass: center freq moves f0->f1 (log), bandwidth in octaves fraction"""
    n = len(x); out = np.zeros(n); zi = None
    nb = (n + block - 1) // block
    for i in range(nb):
        u = i / max(nb - 1, 1)
        if curve is not None: u = curve(u)
        fc = f0 * (f1 / f0) ** u
        lo, hi = fc * 2 ** (-bw), fc * 2 ** bw
        s = sos('bp', (lo, hi), 2)
        seg = x[i * block:(i + 1) * block]
        if zi is None or zi.shape != (s.shape[0], 2): zi = np.zeros((s.shape[0], 2))
        y, zi = signal.sosfilt(s, seg, zi=zi)
        out[i * block:i * block + len(seg)] = y
    return out
def norm(x, peak=1.0):
    m = np.max(np.abs(x)) + 1e-9; return x / m * peak
def pan(x, p):  # p -1..1 (scalar or array)
    p = np.clip(p, -1, 1); a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)
def db(g): return 10 ** (g / 20)

class Bus:
    def __init__(s): s.b = np.zeros((N, 2))
    def add(s, x, t, gain_db=0.0, p=0.0):
        if x.ndim == 1: x = pan(x, p)
        i = int(round(t * SR))
        if i < 0: x = x[-i:]; i = 0
        j = min(N, i + len(x)); s.b[i:j] += x[:j - i] * db(gain_db)

def reverb_ir(t60=2.2, pre=0.02, bright=6000, seed=5):
    r = np.random.default_rng(seed); d = t60 * 1.2; t = tt(d)
    env = np.exp(-6.9 * t / t60)
    L = lp(r.standard_normal(len(t)) * env, bright); R = lp(r.standard_normal(len(t)) * env, bright)
    ir = np.zeros((int(pre * SR) + len(t), 2)); ir[int(pre * SR):, 0] = L; ir[int(pre * SR):, 1] = R
    return ir / np.sqrt(np.sum(ir ** 2) / 2)
def reverb(stereo, ir, mix):
    wet = np.stack([signal.fftconvolve(stereo[:, 0], ir[:, 0])[:len(stereo)], signal.fftconvolve(stereo[:, 1], ir[:, 1])[:len(stereo)]], 1)
    return stereo + wet * mix

# ------------------------------------------------------------------ synth voices
def midi(m): return 440 * 2 ** ((m - 69) / 12)
def ks(freq, d, decay=0.996, bright=0.5, seed=None):
    """Karplus-Strong pluck"""
    r = np.random.default_rng(seed); n = int(d * SR); P = max(2, int(SR / freq))
    buf = r.uniform(-1, 1, P); buf = lp(buf, 2000 + 9000 * bright, 1) if P > 12 else buf
    out = np.empty(n); idx = 0
    for i in range(n):
        v = buf[idx]; out[i] = v
        nxt = buf[(idx + 1) % P]; buf[idx] = decay * 0.5 * (v + nxt); idx = (idx + 1) % P
    return out
def additive(freq, d, partials, decays, amps, detune=0.0, vib=0.0, vibf=5.0):
    t = tt(d); y = np.zeros(len(t))
    ph_v = vib * np.sin(2 * np.pi * vibf * t)
    for p, dc, a in zip(partials, decays, amps):
        f = freq * p * (1 + detune * rng.uniform(-1, 1))
        y += a * np.sin(2 * np.pi * f * t + p * ph_v + rng.uniform(0, 6.28)) * np.exp(-t / dc)
    return y
def saw(freq, t):
    ph = np.cumsum(np.broadcast_to(freq, t.shape) / SR); return 2 * (ph % 1) - 1

# ---- impacts / transitions
def sub_boom(d=1.6, f0=58, f1=28, gain=1.0):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t / 0.18); ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.55) * np.clip(t / 0.004, 0, 1)
    return np.tanh(y * 1.6) * gain
def hit(d=1.2, body=1.0, metal=0.35, noise_amt=0.6):
    t = tt(d)
    thump = sub_boom(d, 90, 40) * body
    n = lp(noise(d), 3500) * np.exp(-t / 0.05) * noise_amt
    m = additive(1, d, [523, 811, 1187, 1730, 2390], [0.25, 0.2, 0.15, 0.1, 0.08], [1, .7, .5, .4, .3]) * metal * 0.3
    click = hp(noise(d), 4000) * np.exp(-t / 0.006) * 0.5
    return thump + n + m + click
def braam(d=2.6, root=38):
    t = tt(d); y = np.zeros(len(t))
    for k, (m, a) in enumerate([(root, 1), (root + 12, 0.7), (root + 7 + 12, 0.35), (root + 24, 0.25)]):
        f = midi(m) * (1 + 0.003 * np.sin(2 * np.pi * (0.3 + k) * t))
        y += a * (saw(f * 0.998, t) + saw(f * 1.003, t)) * 0.5
    cut = 200 + 2200 * np.exp(-t / 0.5)
    out = np.zeros(len(t)); blk = 512
    for i in range(0, len(t), blk):
        out[i:i + blk] = lp(y[max(0, i - 2048):i + blk], cut[i])[-len(y[i:i + blk]):]
    e = np.clip(t / 0.03, 0, 1) * np.exp(-t / 1.1)
    return np.tanh(out * e * 1.8)
def whoosh(d=0.6, f0=300, f1=4000, peak=0.65, bw=0.7):
    n = noise(d); t = tt(d); u = t / d
    e = np.where(u < peak, (u / peak) ** 2.2, np.exp(-(u - peak) / (1 - peak) * 4))
    y = sweep_filter(n, f0, f1, bw, curve=lambda u: u ** 0.8) * e
    return norm(y)
def riser(d=1.5, f0=200, f1=2400):
    t = tt(d); u = t / d
    n = sweep_filter(noise(d), f0 * 2, f1 * 3, 0.5, curve=lambda u: u ** 1.6) * u ** 2.5
    f = f0 * (f1 / f0) ** (u ** 1.5); tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * u ** 3 * 0.35
    trem = 1 + 0.3 * np.sin(2 * np.pi * (4 + 20 * u ** 2) * t)
    return norm((n + tone) * trem)
def reverse_swell(d=0.9):
    t = tt(d); u = t / d; y = hp(noise(d), 3000) * u ** 4 + lp(noise(d), 800) * u ** 3 * 0.6
    return norm(y)
def tick(f=1900, d=0.08):
    t = tt(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + hp(noise(d), 5000) * np.exp(-t / 0.003) * 0.4)
def pop(f0=900, f1=420, d=0.16):
    t = tt(d); f = f1 + (f0 - f1) * np.exp(-t / 0.03); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05) * np.clip(t / 0.002, 0, 1)
def wood_clack(d=0.35, pitch=1.0):
    t = tt(d)
    modes = [(1080, .045, 1), (1690, .035, .8), (2520, .025, .6), (3700, .018, .45), (620, .06, .5)]
    y = sum(a * np.sin(2 * np.pi * f * pitch * t + rng.uniform(0, 6)) * np.exp(-t / dc) for f, dc, a in modes)
    y += bp(noise(d), 800, 6000) * np.exp(-t / 0.004) * 1.2
    y += sub_boom(d, 160, 90) * 0.25  # board thunk
    return norm(y)
def key_click():
    d = 0.05; t = tt(d); return hp(noise(d), 2500) * np.exp(-t / 0.006) + np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.004) * 0.3
def slide_whistle_down(d=0.45):
    t = tt(d); u = t / d; f = 1500 * (0.16) ** (u ** 0.9) * (1 + 0.025 * np.sin(2 * np.pi * 9 * t))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.clip(t / 0.02, 0, 1) * (1 - u ** 3))
    return y + 0.15 * np.sin(4 * np.pi * np.cumsum(f) / SR) * (1 - u)
def sparkle(d=1.2, n=26, fmin=2500, fmax=9000, seed=3):
    r = np.random.default_rng(seed); y = np.zeros(int(d * SR))
    for _ in range(n):
        st = r.uniform(0, d * 0.8); f = r.uniform(fmin, fmax); dd = 0.25; tt_ = tt(dd)
        g = np.sin(2 * np.pi * f * tt_) * np.exp(-tt_ / 0.05) * r.uniform(0.3, 1)
        i = int(st * SR); j = min(len(y), i + len(g)); y[i:j] += g[:j - i]
    return y
def shimmer_sweep(d=1.0):
    return sparkle(d, 50, 3000, 11000, 9) * np.linspace(1, 0.3, int(d * SR))

# ---- India
def tanpura(freq, d=4.0):
    parts = list(range(1, 28)); amps = [1 / k ** 0.75 for k in parts]
    t = tt(d); y = np.zeros(len(t))
    for k, a in zip(parts, amps):
        bloom = np.clip(t / (0.15 + 0.04 * k), 0, 1) ** 1.5  # jawari: upper partials bloom late
        y += a * bloom * np.sin(2 * np.pi * freq * k * (1 + 0.0007 * rng.uniform(-1, 1)) * t + rng.uniform(0, 6)) * np.exp(-t / (2.4 - 0.05 * k))
    return y * np.clip(t / 0.01, 0, 1)
def tabla_na(f=420, d=0.5):
    t = tt(d); fr = f * (1 + 0.04 * np.exp(-t / 0.02))
    y = sum(a * np.sin(2 * np.pi * fr * k * t) * np.exp(-t / dc) for k, a, dc in [(1, 1, .25), (2, .5, .18), (3, .35, .12), (4, .2, .08)])
    return y + bp(noise(d), 1500, 6000) * np.exp(-t / 0.006) * 0.6
def tabla_ge(d=0.7):
    t = tt(d); f = 85 + 40 * np.clip(t / 0.25, 0, 1) - 10 * np.exp(-t / 0.02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3) + lp(noise(d), 600) * np.exp(-t / 0.01) * 0.4
def sitar(freq, d=1.6, bend=0.0):
    y = ks(freq, d, 0.9975, 0.85)
    # buzz / jawari: waveshape + bright resonance
    y = np.tanh(y * 2.2) + 0.25 * bp(y, 2500, 5000)
    if bend:
        t = tt(d); warp = np.cumsum(1 + bend * np.clip((t - 0.15) / 0.25, 0, 1)) / SR * SR
        y = np.interp(np.clip(warp, 0, len(y) - 1), np.arange(len(y)), y)
    return y
def elephant_call(d=1.1):
    t = tt(d); u = t / d
    f = 420 + 380 * np.sin(np.pi * np.clip(u * 1.2, 0, 1)) + 25 * np.sin(2 * np.pi * 17 * t) + 40 * rng.standard_normal(len(t)).cumsum() / SR * 30
    y = saw(f, t) + 0.6 * saw(f * 1.01, t)
    y = bp(y, 500, 2600) + 0.4 * bp(noise(d), 1200, 3500) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * t))
    e = np.clip(t / 0.08, 0, 1) * np.clip((d - t) / 0.35, 0, 1)
    return norm(np.tanh(y * 2) * e)

# ---- Persia
def santur(freq, d=1.8):
    a = ks(freq, d, 0.9985, 1.0); b = ks(freq * 1.0025, d, 0.9985, 1.0)
    t = tt(d); strike = bp(noise(d), 2000, 8000) * np.exp(-t / 0.004) * 0.4
    return (a + b) * 0.5 + strike
def daf(low=True, d=0.6):
    t = tt(d)
    if low: y = np.sin(2 * np.pi * np.cumsum(70 + 30 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.25) + lp(noise(d), 900) * np.exp(-t / 0.02) * 0.5
    else: y = bp(noise(d), 600, 3000) * np.exp(-t / 0.03) * 0.8
    jing = bp(noise(d), 6000, 12000) * np.exp(-t / 0.12) * 0.35 * (1 + 0.5 * np.sin(2 * np.pi * 42 * t))
    return y + jing
def camel_bell(f=1450, d=1.0):
    return additive(f, d, [1, 2.4, 3.9, 5.6], [0.35, 0.2, 0.12, 0.08], [1, .5, .3, .2])

# ---- Europe
def church_bell(f=196, d=6.0):
    parts = [0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011, 4.166]
    dec = [4, 3, 2.2, 1.8, 1.6, 1.0, .9, .7, .5]; am = [.6, 1, .8, .5, .6, .3, .25, .2, .15]
    y = additive(f, d, parts, dec, am)
    t = tt(d); y += bp(noise(d), 1500, 7000) * np.exp(-t / 0.01) * 0.4
    return y
def thunder(d=4.0):
    t = tt(d); r = np.random.default_rng(42)
    rum = lp(np.cumsum(r.standard_normal(len(t))) * 0.02, 180, 2)
    bursts = np.zeros(len(t))
    for st, a, dc in [(0.0, 1, .25), (0.15, .7, .4), (0.5, .8, .6), (1.1, .5, .8), (1.8, .35, 1.0)]:
        i = int(st * SR); bursts[i:] += a * np.exp(-(t[i:] - st) / dc)
    crack = hp(noise(d), 2000) * np.exp(-t / 0.08) * 0.7
    return norm(rum * bursts * 3 + lp(noise(d), 600) * bursts * 0.4 + crack)
def choir(freqs, d, attack=0.6, release=1.0, vowel=(700, 1150, 2600)):
    t = tt(d); y = np.zeros(len(t))
    for f in freqs:
        for v in range(3):
            det = 1 + 0.004 * (v - 1)
            vib = 1 + 0.006 * np.sin(2 * np.pi * (5 + 0.3 * v) * t + v)
            y += saw(f * det * vib, t)
    out = sum(bp(y, F * 0.85, F * 1.15) * g for F, g in zip(vowel, [1, 0.6, 0.25]))
    e = np.clip(t / attack, 0, 1) * np.clip((d - t) / release, 0, 1)
    return out * e
def timpani(f=82, d=1.6):
    t = tt(d); fr = f * (1 + 0.06 * np.exp(-t / 0.05))
    y = sum(a * np.sin(2 * np.pi * fr * k * t) * np.exp(-t / dc) for k, a, dc in [(1, 1, .7), (1.5, .5, .4), (1.99, .35, .3), (2.44, .2, .2)])
    return y + lp(noise(d), 400) * np.exp(-t / 0.03) * 0.5
def brass(freqs, d, attack=0.05):
    t = tt(d); y = sum(saw(f * 0.999, t) + saw(f * 1.002, t) for f in freqs)
    cut = 400 + 3500 * np.clip(t / 0.15, 0, 1) * np.exp(-t / 1.4)
    out = np.zeros(len(t)); blk = 512
    for i in range(0, len(t), blk): out[i:i + blk] = lp(y[max(0, i - 2048):i + blk], cut[i])[-len(y[i:i + blk]):]
    return np.tanh(out * 0.6) * np.clip(t / attack, 0, 1) * np.exp(-t / 1.6)
def sword_ring(d=1.6):
    t = tt(d); scrape = sweep_filter(noise(0.35), 2500, 9000, 0.3) * np.hanning(int(0.35 * SR))
    ring = additive(1, d, [2840, 4120, 5480, 7210], [.6, .45, .35, .25], [1, .7, .5, .3], vib=0.002, vibf=6)
    y = ring * 0.25; y[:len(scrape)] += scrape * 0.8
    return y

# ---- CTA
def pad(freqs, d, attack=0.8, release=1.5, cutoff=1800):
    t = tt(d); y = sum(saw(f * (1 + 0.003 * k), t) for f in freqs for k in (-1, 0, 1))
    return lp(y, cutoff, 2) * np.clip(t / attack, 0, 1) * np.clip((d - t) / release, 0, 1)
def kick(d=0.5):
    t = tt(d); f = 50 + 120 * np.exp(-t / 0.03); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) + hp(noise(d), 3000) * np.exp(-t / 0.003) * 0.3
def fire_crackle(d, density=14, seed=8):
    r = np.random.default_rng(seed); y = np.zeros(int(d * SR))
    for _ in range(int(density * d)):
        i = int(r.uniform(0, d - 0.05) * SR); L = int(r.uniform(0.002, 0.012) * SR)
        y[i:i + L] += r.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * r.uniform(0.2, 1)
    return hp(y, 1500) + 0.25 * lp(noise(d), 300)
def wind(d, seed=2, lo=200, hi=900):
    r = np.random.default_rng(seed); n = r.standard_normal(int(d * SR))
    mod = lp(r.standard_normal(int(d * SR)), 0.7, 1); mod = 0.5 + 0.5 * mod / (np.max(np.abs(mod)) + 1e-9)
    return bp(n, lo, hi) * mod


# ------------------------------------------------------------------ mastering
import pyloudnorm as pyln
METER = pyln.Meter(SR)
def limiter(x, ceil_db=-1.2, look=0.005, rel=0.08):
    c = db(ceil_db); a = np.max(np.abs(x), 1)
    need = np.minimum(1, c / np.maximum(a, 1e-9))
    L = int(look * SR)
    # lookahead: min over the next L samples
    pad_ = np.concatenate([need, np.ones(L)])
    from numpy.lib.stride_tricks import sliding_window_view
    g = sliding_window_view(pad_, L + 1).min(1)[:len(need)]
    # smooth: instant attack, exponential release
    ar = np.exp(-1 / (rel * SR)); g2 = signal.lfilter([1 - ar], [1, -ar], g - 1) + 1
    g = np.minimum(g, g2)
    g = signal.lfilter([1 - np.exp(-1 / (0.0015 * SR))], [1, -np.exp(-1 / (0.0015 * SR))], np.concatenate([np.ones(L), g]))[L:]
    y = np.zeros_like(x); y[:len(x) - L] = x[L:] * 0 + x[:len(x) - L] * g[:len(x) - L, None] if False else 0
    y = x * g[:, None]
    return np.clip(y, -c, c)
def master(x, target=-14.0):
    x = hp(x.T, 25, 2).T[:int(DUR * SR)]
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.5
    for _ in range(3):
        l = METER.integrated_loudness(x); x = x * db(target - l); x = limiter(x)
    print('LUFS', round(METER.integrated_loudness(x), 2), 'peak dB', round(20 * np.log10(np.max(np.abs(x))), 2))
    return x
def fade_out(x, d=0.08):
    n = int(d * SR); x[-n:] *= np.linspace(1, 0, n)[:, None]; return x
def write(p, x):
    y = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    w = wave.open(p, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes()); w.close()
