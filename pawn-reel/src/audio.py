"""Звук «Пішака»: lo-fi, SFX і голос з одного timeline.json. Усе синтезовано numpy/scipy, без семплів.
python3 audio.py ../output          -> ../output/mix.wav (−14 LUFS, true peak ≤ −1.5 dBTP)
Свій голос: покладіть ../public/voice.mp3 (той самий текст і паузи) — він замінить TTS."""
import json, os, subprocess, sys
import numpy as np
from scipy import signal
import pyloudnorm as pyln

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, 'timeline.json')))
EV = TL['events']
DUR = TL['duration']
N = int((DUR + 0.5) * SR)
rng = np.random.default_rng(7)

def tt(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def sos(kind, f, o=2):
    if kind == 'bp': return signal.butter(o, [max(f[0], 20), min(f[1], SR / 2 - 200)], 'bandpass', fs=SR, output='sos')
    return signal.butter(o, min(f, SR / 2 - 200), kind, fs=SR, output='sos')
def lp(x, f, o=2): return signal.sosfilt(sos('low', f, o), x, axis=0)
def hp(x, f, o=2): return signal.sosfilt(sos('high', f, o), x, axis=0)
def bp(x, lo, hi, o=2): return signal.sosfilt(sos('bp', (lo, hi), o), x, axis=0)
def peq(x, f0, g, q=1.0):
    A = 10 ** (g / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    return signal.lfilter([1 + al * A, -2 * np.cos(w), 1 - al * A], [1 + al / A, -2 * np.cos(w), 1 - al / A], x, axis=0)
def env(d, dec, att=0.002):
    t = tt(d); return np.exp(-t / dec) * np.clip(t / max(att, 1e-4), 0, 1)
def db(g): return 10 ** (g / 20)
def pan(x, p):
    a = (np.clip(p, -1, 1) + 1) * np.pi / 4; return np.stack([x * np.cos(a), x * np.sin(a)], 1)

class Bus:
    def __init__(s): s.b = np.zeros((N, 2))
    def add(s, x, t, g=0.0, p=0.0):
        if x.ndim == 1: x = pan(x, p)
        i = int(round(t * SR))
        if i < 0: x = x[-i:]; i = 0
        if i >= N: return
        j = min(N, i + len(x)); s.b[i:j] += x[:j - i] * db(g)

def curve(points):
    """гучність у dB по точках [(t, dB)], лінійно між ними"""
    ts = np.arange(N) / SR; xs, ys = zip(*points)
    return db(np.interp(ts, xs, ys))[:, None]

def reverb(x, t60=1.1, mix=0.18, bright=5000, seed=3):
    r = np.random.default_rng(seed); n = int(t60 * SR)
    ir = r.standard_normal((n, 2)) * np.exp(-6.9 * np.arange(n) / n)[:, None]
    ir = lp(ir, bright); ir[:int(0.012 * SR)] = 0
    wet = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    wet *= np.sqrt(np.mean(x ** 2) + 1e-12) / (np.sqrt(np.mean(wet ** 2)) + 1e-12)
    return x * (1 - mix) + wet * mix

# ------------------------------------------------------------ голоси звуків
def knock(f=900, dec=0.06, gain=1.0, body=1.0, d=0.5):
    """дерев'яний стук: моди корпусу + клац"""
    t = tt(d); x = np.zeros_like(t)
    for k, (m, a, dd) in enumerate([(1, 1, 1), (1.58, 0.6, 0.7), (2.37, 0.4, 0.5), (3.6, 0.25, 0.35)]):
        x += a * np.sin(2 * np.pi * f * m * t + k) * np.exp(-t / (dec * dd))
    x += body * 0.6 * np.sin(2 * np.pi * f * 0.25 * t) * np.exp(-t / (dec * 1.6))
    cl = bp(noise(d), f * 1.5, min(f * 8, 16000)) * np.exp(-t / 0.004)
    return (x * 0.5 + cl * 0.8) * gain

def thud(f=70, dec=0.25, d=0.9):
    t = tt(d); ph = 2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-t / 0.03))) / SR
    return np.sin(ph) * np.exp(-t / dec) + 0.3 * lp(noise(d), 400) * np.exp(-t / 0.05)

