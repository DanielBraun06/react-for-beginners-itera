# Процедурний sound design → audio.wav (48 kHz stereo). Без голосів.
import numpy as np, wave
SR=48000; DUR=45.0; N=int(SR*DUR)
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

# --- атмосфера кімнати ---
amb=lpf(rng.standard_normal(N),220)*0.18+np.sin(2*np.pi*50*tt(DUR))*0.01
add(amb,0,1.0)
# --- музика: темний пед Am-F-C-E весь ролик; біт під партію 10.0–32.0, розгін ближче до мату ---
chords=[[110,130.8,164.8],[87.3,130.8,174.6],[98,130.8,164.8],[82.4,123.5,164.8]]
bar=60/100*4
tcur=0.0; ci=0
while tcur<45:
    d=bar+.6
    g=0.22 if tcur<9.6 else (0.3 if tcur<32 else (0.16 if tcur<38.5 else 0.24))
    cut=500 if tcur<9.6 else (1100 if tcur<32 else (500 if tcur<38.5 else 900))
    add(pad(chords[ci%4],d,cut),tcur,g,pan=(-.2 if ci%2 else .2)); tcur+=bar; ci+=1
beat=60/100
def beat_section(t0,t1,dense=False,g=1.0):
    k=0
    while t0+k*beat/2<t1:
        tb=t0+k*beat/2
        if k%2==0: add(kick(),tb,.55*g)
        add(hat(),tb+beat/4,.12*g,pan=.3)
        if dense: add(hat(),tb,.07*g,pan=-.3)
        if k%4==2: add(lpf(rng.standard_normal(int(.18*SR)),3500)*env(.18,.001,.05),tb,.22*g)
        k+=1
beat_section(10.0,23.4)
beat_section(23.4,31.6,dense=True)
beat_section(38.8,44.0,g=.8)
# --- SFX ---
add(bell(1318.5,1.0),0.52,.35,.1); add(bell(1760,1.0),0.66,.30,.1)          # сповіщення
add(boom(50,1.8),0.72,.5); add(whoosh(.5),0.5,.25)                           # хук під напис
add(riser(.5),4.1,.3); add(whoosh(.7),4.2,.6,-.2)                            # підняв телефон
add(lpf(rng.standard_normal(int(.5*SR)),1500)*env(.5,.05,.15),4.55,.25)      # шурхіт
add(whoosh(.45,bright=5000),5.5,.35,.2); add(click(.02,6000),5.95,.4)        # свайп-розблокування
add(click(.03,3500),6.42,.6); add(pop(900),6.45,.25)                         # тап по іконці
add(whoosh(.45,bright=4000),6.6,.45); add(pop(500),6.95,.3)                  # відкрився застосунок
add(whoosh(.4),7.1,.3)
add(riser(.6),9.4,.3); add(boom(60,1.0),10.0,.35); add(whoosh(.6),9.5,.35)  # наїзд на дошку
M0,STEP,MD=10.2,1.65,.36
CAPS={6,8,9,11}
for i in range(14):
    tm=M0+i*STEP
    if i%2==0: add(click(.025,5000),tm-.4,.35); add(click(.025,5000),tm,.35)
    add(clack(),tm+MD,.75 if i in CAPS else .6,pan=.1)
    if i in CAPS: add(lpf(rng.standard_normal(int(.08*SR)),2500)*env(.08,.001,.02),tm+MD+.02,.35)   # взяття
    add(pop(1100),tm+MD+.12,.08)                                              # репліка в чаті
# перший зівок (4.К:e5?) — короткий «ой»
t=tt(.5); fr=420*np.exp(-t*1.2); add(lpf(np.sign(np.sin(2*np.pi*np.cumsum(fr)/SR))*env(.5,.01,.2),1400),M0+6*STEP+MD+.1,.09)
add(boom(70,.6),M0+6*STEP+MD+.15,.25)
# другий зівок (5.К:f7??) — сумний спадний синт
t=tt(.9); fr=330*np.exp(-t*0.9); add(lpf(np.sign(np.sin(2*np.pi*np.cumsum(fr)/SR))*env(.9,.01,.35),1400),M0+8*STEP+MD+.1,.12)
add(boom(55,.9),M0+8*STEP+MD+.15,.3)
# шах (6…Ф:e4+)
add(bell(880,.6),M0+11*STEP+MD+.02,.15)
# мат
MATE=M0+13*STEP+MD
add(riser(1.4),MATE-1.4,.3); add(boom(42,2.4),MATE,.9); add(whoosh(.3,False,6000),MATE,.4)
add(bell(220,2.0),MATE,.25); add(bell(233,2.0),MATE,.2)
add(pop(400),MATE+.3,.3)
for tw in [MATE+.25,MATE+.55,MATE+.85]: add(click(.03,4000),tw,.2)
# огляд партії: смужки точності
add(whoosh(.4,bright=4000),35.2,.3); add(pop(600),35.4,.25)
t=tt(1.1); add(np.sin(2*np.pi*np.cumsum(300+500*t/1.1)/SR)*env(1.1,.05,.6)*.5,35.8,.06)
add(bell(1046,.8),37.2,.18)
# CTA
add(whoosh(.7),38.4,.55); add(boom(70,.8),39.0,.3)
add(pop(700),39.05,.25); add(pop(850),39.2,.2)
add(whoosh(.35,bright=6000),39.95,.35,-.4); add(pop(900),40.25,.3)
add(whoosh(.35,bright=6000),40.45,.35,.4);  add(pop(1000),40.75,.3)
add(pop(800),41.45,.25); add(bell(1318.5,1.0),41.8,.15)
# мастер: фейд, нормалізація, м'який ліміт
fade=np.ones(N); fi=int(43.8*SR); fade[fi:]=np.linspace(1,0,N-fi)
L*=fade; R*=fade
m=max(np.abs(L).max(),np.abs(R).max()); L=np.tanh(L/m*1.3)*.8; R=np.tanh(R/m*1.3)*.8
st=(np.stack([L,R],1)*32767).astype(np.int16)
w=wave.open('audio.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
print('ok')
