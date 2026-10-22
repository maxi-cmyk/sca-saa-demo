/* Shared, deterministic presentation data for the live views and GIF export. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./core.js"));
  else root.Presentation = factory(root.Core);
})(typeof window === "object" ? window : globalThis, function (C) {
  "use strict";
  const COLORS = ["#3fd0b0", "#b8a3ff", "#ff9bc9", "#c6e86e", "#90d5d8"];
  function groups(matrix, theta) {
    const edges = C.edgesAt(matrix, theta), { comp, size } = C.components(matrix.length, edges);
    const ids = [...new Set(comp.filter((_, i) => size[i] > 1))];
    return { edges, comp, size, count: ids.length, unplaced: size.filter(n => n === 1).length,
      colors: comp.map((id, i) => size[i] === 1 ? null : COLORS[ids.indexOf(id) % COLORS.length]) };
  }
  function layout(info, width = 1600, height = 650) {
    const members = new Map(), isolated = [];
    info.comp.forEach((id, i) => {
      if (info.size[i] === 1) isolated.push(i);
      else { if (!members.has(id)) members.set(id, []); members.get(id).push(i); }
    });
    const tiles = [...members.values()];
    if (isolated.length) tiles.push(isolated);
    const cols = Math.min(3, Math.ceil(Math.sqrt(tiles.length * width / height))), rows = Math.ceil(tiles.length / cols);
    const tw = width / cols, th = height / rows, rx = tw * .35, ry = th * .35;
    const points = new Array(info.comp.length);
    tiles.forEach((items, k) => items.forEach((i, n) => {
      const a = n * Math.PI * (3 - Math.sqrt(5)), r = Math.sqrt((n + .5) / items.length);
      points[i] = { x: (k % cols + .5) * tw + Math.cos(a) * r * rx, y: (Math.floor(k / cols) + .5) * th + Math.sin(a) * r * ry };
    }));
    return points;
  }
  function color(value) {
    const a = value < .5 ? [255,245,240] : [251,106,74], b = value < .5 ? [251,106,74] : [153,0,13];
    const t = value < .5 ? value * 2 : (value - .5) * 2;
    const rgb = a.map((v,i) => Math.round(v + (b[i]-v)*t));
    const linear = rgb.map(v => { const c = v/255; return c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4; });
    return { fill: `rgb(${rgb.join(",")})`, ink: .2126*linear[0]+.7152*linear[1]+.0722*linear[2] > .179 ? "#000000" : "#ffffff" };
  }
  function neighbourhood(a, b, count, limit = 8) {
    const result = new Set([a,b]);
    for (let distance=1; result.size<Math.min(count,limit); distance++)
      for (const i of [a-distance,a+distance,b-distance,b+distance])
        if (i>=0 && i<count && result.size<limit) result.add(i);
    return [...result].sort((x,y)=>x-y);
  }
  // One rotation and one scale for both axes: preserve projection geometry.
  function project(points, width, height) {
    const xx=points.reduce((s,p)=>s+p.x*p.x,0), yy=points.reduce((s,p)=>s+p.y*p.y,0), xy=points.reduce((s,p)=>s+p.x*p.y,0);
    const angle=.5*Math.atan2(2*xy,xx-yy),co=Math.cos(angle),si=Math.sin(angle);
    const rotated=points.map(p=>({x:p.x*co+p.y*si,y:-p.x*si+p.y*co}));
    const bx=Math.max(...rotated.map(p=>Math.abs(p.x)),1e-9),by=Math.max(...rotated.map(p=>Math.abs(p.y)),1e-9);
    const scale=Math.min((width-120)/(2*bx),(height-80)/(2*by));
    return rotated.map(p=>({x:width/2+p.x*scale,y:height/2-p.y*scale}));
  }
  const MOTION_SPEED=1.5, MOTION_DURATION=20/MOTION_SPEED;
  const motionCache=new Map();
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
  const mix=(a,b,t)=>t<=0?a:t>=1?b:a.map((p,i)=>({x:p.x+(b[i].x-p.x)*t,y:p.y+(b[i].y-p.y)*t}));
  function motion(matrix,theta,kind) {
    const key=JSON.stringify([matrix,theta,kind]);
    if(motionCache.has(key))return motionCache.get(key);
    const width=1600,height=620,duration=MOTION_DURATION,info=groups(matrix,theta),n=matrix.length;
    const start=Array.from({length:n},(_,i)=>({x:110+(i%15)*(width-220)/14,y:90+Math.floor(i/15)*(height-180)/4}));
    const edges=[...info.edges].sort((a,b)=>b.w-a.w||a.a-b.a||a.b-b.b);
    let history,final,projectSnapshot;
    if(kind==='scatter') {
      history=[];
      final=C.tsne2d(matrix,{perplexity:n>25?15:3,seed:440,iterations:1000,onIteration:(i,p)=>{if(i>=250)history.push(p);}});
      // Lock the camera for the entire optimization segment. Never re-fit a frame.
      const xx=final.reduce((s,p)=>s+p.x*p.x,0),yy=final.reduce((s,p)=>s+p.y*p.y,0),xy=final.reduce((s,p)=>s+p.x*p.y,0);
      const angle=.5*Math.atan2(2*xy,xx-yy),co=Math.cos(angle),si=Math.sin(angle);
      const rotate=p=>({x:p.x*co+p.y*si,y:-p.x*si+p.y*co});
      let bx=0,by=0;
      for(const frame of history)for(const p of frame){const q=rotate(p);bx=Math.max(bx,Math.abs(q.x));by=Math.max(by,Math.abs(q.y));}
      const scale=Math.min((width-160)/(2*Math.max(bx,1e-9)),(height-120)/(2*Math.max(by,1e-9)));
      projectSnapshot=pts=>pts.map(p=>{const q=rotate(p);return{x:width/2+q.x*scale,y:height/2-q.y*scale};});
      history=history.map(projectSnapshot);final=history.at(-1);
    }else final=layout(info,width,height);
    function frame(seconds) {
      const t=Math.max(0,Math.min(20,seconds*MOTION_SPEED));
      if(kind==='scatter') {
        // The first transition is an explanatory layout, followed by actual optimizer snapshots.
        if(t<2)return {points:start,edges:[],colored:false,phase:'Samples',iteration:null};
        if(t<5)return {points:mix(start,history[0],ease((t-2)/3)),edges:[],colored:true,phase:'Arrange',iteration:null};
        const position=Math.max(0,Math.min(750,(t-5)/11*750)),lo=Math.floor(position),hi=Math.min(750,lo+1);
        return {points:mix(history[lo],history[hi],position-lo),edges:[],colored:true,phase:t>=16?'Final':'Settle',iteration:Math.round(250+position)};
      }
      return {points:t<6?start:mix(start,final,ease((t-6)/6)),edges:edges.slice(0,Math.round(edges.length*ease((t-2)/4))),colored:t>=6,phase:t<2?'Samples':t<6?'Links':t<12?'Groups':'Final',iteration:null};
    }
    const result={duration,info,final,frame,width,height};
    if(motionCache.size>=3)motionCache.delete(motionCache.keys().next().value);
    motionCache.set(key,result);return result;
  }
  return { COLORS, groups, layout, color, neighbourhood, project, motion, MOTION_DURATION };
});