def whoosh(d=0.4, lo=300, hi=3000, peak=0.6):
    t = tt(d); u = t / d
    e = np.where(u < peak, (u / peak) ** 2, ((1 - u) / (1 - peak)) ** 1.5)
    x = noise(d); out = np.zeros_like(x); B = 512
    for i in range(0, len(x), B):
        fc = lo * (hi / lo) ** np.sin(np.pi * min(1, i / len(x))); s = sos('bp', (fc * 0.6, fc * 1.6))
        out[i:i + B] = signal.sosfilt(s, x[i:i + B])
    return out * e

def cloth(d=0.25):
    return bp(noise(d), 1500, 7000) * np.sin(np.pi * tt(d) / d) ** 2 * 0.5

def chime(f, d=1.2, dec=0.5):
    t = tt(d); return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (dec / m ** 0.5)) for m, a in [(1, 1), (2.76, 0.35), (5.4, 0.12)]) * np.clip(t / 0.003, 0, 1)

def buzz(d=0.12):
    t = tt(d); x = np.sign(np.sin(2 * np.pi * 100 * t)) * 0.3 + bp(noise(d), 2000, 9000) * 0.6
    return hp(x, 150) * np.sin(np.pi * t / d)

def click(d=0.08):
    t = tt(d); return bp(noise(d), 1500, 9000) * np.exp(-t / 0.003) * 1.5 + np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.006) * 0.4

# ------------------------------------------------------------ музика: lo-fi 80 BPM
BPM = 80; BEAT = 60 / BPM; BAR = 4 * BEAT
CH = [[53, 57, 60, 64, 67], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]]  # Fmaj9 Em7 Dm9 Cmaj9
ROOT = [41, 40, 38, 36]
mid = lambda n: 440 * 2 ** ((n - 69) / 12)

def ep(f, d=2.6):
    """електропіано: тепло, легкий дзвін на атаці, тремоло"""
    t = tt(d); x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t + 0.3) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
    x += 0.25 * np.sin(2 * np.pi * 7.1 * f * t) * np.exp(-t / 0.03)
    return x * env(d, 1.3, 0.006) * (1 + 0.12 * np.sin(2 * np.pi * 4.3 * t))

def build_music():
    keys, drums, bass, crackle = Bus(), Bus(), Bus(), Bus()
    nb = int(DUR / BAR) + 2
    for b in range(nb):
        t0 = b * BAR; ch = CH[b % 4]
        for k, n in enumerate(ch):
            for hit in (0, 2.5):  # акорд + синкопа
                keys.add(lp(ep(mid(n) * (1 + 0.002 * (k - 2))), 3200), t0 + hit * BEAT + 0.012 * k, -8 - 2 * k - (4 if hit else 0), (k - 2) * 0.25)
        bass.add(np.sin(2 * np.pi * mid(ROOT[b % 4]) * tt(1.6)) * env(1.6, 0.6, 0.01), t0, -6)
        bass.add(np.sin(2 * np.pi * mid(ROOT[b % 4]) * tt(1.0)) * env(1.0, 0.4, 0.01), t0 + 2.5 * BEAT, -10)
        for beat in range(4):
            tb = t0 + beat * BEAT
            if beat in (0, 2): drums.add(thud(52, 0.18, 0.5), tb, -4)
            if beat == 2: drums.add(thud(52, 0.15, 0.4), tb + 0.75 * BEAT, -10)
            if beat in (1, 3): drums.add(knock(620, 0.05, body=0.6), tb + 0.02, -6, 0.1)  # стук фігури замість снейра
            for e8 in (0, 0.58):  # свінг
                drums.add(hp(noise(0.05), 7000) * env(0.05, 0.012), tb + e8 * BEAT, -24 - (4 if e8 else 0), 0.3)
    # вініл
    hiss = lp(hp(rng.standard_normal(N), 1500), 6000) * 0.006
    crackle.b += np.stack([hiss, hiss], 1)
    pops = rng.random(N) < 6 / SR
    cr = np.where(pops, rng.standard_normal(N) * 0.25, 0.0); cr = hp(cr, 1200)
    crackle.b += np.stack([cr, cr], 1)
    return keys.b, drums.b, bass.b, crackle.b

