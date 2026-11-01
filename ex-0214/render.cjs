// Покадровий рендер: node render.cjs → frames.mp4 (без звуку)
const {chromium}=require('playwright');const {spawn}=require('child_process');const path=require('path');
(async()=>{const FPS=30,DUR=45,N=FPS*DUR;
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
 await pg.goto('file://'+path.resolve(__dirname,'index.html')+'?render=1');await pg.waitForTimeout(500);
 const ff=spawn('ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate',String(FPS),'-c:v','png','-i','-','-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p',path.resolve(__dirname,'frames.mp4')],{stdio:['pipe','inherit','inherit']});
 for(let i=0;i<N;i++){await pg.evaluate(t=>__seek(t),i/FPS);const buf=await pg.screenshot({type:'png'});
   if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%60===0)console.log('frame',i);}
 ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();})();
