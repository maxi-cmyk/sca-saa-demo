/*
 * core.js — the algorithms behind the demo. No UI code in here, so the same
 * file runs in the browser (window.Core) and in Node (tools/verify.js).
 *
 *   Jaccard index ............ SAA similarity (paper Sec. II.C, Eq. 1)
 *   MinHash + sketches ....... SCA similarity estimate (paper Sec. II.D, III.A)
 *   Weighted hybrid score .... S_final = a*S_SCA + (1-a)*S_SAA (paper Eq. 2)
 *   Graph + components ....... clusters at threshold theta (paper Sec. III.D)
 *   Degree / betweenness ..... node influence (paper Table 8)
 *   Byte-block cosine ....... integrated code similarity (paper Sec. III.C)
 *   Exact t-SNE ............. seeded 2-D projection of combined distances
 *   Classical MDS ........... legacy helper, not used by the walkthrough
 *   Synthetic PE bytes ....... MZ / PE headers, .text code blocks, .rdata strings
 */
(function (root) {
  "use strict";

  // ------------------------------------------------------------ hashing ----

  /** MurmurHash3 (x86, 32-bit) over an ASCII string. Returns an unsigned int. */
  function murmur3(key, seed) {
    let h = seed >>> 0;
    const len = key.length;
    const c1 = 0xcc9e2d51, c2 = 0x1b873593;
    let i = 0;
    const nblocks = len & ~3;
    for (; i < nblocks; i += 4) {
      let k =
        (key.charCodeAt(i) & 0xff) |
        ((key.charCodeAt(i + 1) & 0xff) << 8) |
        ((key.charCodeAt(i + 2) & 0xff) << 16) |
        ((key.charCodeAt(i + 3) & 0xff) << 24);
      k = Math.imul(k, c1);
      k = (k << 15) | (k >>> 17);
      k = Math.imul(k, c2);
      h ^= k;
      h = (h << 13) | (h >>> 19);
      h = (Math.imul(h, 5) + 0xe6546b64) | 0;
    }
    let k1 = 0;
    switch (len & 3) {
      case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16; // falls through
      case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8; // falls through
      case 1:
        k1 ^= key.charCodeAt(i) & 0xff;
        k1 = Math.imul(k1, c1);
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = Math.imul(k1, c2);
        h ^= k1;
    }
    h ^= len;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /** Seed for the i-th MinHash function (golden-ratio spacing). */
  const seedFor = (i) => (Math.imul(i + 1, 0x9e3779b1) ^ 0x5bd1e995) >>> 0;

  // ------------------------------------------------------------ jaccard ----

  /** Exact Jaccard index with the working shown: |A ∩ B| / |A ∪ B|. */
  function jaccard(a, b) {
    const A = new Set(a), B = new Set(b);
    const shared = [], onlyA = [], onlyB = [];
    for (const x of A) (B.has(x) ? shared : onlyA).push(x);
    for (const x of B) if (!A.has(x)) onlyB.push(x);
    const union = shared.length + onlyA.length + onlyB.length;
    return {
      shared, onlyA, onlyB,
      inter: shared.length, union,
      j: union === 0 ? 0 : shared.length / union,
    };
  }

  // ------------------------------------------------------------ minhash ----

  /** k-value MinHash signature: for each hash function keep the minimum. */
  function minhashSignature(tokens, k) {
    const sig = new Array(k);
    const argmin = new Array(k);
    for (let i = 0; i < k; i++) {
      const s = seedFor(i);
      let best = 0xffffffff, who = null;
      for (const t of tokens) {
        const h = murmur3(t, s);
        if (h < best || who === null) { best = h; who = t; }
      }
      sig[i] = best;
      argmin[i] = who;
    }
    return { sig, argmin };
  }

  /** Fraction of signature slots that match = estimate of the Jaccard index. */
  function minhashEstimate(sigA, sigB) {
    let m = 0;
    for (let i = 0; i < sigA.length; i++) if (sigA[i] === sigB[i]) m++;
    return { matches: m, k: sigA.length, est: m / sigA.length };
  }

  /** Group the signature into sketches (bands) of r values; used as lookup keys. */
  function sketches(sig, r) {
    const out = [];
    for (let b = 0; b * r < sig.length; b++) {
      const part = sig.slice(b * r, b * r + r);
      out.push(b + ":" + part.map((v) => v.toString(16)).join("."));
    }
    return out;
  }

  /** Probability two samples share at least one sketch: 1 - (1 - J^r)^b. */
  const candidateProbability = (j, r, b) => 1 - Math.pow(1 - Math.pow(j, r), b);

  /** Sparse count vector of the actual 16-byte synthetic code blocks.
   * This is the simulator's explicit byte-level representation for Eq. 2;
   * it is separate from standalone SCA's MinHash string-set representation.
   */
  function codeVector(sample) {
    const pe = buildPE(sample), vector = {};
    pe.regions.filter(r => r.kind === "code").forEach(r => {
      const key = Array.from(pe.bytes.slice(r.start, r.end), b => b.toString(16).padStart(2, "0")).join("");
      vector[key] = (vector[key] || 0) + 1;
    });
    return vector;
  }

  function cosine(a, b) {
    let dot = 0, aa = 0, bb = 0;
    for (const [key, value] of Object.entries(a)) { dot += value * (b[key] || 0); aa += value * value; }
    for (const value of Object.values(b)) bb += value * value;
    return aa && bb ? Math.max(0, Math.min(1, dot / Math.sqrt(aa * bb))) : 0;
  }

  /** Terms displayed in the teaching walkthrough; uses the scoring function. */
  function cosineDetails(a, b) {
    const terms = [...new Set([...Object.keys(a), ...Object.keys(b)])].map(key => {
      const x = a[key] || 0, y = b[key] || 0;
      return { key, a: x, b: y, product: x * y, squareA: x * x, squareB: y * y };
    });
    const dot = terms.reduce((sum, t) => sum + t.product, 0);
    const squareA = terms.reduce((sum, t) => sum + t.squareA, 0);
    const squareB = terms.reduce((sum, t) => sum + t.squareB, 0);
    return { terms, dot, squareA, squareB, lengthA: Math.sqrt(squareA), lengthB: Math.sqrt(squareB), similarity: cosine(a, b) };
  }

  /** Exact t-SNE on precomputed distances 1 - similarity.
   * Symmetric Gaussian affinities with binary-search bandwidths; Student-t
   * low-dimensional affinities and KL gradient (van der Maaten & Hinton, 2008).
   * Small, deterministic offline teaching implementation; no family labels.
   */
  function tsne2d(sim, options = {}) {
    const n = sim.length;
    if (n < 2) return Array.from({length:n}, () => ({x:0, y:0}));
    const perplexity = Math.min(n - 1, Math.max(1, options.perplexity || 3));
    const iterations = options.iterations || 1000;
    const target = Math.log(perplexity);
    const distances = sim.map(row => row.map(v => (1 - v) ** 2));
    const conditional = distances.map((row, i) => {
      let beta = 1, lo = 0, hi = Infinity, probs;
      const min = Math.min(...row.filter((v, j) => i !== j));
      for (let step = 0; step < 60; step++) {
        // Subtract the nearest distance to prevent exponential underflow.
        probs = row.map((v, j) => i === j ? 0 : Math.exp(-(v - min) * beta));
        const total = probs.reduce((a,b) => a+b, 0);
        probs = probs.map(v => v / total);
        const entropy = -probs.reduce((a,v) => a + (v > 0 ? v * Math.log(v) : 0), 0);
        if (Math.abs(entropy - target) < 1e-7) break;
        if (entropy > target) { lo = beta; beta = Number.isFinite(hi) ? (beta + hi) / 2 : beta * 2; }
        else { hi = beta; beta = (lo + beta) / 2; }
      }
      return probs;
    });
    const P = conditional.map((row,i) => row.map((v,j) => i === j ? 0 : (v + conditional[j][i]) / (2*n)));
    const random = rng(options.seed === undefined ? 440 : options.seed);
    const y = Array.from({length:n}, () => [(random()-.5)*1e-4, (random()-.5)*1e-4]);
    const velocity = y.map(() => [0,0]), gains = y.map(() => [1,1]);
    const q = y.map(() => new Array(n).fill(0));
    for (let step = 0; step < iterations; step++) {
      let total = 0;
      for (let i=0; i<n; i++) for (let j=i+1; j<n; j++) {
        const value = 1/(1 + (y[i][0]-y[j][0])**2 + (y[i][1]-y[j][1])**2);
        q[i][j] = q[j][i] = value; total += 2*value;
      }
      const grad = y.map(() => [0,0]);
      const exaggeration = step < 100 ? 4 : 1;
      for (let i=0; i<n; i++) for (let j=i+1; j<n; j++) {
        const factor = 4*(exaggeration*P[i][j] - q[i][j]/total)*q[i][j];
        for (let d=0; d<2; d++) {
          const value = factor*(y[i][d]-y[j][d]);
          grad[i][d] += value; grad[j][d] -= value;
        }
      }
      for (let i=0; i<n; i++) for (let d=0; d<2; d++) {
        gains[i][d] = Math.max(.01, Math.sign(grad[i][d]) !== Math.sign(velocity[i][d]) ? gains[i][d]+.2 : gains[i][d]*.8);
        velocity[i][d] = (step < 250 ? .5 : .8)*velocity[i][d] - 10*gains[i][d]*grad[i][d];
        y[i][d] += velocity[i][d];
      }
      for (let d=0; d<2; d++) {
        const mean = y.reduce((a,p) => a+p[d],0)/n;
        y.forEach(p => { p[d] -= mean; });
      }
    }
    let total = 0, kl = 0;
    for (let i=0; i<n; i++) for (let j=i+1; j<n; j++) {
      q[i][j] = q[j][i] = 1/(1+(y[i][0]-y[j][0])**2+(y[i][1]-y[j][1])**2); total += 2*q[i][j];
    }
    for (let i=0; i<n; i++) for (let j=0; j<n; j++) if (P[i][j]>0) kl += P[i][j]*Math.log(P[i][j]/Math.max(q[i][j]/total,1e-15));
    const points = y.map(p => ({x:p[0],y:p[1]}));
    // Diagnostic metadata is omitted from JSON; coordinates stay normal points.
    Object.defineProperty(points, "kl", {value:kl});
    return points;
  }

  // ------------------------------------------------------------- scoring ---

  function matrix(n, fn) {
    const m = [];
    for (let i = 0; i < n; i++) {
      m.push(new Array(n).fill(0));
    }
    for (let i = 0; i < n; i++) {
      m[i][i] = 1;
      for (let j = i + 1; j < n; j++) m[i][j] = m[j][i] = fn(i, j);
    }
    return m;
  }

  /**
   * All the scores the demo needs for a given number of MinHash functions k.
   *   scaExact : exact Jaccard over code fragments (what MinHash estimates)
   *   sca      : MinHash estimate over code fragments (what SCA reports)
   *   saa      : exact Jaccard over attributes
   */
  function computeScores(samples, k) {
    const sigs = samples.map((s) => minhashSignature(s.code, k));
    const n = samples.length;
    const vectors = samples.map(codeVector);
    return {
      k,
      sigs,
      scaExact: matrix(n, (i, j) => jaccard(samples[i].code, samples[j].code).j),
      sca: matrix(n, (i, j) => minhashEstimate(sigs[i].sig, sigs[j].sig).est),
      cosine: matrix(n, (i, j) => cosine(vectors[i], vectors[j])),
      saa: matrix(n, (i, j) => jaccard(samples[i].attrs, samples[j].attrs).j),
    };
  }

  /** Paper Eq. 2: S_final = a * S_SCA + (1 - a) * S_SAA. */
  function combine(sca, saa, alpha) {
    return sca.map((row, i) => row.map((v, j) => alpha * v + (1 - alpha) * saa[i][j]));
  }

  // --------------------------------------------------------------- graphs --

  /** Edges for every pair with similarity >= theta. */
  function edgesAt(m, theta) {
    const edges = [];
    for (let i = 0; i < m.length; i++)
      for (let j = i + 1; j < m.length; j++)
        if (m[i][j] >= theta - 1e-9) edges.push({ a: i, b: j, w: m[i][j] });
    return edges;
  }

  /** Connected components; returns comp[i] = component id (ordered by first member). */
  function components(n, edges) {
    const parent = [...Array(n).keys()];
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    for (const e of edges) {
      const ra = find(e.a), rb = find(e.b);
      if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
    }
    const ids = new Map();
    const comp = new Array(n);
    const size = new Map();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      if (!ids.has(r)) ids.set(r, ids.size);
      comp[i] = ids.get(r);
      size.set(comp[i], (size.get(comp[i]) || 0) + 1);
    }
    return { comp, size: comp.map((c) => size.get(c)), count: ids.size };
  }

  /** Degree and normalised betweenness (Brandes) on the unweighted graph. */
  function centrality(n, edges) {
    const adj = Array.from({ length: n }, () => []);
    for (const e of edges) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
    const bc = new Array(n).fill(0);
    for (let s = 0; s < n; s++) {
      const stack = [], pred = Array.from({ length: n }, () => []);
      const sigma = new Array(n).fill(0), dist = new Array(n).fill(-1);
      sigma[s] = 1; dist[s] = 0;
      const q = [s];
      while (q.length) {
        const v = q.shift();
        stack.push(v);
        for (const w of adj[v]) {
          if (dist[w] < 0) { dist[w] = dist[v] + 1; q.push(w); }
          if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; pred[w].push(v); }
        }
      }
      const delta = new Array(n).fill(0);
      while (stack.length) {
        const w = stack.pop();
        for (const v of pred[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        if (w !== s) bc[w] += delta[w];
      }
    }
    const norm = n > 2 ? (n - 1) * (n - 2) : 1; // undirected: divide sum by 2, then by (n-1)(n-2)/2
    return {
      degree: adj.map((a) => a.length),
      betweenness: bc.map((v) => v / norm),
    };
  }

  /**
   * Compare a clustering with the true families, pair by pair.
   * Two samples are "predicted related" when they land in the same cluster.
   */
  function evaluate(samples, comp) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    const wrong = [];
    for (let i = 0; i < samples.length; i++)
      for (let j = i + 1; j < samples.length; j++) {
        const truth = samples[i].family === samples[j].family;
        const pred = comp[i] === comp[j];
        if (truth && pred) tp++;
        else if (!truth && pred) { fp++; wrong.push({ a: i, b: j, type: "false link" }); }
        else if (truth && !pred) { fn++; wrong.push({ a: i, b: j, type: "missed link" }); }
        else tn++;
      }
    const total = tp + fp + fn + tn;
    const precision = tp + fp ? tp / (tp + fp) : 1;
    const recall = tp + fn ? tp / (tp + fn) : 1;
    return {
      tp, fp, fn, tn, total, wrong,
      correct: tp + tn,
      accuracy: (tp + tn) / total,
      precision, recall,
      f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    };
  }

  /** Ranges of alpha (step 0.01) where the combined clustering matches every family. */
  function perfectAlphaRanges(samples, sca, saa, theta) {
    const ranges = [];
    let start = null;
    for (let s = 0; s <= 100; s++) {
      const a = s / 100;
      const comp = components(samples.length, edgesAt(combine(sca, saa, a), theta)).comp;
      const ok = evaluate(samples, comp).correct === (samples.length * (samples.length - 1)) / 2;
      if (ok && start === null) start = a;
      if (!ok && start !== null) { ranges.push([start, (s - 1) / 100]); start = null; }
    }
    if (start !== null) ranges.push([start, 1]);
    return ranges;
  }

  // ---------------------------------------------------------- family tree --

  /**
   * Single-linkage agglomerative clustering on a similarity matrix.
   * Cutting this tree at height theta gives exactly the connected components
   * of the graph with an edge for every pair >= theta, so it shows the same
   * clusters the paper's graph does, for every theta at once.
   * Returns { root, order } where each node is { leaf } or
   * { left, right, height, members } and order is the leaf order top to bottom.
   */
  function singleLinkage(sim) {
    let clusters = sim.map((_, i) => ({ node: { leaf: i, height: 1, members: [i] }, members: [i] }));
    while (clusters.length > 1) {
      let best = -1, bi = 0, bj = 1;
      for (let a = 0; a < clusters.length; a++)
        for (let b = a + 1; b < clusters.length; b++) {
          let s = -1;
          for (const x of clusters[a].members) for (const y of clusters[b].members) s = Math.max(s, sim[x][y]);
          // ties: prefer the pair whose first members come earliest, for a stable picture
          if (s > best + 1e-12) { best = s; bi = a; bj = b; }
        }
      const A = clusters[bi], B = clusters[bj];
      const members = [...A.members, ...B.members];
      const node = { left: A.node, right: B.node, height: best, members };
      clusters = clusters.filter((_, k) => k !== bi && k !== bj);
      clusters.splice(bi, 0, { node, members });
    }
    const order = [];
    (function walk(n) { if (n.leaf !== undefined) order.push(n.leaf); else { walk(n.left); walk(n.right); } })(clusters[0].node);
    return { root: clusters[0].node, order };
  }

  // --------------------------------------------------------------- layout --

  /** Small deterministic PRNG (mulberry32). */
  function rng(seed) {
    let t = seed >>> 0;
    return () => {
      t = (t + 0x6d2b79f5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Force-directed layout in the spirit of Graphviz `fdp` (Fruchterman–Reingold).
   * Deterministic: the same graph always gives the same picture.
   */
  function forceLayout(n, edges, width, height, opts = {}) {
    const pad = opts.pad ?? 60;
    const iters = opts.iterations ?? 500;
    const rand = rng(opts.seed ?? 7);
    const W = width - 2 * pad, H = height - 2 * pad;
    const cx = width / 2, cy = height / 2;
    const k = Math.sqrt((W * H) / Math.max(n, 1)) * (opts.spread ?? 0.62);
    const pos = [];
    for (let i = 0; i < n; i++) {
      const ang = (2 * Math.PI * i) / n - Math.PI / 2;
      pos.push({
        x: cx + Math.cos(ang) * W * 0.36 + (rand() - 0.5) * 6,
        y: cy + Math.sin(ang) * H * 0.36 + (rand() - 0.5) * 6,
      });
    }
    let temp = Math.min(W, H) / 8;
    const deg = new Array(n).fill(0);
    for (const e of edges) { deg[e.a]++; deg[e.b]++; }
    for (let it = 0; it < iters; it++) {
      const disp = pos.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          let dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
          let d = Math.hypot(dx, dy) || 0.01;
          const f = (k * k) / d;
          dx /= d; dy /= d;
          disp[i].x += dx * f; disp[i].y += dy * f;
          disp[j].x -= dx * f; disp[j].y -= dy * f;
        }
      const attract = opts.attract ?? 0.3;
      for (const e of edges) {
        let dx = pos[e.a].x - pos[e.b].x, dy = pos[e.a].y - pos[e.b].y;
        const d = Math.hypot(dx, dy) || 0.01;
        const f = ((d * d) / k) * (0.4 + e.w) * attract;
        dx /= d; dy /= d;
        disp[e.a].x -= dx * f; disp[e.a].y -= dy * f;
        disp[e.b].x += dx * f; disp[e.b].y += dy * f;
      }
      for (let i = 0; i < n; i++) {
        // gravity: clusters drift to the middle, isolated samples settle around them
        const g = deg[i] ? (opts.gravity ?? 0.06) : (opts.gravity ?? 0.06) * 0.5;
        disp[i].x += (cx - pos[i].x) * g * k / 10;
        disp[i].y += (cy - pos[i].y) * g * k / 10 * (W / Math.max(H, 1));
        const d = Math.hypot(disp[i].x, disp[i].y) || 0.01;
        pos[i].x += (disp[i].x / d) * Math.min(d, temp);
        pos[i].y += (disp[i].y / d) * Math.min(d, temp);
        pos[i].x = Math.max(pad, Math.min(width - pad, pos[i].x));
        pos[i].y = Math.max(pad, Math.min(height - pad, pos[i].y));
      }
      temp = Math.max(temp * 0.985, 0.5);
    }
    return pos;
  }

  /** Classical multidimensional scaling to 2-D from a similarity matrix. */
  function mds2d(sim) {
    const n = sim.length;
    const D2 = sim.map((r) => r.map((v) => Math.pow(1 - v, 2)));
    const rowMean = D2.map((r) => r.reduce((a, b) => a + b, 0) / n);
    const all = rowMean.reduce((a, b) => a + b, 0) / n;
    const B = D2.map((r, i) => r.map((v, j) => -0.5 * (v - rowMean[i] - rowMean[j] + all)));
    const vecs = [], vals = [];
    let M = B.map((r) => r.slice());
    for (let c = 0; c < 2; c++) {
      let v = Array.from({ length: n }, (_, i) => 1 + i * 0.01);
      let lambda = 0;
      for (let it = 0; it < 500; it++) {
        const w = M.map((r) => r.reduce((a, x, j) => a + x * v[j], 0));
        const norm = Math.hypot(...w) || 1;
        v = w.map((x) => x / norm);
        lambda = norm;
      }
      // deterministic sign: largest component positive
      const big = v.reduce((best, x) => (Math.abs(x) > Math.abs(best) ? x : best), 0);
      if (big < 0) v = v.map((x) => -x);
      vecs.push(v); vals.push(lambda);
      M = M.map((r, i) => r.map((x, j) => x - lambda * v[i] * v[j]));
    }
    return Array.from({ length: n }, (_, i) => ({
      x: vecs[0][i] * Math.sqrt(Math.max(vals[0], 0)),
      y: vecs[1][i] * Math.sqrt(Math.max(vals[1], 0)),
    }));
  }

  // ---------------------------------------------------------- synthetic PE --

  function hexId(str, len) {
    let out = "", h = 0x811c9dc5;
    for (let i = 0; out.length < len; i++) {
      h = murmur3(str + "#" + i, h);
      out += h.toString(16).padStart(8, "0");
    }
    return out.slice(0, len);
  }

  /**
   * Build a small synthetic PE image for a sample and record what lives where.
   *   0x000 DOS header ("MZ", e_lfanew -> 0x80)
   *   0x040 DOS stub ("This program cannot be run in DOS mode.")
   *   0x080 "PE\0\0" + COFF header, section table
   *   0x200 .text  : one 16-byte block per code fragment. Identical fragments
   *                  produce identical bytes in every sample: that is shared code.
   *   ....  .rdata : attribute strings, NUL-terminated.
   */
  function buildPE(sample) {
    const bytes = [];
    const regions = [];
    const put = (arr) => { for (const b of arr) bytes.push(b & 0xff); };
    const ascii = (s) => Array.from(s, (c) => c.charCodeAt(0) & 0xff);
    const padTo = (off, val = 0) => { while (bytes.length < off) bytes.push(val); };
    const le32 = (v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

    // DOS header
    put([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
      0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00]);
    padTo(0x3c);
    put(le32(0x80));
    regions.push({ id: "hdr:mz", kind: "header", label: "MZ signature (DOS header)", start: 0, end: 2 });
    regions.push({ id: "hdr:lfanew", kind: "header", label: "e_lfanew = 0x00000080 (offset of PE header)", start: 0x3c, end: 0x40 });

    // DOS stub
    put([0x0e, 0x1f, 0xba, 0x0e, 0x00, 0xb4, 0x09, 0xcd, 0x21, 0xb8, 0x01, 0x4c, 0xcd, 0x21]);
    const stubText = "This program cannot be run in DOS mode.\r\r\n$";
    const stubStart = bytes.length;
    put(ascii(stubText));
    regions.push({ id: "hdr:stub", kind: "header", label: "DOS stub message", start: stubStart, end: stubStart + stubText.length });
    padTo(0x80);

    // PE header
    const ts = Math.floor(Date.parse(sample.firstSeen + "T00:00:00Z") / 1000) - 86400 * 3;
    put(ascii("PE")); put([0, 0]);
    regions.push({ id: "hdr:pe", kind: "header", label: "PE\\0\\0 signature (at e_lfanew)", start: 0x80, end: 0x84 });
    put([0x4c, 0x01, 0x03, 0x00]); put(le32(ts)); put(le32(0)); put(le32(0)); put([0xe0, 0x00, 0x02, 0x01]);
    regions.push({ id: "hdr:coff", kind: "header", label: "COFF header: i386, 3 sections, timestamp", start: 0x84, end: 0x98 });
    put([0x0b, 0x01]); // PE32 magic
    padTo(0x178);
    for (const name of [".text", ".rdata", ".data"]) {
      const s = bytes.length;
      put(ascii(name)); padTo(s + 40);
    }
    regions.push({ id: "hdr:sections", kind: "header", label: "Section table (.text, .rdata, .data)", start: 0x178, end: 0x178 + 120 });
    padTo(0x200);

    // .text: one 16-byte block per code fragment
    const textStart = bytes.length;
    for (const frag of sample.code) {
      const s = bytes.length;
      const body = [];
      for (let i = 0; body.length < 12; i++) {
        const h = murmur3(frag, 0xc0de + i);
        body.push(h & 0xff, (h >>> 8) & 0xff, (h >>> 16) & 0xff, (h >>> 24) & 0xff);
      }
      // push ebp; mov ebp, esp; <body>; ret
      put([0x55, 0x8b, 0xec, ...body.slice(0, 12), 0xc3]);
      regions.push({ id: "code:" + frag, kind: "code", label: frag, start: s, end: s + 16 });
    }
    regions.push({ id: "sec:text", kind: "section", label: ".text", start: textStart, end: bytes.length });
    padTo(Math.ceil(bytes.length / 0x100) * 0x100);

    // .rdata: attribute strings
    const rdataStart = bytes.length;
    for (const attr of sample.attrs) {
      const value = attr.slice(attr.indexOf(":") + 1);
      const s = bytes.length;
      put(ascii(value)); put([0]);
      regions.push({ id: "attr:" + attr, kind: "attr", label: value, start: s, end: s + value.length });
      while (bytes.length % 4) bytes.push(0);
    }
    regions.push({ id: "sec:rdata", kind: "section", label: ".rdata", start: rdataStart, end: bytes.length });
    padTo(Math.ceil(bytes.length / 16) * 16);

    return {
      bytes: Uint8Array.from(bytes),
      regions,
      sha256: hexId(sample.name, 64),
      textRange: [textStart, rdataStart],
    };
  }

  /** What the Unix `strings` utility does: printable ASCII runs of >= minLen. */
  function extractStrings(bytes, minLen = 4) {
    const out = [];
    let start = -1;
    for (let i = 0; i <= bytes.length; i++) {
      const b = i < bytes.length ? bytes[i] : 0;
      const printable = (b >= 0x20 && b <= 0x7e) || b === 0x09;
      if (printable && start < 0) start = i;
      if (!printable && start >= 0) {
        if (i - start >= minLen)
          out.push({ offset: start, text: String.fromCharCode(...bytes.slice(start, i)) });
        start = -1;
      }
    }
    return out;
  }

  const Core = {
    murmur3, seedFor, jaccard, minhashSignature, minhashEstimate, sketches,
    candidateProbability, codeVector, cosine, cosineDetails, tsne2d, matrix, computeScores, combine, edgesAt, components,
    centrality, evaluate, perfectAlphaRanges, singleLinkage, forceLayout, mds2d, buildPE,
    extractStrings, hexId, rng,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Core;
  else root.Core = Core;
})(typeof window !== "undefined" ? window : globalThis);