def tension_drone():
    b = Bus(); d = 6.2; t = tt(d)
    x = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate([55, 55.4, 82.4, 110.3])) * 0.25
    x *= np.clip(t / 1.2, 0, 1) * np.clip((d - t) / 1.0, 0, 1) * (1 + 0.3 * np.sin(2 * np.pi * 0.7 * t))
    b.add(lp(x, 500), 12.6, -8)
    return b.b

# ------------------------------------------------------------ голос
def load_voice():
    src = os.path.join(HERE, '../public/voice.mp3')
    if not os.path.exists(src): src = os.path.join(HERE, '../public/voice_tts_raw.mp3')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.float32).astype(np.float64)
    v = hp(v, 85, 2); v = peq(v, 200, -1.5, 0.8); v = peq(v, 3200, 2.0, 0.9); v = peq(v, 9000, 1.0, 0.7)
    # м'який компресор по RMS
    e = np.sqrt(signal.lfilter([0.002], [1, -0.998], v ** 2) + 1e-9); th = 0.08
    g = np.where(e > th, (th / e) ** 0.45, 1.0); v = v * signal.lfilter([0.01], [1, -0.99], g)
    bus = Bus()
    for seg in TL['voice']:
        a, b = int(seg['src'][0] * SR) - int(0.04 * SR), int(seg['src'][1] * SR) + int(0.12 * SR)
        x = v[max(0, a):b].copy(); f = int(0.015 * SR)
        x[:f] *= np.linspace(0, 1, f); x[-f * 3:] *= np.linspace(1, 0, f * 3)
        bus.add(x, seg['at'] - 0.04, 0)
    return reverb(bus.b, 0.6, 0.07, 6000)

def voice_env(vb):
    e = np.abs(vb).max(1); e = signal.lfilter([0.0015], [1, -0.9985], e)
    return np.clip(e / (e.max() * 0.25), 0, 1)

