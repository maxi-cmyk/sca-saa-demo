#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const C=require("../js/core.js"),D=require("../js/data.js"),P=require("../js/presentation.js");
const root=path.join(__dirname,".."),manifest=require("../assets/animations/manifest.json");
const scores=C.computeScores(D.SAMPLES,64),m=C.combine(scores.cosine,scores.saa,.6);
const at=name=>D.SAMPLES.findIndex(s=>s.name===name),a=at("obviousmalware_v1.exe"),b=at("obviousmalware_v4.exe");
assert(scores.cosine[a][b]<.7 && scores.sca[a][b]<.7 && scores.saa[a][b]>.7 && m[a][b]>.7);
const x=at("payme_v1.exe"),y=at("oopslocked.exe");
assert(scores.saa[x][y]>.7 && m[x][y]<.7);
assert.deepEqual(manifest.samples,D.SAMPLES.map(s=>s.name));
assert.equal(manifest.matrixChecksum,m.flat().reduce((sum,v,i)=>sum+v*(i+1),0));
for(const [theta,expected] of [[.7,manifest.graph.start],[.8,manifest.graph.end]]){
  const info=P.groups(m,theta),points=P.layout(info,1600,410);
  assert.deepEqual({edges:info.edges.length,groups:info.count,unplaced:info.unplaced},expected);
  assert.equal(points.length,D.SAMPLES.length);
  assert(points.every(p=>p.x>0&&p.x<1600&&p.y>0&&p.y<410));
  if(theta===.8)assert.deepEqual(points,manifest.graph.points);
}
assert.equal(manifest.graph.end.unplaced,7);
// Matrix value labels must remain readable across the entire colour ramp.
const luminance=rgb=>rgb.map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
for(let i=0;i<=100;i++){
  const c=P.color(i/100),background=luminance(c.fill.match(/\d+/g).map(Number)),ink=c.ink==="#000000"?0:1;
  assert((Math.max(background,ink)+.05)/(Math.min(background,ink)+.05)>=4.5);
}
// Export callbacks cannot perturb the actual optimizer or its final coordinates.
let snapshots=0,last;
const points=C.tsne2d(m,{perplexity:15,seed:440,iterations:1000,onIteration:(iteration,snapshot)=>{
  assert.equal(iteration,snapshots++);last=snapshot.map(p=>({...p}));snapshot[0].x=999999;
}});
assert.equal(snapshots,1001);assert.deepEqual(last,points);
assert.deepEqual(points,manifest.tsne.points);assert.equal(points.kl,manifest.tsne.kl);
for(const [i,j] of [[0,74],[74,0],[0,1],[73,74]]){
  const indices=P.neighbourhood(i,j,75);assert.equal(indices.length,8);assert(indices.includes(i)&&indices.includes(j));
  assert(indices.every(n=>n>=0&&n<75));
}
// Parse real GIF blocks: check actual resolution, frame delays and no forced loop.
function inspectGIF(file){
  const b=fs.readFileSync(file);assert.match(b.toString("ascii",0,6),/^GIF8[79]a$/);
  const width=b.readUInt16LE(6),height=b.readUInt16LE(8);let pos=13,frames=0,duration=0;
  if(b[10]&128)pos+=3*(2**((b[10]&7)+1));
  const blocks=()=>{while(b[pos])pos+=1+b[pos];pos++;};
  while(pos<b.length){
    const marker=b[pos++];if(marker===0x3b)break;
    if(marker===0x21){const type=b[pos++];if(type===0xf9){assert.equal(b[pos],4);duration+=b.readUInt16LE(pos+2)/100;}blocks();}
    else if(marker===0x2c){frames++;const packed=b[pos+8];pos+=9;if(packed&128)pos+=3*(2**((packed&7)+1));pos++;blocks();}
    else throw Error(`Unexpected GIF block ${marker}`);
  }
  assert.equal(width,1600);assert.equal(height,600);assert.equal(frames,300);assert(Math.abs(duration-15)<1e-6);
  assert(!b.includes(Buffer.from("NETSCAPE2.0")),"GIF should play once and hold its final frame");
}
for(const kind of ["clustering","tsne"]){
  inspectGIF(path.join(root,`assets/animations/${kind}.gif`));
  const png=fs.readFileSync(path.join(root,`assets/animations/${kind}-final.png`));
  assert.equal(png.readUInt32BE(16),1600);assert.equal(png.readUInt32BE(20),600);
}
const katex=require("../vendor/katex/katex.min.js");
const formula=katex.renderToString(String.raw`S_{\mathrm{code}}=\frac{23}{\sqrt{38}\sqrt{39}}\approx0.597`,{throwOnError:true});
assert(formula.includes("<math")&&formula.includes("application/x-tex"));
console.log("Presentation checks passed: complementary pairs, recorded matrix/settings, graph endpoints, t-SNE snapshots, readable matrix neighbourhoods, real 15s GIFs and offline LaTeX.");

// A single timeline retains exact scores/settings and meaningful final geometry.
for(const kind of ['graph','scatter']) {
  for(const theta of [.7,.8]) {
    const movie=P.motion(m,theta,kind);
    assert.equal(movie.duration,20/1.5);
    assert.deepEqual(movie.info,P.groups(m,theta));
    for(const t of [0,2,4,6,9,12,16,20]) {
      const f=movie.frame(t/1.5);
      assert.equal(f.points.length,75);
      assert(f.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>0&&p.x<1600&&p.y>0&&p.y<620));
    }
    assert.deepEqual(movie.frame(movie.duration).points,movie.final);
    assert.equal(movie.frame(movie.duration).phase,'Final');
    if(kind==='graph') {
      assert.deepEqual(movie.final,P.layout(movie.info,1600,620));
      assert.equal(movie.frame(movie.duration).edges.length,movie.info.edges.length);
      assert.equal(movie.frame(0).edges.length,0);
    } else {
      assert.equal(movie.frame(5/1.5).iteration,250);
      assert.equal(movie.frame(16/1.5).iteration,1000);
      // The fixed camera may rotate/scale but cannot distort the final projection.
      const distance=(pts,i,j)=>Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);
      const scale=distance(movie.final,0,1)/distance(points,0,1);
      for(const [i,j] of [[0,74],[4,25],[20,60]])assert(Math.abs(distance(movie.final,i,j)-scale*distance(points,i,j))<1e-8);
    }
  }
}
console.log('Unified playback checks passed: 13.3s timelines at 1.5x speed, current cutoffs, bounded snapshots, exact graph endpoints and undistorted t-SNE final projection.');
