# Хромакей: зелений екран → прозорість, знаходимо 4 кути екрана (у координатах 1080x1920)
import numpy as np, json
from PIL import Image, ImageFilter
out={}
for name in ["hand","desk"]:
    im=Image.open(f"assets/src_{name}.png").convert("RGB").resize((1080,1920),Image.LANCZOS)
    a=np.asarray(im).astype(np.float32)
    r,g,b=a[...,0],a[...,1],a[...,2]
    greenness=g-np.maximum(r,b)               # >0 зеленувате
    alpha=1-np.clip((greenness-25)/60,0,1)     # м'який ключ
    m=Image.fromarray((alpha*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))  # трохи «з'їсти» край
    alpha=np.asarray(m).astype(np.float32)/255
    # despill
    lim=np.maximum(r,b); g2=np.where(g>lim,lim+(g-lim)*0.15,g)
    rgba=np.dstack([r,g2,b,alpha*255]).clip(0,255).astype(np.uint8)
    Image.fromarray(rgba,"RGBA").save(f"assets/{name}.png",optimize=True)
    mask=greenness>60
    ys,xs=np.nonzero(mask)
    pts=np.stack([xs,ys],1).astype(float)
    s=pts.sum(1); d=pts[:,0]-pts[:,1]
    tl=pts[s.argmin()]; br=pts[s.argmax()]; tr=pts[d.argmax()]; bl=pts[d.argmin()]
    # кути округлені — розширюємо квадрат до перетину країв: беремо крайні лінії
    x0,x1=np.percentile(xs,0.2),np.percentile(xs,99.8); y0,y1=np.percentile(ys,0.2),np.percentile(ys,99.8)
    out[name]={"tl":tl.tolist(),"tr":tr.tolist(),"br":br.tolist(),"bl":bl.tolist(),"bbox":[x0,y0,x1,y1]}
    print(name,out[name])
json.dump(out,open("assets/quads.json","w"),indent=1)

# точні кути: апроксимуємо 4 краї прямими й перетинаємо
def edges(name):
    im=np.asarray(Image.open(f"assets/src_{name}.png").convert("RGB").resize((1080,1920),Image.LANCZOS)).astype(float)
    mask=(im[...,1]-np.maximum(im[...,0],im[...,2]))>60
    ys,xs=np.nonzero(mask); y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
    H=y1-y0; W=x1-x0
    rows=np.arange(int(y0+H*.15),int(y1-H*.15))
    L=[(y,np.nonzero(mask[y])[0].min()) for y in rows]; R=[(y,np.nonzero(mask[y])[0].max()) for y in rows]
    # верх: лише краї (без «чубчика» по центру)
    cols=[c for c in range(int(x0+W*.12),int(x1-W*.12)) if not (x0+W*.3<c<x1-W*.3)]
    T=[(c,np.nonzero(mask[:,c])[0].min()) for c in cols]
    cols2=range(int(x0+W*.15),int(x1-W*.15)); B=[(c,np.nonzero(mask[:,c])[0].max()) for c in cols2]
    fl=np.polyfit([a for a,b in L],[b for a,b in L],1); fr=np.polyfit([a for a,b in R],[b for a,b in R],1)   # x=f(y)
    ft=np.polyfit([a for a,b in T],[b for a,b in T],1); fb=np.polyfit([a for a,b in B],[b for a,b in B],1)   # y=f(x)
    def inter(fx,fy):  # x=fx[0]*y+fx[1], y=fy[0]*x+fy[1]
        y=(fy[0]*fx[1]+fy[1])/(1-fy[0]*fx[0]); x=fx[0]*y+fx[1]; return [round(x,1),round(y,1)]
    return {"tl":inter(fl,ft),"tr":inter(fr,ft),"br":inter(fr,fb),"bl":inter(fl,fb)}
q={n:edges(n) for n in ["hand","desk"]}
print(q); json.dump(q,open("assets/quads.json","w"),indent=1)