# ------------------------------------------------------------ SFX за подіями
def build_sfx():
    s = Bus(); E = EV
    sq = lambda n: (ord(n[0]) - 97 - 3.5) / 4
    for i, t in enumerate(E['drops']):
        s.add(knock(420 + 60 * i, 0.07, body=1.2), t, -6, [0.1, -0.1, -0.3, 0.4][i]); s.add(thud(80, 0.12, 0.4), t, -12)
    t = E['knightJump']; s.add(whoosh(0.5, 400, 2500), t, -16, 0.4); s.add(knock(520, 0.06, body=1), t + 0.55, -7, 0.3); s.add(knock(560, 0.05), t + 0.62, -16, 0.3)
    t = E['bishopFly']; s.add(whoosh(0.65, 300, 4000, 0.5), t, -12, 0.2); s.add(knock(600, 0.06), t + 0.62, -8, 0.5)
    t = E['queenSlide']; sl = bp(noise(0.55), 600, 3000) * np.sin(np.pi * tt(0.55) / 0.55) * 0.5
    s.add(sl, t, -10, -0.4); s.add(knock(470, 0.05), t + 0.55, -12, -0.5)
    for h in E['pawnHops']:
        heavy = h['to'] in ('d7', 'd8'); land = h['t'] + h['dur']
        s.add(whoosh(h['dur'] * 0.9, 500, 2000), h['t'], -26)
        s.add(knock(760 if not heavy else 640, 0.06 if not heavy else 0.09, body=1.4 if heavy else 0.8), land, -5 if heavy else -8, sq(h['to']) * 0.5)
        if heavy: s.add(thud(65, 0.2, 0.6), land, -8)
        s.add(bp(noise(0.08), 300, 1200) * env(0.08, 0.02), h['t'] - 0.15, -28)  # скрип підготовки
    s.add(cloth(0.3), E['hankyOut'], -12, -0.2)
    for k in range(4): s.add(cloth(0.18), E['wipe'][0] + k * 0.22, -16, -0.2)
    # слон
    t = E['bishopShadow']; d = E['bishopDrop'] - t
    rum = lp(noise(d + 0.2), 180) * np.linspace(0, 1, int((d + 0.2) * SR)) ** 2
    s.add(rum, t, -6)
    s.add(thud(48, 0.4, 1.4), E['bishopDrop'], 0); s.add(knock(300, 0.1, body=2), E['bishopDrop'], -4)
    for k in range(5): s.add(knock(900 + 140 * k, 0.03), E['bishopDrop'] + 0.06 + k * 0.035, -22, (k - 2) * 0.3)  # дзеленчання дошки
    s.add(chime(1320, 0.3, 0.06) * 0.5, E['bishopDrop'] + 0.05, -20)  # «бойнг» переляку
    for c in [13.86, 14.05, 14.62, 15.48, 15.6, 16.35, 17.08]: s.add(buzz(0.12), c - 0.04, -20, -0.5)
    # секрет і удар
    s.add(whoosh(0.35, 800, 2500), 19.1, -22)
    s.add(chime(1046, 1.0, 0.4), E['arrowStraight'], -24); s.add(chime(1568, 1.2, 0.5), E['arrowDiag'], -20); s.add(chime(2093, 1.0, 0.4), E['arrowDiag'] + 0.08, -26)
    s.add(whoosh(0.45, 600, 3500), 21.25, -16)
    s.add(bp(noise(0.25), 200, 900) * env(0.25, 0.08), E['strikeCrouch'], -18)
    s.add(whoosh(0.3, 900, 6000, 0.8), E['strike'], -9)
    t = E['impact']
    s.add(knock(380, 0.12, gain=1.4, body=2.2, d=0.8), t, 0); s.add(thud(45, 0.35, 1.2), t, -1); s.add(hp(noise(0.06), 3000) * env(0.06, 0.01), t, -8)
    for k, (dt, f, g) in enumerate([(0.38, 330, -4), (0.5, 360, -10), (0.58, 400, -14), (0.64, 420, -18)]): s.add(knock(f, 0.07, body=1.6), t + dt, g, -0.3)
    for k in range(7): s.add(chime([2637, 3136, 3520][k % 3], 0.5, 0.15), t + 0.45 + k * 0.28, -26 - k, np.sin(k * 2.1) * 0.6)
    s.add(cloth(0.35), t + 0.7, -18, 0.2)
    rb = E['bishopRollOff']; rl = lp(noise(1.3), 300) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tt(1.3))) * np.linspace(0.3, 1, int(1.3 * SR))
    s.add(rl, rb, -10, -0.6)
    # золото, фінал
    pad_t = tt(4.0); pad = sum(np.sin(2 * np.pi * mid(n) * pad_t + i) for i, n in enumerate([77, 81, 84, 88])) * 0.15 * np.clip(pad_t / 1.5, 0, 1) * np.clip((4 - pad_t) / 2, 0, 1)
    s.add(lp(pad, 5000), E['goldGlow'], -18)
    rd = E['flash'] - 33.6; ri = whoosh(rd, 400, 9000, 0.97) + sum(np.sin(2 * np.pi * f * np.cumsum(1 + 1.5 * tt(rd) / rd) / SR) for f in [880, 1320]) * 0.08 * (tt(rd) / rd) ** 2
    s.add(ri, 33.6, -12)
    # тиша перед останнім кроком: серцебиття з дерева і вдих
    for k, tb in enumerate([31.5, 32.25, 32.9, 33.4]): s.add(thud(58, 0.14, 0.5), tb, -14 + k * 1.5); s.add(thud(58, 0.1, 0.4), tb + 0.2, -20 + k * 1.5)
    br0, br1 = E['breath']; bd = br1 - br0; s.add(bp(noise(bd), 400, 2500) * np.sin(np.pi * tt(bd) / bd) ** 2 * 0.4, br0, -20)
    s.add(lp(noise(14.0), 250) * 0.15, 25.5, -26)  # кімнатний тон
    t = E['flash']
    for k, n in enumerate([65, 72, 77, 81, 84, 89]): s.add(chime(mid(n), 3.5, 1.6), t + k * 0.012, -13 - k, (k - 2.5) * 0.3)
    s.add(thud(40, 0.7, 2.0), t, -6)
    for k in range(8): s.add(chime(mid(84 + [0, 4, 7, 12, 16, 12, 7, 19][k]), 0.8, 0.3), E['morph'][0] + 0.45 + k * 0.07, -18, np.sin(k) * 0.7)
    s.add(bp(noise(0.25), 300, 1500) * env(0.25, 0.08), E['lookBack'], -22)
    s.add(chime(mid(88), 1.0, 0.4), 41.75, -24)
    s.add(click(), E['lampClick'], -4, -0.3); s.add(buzz(0.05), E['lampClick'] + 0.01, -22)
    return s.b

