import sys, json, numpy as np, wave, onnxruntime as ort
d='vits-piper-uk_UA-ukrainian_tts-medium/uk_UA-ukrainian_tts-medium'
cfg=json.load(open(d+'.onnx.json')); m=cfg['phoneme_id_map']
sess=ort.InferenceSession(d+'.onnx',providers=['CPUExecutionProvider'])
def synth(text,sid=0,length=1.0,noise=0.667,noise_w=0.8):
    text=text.lower().replace('+','́').replace('’',"'")
    ids=[m['^'][0],m['_'][0]]
    for ch in text:
        if ch in m: ids+= [m[ch][0], m['_'][0]]
        else: print('skip',repr(ch),file=sys.stderr)
    ids.append(m['$'][0])
    out=sess.run(None,{'input':np.array([ids],dtype=np.int64),'input_lengths':np.array([len(ids)],dtype=np.int64),
        'scales':np.array([noise,length,noise_w],dtype=np.float32),'sid':np.array([sid],dtype=np.int64)})[0]
    return out.squeeze()
if __name__=='__main__':
    text=sys.argv[1]; sid=int(sys.argv[2]); ls=float(sys.argv[3]); out=sys.argv[4]
    s=synth(text,sid,ls); s=s/np.abs(s).max()*0.95
    w=wave.open(out,'wb');w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes((s*32767).astype(np.int16).tobytes());w.close()
    print(out,len(s)/22050)
