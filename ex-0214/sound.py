# Процедурний sound design → audio.wav (48 kHz stereo). Без голосів.
import numpy as np, wave
SR=48000; DUR=20.0; N=int(SR*DUR)
L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(7)
def add(sig,t,g=1.0,pan=0.0):
    i=int(t*SR); n=min(len(sig),N-i)
    if n<=0: return
    L[i:i+n]+=sig[:n]*g*np.sqrt(.5*(1-pan)); R[i:i+n]+=sig[:n]*g*np.sqrt(.5*(1+pan))
def tt(d): return np.arange(int(d*SR))/SR
def lp(x,a):  # one-pole lowpass, a in (0,1)
    y=np.empty_like(x); s=0.0
    for i in range(len(x)): s+=a*(x[i]-s); y[i]=s
    return y
def lpf(x,fc): return lp(x,1-np.exp(-2*np.pi*fc/SR))
def env(d,a=.005,r=None):
    t=tt(d); e=np.minimum(1,t/a) if a>0 else np.ones_like(t)
    return e*np.exp(-t/(r if r else d/4))
def bell(f,d=1.2):
    t=tt(d); return (np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*f*2.01*t)+.15*np.sin(2*np.pi*f*3.02*t))*env(d,.002,.28)
def whoosh(d=.6,up=True,bright=2500):
    n=rng.standard_normal(int(d*SR)); t=tt(d)
    shape=np.sin(np.pi*np.clip(t/d,0,1))**2 if up else np.exp(-t/(d/3))
    return lpf(n,bright)*shape*.8
def riser(d=1.0):
    n=rng.standard_normal(int(d*SR)); t=tt(d); out=np.zeros_like(n)
    seg=int(SR*.05)
    for k in range(0,len(n),seg):
        fc=300+ (k/len(n))**2*6000; out[k:k+seg]=lpf(n[k:k+seg],fc)
    return out*(t/d)**2
def boom(f0=55,d=1.6):
    t=tt(d); f=f0*(1+2.5*np.exp(-t*18)); ph=2*np.pi*np.cumsum(f)/SR
    return np.tanh(1.8*np.sin(ph))*env(d,.003,.45)
def click(d=.03,fc=4000):
    return lpf(rng.standard_normal(int(d*SR)),fc)*env(d,.0005,.006)
def clack():  # wooden piece on board
    t=tt(.18); s=(np.sin(2*np.pi*1150*t)*.6+np.sin(2*np.pi*780*t)*.5+np.sin(2*np.pi*2300*t)*.25)*env(.18,.0005,.022)
    return s+lpf(rng.standard_normal(len(t)),3000)*env(.18,.0005,.006)*.8
def pop(f=600):
    t=tt(.12); fr=f*(1+1.5*np.exp(-t*40)); return np.sin(2*np.pi*np.cumsum(fr)/SR)*env(.12,.001,.03)
def kick(d=.35):
    t=tt(d); fr=48*(1+3*np.exp(-t*30)); return np.sin(2*np.pi*np.cumsum(fr)/SR)*env(d,.001,.12)
def hat(): return (lpf(rng.standard_normal(int(.06*SR)),12000)-lpf(rng.standard_normal(int(.06*SR)),5000))*env(.06,.0005,.012)
def pad(freqs,d,cut=900):
    t=tt(d); s=sum(np.sin(2*np.pi*f*t+0.3*np.sin(2*np.pi*.2*t))+0.5*np.sin(2*np.pi*f*1.003*t) for f in freqs)
    a=np.minimum(1,t/1.2)*np.minimum(1,(d-t)/0.8)
    return lpf(s/len(freqs),cut)*a

