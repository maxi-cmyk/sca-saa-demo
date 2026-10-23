/*
 * app.js — the walkthrough UI (specimen catalogue, dark).
 *
 * Stage-first: each step fills the screen for the room. The specimen drawer
 * (D) holds the analyst views: catalogue list, details tree and bytes.
 * Every number on screen is computed live by core.js from data.js.
 */
(function () {
  "use strict";

  const C = window.Core;
  const D = window.DemoData;
  const SAMPLES = D.SAMPLES;
  const N = SAMPLES.length;
  const PAIRS_TOTAL = (N * (N - 1)) / 2;

  // ------------------------------------------------------------- palette --
  // Mirrors css/style.css; SVG needs literal colours.
  const COL = {
    ground: "#0b1d33", deep: "#081629", tray: "#10294a", tray2: "#15345b", tray3: "#1b3f6c",
    rule: "#24466f", ruleStrong: "#34608f",
    white: "#ffffff", text: "#eaf1fa", muted: "#b4c7de", faint: "#8aa3c2",
    cream: "#f2e6c9", creamDeep: "#e4d2a8",
    sca: "#f5b94a", saa: "#79c2ff", fin: "#ffffff", ok: "#f2e6c9", bad: "#ff7d6e",
    edge: "#9db6d6", branchOff: "#4f7099",
  };
  const FAM = ["#3fd0b0", "#b8a3ff", "#ff9bc9", "#c6e86e", "#90d5d8"];

  // --------------------------------------------------------------- steps --
  const STEPS = [
    { id:"features",metric:null,title:"Two clues to related malware",lede:"Start with the same samples. Compare their code and their attributes.",ref:"Sec. III.A–C · Fig. 3" },
    { id:"minhash",metric:"sca",title:"SCA: find shared code",lede:"MinHash gives a compact estimate of code-feature overlap.",ref:"Sec. III.A · IV.A · Fig. 4–5" },
    { id:"jaccard",metric:"saa",title:"SAA: compare shared attributes",lede:"The Jaccard index measures how much two sets of attributes overlap.",ref:"Sec. III.B · IV.B · Fig. 6–7" },
    { id:"combine",metric:"final",title:"Combine the two kinds of evidence",lede:"Derive code cosine similarity, then combine it with the attribute Jaccard index.",ref:"Sec. III.C · Eq. 2" },
    { id:"results",metric:"final",title:"Read the analysis output",lede:"Explore the combined scores through one view at a time.",ref:"Sec. IV.G–H · Fig. 8–10" }
  ];
  const STEP_NAMES = ["Overview","SCA","SAA","Synthesis","Output"];
  const TRUTH_FROM = 1;

  const K_VALUES = [4, 8, 16, 32, 48, 64, 96, 128, 192, 256];
  const SKETCH_R = 4;

  // ---------------------------------------------------------------- state --
  const DEFAULTS = {
    step: 0, detail:false, returnStep:0, inputView:"overview", overviewFocus:null, scaView:"features", saaView:"sets", combineView:"vectors", outputView:"graph", vectorStep:"blocks", selA: 0, selB: 1, region: null,
    k: 64, theta: 0.7, alpha: 0.6,
    truthOverride: null, drawer: false,
    nameFilter: null, zoom: 1,
    resultsTab: "tree", heatSource: "final",
    query: 4, keyRow: 1, searchView: "table",
    effN: 3, effM: 2,
    codeGroup: 0, attrGroup: 0, vennAll: false, featAll: false,
  };
  let state = { ...DEFAULTS };
  const expanded = new Set(["code", "attrs"]);
  const comments = {};

  const truthOn = () => (state.truthOverride !== null ? state.truthOverride : state.step >= TRUTH_FROM);

  // -------------------------------------------------------------- derived --
  const idxOf = (name) => SAMPLES.findIndex((s) => s.name === name);
  const shortName = (i) => SAMPLES[i].name.replace(/\.exe$/, "");
  const KEY = D.KEY_PAIRS.map((p) => ({ ...p, i: idxOf(p.a), j: idxOf(p.b) }));
  DEFAULTS.selA=state.selA=KEY[1].i;
  DEFAULTS.selB=state.selB=KEY[1].j;

  const PE = SAMPLES.map((s) => C.buildPE(s));
  const SIG = SAMPLES.map((s) => C.minhashSignature(s.code, 256));
  const STRS = SAMPLES.map((s, i) => C.extractStrings(PE[i].bytes, 4));
  const SAA = C.matrix(N, (i, j) => C.jaccard(SAMPLES[i].attrs, SAMPLES[j].attrs).j);
  const SCA_EXACT = C.matrix(N, (i, j) => C.jaccard(SAMPLES[i].code, SAMPLES[j].code).j);

  const CODE_VECTORS = SAMPLES.map(C.codeVector);
  const CODE_COSINE = C.matrix(N,(i,j)=>C.cosine(CODE_VECTORS[i],CODE_VECTORS[j]));
  const scaCache = new Map();
  function scaAt(k) {
    if (!scaCache.has(k))
      scaCache.set(k, C.matrix(N, (i, j) => C.minhashEstimate(SIG[i].sig.slice(0, k), SIG[j].sig.slice(0, k)).est));
    return scaCache.get(k);
  }
  const finalM = (alpha = state.alpha) => C.combine(CODE_COSINE, SAA, alpha);
  function matrixFor(metric) {
    if (metric === "saa") return SAA;
    if (metric === "sca") return scaAt(state.k);
    if (metric === "final") return finalM();
    return null;
  }
  const METRIC_NAME = { saa: "SAA", sca: "SCA", final: "S_final" };

  /** Families at θ: components of the graph, coloured, with isolated specimens unplaced. */
  function clusterInfo(m, theta = state.theta) {
    const edges = C.edgesAt(m, theta);
    const { comp, size } = C.components(N, edges);
    const colorOf = new Map();
    const style = [];
    let next = 0;
    for (let i = 0; i < N; i++) {
      if (size[i] === 1) { style.push({ placed: false, color: null, label: "Unplaced", no: null }); continue; }
      if (!colorOf.has(comp[i])) colorOf.set(comp[i], next++);
      const n = colorOf.get(comp[i]);
      style.push({ placed: true, color: FAM[n % FAM.length], label: "Group " + (n + 1), no: n + 1 });
    }
    return { edges, comp, size, style, ev: C.evaluate(SAMPLES, comp), clusters: next, theta };
  }

  function sketchesOf(i, k) { return C.sketches(SIG[i].sig.slice(0, k), SKETCH_R); }
  function shareSketch(i, j, k) {
    const a = new Set(sketchesOf(i, k));
    return sketchesOf(j, k).some((x) => a.has(x));
  }

  // -------------------------------------------------------------- helpers --
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const f2 = (v) => v.toFixed(2);
  const f3 = (v) => v.toFixed(3);
  const hex = (v, w = 2) => v.toString(16).padStart(w, "0");
  const fmtInt = (v) => v.toLocaleString("en-US");
  const fs = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  // projector floor: no on-stage label below 14px
  const px = (mult, floor = 14) => Math.max(floor, Math.round(fs() * mult));
  const cat = (a) => a.slice(0, a.indexOf(":"));
  const val = (a) => a.slice(a.indexOf(":") + 1);
  const icon = (id, cls = "") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const svgEl = (tag, attrs = {}) => {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function bytesHuman(b) {
    if (b < 1024) return fmtInt(Math.round(b)) + " B";
    const u = ["KB", "MB", "GB", "TB", "PB"];
    let i = -1;
    do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
    return (b >= 100 ? b.toFixed(0) : b >= 10 ? b.toFixed(1) : b.toFixed(2)) + " " + u[i];
  }
  function countWords(v) {
    const u = [[" trillion", 1e12], [" billion", 1e9], [" million", 1e6]];
    for (const [s, d] of u) if (v >= d) return (v / d >= 100 ? (v / d).toFixed(0) : (v / d).toFixed(1)) + s;
    return fmtInt(Math.round(v));
  }
  const famTag = (st) => st.placed
    ? `<span class="fam" style="background:${st.color}">${esc(st.label)}</span>`
    : `<span class="fam unplaced">Unplaced</span>`;
  const verdict = (ok, text) => `<span class="verdict ${ok ? "ok" : "bad"}">${icon(ok ? "check" : "cross")}${esc(text)}</span>`;

  // ------------------------------------------------------------ status --
  let statusTimer = null;
  function say(msg, err = false) {
    const el = $("#sbMsg");
    el.textContent = msg || "";
    el.classList.toggle("err", !!err);
    clearTimeout(statusTimer);
    if (msg && !err) statusTimer = setTimeout(() => { el.textContent = ""; }, 4000);
  }
  function renderStatus() {
    if(!state.detail) {
      $("#sbStep").textContent = `${state.step+1} / ${STEPS.length}`;
      $("#btnPrev").disabled = state.step===0;
      $("#btnNext").disabled = state.step===STEPS.length-1;
      $("#nextLabel").textContent = state.step===STEPS.length-1 ? "Finished" : `Next: ${STEP_NAMES[state.step+1]}`;
      return;
    }
    $("#sbStep").textContent = `${state.step + 1} / ${STEPS.length}`;
    $("#btnPrev").disabled = state.step === 0 && state.inputView === "overview";
    $("#btnNext").disabled = state.step === STEPS.length - 1;
    const id=STEPS[state.step].id;
    const lesson=LESSONS[id],at=lesson?lesson.scenes.findIndex(([scene])=>scene===state[lesson.key]):-1;
    const nextScene=lesson&&lesson.scenes[at+1];
    $("#nextLabel").textContent=nextScene ? `Next: ${nextScene[1]}` : state.step===STEPS.length-1 ? "Finished" : `Next: ${STEP_NAMES[state.step+1]}`;
    $("#sbParams").innerHTML = `<span>θ <b>${f2(state.theta)}</b></span><span>α <b>${f2(state.alpha)}</b></span><span>k <b>${state.k}</b></span>`;
  }

  // ------------------------------------------------------------ top bar --
  function renderSteps() {
    const pages=STEPS.map((s,i)=>[s,i]);
    $("#steps").innerHTML = pages.map(([s, i]) =>
      `<button class="step${i < state.step ? " done" : ""}" data-step="${i}" ${i === state.step ? 'aria-current="step"' : ""} title="${i+1}. ${esc(i===3?"Synthesis":STEP_NAMES[i])}">
        <span class="n">${i+1}</span><span class="lbl">${esc(i===3?"Synthesis":STEP_NAMES[i])}</span>
      </button>`).join("");
  }
  function renderHead() {
    const s = STEPS[state.step];
    $("#app").classList.toggle("output-stage",state.step===4);
    $("#app").classList.toggle("synthesis-stage",state.step===3&&!state.detail);
    $("#app").classList.toggle("overview-stage",state.step===0&&state.inputView==="overview");
    $("#stepTitle").textContent = s.title;
    $("#stepLede").textContent = s.lede;
    $("#stepRef").textContent = s.ref;
    if(!state.detail && state.step!==4) {
      $("#stepTitle").textContent = ["The SCA / SAA analysis framework", "SCA: compare code signatures", "SAA: compare attribute sets", "Synthesis: calculate the combined decision"][state.step];
      $("#stepLede").textContent = ["Select a stage to open its worked example.", "Extract strings → keep hash minima → compare signature positions.", "For the same pair, count shared attributes against all distinct attributes.", "Apply both analyses to the same pair, then combine their similarity scores."][state.step];
      $("#btnFramework").hidden=true;
      $("#app").classList.add("guided");
      document.title=`${state.step+1}. ${state.step===3?"Synthesis":STEP_NAMES[state.step]} · SCA / SAA Explorer`;
      return;
    }
    const overview=state.step===0&&state.inputView==="overview";
    $("#btnFramework").hidden=!state.detail;
    if(state.step===0) {
      $("#stepTitle").textContent=overview?"The SCA / SAA analysis framework":state.inputView==="preprocess"?"Preprocessing: prepare the features":"Input data: executable samples";
      $("#stepLede").textContent=overview?"Follow the complete workflow, or select any stage to explore it in depth.":state.inputView==="preprocess"?"Validate the executable, then build the representations used by each analysis.":`${N} fictional samples provide code-related and attribute-related evidence.`;
    }
    if(state.step===4) { $("#stepTitle").textContent={graph:"Watch the samples form groups",heatmap:"Inspect the similarity scores",scatter:"Watch the t-SNE projection settle"}[state.outputView]; $("#stepLede").textContent="75 synthetic samples · one combined similarity matrix · three ways to read it."; }


    $("#app").classList.add("guided");
    $("#mTruth").setAttribute("aria-checked", String(truthOn()));
    document.title = `${state.step + 1}. ${STEP_NAMES[state.step]} · SCA / SAA Explorer`;
  }

  // ------------------------------------------------------------- drawer --
  function setDrawer(open) {
    state.drawer = open;
    const d = $("#drawer");
    d.classList.toggle("open", open);
    if (open) d.removeAttribute("inert"); else d.setAttribute("inert", "");
    $("#btnDrawer").setAttribute("aria-expanded", String(open));
    if (open) renderDrawer();
  }
  function renderDrawer() {
    if (!state.drawer) return;
    renderList(); renderDetails(); renderBytes();
  }

  function renderList() {
    const metric = STEPS[state.step].metric;
    const info = metric ? clusterInfo(matrixFor(metric)) : null;
    let shown = 0;
    const rows = SAMPLES.map((s, i) => {
      const hidden = state.nameFilter && !state.nameFilter(s);
      if (!hidden) shown++;
      const ab = i === state.selA ? "A" : i === state.selB ? "B" : "";
      const famCell = info ? famTag(info.style[i]) : '<span class="fam unplaced">Unplaced</span>';
      return `<tr class="${i === state.selA ? "selA" : ""} ${hidden ? "hidden" : ""}" data-i="${i}">
        <td class="ab">${ab}</td>
        <td class="mono">${String(i + 1).padStart(3, "0")}</td>
        <td class="mono">${esc(s.name)}</td>
        <td>${truthOn() ? esc(s.family) : '<span style="color:' + COL.faint + '">hidden</span>'}</td>
        <td>${famCell}</td>
      </tr>`;
    }).join("");
    const head = info
      ? `Placed by <b>${METRIC_NAME[metric]}</b> at θ <b>${f2(state.theta)}</b> · ${shown} of ${N} shown`
      : `Not classified on this step · ${shown} of ${N} shown`;
    $("#plist").innerHTML = `<div class="plist-head">${head}</div><div class="plist"><table aria-label="Specimens">${rows}</table>${shown === 0 ? `<p class="empty">No specimens match this filter. Clear it to see all ${N} samples.</p>` : ""}</div>`;
  }

  function treeRow(depth, opts) {
    const tw = opts.parent ? `<svg class="tw-icon${opts.open ? " open" : ""}"><use href="#i-next"/></svg>` : "";
    const sel = opts.region && state.region === opts.region ? " sel" : "";
    const data = opts.parent ? `data-toggle="${opts.parent}" role="button" aria-expanded="${!!opts.open}"` : opts.region ? `data-region="${esc(opts.region)}"` : "";
    return `<div class="tree-item${sel}" ${data} tabindex="${opts.parent || opts.region ? 0 : -1}" style="padding-left:${0.9 + depth * 1}rem"><span class="tw" aria-hidden="true">${tw}</span>${opts.html}</div>`;
  }
  function renderDetails() {
    const i = state.selA, s = SAMPLES[i], pe = PE[i];
    const pairStep = ["jaccard", "minhash", "combine"].includes(STEPS[state.step].id);
    const b = pairStep && state.selB !== i ? SAMPLES[state.selB] : null;
    const reg = (id) => pe.regions.find((r) => r.id === id);
    const at = (r) => `<span class="at">@0x${hex(r.start, 4)}</span>`;
    const open = (k) => expanded.has(k);
    let h = treeRow(0, { parent: "sample", open: open("sample"), html: `<b>No. ${String(i + 1).padStart(3, "0")}</b>&nbsp;${esc(s.name)} <span class="at">${fmtInt(pe.bytes.length)} bytes, synthetic</span>` });
    if (open("sample")) {
      h += treeRow(1, { html: `First seen <span class="val">${esc(s.firstSeen)}</span>` });
      h += treeRow(1, { html: `Source <span class="val">${esc(s.source)}</span>` });
      h += treeRow(1, { html: `SHA-256 <span class="val">${pe.sha256.slice(0, 24)}…</span>` });
      h += treeRow(1, { html: `<span style="color:${COL.muted}">${esc(s.story)}</span>` });
    }
    h += treeRow(0, { parent: "hdr", open: open("hdr"), html: "Headers" });
    if (open("hdr")) for (const id of ["hdr:mz", "hdr:lfanew", "hdr:stub", "hdr:pe", "hdr:coff", "hdr:sections"]) {
      const r = reg(id); h += treeRow(1, { region: id, html: `${esc(r.label)} ${at(r)}` });
    }
    const bCode = b ? new Set(b.code) : null, bAttr = b ? new Set(b.attrs) : null;
    const note = (n, t) => (b ? ` <span class="shared">${n}/${t} shared with B</span>` : "");
    h += treeRow(0, { parent: "code", open: open("code"), html: `<span class="tag sca">SCA</span> Code fragments [${s.code.length}]${note(b ? s.code.filter((x) => bCode.has(x)).length : 0, s.code.length)}` });
    if (open("code")) for (const f of s.code) h += treeRow(1, { region: "code:" + f, html: `<span class="val">${esc(f)}</span> ${at(reg("code:" + f))}${b && bCode.has(f) ? ' <span class="shared">shared</span>' : ""}` });
    h += treeRow(0, { parent: "attrs", open: open("attrs"), html: `<span class="tag saa">SAA</span> Attributes [${s.attrs.length}]${note(b ? s.attrs.filter((x) => bAttr.has(x)).length : 0, s.attrs.length)}` });
    if (open("attrs")) for (const a of s.attrs) h += treeRow(1, { region: "attr:" + a, html: `<span class="cat">${esc(cat(a))}</span> <span class="val">${esc(val(a))}</span> ${at(reg("attr:" + a))}${b && bAttr.has(a) ? ' <span class="shared">shared</span>' : ""}` });
    $("#details").innerHTML = `<div class="details">${h}</div>`;
    const sel = $("#details .tree-item.sel");
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  function renderBytes() {
    const i = state.selA, pe = PE[i], bytes = pe.bytes;
    const owner = new Array(bytes.length).fill(null);
    for (const r of pe.regions) if (r.kind !== "section") for (let o = r.start; o < r.end && o < bytes.length; o++) owner[o] = r;
    const selR = state.region ? pe.regions.find((r) => r.id === state.region) : null;
    const cls = (o) => {
      const r = owner[o];
      let c = "b";
      if (r) c += r.kind === "code" ? " code" : r.kind === "attr" ? " attr" : " hdr";
      if (selR && o >= selR.start && o < selR.end) c += " hl";
      return c;
    };
    let out = "";
    for (let off = 0; off < bytes.length; off += 16) {
      let hx = "", asc = "";
      for (let j = 0; j < 16; j++) {
        const o = off + j;
        if (o >= bytes.length) { hx += "   "; continue; }
        const v = bytes[o];
        hx += `<span class="${cls(o)}" data-off="${o}">${hex(v)}</span>` + (j === 7 ? "  " : " ");
        asc += `<span class="${cls(o)}" data-off="${o}">${v >= 0x20 && v <= 0x7e ? esc(String.fromCharCode(v)) : "."}</span>`;
      }
      out += `<span class="off">${hex(off, 4)}</span>  ${hx} ${asc}\n`;
    }
    const head = selR
      ? `Bytes of <b>${esc(SAMPLES[i].name)}</b> · selected <b>${esc(selR.label)}</b> (${selR.end - selR.start} bytes @ 0x${hex(selR.start, 4)})`
      : `Bytes of <b>${esc(SAMPLES[i].name)}</b> · click any byte`;
    $("#bytes").innerHTML = `<div class="bytes-head">${head}</div><div class="bytes"><pre>${out}</pre></div>`;
    const hl = $("#bytes .hl");
    if (hl) hl.scrollIntoView({ block: "center" });
  }

  // -------------------------------------------------------------- graphs --
  const LAST_POS = {};
  const LAYOUT_CACHE = {};

  function resolveOverlaps(pos, sizes, width, height, pad) {
    const gap = 14;
    for (let it = 0; it < 400; it++) {
      let moved = false;
      for (let i = 0; i < pos.length; i++)
        for (let j = i + 1; j < pos.length; j++) {
          const dx = pos[j].x - pos[i].x, dy = pos[j].y - pos[i].y;
          const ox = (sizes[i].w + sizes[j].w) / 2 + gap - Math.abs(dx);
          const oy = (sizes[i].h + sizes[j].h) / 2 + gap - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            moved = true;
            if (ox / (sizes[i].w + sizes[j].w) < oy / (sizes[i].h + sizes[j].h)) { const s = (dx >= 0 ? 1 : -1) * ox / 2; pos[i].x -= s; pos[j].x += s; }
            else { const s = (dy >= 0 ? 1 : -1) * oy / 2; pos[i].y -= s; pos[j].y += s; }
          }
        }
      for (let i = 0; i < pos.length; i++) {
        pos[i].x = clampN(pos[i].x, pad + sizes[i].w / 2, width - pad - sizes[i].w / 2);
        pos[i].y = clampN(pos[i].y, pad / 2 + sizes[i].h / 2, height - pad / 2 - sizes[i].h / 2);
      }
      if (!moved) break;
    }
    return pos;
  }

  function componentPositions(info, width, height) {
    const groups=new Map();
    info.comp.forEach((component,i)=>{if(!groups.has(component))groups.set(component,[]);groups.get(component).push(i);});
    const columns=Math.max(1,Math.ceil(Math.sqrt(groups.size*width/height))),rows=Math.ceil(groups.size/columns);
    const tileW=width/columns,tileH=height/rows,radius=Math.max(0,Math.min(tileW,tileH)*.42-8),positions=new Array(N);
    [...groups.values()].forEach((members,group)=>members.forEach((i,n)=>{
      const angle=n*Math.PI*(3-Math.sqrt(5)),r=members.length===1?0:radius*Math.sqrt((n+.5)/members.length);
      positions[i]={x:(group%columns+.5)*tileW+Math.cos(angle)*r,y:(Math.floor(group/columns)+.5)*tileH+Math.sin(angle)*r};
    }));
    return positions;
  }

  /** Similarity graph: nodes are specimens, an edge is a pair >= θ. */
  function drawGraph(host, opts) {
    if (!host) return;
    const width = Math.max(host.clientWidth, N>25?560:220);
    const height = opts.height;
    if(N>25) host.classList.add("cohort-graph");
    const small = !!opts.small;
    const dense = N > 25;
    const edges = opts.info.edges;
    const fsz = px(small ? 0.84 : 0.9);
    const ringOf = (i) => (opts.showB && i === state.selB && i !== state.selA ? 10 : 0);
    const sizes = SAMPLES.map((s, i) => ({ w: dense ? 18 : shortName(i).length * fsz * 0.61 + (small ? 18 : 24) + ringOf(i), h: dense ? 18 : fsz * (small ? 1.75 : 2) + ringOf(i) }));
    const key = `${opts.id}|${width}x${height}|${fsz}|${opts.showB ? state.selB : ""}|${edges.map((e) => e.a + "-" + e.b).join(",")}`;
    let pos = LAYOUT_CACHE[key];
    if (!pos && dense) { pos=componentPositions(opts.info,width,height); LAYOUT_CACHE[key]=pos; }
    if (!pos) {
      const pad = small ? 30 : 48;
      const overlaps = (P) => { let c = 0; for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++)
        if (Math.abs(P[a].x - P[b].x) < (sizes[a].w + sizes[b].w) / 2 + 14 && Math.abs(P[a].y - P[b].y) < (sizes[a].h + sizes[b].h) / 2 + 14) c++; return c; };
      let best = null, bestC = Infinity;
      for (let seed = 11; seed < (dense ? 13 : 31) && bestC > 0; seed++) {
        let P = C.forceLayout(N, edges, width, height, { pad, spread: small ? 0.92 : 0.8, gravity: small ? 0.1 : 0.09, iterations: dense ? 240 : 500, seed });
        P = resolveOverlaps(P, sizes, width, height, dense ? 3 : small ? 8 : 14);
        const c = overlaps(P);
        if (c < bestC) { best = P; bestC = c; }
      }
      pos = best;
      LAYOUT_CACHE[key] = pos.map((p) => ({ ...p }));
    }
    const from = LAST_POS[opts.id] && LAST_POS[opts.id].w === width ? LAST_POS[opts.id].pos : null;
    const svg = svgEl("svg", { class: "viz", viewBox: `0 0 ${width} ${height}`, width, height, role: "group", "aria-label": opts.aria || "Similarity graph" });
    const gE = svgEl("g"), gL = svgEl("g"), gN = svgEl("g");
    svg.append(gE, gL, gN);
    const theta = opts.info.theta;
    const lines = edges.map((e) => {
      const t = clampN((e.w - theta) / Math.max(1 - theta, 0.05), 0, 1);
      const l = svgEl("line", { class: "edge", stroke: COL.edge, "stroke-opacity": dense ? .22 : 1, "stroke-width": dense ? .6+t*.9 : (small ? 1.4 : 1.8) + t * (small ? 3 : 5) });
      l.dataset.a = e.a; l.dataset.b = e.b;
      const lti = svgEl("title"); lti.textContent = `${SAMPLES[e.a].name} ~ ${SAMPLES[e.b].name}: ${f2(e.w)}`; l.append(lti);
      gE.append(l);
      let label = null;
      if (opts.labels) {
        label = svgEl("g", { class: "edge-label" });
        const lfs = px(0.88);
        const bw = lfs * 0.62 * 4 + 10, bh = lfs * 1.35;
        label.append(svgEl("rect", { x: -bw / 2, y: -bh / 2, width: bw, height: bh, rx: 4, fill: COL.ground, stroke: COL.rule }));
        const lt = svgEl("text", { "font-size": lfs, fill: COL.white, "text-anchor": "middle", "dominant-baseline": "central", class: "mono", "font-weight": 700 });
        lt.textContent = f2(e.w);
        label.append(lt);
        label.box = { w: bw, h: bh };
        gL.append(label);
      }
      return { e, l, label };
    });
    const nodes = SAMPLES.map((s, i) => {
      const st = opts.info.style[i];
      const w = sizes[i].w - ringOf(i), h = sizes[i].h - ringOf(i);
      const isA = i === state.selA, isB = opts.showB && i === state.selB && i !== state.selA;
      const g = svgEl("g", { class: "node", tabindex: "0", role: "button", "aria-label": `${s.name}, ${st.placed ? st.label : "unplaced"}${i === state.selA ? ", specimen A" : ""}${isB ? ", specimen B" : ""}` });
      g.dataset.i = i;
      const rect = svgEl("rect", {
        class: "shape", x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2,
        fill: st.placed ? st.color : COL.ground,
        stroke: isA ? COL.white : st.placed ? st.color : COL.creamDeep,
        "stroke-width": isA ? 3 : 1.6,
        "stroke-dasharray": st.placed ? "" : "5 4",
      });
      if (isB) {
        // specimen B: a solid outer ring with a gap, so it never reads as "unplaced"
        g.append(svgEl("rect", { x: -w / 2 - 5, y: -h / 2 - 5, width: w + 10, height: h + 10, rx: h / 2 + 5, fill: "none", stroke: COL.white, "stroke-width": 2 }));
      }
      const t = svgEl("text", { "text-anchor": "middle", "dominant-baseline": "central", "font-size": fsz, "font-weight": 700, fill: st.placed ? COL.ground : COL.cream, class: "mono" });
      t.textContent = dense ? (isA ? "A" : isB ? "B" : "") : shortName(i);
      if(dense) { t.setAttribute("font-size",14); t.setAttribute("pointer-events","none"); }
      const title = svgEl("title"); title.textContent = `${s.name} · ${st.placed ? st.label : "unplaced"}`;
      g.append(title, rect, t);
      gN.append(g);
      return g;
    });
    function place(P) {
      for (const { e, l, label } of lines) {
        l.setAttribute("x1", P[e.a].x); l.setAttribute("y1", P[e.a].y);
        l.setAttribute("x2", P[e.b].x); l.setAttribute("y2", P[e.b].y);
      }
      placeLabels(P);
      nodes.forEach((g, i) => g.setAttribute("transform", `translate(${P[i].x.toFixed(1)},${P[i].y.toFixed(1)})`));
    }
    // edge labels: try spots along each edge, skip any that would cover a node or
    // another label; a label with no clear spot is dropped (hover the edge to read it)
    function placeLabels(P) {
      const boxes = SAMPLES.map((s, i) => ({ x: P[i].x - sizes[i].w / 2 - 6, y: P[i].y - sizes[i].h / 2 - 6, w: sizes[i].w + 12, h: sizes[i].h + 12 }));
      const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const order = lines.filter((x) => x.label).sort((p, q) => q.e.w - p.e.w);
      for (const { e, label } of order) {
        const { w, h } = label.box;
        let spot = null;
        for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78]) {
          const cx = P[e.a].x + (P[e.b].x - P[e.a].x) * t, cy = P[e.a].y + (P[e.b].y - P[e.a].y) * t;
          const b = { x: cx - w / 2, y: cy - h / 2, w, h };
          if (b.x < 0 || b.y < 0 || b.x + w > width || b.y + h > height) continue;
          if (boxes.some((o) => hit(b, o))) continue;
          spot = b; break;
        }
        if (spot) { boxes.push(spot); label.style.display = ""; label.setAttribute("transform", `translate(${(spot.x + w / 2).toFixed(1)},${(spot.y + h / 2).toFixed(1)})`); }
        else label.style.display = "none";
      }
    }
    host.innerHTML = "";
    host.append(svg);
    LAST_POS[opts.id] = { w: width, pos: pos.map((p) => ({ ...p })) };
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (from && !reduce) {
      const t0 = performance.now(), dur = 420;
      const ease = (t) => 1 - Math.pow(1 - t, 4);
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / dur), k = ease(t);
        place(pos.map((p, i) => ({ x: from[i].x + (p.x - from[i].x) * k, y: from[i].y + (p.y - from[i].y) * k })));
        if (t < 1) requestAnimationFrame(tick);
      };
      place(from); requestAnimationFrame(tick);
    } else place(pos);
    gN.addEventListener("mouseover", (ev) => {
      const g = ev.target.closest(".node"); if (!g) return;
      const i = g.dataset.i;
      lines.forEach(({ l }) => l.classList.toggle("dim", l.dataset.a !== i && l.dataset.b !== i));
    });
    gN.addEventListener("mouseout", () => lines.forEach(({ l }) => l.classList.remove("dim")));
  }

  /**
   * Signature move: the family tree (single-linkage dendrogram) with θ as a
   * cut line. Branches joined at a similarity >= θ ink into their family colour.
   * The SVG is reused while the tree is unchanged, so θ glides instead of jumping.
   */
  const TREE_CACHE = {};
  function drawTree(host, sim, info, opts) {
    if (!host) return;
    const width = Math.max(host.clientWidth, 260);
    const height = opts.height;
    const f = fs();
    const fsz = px(opts.small ? 0.84 : 0.88);
    const tree = C.singleLinkage(sim);
    const labW = fsz * 7.6 + 18;
    const x0 = labW + 6, x1 = width - 16;
    const top = fsz * 1.9, bottom = fsz * 2.2;
    const rowH = (height - top - bottom) / N;
    const xOf = (s) => x0 + (1 - s) * (x1 - x0);
    const rowOf = new Map(tree.order.map((leaf, r) => [leaf, r]));
    const sig = `${width}x${height}|${fsz}|` + JSON.stringify(tree.order) + "|" + JSON.stringify(collectHeights(tree.root));
    let rec = TREE_CACHE[opts.id];
    if (!rec || rec.sig !== sig || !host.contains(rec.svg)) {
      const svg = svgEl("svg", { class: "viz", viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-label": opts.aria || "Family tree with threshold cut" });
      const zone = svgEl("rect", { x: x0, y: top - 6, height: height - top - bottom + 12, fill: COL.cream, "fill-opacity": 0.06, rx: 4 });
      svg.append(zone);
      // axis
      const axisY = height - bottom + fsz * 0.4;
      svg.append(svgEl("line", { x1: x0, x2: x1, y1: axisY, y2: axisY, stroke: COL.rule }));
      for (const v of [1, 0.75, 0.5, 0.25, 0]) {
        const tx = svgEl("text", { x: xOf(v), y: axisY + fsz * 1.15, "text-anchor": "middle", "font-size": fsz, fill: COL.muted, class: "mono" });
        tx.textContent = v === 1 ? "1.0" : v === 0 ? "0" : v.toFixed(2);
        svg.append(tx);
      }
      const branches = [];
      const pos = new Map();
      (function place(n) {
        if (n.leaf !== undefined) { const p = { x: x0, y: top + rowH * (rowOf.get(n.leaf) + 0.5) }; pos.set(n, p); return p; }
        const a = place(n.left), b = place(n.right);
        const p = { x: xOf(n.height), y: (a.y + b.y) / 2 };
        pos.set(n, p);
        const path = svgEl("path", { class: "branch", d: `M${a.x},${a.y}H${p.x}V${b.y}H${b.x}`, fill: "none", "stroke-linejoin": "round" });
        branches.push({ n, path });
        svg.append(path);
        return p;
      })(tree.root);
      const leaves = [];
      for (const leaf of tree.order) {
        const y = top + rowH * (rowOf.get(leaf) + 0.5);
        const g = svgEl("g");
        const mark = svgEl("rect", { x: 4, y: y - fsz * 0.55, width: fsz * 1.1, height: fsz * 1.1, rx: 3 });
        const t = svgEl("text", { x: fsz * 1.1 + 12, y, "dominant-baseline": "central", "font-size": fsz, fill: COL.text, class: "mono", "font-weight": 700 });
        t.textContent = shortName(leaf);
        g.append(mark, t);
        svg.append(g);
        leaves.push({ leaf, mark });
      }
      const cut = svgEl("g", { class: "cutline" });
      cut.append(svgEl("line", { x1: 0, x2: 0, y1: top - fsz * 0.6, y2: height - bottom + 4, stroke: COL.cream, "stroke-width": 2.2, "stroke-dasharray": "6 5" }));
      const lab = svgEl("g");
      lab.append(svgEl("rect", { x: -fsz * 2.4, y: 2, width: fsz * 4.8, height: fsz * 1.45, rx: 4, fill: COL.cream }));
      const lt = svgEl("text", { x: 0, y: 2 + fsz * 0.74, "text-anchor": "middle", "dominant-baseline": "central", "font-size": fsz, "font-weight": 700, fill: "#2a2214", class: "mono" });
      lab.append(lt);
      cut.append(lab);
      svg.append(cut);
      host.innerHTML = "";
      host.append(svg);
      rec = TREE_CACHE[opts.id] = { sig, svg, zone, branches, leaves, cut, lt, xOf };
    }
    // update colours and cut position (animated through CSS transitions)
    const theta = info.theta;
    const xc = rec.xOf(theta);
    rec.cut.style.transform = `translateX(${xc}px)`;
    rec.lt.textContent = "θ " + f2(theta);
    rec.zone.setAttribute("width", Math.max(0, xc - x0));
    for (const { n, path } of rec.branches) {
      const inside = n.height >= theta - 1e-9;
      const st = info.style[n.members[0]];
      path.setAttribute("stroke", inside && st.placed ? st.color : COL.branchOff);
      path.setAttribute("stroke-width", inside ? 3.2 : 1.6);
      path.setAttribute("stroke-dasharray", inside ? "" : "4 5");
    }
    for (const { leaf, mark } of rec.leaves) {
      const st = info.style[leaf];
      mark.setAttribute("fill", st.placed ? st.color : "none");
      mark.setAttribute("stroke", st.placed ? st.color : COL.creamDeep);
      mark.setAttribute("stroke-dasharray", st.placed ? "" : "3 3");
      mark.setAttribute("stroke-width", 1.6);
    }
  }
  function collectHeights(n) { return n.leaf !== undefined ? n.leaf : [collectHeights(n.left), +n.height.toFixed(4), collectHeights(n.right)]; }

  function legendHTML(info) {
    const groups = new Map();
    SAMPLES.forEach((s, i) => {
      const st = info.style[i];
      const k = st.placed ? st.no : "u";
      if (!groups.has(k)) groups.set(k, { st, members: [] });
      groups.get(k).members.push(shortName(i));
    });
    const items = [];
    for (const [k, g] of groups) if (k !== "u") items.push(`<span>${famTag(g.st)} <span class="members">${esc(g.members.join(", "))}</span></span>`);
    if (groups.has("u")) items.push(`<span>${famTag(groups.get("u").st)} <span class="members">${esc(groups.get("u").members.join(", "))}</span></span>`);
    return `<div class="legend" aria-label="Families at θ">${items.join("")}</div>`;
  }

  // ------------------------------------------------------------- heatmap --
  function drawHeatmap(host, m, opts = {}) {
    if (!host) return;
    const availableWidth = Math.max(host.clientWidth, opts.minWidth || 260);
    const fsz = px(opts.labelSize || 0.86);
    const longestLabel = Math.max(...SAMPLES.map((sample,i)=>shortName(i).length)) * fsz * .62;
    const labelW = Math.max(fsz * 6.4,longestLabel + 10);
    const topH = Math.max(fsz * 5.6,longestLabel * Math.sin(50 * Math.PI / 180) + 12);
    const dense=N>25;
    const maxCell = dense ? 14 : opts.maxCell || 50;
    const cell = Math.max(dense ? 10 : 18, Math.min(maxCell, Math.floor((availableWidth - labelW - fsz * 3.2) / N), opts.maxH && !dense ? Math.floor((opts.maxH - topH - 4) / N) : 999));
    const height = topH + cell * N + 4;
    const width = labelW + cell * N + fsz * 3.2;
    const svg = svgEl("svg", { class: "viz", viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-label": opts.aria || "Pairwise similarity heatmap" });
    const color = (v) => {
      const low=v<=.5?[255,245,240]:[251,106,74],high=v<=.5?[251,106,74]:[153,0,13],t=v<=.5?v*2:(v-.5)*2;
      const rgb=low.map((value,k)=>Math.round(value+(high[k]-value)*t));
      const linear=rgb.map(value=>{const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
      const luminance=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
      return {fill:`rgb(${rgb.join(",")})`,ink:luminance>.179?"#000000":"#ffffff"};
    };
    for (let i = 0; i < N; i++) {
      const tl = svgEl("text", { x: labelW - 6, y: topH + cell * i + cell / 2, "text-anchor": "end", "dominant-baseline": "central", "font-size": fsz, fill: COL.muted, class: "mono" });
      tl.textContent = shortName(i); if(!dense || i%10===0) svg.append(tl);
      const tt = svgEl("text", { transform: `translate(${labelW + cell * i + cell / 2},${topH - 6}) rotate(-50)`, "font-size": fsz, fill: COL.muted, class: "mono" });
      tt.textContent = shortName(i); if(!dense || i%10===0) svg.append(tt);
      for (let j = 0; j < N; j++) {
        const v = m[i][j],colors=color(v);
        const x = labelW + cell * j, y = topH + cell * i;
        const g = svgEl("g", { class: opts.onPick && i !== j ? "hcell" : "" });
        g.dataset.i = i; g.dataset.j = j;
        const rect = svgEl("rect", { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill: colors.fill, rx: 3 });
        if (i !== j && v >= state.theta - 1e-9) { rect.setAttribute("stroke", COL.cream); rect.setAttribute("stroke-width", 2); }
        const sel = opts.pair && ((opts.pair[0] === i && opts.pair[1] === j) || (opts.pair[0] === j && opts.pair[1] === i));
        if (sel) { rect.setAttribute("stroke", COL.saa); rect.setAttribute("stroke-width", 3.5); }
        const t = svgEl("text", { x: x + cell / 2, y: y + cell / 2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": Math.min(fsz, Math.max(14, cell * 0.44)), fill: colors.ink, class: "mono", "font-weight": 700 });
        t.textContent = i === j ? "1" : v.toFixed(2).replace(/^0/, "");
        const title = svgEl("title"); title.textContent = `${SAMPLES[i].name} ~ ${SAMPLES[j].name}: ${f3(v)}`;
        g.append(title, rect);
        if(!dense) g.append(t);
        svg.append(g);
      }
    }
    host.innerHTML = "";
    host.append(svg);
    if (opts.onPick) svg.addEventListener("click", (ev) => {
      const g = ev.target.closest("g[data-i]"); if (!g) return;
      const i = +g.dataset.i, j = +g.dataset.j;
      if (i !== j) opts.onPick(i, j);
    });
  }

  // ------------------------------------------------------------- scatter --
  function drawScatter(host, pts, info, height) {
    if (!host) return;
    const width = Math.max(host.clientWidth, 300);
    const pad = 70;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)], [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const sx = (x) => pad + ((x - x0) / (x1 - x0 || 1)) * (width - 2 * pad);
    const sy = (y) => height - pad / 1.4 - ((y - y0) / (y1 - y0 || 1)) * (height - 1.5 * pad);
    const svg = svgEl("svg", { class: "viz", viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-label": "2-D map of specimens" });
    const placed = [];
    pts.forEach((p, i) => {
      const st = info.style[i];
      const x = sx(p.x), y = sy(p.y);
      let ly = y - 16;
      for (const q of placed) if (Math.abs(q.x - x) < 110 && Math.abs(q.y - ly) < fs()) ly = q.y - fs() * 1.15;
      placed.push({ x, y: ly });
      const c = svgEl("circle", { cx: x, cy: y, r: N>25?4:10, fill: st.placed ? st.color : COL.ground, stroke: st.placed ? st.color : COL.creamDeep, "stroke-width": 2, "stroke-dasharray": st.placed ? "" : "4 3" });
      const t = svgEl("text", { x, y: ly, "text-anchor": "middle", "font-size": px(0.88), fill: COL.text, class: "mono", "font-weight": 700 });
      t.textContent = shortName(i);
      const title=svgEl("title");title.textContent=`${SAMPLES[i].name} · ${st.placed?st.label:"Unplaced"}`;c.append(title);
      svg.append(c);
      if(N<=25||i===state.selA||i===state.selB) svg.append(t);
    });
    host.innerHTML = "";
    host.append(svg);
  }

  // --------------------------------------------------- convergence chart --
  function drawConvergence(host, i, j, height) {
    if (!host) return;
    const width = Math.max(host.clientWidth, 280);
    const exact = SCA_EXACT[i][j];
    const fsz = px(0.88);
    const padL = fsz * 2.9, padR = 14, padT = 12, padB = fsz * 2.6;
    const lx = (k) => padL + (Math.log2(k) / 8) * (width - padL - padR);
    const ly = (v) => padT + (1 - v) * (height - padT - padB);
    const svg = svgEl("svg", { class: "viz", viewBox: `0 0 ${width} ${height}`, width, height, role: "img", "aria-label": "MinHash estimate as k grows" });
    for (const v of [0, 0.5, 1]) {
      svg.append(svgEl("line", { x1: padL, x2: width - padR, y1: ly(v), y2: ly(v), stroke: COL.rule }));
      const t = svgEl("text", { x: padL - 6, y: ly(v), "text-anchor": "end", "dominant-baseline": "central", "font-size": fsz, fill: COL.muted, class: "mono" });
      t.textContent = v.toFixed(1); svg.append(t);
    }
    for (const k of [1, 4, 16, 64, 256]) {
      const t = svgEl("text", { x: lx(k), y: height - padB + fsz * 1.1, "text-anchor": "middle", "font-size": fsz, fill: COL.muted, class: "mono" });
      t.textContent = k; svg.append(t);
    }
    const xl = svgEl("text", { x: (padL + width - padR) / 2, y: height - 3, "text-anchor": "middle", "font-size": fsz, fill: COL.muted });
    xl.textContent = "k, number of hash functions"; svg.append(xl);
    let band = "";
    for (let k = 1; k <= 256; k++) band += `${k === 1 ? "M" : "L"}${lx(k)},${ly(Math.min(1, exact + Math.sqrt((exact * (1 - exact)) / k)))}`;
    for (let k = 256; k >= 1; k--) band += `L${lx(k)},${ly(Math.max(0, exact - Math.sqrt((exact * (1 - exact)) / k)))}`;
    svg.append(svgEl("path", { d: band + "Z", fill: COL.sca, "fill-opacity": 0.13 }));
    svg.append(svgEl("line", { x1: padL, x2: width - padR, y1: ly(exact), y2: ly(exact), stroke: COL.white, "stroke-dasharray": "6 5", "stroke-width": 1.6 }));
    const el = svgEl("text", { x: width - padR, y: ly(exact) - 8, "text-anchor": "end", "font-size": fsz, fill: COL.white });
    el.textContent = `exact ${f2(exact)}`; svg.append(el);
    let d = "", m = 0;
    for (let k = 1; k <= 256; k++) {
      if (SIG[i].sig[k - 1] === SIG[j].sig[k - 1]) m++;
      d += `${k === 1 ? "M" : "L"}${lx(k).toFixed(1)},${ly(m / k).toFixed(1)}`;
    }
    svg.append(svgEl("path", { d, fill: "none", stroke: COL.sca, "stroke-width": 2.4 }));
    const est = C.minhashEstimate(SIG[i].sig.slice(0, state.k), SIG[j].sig.slice(0, state.k)).est;
    svg.append(svgEl("circle", { cx: lx(state.k), cy: ly(est), r: 6.5, fill: COL.sca, stroke: COL.ground, "stroke-width": 2.5 }));
    const tl = svgEl("text", { x: lx(state.k) - 10, y: ly(est) + (est >= exact ? -12 : 20), "text-anchor": "end", "font-size": px(0.9), fill: COL.sca, "font-weight": 700, class: "mono" });
    tl.textContent = `k=${state.k}: ${f2(est)}`; svg.append(tl);
    host.innerHTML = "";
    host.append(svg);
  }

  // ------------------------------------------------------- stage helpers --
  const sampleOptions = (sel) => SAMPLES.map((s, i) => `<option value="${i}"${i === sel ? " selected" : ""}>${esc(s.name)}</option>`).join("");
  function pairControls() {
    return `<div class="ctl"><span class="lab" id="pairLab">Compare</span>
        <span class="seg" role="group" aria-labelledby="pairLab">${KEY.map((p, n) => `<button data-pair="${n}" aria-pressed="false" title="${esc(p.a)} vs ${esc(p.b)}: ${esc(p.note)}">${esc(p.label)}</button>`).join("")}</span></div>
      <div class="ctl"><label for="selA">A</label><select id="selA" data-ctl="selA">${sampleOptions(state.selA)}</select>
        <label for="selB">B</label><select id="selB" data-ctl="selB">${sampleOptions(state.selB)}</select></div>`;
  }
  function thetaControls(withSlider = true) {
    return `<div class="ctl"><label for="theta">Threshold θ</label>
      ${withSlider ? `<input id="theta" type="range" min="0.3" max="0.95" step="0.05" value="${state.theta}" data-ctl="theta">` : ""}
      <span class="val" data-bind="theta">${f2(state.theta)}</span>
      <span class="seg" role="group" aria-label="Thresholds the paper tested">${[0.5, 0.6, 0.7, 0.8, 0.9].map((t) => `<button data-theta="${t}" aria-pressed="false">${t.toFixed(1)}</button>`).join("")}</span></div>`;
  }
  function syncControls() {
    const st = $("#stage");
    const press = (sel, test) => $$(sel, st).forEach((b) => b.setAttribute("aria-pressed", String(test(b))));
    press("[data-pair]", (b) => { const p = KEY[+b.dataset.pair]; return (p.i === state.selA && p.j === state.selB) || (p.j === state.selA && p.i === state.selB); });
    press("[data-theta]", (b) => Math.abs(+b.dataset.theta - state.theta) < 1e-9);
    press("[data-alpha]", (b) => Math.abs(+b.dataset.alpha - state.alpha) < 1e-9);
    press("[data-kset]", (b) => +b.dataset.kset === state.k);
    press("[data-query]", (b) => +b.dataset.query === state.query);
    press("[data-tab]", (b) => b.dataset.tab === state.resultsTab);
    press("[data-heat]", (b) => b.dataset.heat === state.heatSource);
    press("[data-view]", (b) => b.dataset.view === state.searchView);
    press("[data-effn]", (b) => +b.dataset.effn === state.effN);
    press("[data-effm]", (b) => +b.dataset.effm === state.effM);
    const setVal = (sel, v) => { const e = $(sel, st); if (e && document.activeElement !== e) e.value = v; };
    setVal("#guideQuery",state.selA); setVal("#selA", state.selA); setVal("#selB", state.selB); setVal("#query", state.query); setVal("#specimen", state.selA);
    setVal("#theta", state.theta); setVal("#alpha", state.alpha); setVal("#kslider", K_VALUES.indexOf(state.k));
    $$("input[type=range]", st).forEach((r) => r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min)) * 100 + "%"));
    $$("[data-bind]", st).forEach((e) => {
      const b = e.dataset.bind;
      if (b === "theta") e.textContent = f2(state.theta);
      if (b === "alpha") e.textContent = f2(state.alpha);
      if (b === "k") e.textContent = state.k;
    });
  }
  // available height for the stage body, so steps fit 1280×720 without scrolling
  const bodyH = () => ($("#stage") ? $("#stage").clientHeight : 500);
  // height a chart may use: the space its flex host was given
  const vizH = (host, lo = 140, hi = 900) => (host ? clampN(host.clientHeight || lo, lo, hi) : lo);

  // --------------------------------------------------------------- stages --
  // Each lesson reveals its calculation, then its output. Only one is visible.
  const GUIDE_LABELS = ["Related variants", "Rewritten code", "Reused code", "Similar attributes"];
  const examples = () => `<div class="guide-examples"><span>Example</span><div class="seg" role="group" aria-label="Example pairs">${KEY.map((p,n) => `<button data-pair="${n}" aria-pressed="false" title="${esc(p.a)} compared with ${esc(p.b)}">${GUIDE_LABELS[n]}</button>`).join("")}</div></div>`;
  const pairSelectors = () => `<div class="pair-selectors" role="group" aria-label="Choose samples to compare">${["A","B"].map(letter=>`<label for="pair${letter}">${letter}</label><select id="pair${letter}" data-ctl="sel${letter}" aria-label="Sample ${letter}">${sampleOptions(state[`sel${letter}`])}</select>`).join("")}</div>`;
  const pairName = (editable=false) => `${editable?pairSelectors():`<div class="guide-pair">A: ${esc(shortName(state.selA))}<span>compared with</span>B: ${esc(shortName(state.selB))}</div>`}<p class="guide-truth">Known synthetic relationship: <b>${SAMPLES[state.selA].family===SAMPLES[state.selB].family ? "same family — expected link" : "different families — expected no link"}</b>.</p>`;
  const takeaway = text => `<p class="guide-takeaway">${text}</p>`;
  const guideShell = content => `<div class="guide-content">${content}</div>`;
  const scoreBar = (label, score, kind) => `<div class="guide-score"><b class="t-${kind}">${label}</b><div class="guide-track"><i style="left:${state.theta*100}%" aria-hidden="true"></i><span style="width:${score*100}%;background:${COL[kind]}"></span></div><strong class="num">${f2(score)}</strong><span class="guide-decision">${score >= state.theta ? "linked" : "apart"}</span></div>`;
  const LESSONS = {
    features: { key: "inputView", scenes: [["overview", "Framework overview"], ["input", "Input data"], ["preprocess", "Preprocessing"]] },
    minhash: { key: "scaView", scenes: [["features", "Feature sets"], ["hash", "Build signatures"], ["method", "Estimate similarity"], ["output", "Search output"]] },
    jaccard: { key: "saaView", scenes: [["sets", "Attribute sets"], ["method", "Calculate index"], ["output", "Graph output"]] },
    combine: { key: "combineView", scenes: [["vectors", "Code vectors"], ["products", "Products & sums"], ["cosine", "Cosine similarity"], ["blend", "Weighted combination"]] }
  };
  const FRAMEWORK = [
    { id:"input", label:"Input data", detail:"Executable samples", step:0, key:"inputView", scene:"input", box:[0,150,160,120] },
    { id:"preprocess", label:"Preprocessing", detail:"Validate and extract features", step:0, key:"inputView", scene:"preprocess", box:[200,150,190,120] },
    { id:"sca", label:"SCA", detail:"Shared Code Analysis", step:1, key:"scaView", scene:"features", box:[450,10,190,110] },
    { id:"saa", label:"SAA", detail:"Shared Attribute Analysis", step:2, key:"saaView", scene:"sets", box:[450,270,190,110] },
    { id:"integrate", label:"Integrated similarity computation", detail:"Cosine similarity + Jaccard index", step:3, key:"combineView", scene:"vectors", box:[730,140,270,140] },
    { id:"cluster", label:"Clustering and anomaly detection", detail:"Threshold links and find groups", step:4, key:"outputView", scene:"graph", box:[730,400,270,120] },
    { id:"visualize", label:"Visualization", detail:"Graph, matrix and t-SNE", step:4, key:"outputView", scene:"graph", box:[450,400,190,120] },
    { id:"interpret", label:"Results interpretation", detail:"Read relationships and limits", step:4, key:"outputView", scene:"scatter", box:[200,400,190,120] }
  ];
  function frameworkOverview() {
    const paths=["M160 210H200","M390 195H420V65H450","M390 225H420V325H450","M640 65H690V180H730","M640 325H690V240H730","M865 280V400","M730 460H640","M450 460H390"];
    return `<div class="guide-content framework-overview"><div class="framework-map" aria-label="SCA and SAA framework. Input data flows through preprocessing into parallel SCA and SAA analysis, then integrated similarity, clustering, visualization and interpretation."><svg class="framework-connections" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="framework-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>${paths.map(d=>`<path d="${d}" marker-end="url(#framework-arrow)"/>`).join("")}</svg>${FRAMEWORK.map(node=>{
      const [x,y,w,h]=node.box;
      return `<button class="framework-node node-${node.id}" data-framework="${node.id}" style="left:${x/10}%;top:${y/5.2}%;width:${w/10}%;height:${h/5.2}%" aria-label="Explore ${esc(node.label)}"><strong>${node.label}</strong><span>${node.detail}</span></button>`;
    }).join("")}</div></div>`;
  }
  function openFramework(id) {
    const node=FRAMEWORK.find(n=>n.id===id); if(!node) return;
    state.detail=node.step===0;
    state.returnStep=0;
    state.overviewFocus=id;
    goStep(node.step);
    state[node.key]=node.scene;
    renderHead(); renderStage(false); refreshAll();
  }
  function returnFramework() {
    state.detail=false;
    goStep(0); state.inputView="overview"; renderHead(); renderStage(false); refreshAll();
  }
  function zoomFramework(id) {
    if(id===null) returnFramework(); else openFramework(id);
    $("#stepTitle").setAttribute("tabindex","-1");
    $("#stepTitle").focus({preventScroll:true});
  }
  function lessonTabs(id) {
    const lesson=LESSONS[id];
    return `<div class="guide-toolbar"><div class="seg lesson-scenes" role="group" aria-label="Calculation stages">${lesson.scenes.map(([scene,label],n)=>`<button data-lesson="${scene}" data-lesson-key="${lesson.key}" aria-pressed="${state[lesson.key]===scene}">${n+1}. ${label}</button>`).join("")}</div></div>`;
  }
  function setColumns(key) {
    const a=SAMPLES[state.selA],b=SAMPLES[state.selB],r=C.jaccard(a[key],b[key]);
    const groups=[[`Only ${shortName(state.selA)}`,r.onlyA],["Shared",r.shared],[`Only ${shortName(state.selB)}`,r.onlyB]];
    const column=(label,items,all)=>`<section><h3>${esc(label)} <span class="num">(${items.length})</span></h3><ul>${items.slice(0,all?items.length:3).map(x=>`<li><code>${esc(x)}</code></li>`).join("")||"<li>None</li>"}</ul>${!all&&items.length>3?`<p class="caption">+ ${items.length-3} more</p>`:""}</section>`;
    return `<div class="feature-sets ${key==="code"?"code-sets":"attribute-sets"}">${groups.map(([label,items])=>column(label,items,false)).join("")}</div><p class="set-counts"><b>Intersection: ${r.inter} shared.</b> Union: ${r.onlyA.length} + ${r.inter} + ${r.onlyB.length} = <b>${r.union} distinct ${key==="code"?"code features":"attributes"}</b>.</p><details class="guide-details"><summary>Inspect all ${key==="code"?"code features":"attributes"}</summary><div class="feature-sets">${groups.map(([label,items])=>column(label,items,true)).join("")}</div></details>`;
  }
  function hashWalkthrough() {
    const i=state.selA;
    return `<h2>One hash function produces one signature position</h2><p>Apply each function to every code feature in ${esc(shortName(i))}. Keep its smallest hash value.</p><div class="hash-functions">${[0,1,2].map(slot=>{
      const rows=SAMPLES[i].code.map(token=>({token,value:C.murmur3(token,C.seedFor(slot))})).sort((a,b)=>a.value-b.value).slice(0,2);
      return `<section><h3>Hash function ${slot+1}</h3><ol>${rows.map((r,n)=>`<li class="${n===0?"minimum":""}"><code>${esc(r.token)}</code><span class="num">${hex(r.value,8)}${n===0?" · minimum":""}</span></li>`).join("")}</ol><p>Signature[${slot+1}] = <b class="num t-sca">${hex(SIG[i].sig[slot],8)}</b></p></section>`;
    }).join("")}</div><p class="caption">Two lowest values shown per function; minima are taken over all ${SAMPLES[i].code.length} features. Hashes are displayed in hexadecimal.</p>${takeaway(`Repeat with <b>${state.k} hash functions</b> for both samples. The same functions and seeds give comparable signatures.`)}`;
  }
  const BLOCK_LABELS = new Map();
  PE.forEach(pe=>pe.regions.filter(r=>r.kind==="code").forEach(r=>{
    const key=Array.from(pe.bytes.slice(r.start,r.end),b=>hex(b,2)).join("");
    BLOCK_LABELS.set(key,r.label);
  }));
  function vectorTable(details, products=false, all=false) {
    const shared=details.terms.filter(t=>t.a&&t.b),onlyA=details.terms.filter(t=>t.a&&!t.b),onlyB=details.terms.filter(t=>!t.a&&t.b);
    const shown=all?details.terms:[...shared.slice(0,1),...onlyA.slice(0,1),...onlyB.slice(0,1)];
    return `<div class="vector-scroll"><table class="t vector-table"><caption>${all?"All":"Selected"} aligned block counts${products?" and products":""}</caption><thead><tr><th>16-byte block (fragment label)</th><th>A count</th><th>B count</th>${products?"<th>A × B</th><th>A²</th><th>B²</th>":""}</tr></thead><tbody>${shown.map(t=>`<tr class="${t.a&&t.b?"shared-block":""}"><th scope="row"><code>${esc(BLOCK_LABELS.get(t.key)||t.key)}</code></th><td>${t.a}</td><td>${t.b}</td>${products?`<td>${t.product}</td><td>${t.squareA}</td><td>${t.squareB}</td>`:""}</tr>`).join("")}</tbody>${products?`<tfoot><tr><th scope="row">Totals over all ${details.terms.length} blocks</th><td>—</td><td>—</td><td>${details.dot}</td><td>${details.squareA}</td><td>${details.squareB}</td></tr></tfoot>`:""}</table></div>${!all?`<p class="caption">${shown.length} of ${details.terms.length} distinct blocks shown. ${shared.length} shared, ${onlyA.length} only in A, ${onlyB.length} only in B. ${products?"Totals include every block.":"A zero means the block is absent."}</p>`:""}`;
  }
  function methodReason(metric) {
    const same=SAMPLES[state.selA].family===SAMPLES[state.selB].family,linked=matrixFor(metric)[state.selA][state.selB]>=state.theta;
    if(linked===same) return same ? "Shared features support the known relationship at this threshold." : "The feature overlap is below the threshold, consistent with different families.";
    return same ? `The samples are related, but too few ${metric==="sca"?"code features":"attributes"} match to pass the threshold. This is a false negative.` : `The shared ${metric==="sca"?"code features":"attributes"} are not specific to one family. Similarity passes the threshold even though the families differ: a false positive.`;
  }
  function decision(linked, same) {
    return verdict(linked===same, linked===same ? "Correct decision" : same ? "Missed relationship (false negative)" : "Incorrect relationship (false positive)");
  }
  const pairOutcome = metric => {
    const same=SAMPLES[state.selA].family===SAMPLES[state.selB].family;
    const score=matrixFor(metric)[state.selA][state.selB], linked=score>=state.theta;
    return `${decision(linked,same)} <span>${f3(score)} ${linked ? "≥" : "<"} ${f2(state.theta)} → ${linked ? "link" : "no link"}.</span>`;
  };
  function evidence(metric) {
        const n=KEY.findIndex(p=>(p.i===state.selA&&p.j===state.selB)||(p.j===state.selA&&p.i===state.selB));
    const reasons=metric==="sca" ? ["Related variants retain most code features.","Rewriting replaces code features even though these samples remain related.","A shared loader kit contributes code features to two different families.","These different families share little code."] : ["Related variants retain most attributes.","The code changed, but most attributes were retained.","The reused loader does not imply similar attributes.","Generic ransomware attributes occur in different families."];
    return `<p class="guide-evidence">${reasons[n]||"Inspect shared features alongside the known synthetic relationship."}</p>`;
  }
  function caseText() {
    const i=state.selA,j=state.selB,same=SAMPLES[i].family===SAMPLES[j].family;
    const scaLinked=shareSketch(i,j,state.k)&&scaAt(state.k)[i][j]>=state.theta;
    const saaLinked=SAA[i][j]>=state.theta, combinedLinked=finalM()[i][j]>=state.theta;
    const wrong=[];
    if(scaLinked!==same) wrong.push("SCA search");
    if(saaLinked!==same) wrong.push("SAA");
    if(combinedLinked!==same) return "The combined decision is still incorrect at these settings. A weighted blend does not guarantee the correct relationship.";
    return wrong.length ? `The combined evidence resolves the ${wrong.join(" and ")} error at these settings.` : "The individual methods and combined decision agree with the known relationship at these settings.";
  }
  function searchOutcome() {
    const i=state.selA,j=state.selB,same=SAMPLES[i].family===SAMPLES[j].family;
    if(!shareSketch(i,j,state.k)) return `${decision(false,same)} Selected pair: skipped by sketch lookup; not scored in this search.`;
    return `${pairOutcome("sca")} Selected pair was retrieved by sketch lookup.`;
  }
  // Desktop presentation: formulas, evidence and full-stage output.
  const P = window.Presentation;
  const tex = (source, block = false) => window.katex.renderToString(source, { displayMode:block, throwOnError:true, output:"htmlAndMathml" });
  const paperThreshold = () => `Default ${tex(String.raw`\theta=0.70`)}: within the paper’s precision–recall balance range of ${tex(String.raw`0.70\text{–}0.80`)} (Sec. IV.C).`;
  function sharedAttributeExamples(shared) {
    const chosen=[];
    for(const kind of ['api','net','mutex','file','reg','cmd','ua','ext','note']) {
      const item=shared.find(value=>cat(value)===kind);
      if(item&&chosen.length<4)chosen.push(item);
    }
    for(const item of shared)if(chosen.length<4&&!chosen.includes(item))chosen.push(item);
    const names={api:'API name',net:'Network indicator',mutex:'Mutex',file:'File path',reg:'Registry key',cmd:'Command',ua:'User agent',ext:'File extension',note:'Note filename'};
    return `<section class="shared-attribute-examples" aria-label="Attributes present in both samples"><h3>Shared attributes${shared.length?` · ${chosen.length} of ${shared.length} shown`:''}</h3>${chosen.length?`<dl>${chosen.map(item=>`<div><dt>${names[cat(item)]||'Attribute'}</dt><dd><code data-shared-attribute="${esc(item)}">${esc(item.slice(item.indexOf(':')+1))}</code></dd></div>`).join('')}</dl>`:'<p>None: these samples have no attribute values in common.</p>'}</section>`;
  }
  function vectorConstruction(d) {
    const chosen=[];
    for(const group of [d.terms.filter(t=>t.a&&t.b),d.terms.filter(t=>t.a&&!t.b),d.terms.filter(t=>!t.a&&t.b),d.terms]) {
      const term=group.find(t=>!chosen.includes(t));if(term&&chosen.length<2)chosen.push(term);
    }
    const feature=t=>`f_{${d.terms.indexOf(t)+1}}`;
    const codeBlock=t=>t.key.match(/.{1,8}/g).join(" ");
    let content;
    if(state.vectorStep==="vectors") {
      const preview=d.terms.slice(0,6), last=d.terms[d.terms.length-1];
      const tail=axis=>d.terms.length>preview.length?String.raw`,\ldots,${last[axis]}`:"";
      content=`<p>Each coordinate is a block’s occurrence count, in the same feature order.</p><div class="vector-excerpt">${tex(String.raw`\mathbf a^{T}=[${preview.map(t=>t.a).join(",")}${tail("a")}],\qquad\mathbf b^{T}=[${preview.map(t=>t.b).join(",")}${tail("b")}]`,true)}</div><p class="caption">First ${preview.length} and final coordinate (${d.terms.length}) shown; 0 = absent. All ${d.terms.length} enter cosine similarity.</p>`;
    } else if(state.vectorStep==="cosine") {
      content=`<div class="vector-numeric">${tex(String.raw`\frac{${d.dot}}{\sqrt{${d.squareA}}\sqrt{${d.squareB}}}\approx ${f3(d.similarity)}`,true)}</div><p class="caption">Across all ${d.terms.length} positions: ${tex(String.raw`\sum a_i b_i=${d.dot},\quad\sum a_i^2=${d.squareA},\quad\sum b_i^2=${d.squareB}`)}.</p>`;
    } else {
      content=`<table class="code-block-excerpt" aria-label="Actual 16-byte code blocks and their occurrence counts"><thead><tr><th>Feature</th><th>Actual block bytes · hex (${chosen.length}/${d.terms.length} shown)</th><th>A</th><th>B</th></tr></thead><tbody>${chosen.map(t=>`<tr><th scope="row" title="${esc(BLOCK_LABELS.get(t.key)||t.key)}">${tex(feature(t))}</th><td><code title="${esc(BLOCK_LABELS.get(t.key)||t.key)}">${codeBlock(t)}</code></td><td>${t.a}</td><td>${t.b}</td></tr>`).join("")}</tbody></table>`;
    }
    return `<div class="cosine-definition" title="Code cosine similarity, calculated independently of MinHash">${tex(String.raw`S_{\mathrm{SCA}}(i,j)=\cos(\mathbf a,\mathbf b)=\frac{\mathbf a\cdot\mathbf b}{\lVert\mathbf a\rVert\,\lVert\mathbf b\rVert}`,true)}</div><div class="seg vector-nav" role="group" aria-label="Build the code vectors">${[["blocks","1. Blocks → counts"],["vectors","2. Counts → vectors"],["cosine","3. Cosine similarity"]].map(([id,label])=>`<button data-vector-step="${id}" aria-pressed="${state.vectorStep===id}">${label}</button>`).join("")}</div><div class="vector-stage" aria-live="polite">${content}</div>`;
  }
  function synthesisBody() {
    const d=C.cosineDetails(CODE_VECTORS[state.selA],CODE_VECTORS[state.selB]), a=SAMPLES[state.selA],b=SAMPLES[state.selB],r=C.jaccard(a.attrs,b.attrs),fin=finalM()[state.selA][state.selB],linked=fin>=state.theta,same=a.family===b.family;
    return `${pairName(true)}<div class="synthesis-calculations"><section class="calculation-panel calculation-sca" aria-labelledby="scaCalculationTitle"><h2 id="scaCalculationTitle">SCA calculation <span class="sca-current-score">${tex(String.raw`\approx ${f3(d.similarity)}`)}</span></h2>${vectorConstruction(d)}</section><section class="calculation-panel calculation-saa" aria-labelledby="saaCalculationTitle"><h2 id="saaCalculationTitle">SAA calculation</h2><div class="calculation-inputs attribute-counts"><span>Only A: <b>${r.onlyA.length}</b></span><span>Shared: <b>${r.inter}</b></span><span>Only B: <b>${r.onlyB.length}</b></span></div>${sharedAttributeExamples(r.shared)}<div class="calculation-equation">${tex(String.raw`S_{\mathrm{SAA}}(i,j)=\frac{|A\cap B|}{|A\cup B|}=\frac{${r.inter}}{${r.union}}\approx ${f3(r.j)}`,true)}</div></section></div><section class="synthesis-combination" aria-labelledby="combinationTitle"><h2 id="combinationTitle">Combination</h2><p class="caption combination-weights">${tex(String.raw`\alpha`)} = code similarity weight (${tex(f2(state.alpha))}); ${tex(String.raw`(1-\alpha)`)} = attribute similarity weight (${tex(f2(1-state.alpha))}).</p><div class="synthesis-equation combination-formula">${tex(String.raw`S_{\mathrm{final}}(i,j)=\alpha\cdot S_{\mathrm{SCA}}(i,j)+(1-\alpha)\cdot S_{\mathrm{SAA}}(i,j),\qquad\alpha\in[0,1]`,true)}</div><div class="combination-main"><div class="synthesis-equation">${tex(String.raw`S_{\mathrm{final}}(i,j)=\alpha\times ${f3(d.similarity)}+(1-\alpha)\times ${f3(r.j)}\approx ${f3(fin)}`,true)}</div><div class="combination-decision">${decision(linked,same)}${tex(String.raw`${f3(fin)} ${linked?"\\ge":"<"} ${f2(state.theta)}\;\Rightarrow\;\text{${linked?"link":"no link"}}`)}</div></div><div class="combination-footer"><div class="synthesis-settings"><label for="alpha">Code / attribute weights (${tex(String.raw`\alpha / (1-\alpha)`)})</label><input id="alpha" type="range" min="0" max="1" step="0.05" value="${state.alpha}" data-ctl="alpha"><span>${tex(String.raw`${f2(state.alpha)}\,/\,${f2(1-state.alpha)}`)}</span><button class="btn" data-alpha="0.6">Reset weights</button></div><p class="caption">The paper experimentally uses ${tex(String.raw`\alpha=0.60`)} and ${tex(String.raw`(1-\alpha)=0.40`)} (Eq. 2).</p><p class="caption">${paperThreshold()}</p></div></section>`;
  }
  let outputPlayback={key:null,time:0,playing:false,token:0,paint:null};
  function outputShell() {
    return `<div class="output-content"><div class="output-toolbar"><div class="seg" role="group" aria-label="Analysis view">${[["graph","Clustering"],["heatmap","Similarity matrix"],["scatter","t-SNE"]].map(([id,label])=>`<button data-analysis="${id}" aria-pressed="${state.outputView===id}">${label}</button>`).join("")}</div><div class="output-cutoff"><label for="theta">${state.outputView==="scatter"?"Group cutoff":"Link cutoff"}</label><input id="theta" type="range" min="0.5" max="0.9" step="0.05" value="${state.theta}" data-ctl="theta"><span class="num" data-bind="theta">${f2(state.theta)}</span></div></div><div id="outputPair" class="output-pair"></div><div id="guideAnalysis" class="output-visual"></div></div>`;
  }
  const motionReduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function drawTsneAxes(svg,movie) {
    const {width,height,axes,info}=movie;
    const layer=svgEl('g',{'aria-label':'Projection axes and graph group legend','pointer-events':'none'});
    const text=(value,x,y,attrs={})=>{
      const label=svgEl('text',{x,y,fill:COL.muted,'font-size':24,...attrs});
      label.textContent=value;layer.append(label);
    };
    layer.append(svgEl('rect',{x:0,y:0,width,height,fill:'none',stroke:COL.ruleStrong,'stroke-width':1.5}));
    // Tick values use the same fixed, uniformly scaled camera as the points.
    function ticks(span,center,vertical) {
      const extent=span/(2*axes.scale),rough=2*extent/(vertical?5:8),power=10**Math.floor(Math.log10(rough));
      const step=[1,2,5,10].find(n=>n*power>=rough)*power;
      for(let k=Math.ceil(-extent/step);k<=Math.floor(extent/step);k++) {
        const value=k*step,pos=center+(vertical?-1:1)*value*axes.scale;
        layer.append(svgEl('line',vertical?{x1:-7,x2:0,y1:pos,y2:pos,stroke:COL.muted}:{x1:pos,x2:pos,y1:height,y2:height+7,stroke:COL.muted}));
        const label=Number(value.toPrecision(6)).toString();
        if(vertical)text(label,-14,pos,{'text-anchor':'end','dominant-baseline':'central'});
        else text(label,pos,height+32,{'text-anchor':'middle'});
      }
    }
    ticks(width,axes.centerX,false);ticks(height,axes.centerY,true);
    text('Component 1',width/2,height+72,{'text-anchor':'middle','font-size':28});
    text('Component 2',-85,height/2,{'text-anchor':'middle','font-size':28,transform:`rotate(-90 -85 ${height/2})`});
    const ids=[...new Set(info.comp.filter((_,i)=>info.size[i]>1))];
    const entries=ids.map((id,i)=>({label:`Group ${i+1}`,color:info.colors[info.comp.indexOf(id)]}));
    if(info.unplaced)entries.push({label:'Unplaced',color:null});
    const rows=Math.min(entries.length,17),columns=Math.ceil(entries.length/17),legendWidth=columns*185;
    layer.append(svgEl('rect',{x:width+24,y:0,width:legendWidth,height:52+rows*32,fill:COL.ground,stroke:COL.ruleStrong,'stroke-width':1.5}));
    text('Graph groups',width+40,32,{fill:COL.text,'font-weight':700});
    entries.forEach((entry,i)=>{
      const x=width+44+Math.floor(i/17)*185,y=66+(i%17)*32;
      layer.append(svgEl('circle',{cx:x,cy:y-7,r:7,fill:entry.color||COL.ground,stroke:entry.color||COL.cream,'stroke-width':1.5,'stroke-dasharray':entry.color?'':'3 3'}));
      text(entry.label,x+18,y);
    });
    svg.setAttribute('viewBox',`-110 -20 ${width+160+legendWidth} ${height+110}`);
    svg.append(layer);
  }
  function drawOutputMotion(host,m) {
    const movie=P.motion(m,state.theta,state.outputView),key=JSON.stringify([state.outputView,state.theta,state.alpha]);
    if(outputPlayback.key!==key)outputPlayback={key,time:motionReduced()?movie.duration:0,playing:!motionReduced(),token:outputPlayback.token+1};
    const token=++outputPlayback.token;
    host.innerHTML=`<div class="output-motion-chart" id="motionChart"></div><div class="output-playback"><button class="btn" data-playback="toggle" id="motionToggle">${outputPlayback.playing?"Pause":"Play"}</button><button class="btn" data-playback="replay">Replay</button><label class="sr" for="motionProgress">Animation progress</label><input id="motionProgress" data-motion-progress type="range" min="0" max="${movie.duration}" step="0.05" value="${outputPlayback.time}"><output id="motionTime"></output><button class="btn" data-playback="final">Show final</button><span id="motionPhase" class="motion-phase"></span></div>`;
    const svg=svgEl('svg',{class:'output-svg',viewBox:`0 0 ${movie.width} ${movie.height}`,role:'group','aria-label':state.outputView==='scatter'?'Interactive t-SNE map':'Interactive similarity graph'});
    if(state.outputView==='scatter')drawTsneAxes(svg,movie);
    const edgeLayer=svgEl('g'),nodeLayer=svgEl('g'),selectedLayer=svgEl('g');svg.append(edgeLayer,nodeLayer,selectedLayer);
    const lines=movie.info.edges.map(e=>{const line=svgEl('line',{stroke:COL.edge,'stroke-width':1.5,'stroke-opacity':.25});edgeLayer.append(line);return {line,e};});
    const nodes=SAMPLES.map((sample,i)=>{
      const selected=i===state.selA||i===state.selB;
      const g=svgEl('g',{class:'node',tabindex:0,role:'button','aria-label':`${sample.name}${selected?i===state.selA?', selected A':', selected B':''}`});g.dataset.i=i;
      const title=svgEl('title');title.textContent=sample.name;g.append(title);
      const circle=svgEl('circle',{r:selected?11:7,stroke:selected?COL.white:COL.cream,'stroke-width':selected?3:1.5});g.append(circle);
      if(selected){const label=svgEl('text',{x:17,y:i===state.selA?-15:26,'font-size':20,fill:COL.white,'paint-order':'stroke',stroke:COL.ground,'stroke-width':5});label.textContent=i===state.selA?'A':'B';g.append(label);}
      (selected?selectedLayer:nodeLayer).append(g);return {g,circle,selected};
    });
    $('#motionChart').append(svg);
    const progress=$('#motionProgress'),clock=$('#motionTime'),phase=$('#motionPhase'),toggle=$('#motionToggle');
    function paint() {
      const frame=movie.frame(outputPlayback.time),shown=new Set(frame.edges.map(e=>`${e.a}:${e.b}`));
      lines.forEach(({line,e})=>{const a=frame.points[e.a],b=frame.points[e.b];for(const [name,value] of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y,visibility:shown.has(`${e.a}:${e.b}`)?'visible':'hidden'}))line.setAttribute(name,value);});
      nodes.forEach(({g,circle,selected},i)=>{const p=frame.points[i],color=frame.colored?movie.info.colors[i]:null;g.setAttribute('transform',`translate(${p.x} ${p.y})`);circle.setAttribute('fill',color||COL.ground);circle.setAttribute('stroke',selected?COL.white:color||COL.cream);circle.setAttribute('stroke-dasharray',frame.colored&&!color?'3 3':'');});
      progress.value=outputPlayback.time;
      progress.setAttribute('aria-valuetext',`${outputPlayback.time.toFixed(1)} of ${movie.duration.toFixed(1)} seconds`);
      clock.textContent=`${outputPlayback.time.toFixed(1)} / ${movie.duration.toFixed(1)} s`;
      phase.textContent=frame.iteration===null?frame.phase:`${frame.phase} · ${frame.iteration}/1000`;
      toggle.textContent=outputPlayback.playing?'Pause':'Play';
      toggle.setAttribute('aria-label',outputPlayback.playing?'Pause animation':'Play animation');
    }
    outputPlayback.paint=paint;paint();
    let previous=null,pending=false;
    function schedule(){if(!pending&&outputPlayback.playing&&typeof requestAnimationFrame==='function'){pending=true;requestAnimationFrame(tick);}}
    function tick(now) {
      pending=false;
      if(token!==outputPlayback.token||state.step!==4||svg.isConnected===false)return;
      if(document.hidden)outputPlayback.playing=false;
      if(outputPlayback.playing&&previous!==null){outputPlayback.time=Math.min(movie.duration,outputPlayback.time+Math.min(.1,(now-previous)/1000));if(outputPlayback.time===movie.duration)outputPlayback.playing=false;paint();}
      previous=now;
      if(!outputPlayback.playing){paint();return;}
      schedule();
    }
    outputPlayback.start=()=>{previous=null;schedule();};
    schedule();
  }
  function drawOutputMatrix(host,m,height) {
    const indices=P.neighbourhood(state.selA,state.selB,N), cell=44, padX=60,padY=40;
    const overviewSize=Math.max(220,Math.min(height-70,host.clientWidth*.4)),oc=overviewSize/N;
    const overview=svgEl("svg",{viewBox:`0 0 ${overviewSize} ${overviewSize}`,width:overviewSize,height:overviewSize,preserveAspectRatio:"xMidYMid meet",class:"matrix-overview",role:"img","aria-label":"Overview of all 75 by 75 combined similarity scores"});
    for(let i=0;i<N;i++)for(let j=0;j<N;j++){
      const rect=svgEl("rect",{x:j*oc,y:i*oc,width:oc+.1,height:oc+.1,fill:P.color(m[i][j]).fill});
      const title=svgEl("title");title.textContent=`${shortName(i)} × ${shortName(j)}: ${f3(m[i][j])}`;rect.append(title);overview.append(rect);
    }
    for(const [i,j] of [[state.selA,state.selB],[state.selB,state.selA]])overview.append(svgEl("rect",{x:j*oc-2,y:i*oc-2,width:oc+4,height:oc+4,fill:"none",stroke:COL.ground,"stroke-width":2}));
    const box=document.createElement("section");box.className="matrix-overview-panel";box.innerHTML=`<h2>All ${N} samples</h2><p class="caption">Select a region to inspect its scores.</p>`;box.append(overview);
    overview.addEventListener("click",ev=>{
      const transform=overview.getScreenCTM(); if(!transform)return;
      const point=overview.createSVGPoint();point.x=ev.clientX;point.y=ev.clientY;
      const local=point.matrixTransform(transform.inverse());
      if(local.x<0||local.y<0||local.x>=overviewSize||local.y>=overviewSize)return;
      const i=Math.floor(local.y/oc),j=Math.floor(local.x/oc);
      if(i!==j)setPair(i,j);
    });
    const width=padX+indices.length*cell+8,h=padY+indices.length*cell+8;
    const detail=svgEl("svg",{viewBox:`0 0 ${width} ${h}`,width,height:h,preserveAspectRatio:"xMidYMid meet",class:"matrix-detail",role:"group","aria-label":"Magnified neighbourhood of the selected pair with exact scores"});
    indices.forEach((i,row)=>{
      const label=svgEl("text",{x:padX-8,y:padY+(row+.5)*cell,"text-anchor":"end","dominant-baseline":"central","font-size":14,fill:i===state.selA||i===state.selB?COL.cream:COL.text});label.textContent=`#${String(i+1).padStart(3,"0")}`;detail.append(label);
      const top=svgEl("text",{x:padX+(row+.5)*cell,y:padY-12,"text-anchor":"middle","font-size":15,fill:i===state.selA||i===state.selB?COL.cream:COL.text});top.textContent=`#${String(i+1).padStart(3,"0")}`;detail.append(top);
      indices.forEach((j,col)=>{
        const colors=P.color(m[i][j]),selected=(i===state.selA&&j===state.selB)||(j===state.selA&&i===state.selB),g=svgEl("g",{class:"matrix-cell",tabindex:i===j?-1:0,role:"button","aria-label":`${shortName(i)} and ${shortName(j)}: ${f3(m[i][j])}`});
        g.dataset.matrixA=i;g.dataset.matrixB=j;
        g.append(svgEl("rect",{x:padX+col*cell,y:padY+row*cell,width:cell-1,height:cell-1,fill:colors.fill,stroke:selected?COL.ground:"none","stroke-width":selected?4:0}));
        const t=svgEl("text",{x:padX+(col+.5)*cell,y:padY+(row+.5)*cell,"text-anchor":"middle","dominant-baseline":"central","font-size":16,fill:colors.ink});t.textContent=f2(m[i][j]);g.append(t);detail.append(g);
      });
    });
    const zoom=document.createElement("section");zoom.className="matrix-zoom-panel";zoom.innerHTML=`<h2>Selected neighbourhood · ${indices.length} samples</h2>`;zoom.append(detail);
    host.append(box,zoom);
  }
  function refreshOutput() {
    const m=finalM();
    $("#outputPair").hidden=false;
    const height=Math.max(220,bodyH()-145);
    const shell=$("#stage .output-content");
    if(!shell)return;
    const score=m[state.selA][state.selB];
    $("#outputPair").innerHTML=`${pairSelectors()}<span>${tex(String.raw`S_{\mathrm{final}}=${f3(score)}`)} · ${score>=state.theta?"linked":"no direct link"} at ${tex(String.raw`\theta=${f2(state.theta)}`)}</span>`;
    const host=$("#guideAnalysis");
    if(state.outputView==="heatmap") {
      host.innerHTML=`<div class="output-matrix" id="outputMatrix"></div><div class="matrix-footer"><div class="heatmap-scale"><span>0 · low</span><span class="heatmap-ramp"></span><span>1 · high</span></div><p>Deeper red means greater similarity. Outlines mark the selected pair; numbers identify specimens.</p></div>`;
      drawOutputMatrix($("#outputMatrix"),m,height);return;
    }
    drawOutputMotion(host,m);
  }

  const GUIDES = {
    features: {
      render() {
        if(state.inputView==="overview") return frameworkOverview();
        if(state.inputView==="preprocess") return guideShell(`${lessonTabs("features")}<h2>Prepare comparable features from each executable</h2><ol class="preprocess-flow"><li><h3>Validate the file format</h3><p>Check the Windows Portable Executable structure before parsing. These generated samples begin with an MZ header and contain a PE signature.</p></li><li><h3>Extract two feature sets</h3><p><span class="t-sca">Code-related strings</span> feed SCA’s MinHash comparison. <span class="t-saa">API names, domains and registry strings</span> feed SAA’s attribute Jaccard index.</p></li><li><h3>Build code vectors for integration</h3><p>Count synthetic 16-byte code blocks in a common feature space. Their cosine similarity is calculated separately from MinHash.</p></li></ol>${takeaway("SCA and SAA analyze the same samples through different features. Code-block counts provide the integrated model’s code representation.")}<p class="caption">The simulator generates these features and bytes deterministically; it does not parse or execute uploaded malware.</p>`);
        return guideShell(`${lessonTabs("features")}<div class="guide-input"><div class="guide-file"><h2>${N} synthetic PE samples · ${new Set(SAMPLES.map(s=>s.family)).size} fictional families</h2><dl class="cohort-summary">${[...new Set(SAMPLES.map(s=>s.family))].map(family=>`<div><dt>${family}</dt><dd>${SAMPLES.filter(s=>s.family===family).length} samples</dd></div>`).join("")}</dl><p>Nine teaching specimens plus ${N-9} deterministic variants. Open <b>Specimens</b> to inspect all ${N} samples.</p></div><div class="guide-signals"><section><h2 class="t-sca">Code patterns → SCA</h2><p>Validate PE format → extract printable code-related strings → form a feature set.</p><div class="guide-items">${SAMPLES[0].code.slice(0,3).map(x=>`<code>${esc(x)}</code>`).join("")}</div></section><section><h2 class="t-saa">Attributes → SAA</h2><p>Extract API names, domains and registry strings → form an attribute set.</p><div class="guide-items">${[SAMPLES[0].attrs[0],SAMPLES[0].attrs.find(x=>cat(x)==="net"),SAMPLES[0].attrs.find(x=>cat(x)==="reg")].filter(Boolean).map(x=>`<code>${esc(x)}</code>`).join("")}</div></section></div></div>${takeaway("Same executable samples, <b>two feature sets</b>. MinHash estimates code-feature overlap; SAA calculates attribute overlap directly.")}<details class="guide-details"><summary>What is simulated?</summary><p>Fictional code-fragment names stand in for code-related extracted strings. Each has a repeatable synthetic byte block. Attribute strings stand in for static indicators of behaviour; no malware is executed.</p></details>`);
      },
      refresh() {}
    },
    minhash: {
      render() { return guideShell(`${lessonTabs("minhash")}${examples()}${state.scaView!=="output"?"":`<div class="guide-query"><label for="guideQuery">Find code similar to</label><select id="guideQuery" data-ctl="selA">${sampleOptions(state.selA)}</select></div>`}<div id="guideCalculation"></div>`); },
      refresh() {
        const i=state.selA,j=state.selB,k=state.k,sca=scaAt(k);
        if(state.scaView === "output") {
          const candidates=[],skipped=[];
          SAMPLES.forEach((s,n)=>{ if(n!==i) (shareSketch(i,n,k)?candidates:skipped).push(n); });
          candidates.sort((a,b)=>sca[i][b]-sca[i][a]);
          $("#guideCalculation").innerHTML=`${pairName()}<div class="guide-search"><table class="t"><thead><tr><th>Candidate sample</th><th class="r">MinHash score</th><th>Decision at ${f2(state.theta)}</th><th>Known relationship</th></tr></thead><tbody>${candidates.map(n=>`<tr><td class="mono">${esc(shortName(n))}</td><td class="r num">${f3(sca[i][n])}</td><td>${sca[i][n]>=state.theta ? "Link" : "No link"}</td><td>${decision(sca[i][n]>=state.theta,SAMPLES[i].family===SAMPLES[n].family)}</td></tr>`).join("") || `<tr><td colspan="4">No candidates share a sketch. Try another sample.</td></tr>`}</tbody></table></div>${takeaway(searchOutcome())}<p class="caption">${candidates.length} candidates scored; ${skipped.length} skipped. Skipped samples are unscored, not zero similarity.</p><details class="guide-details"><summary>How does sketch lookup narrow the search?</summary><p>Groups of ${SKETCH_R} signature values form lookup keys. Only samples sharing a key are scored in this search. ${skipped.length} skipped: ${skipped.map(n=>esc(shortName(n))).join(", ") || "none"}. A skipped sample has not received a zero score; lookup can miss a related sample.</p></details>`;
        } else if(state.scaView==="features") {
          $("#guideCalculation").innerHTML=`${pairName()}<h2>Executable → extracted code-related strings → feature sets</h2><p>Each distinct string is one feature. Compare what is shared and what changed.</p>${setColumns("code")}${evidence("sca")}<p class="caption">These fictional fragment labels stand in for extracted strings. Source code is not required; extraction is simulated here.</p>`;
        } else if(state.scaView==="hash") {
          $("#guideCalculation").innerHTML=`${pairName()}${hashWalkthrough()}`;
        } else {
          const e=C.minhashEstimate(SIG[i].sig.slice(0,k),SIG[j].sig.slice(0,k)),visible=Math.min(6,k);
          const signature=who=>`<div class="guide-signature"><b>${esc(shortName(who))}</b>${SIG[who].sig.slice(0,visible).map((v,n)=>`<code class="${SIG[i].sig[n]===SIG[j].sig[n]?"match":""}">${hex(v,8)}</code>`).join("")}</div>`;
          $("#guideCalculation").innerHTML=`${pairName()}<h2>Compare matching signature positions</h2><div class="guide-signatures">${signature(i)}${signature(j)}</div><p class="caption">First ${visible} of ${k} positions. Highlighted values match; the calculation uses all ${k}.</p><div class="guide-equation"><span><strong>${e.matches}</strong>matching positions</span><span>÷</span><span><strong>${k}</strong>hash functions</span><span>≈</span><span class="t-sca"><strong>${f3(e.est)}</strong>estimated Jaccard index</span></div>${takeaway(`${pairOutcome("sca")} ${methodReason("sca")}`)}<details class="guide-details"><summary>Signature length and estimation accuracy</summary><div class="guide-query"><label for="lessonK">Hash functions</label><select id="lessonK" data-ctl="k">${K_VALUES.map((value,n)=>`<option value="${n}" ${value===k?"selected":""}>${value}</option>`).join("")}</select></div><p>The exact code-feature Jaccard index is ${f3(SCA_EXACT[i][j])}. More hash functions generally reduce estimation variance, with more computation; a particular estimate need not improve monotonically. MinHash cannot restore features lost through rewriting.</p></details>`;
        }
        syncLessonTabs();
      }
    },
    jaccard: {
      render() { return guideShell(`${lessonTabs("jaccard")}${examples()}${state.saaView!=="output"?"":`<div class="guide-query"><label for="theta">Link when SAA ≥</label><input id="theta" type="range" min="0.5" max="0.9" step="0.05" value="${state.theta}" data-ctl="theta"><b class="num" data-bind="theta">${f2(state.theta)}</b></div>`}<div id="guideCalculation"></div>`); },
      refresh() {
        if(state.saaView === "output") {
          const info=clusterInfo(SAA);
          $("#guideCalculation").innerHTML=`${pairName()}<div class="lesson-chart" id="saaGraph"></div>${takeaway(pairOutcome("saa"))}<p class="caption">${info.edges.length} links · ${info.clusters} groups. Each line meets the attribute threshold.</p><p class="caption">Dense groups suggest shared characteristics. Similar behaviour can also connect unrelated families.</p>`;
          drawGraph($("#saaGraph"), {id:"saa-output",info,height:chartHeight(),labels:false,aria:"SAA attribute similarity graph"});
        } else if(state.saaView==="sets") {
          $("#guideCalculation").innerHTML=`${pairName()}<h2>Executable → extracted attribute strings → attribute sets</h2><p>API names, domains and registry strings are static indicators of possible behaviour.</p>${setColumns("attrs")}${evidence("saa")}`;
        } else {
          const r=C.jaccard(SAMPLES[state.selA].attrs,SAMPLES[state.selB].attrs);
          $("#guideCalculation").innerHTML=`${pairName()}<h2>Jaccard index = intersection ÷ union</h2><div class="guide-equation"><span><strong>${r.inter}</strong>shared attributes</span><span>÷</span><span><strong>${r.union}</strong>distinct attributes in total</span><span>=</span><span class="t-saa"><strong>${f2(r.j)}</strong>Jaccard index</span></div>${takeaway(`${pairOutcome("saa")} ${methodReason("saa")}`)}<p class="caption">1 = identical sets. 0 = no shared attributes. Cutoff: ${f2(state.theta)}.</p><details class="guide-details"><summary>Inspect the attribute sets</summary><div class="guide-set-details"><section><h2>Only ${esc(shortName(state.selA))}</h2><p>${r.onlyA.map(esc).join("<br>")||"None"}</p></section><section><h2>Shared</h2><p>${r.shared.map(esc).join("<br>")||"None"}</p></section><section><h2>Only ${esc(shortName(state.selB))}</h2><p>${r.onlyB.map(esc).join("<br>")||"None"}</p></section></div></details>`;
        }
        syncLessonTabs();
      }
    },
    combine: {
      render() { return guideShell(`${lessonTabs("combine")}${examples()}<div id="guideCalculation"></div>${state.combineView==="blend"?`<details class="guide-details"><summary>Adjust weights and threshold</summary><div class="guide-query"><label for="alpha">Weight on code α</label><input id="alpha" type="range" min="0" max="1" step="0.05" value="${state.alpha}" data-ctl="alpha"><b class="num" data-bind="alpha">${f2(state.alpha)}</b><button class="btn" data-alpha="0.6">Paper weight: 0.6</button><label for="theta">Link threshold</label><input id="theta" type="range" min="0.5" max="0.9" step="0.05" value="${state.theta}" data-ctl="theta"><b class="num" data-bind="theta">${f2(state.theta)}</b></div></details>`:""}`); },
      refresh() {
        const i=state.selA,j=state.selB,code=CODE_COSINE[i][j],saa=SAA[i][j],fin=finalM()[i][j];
        const d=C.cosineDetails(CODE_VECTORS[i],CODE_VECTORS[j]);
        if(state.combineView==="vectors") {
          const block=PE[i].regions.find(r=>r.kind==="code");
          const bytes=Array.from(PE[i].bytes.slice(block.start,block.end),b=>hex(b,2)).join(" ");
          $("#guideCalculation").innerHTML=`${pairName()}<h2>Build a numerical vector from code blocks</h2><p>For the integrated model, count each distinct 16-byte block. Use the same block order for both samples.</p><p class="block-example"><code>${esc(block.label)}</code> → <code>${bytes}</code></p>${vectorTable(d)}${takeaway("Each column is a vector: <b>A’s block counts</b> and <b>B’s block counts</b>. Shared blocks align on the same row.")}<details class="guide-details"><summary>Inspect every vector entry</summary>${vectorTable(d,false,true)}</details><p class="caption">Synthetic blocks illustrate byte-level features. This is a separate code representation; MinHash signatures are not converted into these vectors.</p>`;
        } else if(state.combineView==="products") {
          $("#guideCalculation").innerHTML=`${pairName()}<h2>Multiply aligned counts, then sum each column</h2>${vectorTable(d,true)}${takeaway("<b>A × B</b> contributes to the dot product only when a block occurs in both samples. <b>A²</b> and <b>B²</b> prepare the two vector lengths.")}<details class="guide-details"><summary>Inspect all products and squared counts</summary>${vectorTable(d,true,true)}</details>`;
        } else if(state.combineView==="cosine") {
          $("#guideCalculation").innerHTML=`${pairName()}<h2>Normalize the dot product by both vector lengths</h2><div class="cosine-equation"><p>From the previous stage: A · B = Σ(A × B) = <b>${d.dot}</b></p><p>‖A‖ = √ΣA² = √${d.squareA} = <b>${f3(d.lengthA)}</b></p><p>‖B‖ = √ΣB² = √${d.squareB} = <b>${f3(d.lengthB)}</b></p><p class="cosine-result">Cosine similarity<br>${d.dot} ÷ (√${d.squareA} × √${d.squareB}) = <b class="t-sca">${f3(d.similarity)}</b></p></div>${takeaway("Dividing by vector lengths compares direction: <b>1 means the same nonzero count proportions; 0 means no shared blocks.</b>")}<p class="caption">This code cosine similarity enters the weighted model. It was calculated from block-count vectors, independently of MinHash.</p>`;
        } else {
          $("#guideCalculation").innerHTML=`${pairName()}<h2>Weight the two independently calculated similarities</h2><div class="guide-bars">${scoreBar("Code · cosine similarity",code,"sca")}${scoreBar("Attributes · Jaccard index",saa,"saa")}${scoreBar("Combined",fin,"fin")}</div><p class="guide-sum">${f2(state.alpha)} × <span class="t-sca">${f3(code)}</span> + ${f2(1-state.alpha)} × <span class="t-saa">${f3(saa)}</span> ≈ <b>${f3(fin)}</b></p><p class="guide-cutoff">Bar markers show the link threshold: <b class="num">${f2(state.theta)}</b>.</p>${takeaway(`${pairOutcome("final")} ${caseText()}`)}<p class="caption">The code term is cosine similarity, not the SCA search’s MinHash estimate. This is a weighted blend of evidence, not a sequential fallback.</p>`;
        }
        syncLessonTabs();
      }
    },
    results: {
      render: outputShell,
      refresh: refreshOutput
    }
  };
  function compactShell() {
    return guideShell(`<div class="compact-demo${state.step===3?" synthesis-demo":""}">${state.step===3?"":examples()}<div id="guideCalculation"></div></div>`);
  }
  function renderCompact() {
    const i=state.selA,j=state.selB,k=state.k;
    const r=C.jaccard(SAMPLES[i].attrs,SAMPLES[j].attrs);
    let body="";
    if(state.step===1) {
      const e=C.minhashEstimate(SIG[i].sig.slice(0,k),SIG[j].sig.slice(0,k));
      const signature=who=>`<div class="guide-signature"><b>${esc(shortName(who))}</b>${SIG[who].sig.slice(0,Math.min(6,k)).map((v,n)=>`<code class="${SIG[i].sig[n]===SIG[j].sig[n]?"match":""}">${hex(v,8)}</code>`).join("")}</div>`;
      body=`<p class="compact-source"><b>${SAMPLES[i].code.length} code strings in A · ${SAMPLES[j].code.length} in B.</b> Apply the same ${k} hash functions to each set; keep each function’s minimum.</p><div class="guide-signatures">${signature(i)}${signature(j)}</div><p class="caption">First ${Math.min(6,k)} of ${k} signature positions; highlighted values match.</p><p class="guide-sum">${e.matches} matching positions ÷ ${k} = <b class="t-sca">${f3(e.est)}</b> estimated Jaccard index</p>${takeaway(`${pairOutcome("sca")} ${methodReason("sca")}`)}<details class="guide-details"><summary>Inspect extracted strings and hash minima</summary>${setColumns("code")}${hashWalkthrough()}</details>`;
    } else if(state.step===2) {
      const sampleList=(label,items)=>`<section><h3>${label} <span class="num">(${items.length})</span></h3><p>${items.slice(0,3).map(x=>`<code>${esc(x)}</code>`).join("<br>")||"None"}${items.length>3?`<br><span class="caption">+ ${items.length-3} more</span>`:""}</p></section>`;
      body=`<div class="feature-sets attribute-sets">${sampleList("Only A",r.onlyA)}${sampleList("Shared",r.shared)}${sampleList("Only B",r.onlyB)}</div><p class="guide-sum">${r.inter} shared ÷ ${r.union} distinct attributes = <b class="t-saa">${f3(r.j)}</b> Jaccard index</p>${takeaway(`${pairOutcome("saa")} ${methodReason("saa")}`)}<details class="guide-details"><summary>Inspect all extracted attributes</summary>${setColumns("attrs")}</details>`;
    } else {
      $("#guideCalculation").innerHTML=synthesisBody();
      return;
    }
    $("#guideCalculation").innerHTML=`${pairName()}${body}<p class="caption">Link threshold: ${f2(state.theta)}. Scores and known relationships are simulated.</p>`;
  }
  function chartHeight() { return window.innerWidth<=900 ? 320 : Math.max(180,Math.min(340,bodyH()-280)); }
  function syncLessonTabs() {
    $$("[data-lesson]").forEach(b=>b.setAttribute("aria-pressed",String(state[b.dataset.lessonKey]===b.dataset.lesson)));
  }
  function advance(direction) {
    if(!state.detail) { goStep(clampN(state.step+direction,0,STEPS.length-1)); return; }
    const lesson=LESSONS[STEPS[state.step].id];
    if(lesson) {
      const at=lesson.scenes.findIndex(([id])=>id===state[lesson.key]),next=at+direction;
      if(next>=0 && next<lesson.scenes.length) {
        state[lesson.key]=lesson.scenes[next][0]; renderHead(); renderStage(false); refreshAll(); $("#stage").scrollTop=0; return;
      }
    }
    goStep(state.step+direction);
    if(direction<0) {
      const previous=LESSONS[STEPS[state.step].id];
      if(previous) { state[previous.key]=previous.scenes[previous.scenes.length-1][0]; renderHead(); renderStage(false); refreshAll(); }
    }
  }

  // --------------------------------------------------------------- render --
  function renderStage(animate) {
    outputPlayback.token++;
    if(state.step!==4)outputPlayback.playing=false;
    const st = $("#stage");
    st.innerHTML = state.detail || state.step===4 ? GUIDES[STEPS[state.step].id].render() : state.step===0 ? frameworkOverview() : compactShell();
    syncControls();
  }
  function refreshAll() {
    const active=document.activeElement,focusId=active&&active.dataset&&active.dataset.ctl?active.id:null;
    const openDetails=new Set($$("#stage details[open]").map(d=>$("summary",d).textContent));
    if(state.detail || state.step===4) GUIDES[STEPS[state.step].id].refresh(); else if(state.step!==0) renderCompact();
    syncControls();
    $$("#stage details").forEach(d=>{ if(openDetails.has($("summary",d).textContent)) d.open=true; });
    if(focusId && !document.contains(active)) { const replacement=document.getElementById(focusId); if(replacement) replacement.focus({preventScroll:true}); }
    renderDrawer();
    renderStatus();
    $("#mTruth").setAttribute("aria-checked", String(truthOn()));
  }
  function goStep(n) {
    const next = clampN(n, 0, STEPS.length-1);
    const changed = next !== state.step;
    state.step = next;
    if(next===0) state.inputView="overview";
    state.truthOverride = null;
    if (changed) {
      if(next===1) state.scaView="features";
      if(next===2) state.saaView="sets";
      if(next===3) state.combineView="vectors";
    }
    renderSteps(); renderHead(); renderStage(changed); refreshAll();
    $("#stage").scrollTop = 0;
  }
  function setPair(a, b) { state.selA = a; state.selB = b; const row = KEY.findIndex(p => (p.i === a && p.j === b) || (p.i === b && p.j === a)); if (row >= 0) state.keyRow = row; state.region = null; refreshAll(); }
  function setA(i) {
    if (i === state.selA) return;
    if (i === state.selB) state.selB = state.selA;
    state.selA = i; state.region = null;
    if (STEPS[state.step].id === "search") state.query = i;
    refreshAll();
  }
  function setB(i) { if (i !== state.selA) { state.selB = i; refreshAll(); } }

  // ------------------------------------------------------- display filter --
  const FIELDS = ["sim.saa", "sim.sca", "sim.final", "sim.alpha", "sample.name", "sample.family", "minhash.k"];
  function parseFilter(text) {
    const t = text.trim();
    if (!t) return { kind: "empty" };
    let m = t.match(/^sim\.(saa|sca|final)\s*(>=|>)\s*(\d*\.?\d+)$/);
    if (m) {
      let v = parseFloat(m[3]);
      if (v < 0 || v > 1) return { kind: "error", msg: `${m[3]} is outside 0 to 1. Try sim.${m[1]} >= 0.7.` };
      if (m[2] === ">") v = Math.min(1, v + 0.001);
      return { kind: "theta", metric: m[1], value: Math.round(v * 1000) / 1000 };
    }
    m = t.match(/^sample\.(name|family)\s+contains\s+"([^"]*)"$/);
    if (m) return { kind: "name", field: m[1], op: "contains", value: m[2] };
    m = t.match(/^sample\.(name|family)\s*==\s*"([^"]*)"$/);
    if (m) return { kind: "name", field: m[1], op: "==", value: m[2] };
    m = t.match(/^minhash\.k\s*==\s*(\d+)$/);
    if (m) {
      const want = parseInt(m[1], 10);
      const snap = K_VALUES.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
      return { kind: "k", value: snap, warn: snap !== want ? `k snaps to ${snap}` : null };
    }
    m = t.match(/^sim\.alpha\s*==\s*(\d*\.?\d+)$/);
    if (m) {
      const v = parseFloat(m[1]);
      if (v < 0 || v > 1) return { kind: "error", msg: `${m[1]} is outside 0 to 1. Try sim.alpha == 0.6.` };
      return { kind: "alpha", value: v };
    }
    const tok = t.split(/[\s=<>!]/)[0];
    if (!FIELDS.includes(tok)) return { kind: "error", msg: `"${tok}" isn't a field. Use sim.saa, sim.sca, sim.final, sim.alpha, sample.name, sample.family or minhash.k.` };
    return { kind: "error", msg: `Couldn't read that. Examples: sim.saa >= 0.6 · sample.name contains "moth" · minhash.k == 128.` };
  }
  function validateFilter() {
    const inp = $("#filter"), msg = $("#filterMsg");
    const r = parseFilter(inp.value);
    inp.classList.remove("ok", "bad");
    msg.classList.remove("err");
    if (r.kind === "empty") msg.textContent = "";
    else if (r.kind === "error") { inp.classList.add("bad"); msg.classList.add("err"); msg.textContent = r.msg; }
    else { inp.classList.add("ok"); msg.textContent = r.warn ? r.warn + ". Press Enter to apply." : "Press Enter to apply."; }
    return r;
  }
  function applyFilter() {
    const r = validateFilter();
    if (r.kind === "error") { say(r.msg, true); return; }
    const msg = $("#filterMsg");
    if (r.kind === "empty") { state.nameFilter = null; refreshAll(); return; }
    if (r.kind === "theta") {
      state.theta = r.value;
        msg.textContent = `Applied: θ = ${f2(r.value)} on ${METRIC_NAME[r.metric]}.`;
      goStep({ saa: 2, sca: 1, final: 4 }[r.metric]);
      if(r.metric === "saa") { state.saaView="output"; refreshAll(); }
      return;
    }
    if (r.kind === "name") {
      const v = r.value.toLowerCase();
      state.nameFilter = (s) => { const x = String(r.field === "name" ? s.name : s.family).toLowerCase(); return r.op === "contains" ? x.includes(v) : x === v; };
      const n = SAMPLES.filter(state.nameFilter).length;
      msg.textContent = n ? `Showing ${n} of ${N} specimens.` : `No specimens match. Clear the filter to see all ${N} samples.`;
    }
    if (r.kind === "k") { state.k = r.value; msg.textContent = `MinHash k = ${r.value}.`; }
    if (r.kind === "alpha") { state.alpha = r.value; msg.textContent = `α = ${f2(r.value)}.`; goStep(3); return; }
    refreshAll();
  }

  // --------------------------------------------------------------- events --
  let lastPointer = 0;
  document.addEventListener("pointerdown", () => { lastPointer = Date.now(); }, true);
  const releaseIfPointer = (el) => { if (Date.now() - lastPointer < 1500 && el && el.blur) el.blur(); };

  function onStageInput(ev) {
    const el = ev.target, ctl = el.dataset.ctl;
    if(el.dataset.motionProgress!==undefined){outputPlayback.playing=false;outputPlayback.time=Math.max(0,Math.min(P.MOTION_DURATION,+el.value));if(outputPlayback.paint)outputPlayback.paint();return;}
    if (!ctl) return;
    if (ctl === "theta") state.theta = Math.round(parseFloat(el.value) * 100) / 100;
    else if (ctl === "alpha") state.alpha = Math.round(parseFloat(el.value) * 100) / 100;
    else if (ctl === "k") state.k = K_VALUES[+el.value];
    else if (ctl === "selA") { const v = +el.value; if (v === state.selB) state.selB = state.selA; state.selA = v; state.region = null; }
    else if (ctl === "selB") { const v = +el.value; if (v === state.selA) state.selA = state.selB; state.selB = v; }
    else if (ctl === "query") state.query = +el.value;
    else return;
    refreshAll();
    if (ev.type === "change") releaseIfPointer(el);
  }

  function onStageClick(ev) {
    const t = ev.target.closest("button, [data-region], [data-keyrow], .node[data-i], [data-card], [data-matrix-a]");
    if (!t) return;
    const ds = t.dataset;
    if(ds.vectorStep !== undefined) { state.vectorStep=ds.vectorStep; refreshAll(); return; }
    if(ds.matrixA !== undefined) { if(+ds.matrixA!==+ds.matrixB)setPair(+ds.matrixA,+ds.matrixB); return; }
    if(ds.playback!==undefined){
      if(ds.playback==='final'){outputPlayback.time=P.MOTION_DURATION;outputPlayback.playing=false;}
      else if(ds.playback==='replay'){outputPlayback.time=0;outputPlayback.playing=true;}
      else {if(outputPlayback.time>=P.MOTION_DURATION)outputPlayback.time=0;outputPlayback.playing=!outputPlayback.playing;}
      if(outputPlayback.paint)outputPlayback.paint();
      if(outputPlayback.playing&&outputPlayback.start)outputPlayback.start();return;
    }
    if(ds.framework !== undefined) { zoomFramework(ds.framework,t); return; }
    if(ds.lesson !== undefined) { state[ds.lessonKey]=ds.lesson; renderHead(); renderStage(false); refreshAll(); $("#stage").scrollTop=0; return; }
    if(ds.analysis !== undefined) { state.outputView=ds.analysis; renderHead(); renderStage(false); refreshAll(); return; }
    if (ds.pair !== undefined) { const p = KEY[+ds.pair]; return setPair(p.i, p.j); }
    if (ds.theta !== undefined) { state.theta = +ds.theta; return refreshAll(); }
    if (ds.alpha !== undefined) { state.alpha = +ds.alpha; return refreshAll(); }
    if (ds.kset !== undefined) { state.k = +ds.kset; return refreshAll(); }
    if (ds.query !== undefined) { state.query = +ds.query; return refreshAll(); }
    if (ds.tab !== undefined) { state.resultsTab = ds.tab; return refreshAll(); }
    if (ds.heat !== undefined) { state.heatSource = ds.heat; return refreshAll(); }
    if (ds.view !== undefined) { state.searchView = ds.view; return refreshAll(); }
    if (ds.effn !== undefined) { state.effN = +ds.effn; return refreshAll(); }
    if (ds.effm !== undefined) { state.effM = +ds.effm; return refreshAll(); }
    if (ds.group !== undefined) {
      const [kind, n] = ds.group.split(":");
      if (kind === "sca") state.codeGroup = +n; else state.attrGroup = +n;
      state.featAll = false;
      return refreshAll();
    }
    if (ds.act === "vennAll") { state.vennAll = !state.vennAll; return refreshAll(); }
    if (ds.act === "featAll") { state.featAll = true; return refreshAll(); }
    if (ds.act === "comment") {
      const inp = $("#comment"), v = inp.value.trim();
      if (!v) { say("Type a comment first.", true); inp.focus(); return; }
      (comments[state.query] = comments[state.query] || []).push(v);
      inp.value = ""; say(`Comment added to ${SAMPLES[state.query].name}.`);
      return refreshAll();
    }
    if (ds.keyrow !== undefined) { state.keyRow = +ds.keyrow; const p = KEY[state.keyRow]; state.selA = p.i; state.selB = p.j; return refreshAll(); }
    if (ds.region !== undefined) { state.region = state.region === ds.region ? null : ds.region; return refreshAll(); }
    if (ds.card !== undefined) return ev.shiftKey ? setB(+ds.card) : setA(+ds.card);
    if (t.classList.contains("node") && ds.i !== undefined) return ev.shiftKey ? setB(+ds.i) : setA(+ds.i);
  }

  function toggleMenu(open) {
    const m = $("#menu"), b = $("#btnMenu");
    const want = open === undefined ? m.hidden : open;
    m.hidden = !want;
    b.setAttribute("aria-expanded", String(want));
    if (want) { const first = $("button", m); if (first) first.focus(); }
  }
  function setTruth(v) { state.truthOverride = v; renderHead(); refreshAll(); say(v ? "True families shown." : "True families hidden."); }
  function setZoom(z) {
    state.zoom = Math.round(clampN(z, 0.8, 1.5) * 10) / 10;
    document.documentElement.style.setProperty("--zoom", state.zoom);
    $("#zoomVal").textContent = Math.round(state.zoom * 100) + "%";
    try { localStorage.setItem("scasaa-zoom", String(state.zoom)); } catch (e) { /* storage unavailable */ }
    renderStage(false); refreshAll();
  }
  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    } catch (e) { say("Full screen isn't available here.", true); }
  }
  let resetArmed = 0;
  function reset() {
    if (Object.keys(comments).length && Date.now() - resetArmed > 4000) {
      resetArmed = Date.now();
      say("Reset clears your analyst comments. Press R or choose Reset again to confirm.", true);
      return;
    }
    const zoom = state.zoom;
    state = { ...DEFAULTS, zoom };
    expanded.clear(); expanded.add("code"); expanded.add("attrs");
    for (const k of Object.keys(comments)) delete comments[k];
    $("#filter").value = ""; validateFilter();
    setDrawer(false); toggleMenu(false);
    goStep(0);
    say("Demo reset.");
  }

  function bind() {
    $("#steps").addEventListener("click", (ev) => { const b = ev.target.closest("[data-step]"); if (b) { state.detail=false; goStep(+b.dataset.step); } });
    $("#btnPrev").addEventListener("click", () => advance(-1));
    $("#btnNext").addEventListener("click", () => advance(1));
    $("#btnFramework").addEventListener("click",()=>{state.detail=false;goStep(state.returnStep);});
    $("#btnDrawer").addEventListener("click", () => setDrawer(!state.drawer));
    $("#btnDrawerClose").addEventListener("click", () => setDrawer(false));
    $("#btnMenu").addEventListener("click", () => toggleMenu());
    $("#mTruth").addEventListener("click", () => setTruth(!truthOn()));
    $("#mFull").addEventListener("click", () => { toggleMenu(false); toggleFullscreen(); });
    $("#mZoomIn").addEventListener("click", () => setZoom(state.zoom + 0.1));
    $("#mZoomOut").addEventListener("click", () => setZoom(state.zoom - 0.1));
    $("#mKeys").addEventListener("click", () => { toggleMenu(false); $("#keysDialog").showModal(); });
    $("#mReset").addEventListener("click", reset);
    document.addEventListener("click", (ev) => { if (!$("#menu").hidden && !ev.target.closest(".menu-wrap")) toggleMenu(false); });

    $("#plist").addEventListener("click", (ev) => { const tr = ev.target.closest("tr[data-i]"); if (tr) ev.shiftKey ? setB(+tr.dataset.i) : setA(+tr.dataset.i); });
    $("#details").addEventListener("click", (ev) => {
      const it = ev.target.closest(".tree-item"); if (!it) return;
      if (it.dataset.toggle) { const k = it.dataset.toggle; expanded.has(k) ? expanded.delete(k) : expanded.add(k); renderDetails(); }
      else if (it.dataset.region) { state.region = state.region === it.dataset.region ? null : it.dataset.region; refreshAll(); }
    });
    $("#details").addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { const it = ev.target.closest(".tree-item"); if (it) { ev.preventDefault(); it.click(); } } });
    $("#bytes").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-off]"); if (!b) return;
      const off = +b.dataset.off;
      const r = PE[state.selA].regions.find((x) => x.kind !== "section" && off >= x.start && off < x.end);
      state.region = r ? r.id : null;
      if (r && r.kind === "code") expanded.add("code");
      if (r && r.kind === "attr") expanded.add("attrs");
      if (r && r.kind === "header") expanded.add("hdr");
      refreshAll();
    });

    const stage = $("#stage");
    stage.addEventListener("input", onStageInput);
    stage.addEventListener("change", onStageInput);
    stage.addEventListener("click", onStageClick);
    stage.addEventListener("keydown", (ev) => {
      if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches(".node, [data-keyrow], [data-matrix-a]")) { ev.preventDefault(); onStageClick({ target: ev.target, shiftKey: ev.shiftKey }); }
      if (ev.key === "Enter" && ev.target.id === "comment") { ev.preventDefault(); onStageClick({ target: $("[data-act=comment]"), shiftKey: false }); }
    });

    const filter = $("#filter");
    filter.addEventListener("input", validateFilter);
    filter.addEventListener("keydown", (ev) => { if (ev.key === "Enter") applyFilter(); });

    document.addEventListener("keydown", (ev) => {
      if ($("#keysDialog").open) return;
      const el = ev.target;
      const tag = (el.tagName || "").toLowerCase();
      const typing = tag === "textarea" || (tag === "input" && el.type === "text");
      if (ev.key === "Escape") {
        if (!$("#menu").hidden) { toggleMenu(false); $("#btnMenu").focus(); return; }
        if (el && el !== document.body && el.blur) { el.blur(); return; }
        if (state.drawer) { setDrawer(false); return; }
        return;
      }
      if (typing || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const keyCtl = tag === "select" || (tag === "input" && el.type === "range");
      if (keyCtl && /^Arrow/.test(ev.key)) return; // keyboard users adjust the focused control; Esc releases it
      if (ev.key === "ArrowRight" || ev.key === "PageDown") { ev.preventDefault(); advance(1); }
      else if (ev.key === "ArrowLeft" || ev.key === "PageUp") { ev.preventDefault(); advance(-1); }
      else if (/^[1-5]$/.test(ev.key)) { state.detail=false; goStep(+ev.key-1); if (keyCtl) el.blur(); }
      else if (ev.key === "/") { ev.preventDefault(); setDrawer(true); setTimeout(() => filter.focus(), 60); }
      else if (ev.key === "d" || ev.key === "D") setDrawer(!state.drawer);
      else if (ev.key === "t" || ev.key === "T") setTruth(!truthOn());
      else if (ev.key === "f" || ev.key === "F") toggleFullscreen();
      else if (ev.key === "+" || ev.key === "=") setZoom(state.zoom + 0.1);
      else if (ev.key === "-") setZoom(state.zoom - 0.1);
      else if (ev.key === "?") $("#keysDialog").showModal();
      else if (ev.key === "r" || ev.key === "R") reset();
    });

    let rt = null;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { renderStage(false); refreshAll(); }, 150); });
  }

  // ----------------------------------------------------------------- init --
  try {
    const z = parseFloat(localStorage.getItem("scasaa-zoom"));
    if (z >= 0.8 && z <= 1.5) state.zoom = z;
  } catch (e) { /* storage unavailable */ }
  document.documentElement.style.setProperty("--zoom", state.zoom);
  $("#zoomVal").textContent = Math.round(state.zoom * 100) + "%";
  bind();
  const hashStep = parseInt((location.hash.match(/step=(\d+)/) || [])[1], 10);
  state.step = -1;
  goStep(Number.isFinite(hashStep) ? hashStep-1 : 0);

  window.SCASAA = { state: () => state, goStep, scaAt, SAA, SCA_EXACT };
})();
