// Покадровий рендер у кілька потоків: node render.cjs → frames.mp4 (без звуку)
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');const fs=require('fs');
const FPS=30,DUR=45,N=FPS*DUR,W=+(process.env.WORKERS||4);
async function part(b,k,a,z){const pg=await b.newPage({viewport:{width:1080,height:1920}});
 await pg.goto('file://'+path.resolve(__dirname,'index.html')+'?render=1');await pg.waitForTimeout(500);
 const out=path.resolve(__dirname,`part${k}.mp4`);
 const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p',out],{stdio:['pipe','inherit','inherit']});
 for(let i=a;i<z;i++){await pg.evaluate(t=>__seek(t),i/FPS);const buf=await pg.screenshot({type:'jpeg',quality:95});
   if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if((i-a)%150===0)console.log('part',k,'frame',i);}
 ff.stdin.end();await new Promise(r=>ff.on('close',r));return out;}
(async()=>{const b=await chromium.launch();const per=Math.ceil(N/W);
 const outs=await Promise.all([...Array(W)].map((_,k)=>part(b,k,k*per,Math.min(N,(k+1)*per))));
 fs.writeFileSync(path.resolve(__dirname,'parts.txt'),outs.map(o=>`file '${o}'`).join('\n'));
 await new Promise(r=>spawn('ffmpeg',['-loglevel','error','-y','-f','concat','-safe','0','-i','parts.txt','-c','copy','frames.mp4'],{cwd:__dirname,stdio:'inherit'}).on('close',r));
 outs.forEach(o=>fs.unlinkSync(o));fs.unlinkSync(path.resolve(__dirname,'parts.txt'));await b.close();console.log('done');})();