# --- атмосфера кімнати: низький гул + шум ---
amb=lpf(rng.standard_normal(N),220)*0.18+np.sin(2*np.pi*50*tt(DUR))*0.01
add(amb,0,1.0)
# --- музика: темний пед (Am-F-C-E) + біт з 8.4 до 15, ехо-хвіст після ---
chords=[[110,130.8,164.8],[87.3,130.8,174.6],[98,130.8,164.8],[82.4,123.5,164.8]]
bar=60/100*4  # 100 bpm
tcur=0.0; ci=0
while tcur<20:
    d=bar+.6; g=0.22 if tcur<8.4 else (0.3 if tcur<15 else 0.2)
    cut=500 if tcur<8 else (1100 if tcur<15 else 700)
    add(pad(chords[ci%4],d,cut),tcur,g,pan=(-.2 if ci%2 else .2)); tcur+=bar; ci+=1
beat=60/100
t0=8.4
k=0
while t0+k*beat/2<15.0:
    tb=t0+k*beat/2
    if k%2==0: add(kick(),tb,.55)
    add(hat(),tb+beat/4,.12,pan=.3)
    if k%4==2: add(lpf(rng.standard_normal(int(.18*SR)),3500)*env(.18,.001,.05),tb,.22)  # snare
    k+=1
# --- SFX по подіях ---
add(bell(1318.5,1.0),0.42,.35,.1); add(bell(1760,1.0),0.56,.30,.1)          # сповіщення
add(boom(50,1.8),0.62,.55); add(whoosh(.5),0.38,.25)                         # хук-удар під напис
add(whoosh(.8),3.85,.5,-.2); add(lpf(rng.standard_normal(int(.5*SR)),1500)*env(.5,.05,.15),4.0,.2)  # підняв телефон
add(whoosh(.45,bright=5000),4.95,.35,.2); add(click(.02,6000),5.38,.4)       # свайп-розблокування
add(click(.03,3500),5.8,.6); add(pop(900),5.82,.25)                          # тап по іконці
add(whoosh(.45,bright=4000),5.95,.45); add(pop(500),6.3,.3)                  # відкриття застосунку
for i,tw in enumerate([6.35,6.45,6.55,6.75,6.85]): add(click(.02,7000),tw,.12)
add(riser(.6),7.85,.35); add(boom(60,1.0),8.4,.4); add(whoosh(.6),8.0,.4)  # наїзд камери
MOVES=[(8.55,'w'),(10.15,'b'),(11.75,'w'),(13.25,'b')]; MD=.38
for tm,c in MOVES:
    if c=='w': add(click(.025,5000),tm-.35,.35); add(click(.025,5000),tm,.35)
    add(clack(),tm+MD,.7,pan=.1)
add(pop(1200),8.55+MD+.05,.2)                                                # бейдж ?!
# зівок ?? — сумний спадний синт
t=tt(.9); fr=330*np.exp(-t*0.9); s=np.sign(np.sin(2*np.pi*np.cumsum(fr)/SR))*env(.9,.01,.35)
add(lpf(s,1400),11.75+MD+.05,.12)
# мат
add(riser(1.2),12.4,.3); add(boom(42,2.4),13.63,.9); add(whoosh(.3,False,6000),13.63,.4)
add(bell(220,2.0),13.63,.25); add(bell(233,2.0),13.63,.2)
add(pop(400),13.85,.3)
for tw in [13.7,14.0,14.3]: add(click(.03,4000),tw,.2)
# CTA
add(whoosh(.7),14.85,.55); add(boom(70,.8),15.25,.3)
add(pop(700),15.3,.25); add(pop(850),15.45,.2)
add(whoosh(.35,bright=6000),16.15,.35,-.4); add(pop(900),16.45,.3)
add(whoosh(.35,bright=6000),16.6,.35,.4);  add(pop(1000),16.9,.3)
add(pop(800),17.55,.25); add(bell(1318.5,1.0),17.9,.15)
# мастер: фейд, нормалізація, м'який ліміт
fade=np.ones(N); fi=int(19.0*SR); fade[fi:]=np.linspace(1,0,N-fi)
L*=fade; R*=fade
m=max(np.abs(L).max(),np.abs(R).max()); L=np.tanh(L/m*1.3)*.8; R=np.tanh(R/m*1.3)*.8
st=(np.stack([L,R],1)*32767).astype(np.int16)
w=wave.open('audio.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
print('ok')