def main(out):
    keys, drums, bass, crk = build_music()
    v = load_voice(); ve = voice_env(v)
    E = EV; fl = E['flash']
    kg = curve([(0, -4), (3, -4), (12.4, -4), (13.2, -11), (18.6, -11), (19.4, -6), (24.8, -6), (26.4, -24), (27.5, -40), (fl - 0.1, -60), (fl, -2), (36.5, -6), (42.4, -6), (44.0, -40), (DUR + 0.5, -60)])
    dg = curve([(0, -60), (2.9, -60), (3.0, -6), (12.4, -6), (12.9, -60), (19.2, -60), (20.4, -12), (22.4, -9), (22.5, -60), (22.9, -60), (23.4, -9), (24.8, -9), (25.6, -60), (fl + 0.6, -60), (fl + 1.0, -12), (42.4, -12), (43.6, -60)])
    bg = curve([(0, -60), (2.9, -60), (3.0, -6), (12.4, -6), (13.0, -14), (18.6, -14), (19.4, -8), (24.8, -8), (26.0, -60), (fl, -60), (fl + 0.05, -5), (42.4, -8), (43.8, -60)])
    cg = curve([(0, -6), (25, -6), (26, -12), (fl, -12), (fl + 0.3, -6), (43.9, -6), (44.0, -14), (DUR + 0.5, -14)])
    music = hp(keys * kg + bass * bg + tension_drone(), 35) + drums * dg + crk * cg
    music = lp(music, 9000)
    duck = db(-9 * ve)[:, None]  # музика ховається під голос
    mix = music * duck * db(-10) + build_sfx() * db(-3) + v * db(0)
    mix = hp(mix, 25)
    meter = pyln.Meter(SR); L = meter.integrated_loudness(mix)
    mix *= db(-14 - L)
    # ліміт з lookahead до −2 dBTP (гучність після нього трохи падає — підтягуємо ітераціями)
    from scipy.ndimage import minimum_filter1d
    for _ in range(4):
        up = signal.resample_poly(mix, 4, 1, axis=0)
        pk = np.abs(up).reshape(-1, 4, 2).max(axis=(1, 2))[:len(mix)]
        g = np.minimum(1, db(-2.2) / (pk + 1e-9))
        g = minimum_filter1d(g, int(0.003 * SR))
        g = np.minimum(g, signal.lfilter([0.004], [1, -0.996], g - 1) + 1)
        g = minimum_filter1d(g, int(0.003 * SR))
        mix = mix * g[:, None]
        L = meter.integrated_loudness(mix)
        if abs(L + 14) < 0.15: break
        mix *= db(-14 - L)
    mix = mix[:int(DUR * SR)]
    os.makedirs(out, exist_ok=True); path = os.path.join(out, 'mix.wav')
    import wave
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
    up = signal.resample_poly(mix, 4, 1, axis=0)
    print(f'{path}: {meter.integrated_loudness(mix):.2f} LUFS, true peak {20 * np.log10(np.abs(up).max()):.2f} dBTP')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../output'))
