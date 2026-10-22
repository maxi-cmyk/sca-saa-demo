#!/usr/bin/env node
"use strict";
// Build from computed scores/optimizer snapshots, never from hand-placed clusters.
// Requires macOS Swift/AppKit and ffmpeg; playback has no build dependencies.
const C = require("../js/core.js"), D = require("../js/data.js"), P = require("../js/presentation.js");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), {spawnSync} = require("node:child_process");
const root = path.join(__dirname,".."), out = path.join(root,"assets/animations");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),"sca-saa-animation-"));
const scores=C.computeScores(D.SAMPLES,64), matrix=C.combine(scores.cosine,scores.saa,.6);
const low=P.groups(matrix,.7), high=P.groups(matrix,.8), width=1600, height=600, fps=20, frames=300;
const p0=Array.from({length:75},(_,i)=>({x:100+(i%15)*100,y:35+Math.floor(i/15)*80}));
const p1=P.layout(low,width,410), p2=P.layout(high,width,410);
const ordered=[...low.edges].sort((a,b)=>b.w-a.w || a.a-b.a || a.b-b.b);
const ease=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x)};
const blend=(a,b,t)=>a.map((p,i)=>({x:p.x+(b[i].x-p.x)*t,y:p.y+(b[i].y-p.y)*t}));
const graph=[];
for(let f=0;f<frames;f++){
  const t=f/fps, toHigh=t>=9, progress=ease((t-9)/2);
  const edges=t<5?ordered.slice(0,Math.floor(ordered.length*ease((t-1.5)/3.5))):ordered;
  const shown=toHigh?edges.map(e=>({...e,opacity:e.w>=.8?1:1-progress})):edges;
  const info=toHigh&&progress===1?high:low;
  const points=t<5?p0:t<7?blend(p0,p1,ease((t-5)/2)):toHigh?blend(p1,p2,progress):p1;
  const title=t<1.5?"Start with 75 samples":t<5?"Connect pairs at or above 0.70":t<7?"Group samples connected by links":t<9?"0.70 cutoff: five connected groups":t<11?"Raise the cutoff: remove weaker links":"0.80 cutoff: seven samples become unplaced";
  graph.push({title,subtitle:t<9?"Cutoff 0.70  ·  code weight 0.60  ·  attribute weight 0.40":"Cutoff 0.70 → 0.80  ·  code weight 0.60  ·  attribute weight 0.40",points,edges:shown,colors:t<5?Array(75).fill(null):info.colors,
    footer:t<5?`${edges.length} of 464 qualifying links revealed`:t<9?"464 links  ·  5 groups  ·  0 unplaced":"185 links at 0.80  ·  5 groups  ·  7 unplaced",iteration:-1});
}
const history=[];
const points=C.tsne2d(matrix,{perplexity:15,seed:440,iterations:1000,onIteration:(iteration,points)=>history.push({iteration,points})});
// Rotate every snapshot by the final projection's principal axis. Rotation
// preserves distances and uses the wide stage without stretching either axis.
const xx=points.reduce((s,p)=>s+p.x*p.x,0),yy=points.reduce((s,p)=>s+p.y*p.y,0),xy=points.reduce((s,p)=>s+p.x*p.y,0);
const angle=.5*Math.atan2(2*xy,xx-yy),co=Math.cos(angle),si=Math.sin(angle);
const rotate=p=>({x:p.x*co+p.y*si,y:-p.x*si+p.y*co});
const bounds=history.reduce((b,f)=>f.points.reduce((a,p)=>{const q=rotate(p);return {x:Math.max(a.x,Math.abs(q.x)),y:Math.max(a.y,Math.abs(q.y))}},b),{x:0,y:0});
const scale=Math.min(700/bounds.x,185/bounds.y);
const project=pts=>pts.map(p=>{const q=rotate(p);return {x:width/2+q.x*scale,y:205-q.y*scale}});
const scatter=[];
for(let f=0;f<frames;f++){
  const iteration=Math.min(1000,Math.round(f/fps/11.5*1000));
  scatter.push({title:iteration===1000?"The final t-SNE projection":"t-SNE: samples settle into a 2-D projection",subtitle:"Colour = graph group at cutoff 0.70  ·  position = t-SNE optimization",points:project(history[iteration].points),colors:low.colors,edges:[],iteration,
    footer:iteration===1000?"Nearby points suggest local similarity; groups come from graph connections.":`Iteration ${iteration} / 1,000  ·  exact t-SNE  ·  perplexity 15  ·  seed 440`});
}
fs.mkdirSync(out,{recursive:true});
const manifest={width,height,fps,frames,duration:frames/fps,alpha:.6,theta:.7,endTheta:.8,samples:D.SAMPLES.map(s=>s.name),
  graph:{start:{edges:low.edges.length,groups:low.count,unplaced:low.unplaced},end:{edges:high.edges.length,groups:high.count,unplaced:high.unplaced},points:p2},
  tsne:{iterations:1000,perplexity:15,seed:440,kl:points.kl,points,angle,scale,bounds},
  matrixChecksum:matrix.flat().reduce((sum,v,i)=>sum+v*(i+1),0)};
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{stdio:"inherit"});if(r.status!==0)throw Error(`${cmd} failed (${r.status})`)};
for(const [name,data] of [["clustering",graph],["tsne",scatter]]){
  const folder=path.join(tmp,name);fs.mkdirSync(folder);
  const input=path.join(tmp,`${name}.json`);fs.writeFileSync(input,JSON.stringify({width,height,frames:data}));
  run("swift",["-module-cache-path",path.join(os.tmpdir(),"sca-saa-swift-cache"),path.join(__dirname,"render-animation.swift"),input,folder,path.join(root,"fonts")]);
  run("ffmpeg",["-v","error","-y","-framerate",String(fps),"-i",path.join(folder,"%04d.png"),"-filter_complex","[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle","-loop","-1",path.join(out,`${name}.gif`)]);
  fs.copyFileSync(path.join(folder,"0299.png"),path.join(out,`${name}-final.png`));
  console.log(`${name}: ${width} × ${height}, ${frames/fps}s, ${fps} fps`);
}
fs.writeFileSync(path.join(out,"manifest.json"),JSON.stringify(manifest,null,2)+"\n");
fs.rmSync(tmp,{recursive:true,force:true});
