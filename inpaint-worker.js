/* Nova Studio — content-aware fill. Multi-scale PatchMatch (Wexler-style) inpainting, written from scratch.
   in:  { rgba: Uint8ClampedArray, w, h, hole: Uint8Array (1 = fill) }   out: { rgba } */
'use strict';
const R = 3;            // patch radius (7x7)

function pyramidDown(L) {
  const w = Math.max(1, L.w >> 1), h = Math.max(1, L.h >> 1);
  const img = new Float32Array(w * h * 3), hole = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, n = 0, any = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const sx = Math.min(L.w - 1, x * 2 + dx), sy = Math.min(L.h - 1, y * 2 + dy), i = sy * L.w + sx;
      if (L.hole[i]) { any = 1; continue; }
      r += L.img[i * 3]; g += L.img[i * 3 + 1]; b += L.img[i * 3 + 2]; n++;
    }
    const o = y * w + x;
    hole[o] = any;
    if (n) { img[o * 3] = r / n; img[o * 3 + 1] = g / n; img[o * 3 + 2] = b / n; }
  }
  return { w, h, img, hole };
}

// row interpolation: most photos are horizontal bands (horizon, tree line, water), so seed the hole
// by blending the nearest real pixels to its left and right; fall back to columns, then diffusion
function rowSeed(L) {
  const { w, h, img, hole } = L; const done = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      if (!hole[y * w + x]) { x++; continue; }
      let e = x; while (e < w && hole[y * w + e]) e++;
      const l = x - 1, r = e;
      for (let k = x; k < e; k++) {
        const i = y * w + k;
        if (l >= 0 && r < w) { const t = (k - l) / (r - l); for (let c = 0; c < 3; c++) img[i * 3 + c] = img[(y * w + l) * 3 + c] * (1 - t) + img[(y * w + r) * 3 + c] * t; done[i] = 1; }
        else if (l >= 0 || r < w) { const j = y * w + (l >= 0 ? l : r); for (let c = 0; c < 3; c++) img[i * 3 + c] = img[j * 3 + c]; done[i] = 1; }
      }
      x = e;
    }
  }
  // light vertical smoothing inside the hole so neighbouring rows agree
  for (let pass = 0; pass < 2; pass++) for (let y = 1; y < h - 1; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!hole[i]) continue; for (let c = 0; c < 3; c++) img[i * 3 + c] = (img[(i - w) * 3 + c] + 2 * img[i * 3 + c] + img[(i + w) * 3 + c]) / 4; }
  if (done.some((v, i) => hole[i] && !v)) { const keep = L.hole; L.hole = Uint8Array.from(keep, (v, i) => v && !done[i] ? 1 : 0); diffuse(L); L.hole = keep; }
}
// onion-peel diffusion: fills every hole pixel from its filled neighbours, outside in
function diffuse(L) {
  const { w, h, img } = L; const known = Uint8Array.from(L.hole, v => v ? 0 : 1);
  let left = known.reduce((s, v) => s + (v ? 0 : 1), 0);
  if (left === w * h) { img.fill(128); return; }
  while (left > 0) {
    const set = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (known[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx; if (!known[j]) continue;
        r += img[j * 3]; g += img[j * 3 + 1]; b += img[j * 3 + 2]; n++;
      }
      if (n) set.push(i, r / n, g / n, b / n);
    }
    if (!set.length) break;
    for (let k = 0; k < set.length; k += 4) { const i = set[k]; img[i * 3] = set[k + 1]; img[i * 3 + 1] = set[k + 2]; img[i * 3 + 2] = set[k + 3]; known[i] = 1; left--; }
  }
}

function run(L, nnfPrev, emIters, pmIters, coarsest) {
  const { w, h, img, hole } = L, N = w * h;
  // valid source centres: whole patch inside the image and free of hole pixels
  const holeInt = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += hole[y * w + x]; holeInt[(y + 1) * (w + 1) + x + 1] = holeInt[y * (w + 1) + x + 1] + row; } }
  const holesIn = (x0, y0, x1, y1) => holeInt[(y1 + 1) * (w + 1) + x1 + 1] - holeInt[y0 * (w + 1) + x1 + 1] - holeInt[(y1 + 1) * (w + 1) + x0] + holeInt[y0 * (w + 1) + x0];
  const valid = new Uint8Array(N); const vlist = [];
  for (let y = R; y < h - R; y++) for (let x = R; x < w - R; x++) if (!holesIn(x - R, y - R, x + R, y + R)) { valid[y * w + x] = 1; vlist.push(y * w + x); }
  if (vlist.length < 8) return null;
  // targets: pixels whose patch touches the hole
  const tgt = []; const isT = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (holesIn(Math.max(0, x - R), Math.max(0, y - R), Math.min(w - 1, x + R), Math.min(h - 1, y + R))) { tgt.push(y * w + x); isT[y * w + x] = 1; }
  }
  const nnf = new Int32Array(N).fill(-1), dist = new Float32Array(N);
  const rnd = () => vlist[(Math.random() * vlist.length) | 0];
  let knownOnly = coarsest;   // first pass on the coarsest level: judge patches only by the real pixels around the hole
  const D = (p, s, best) => {
    const px = p % w, py = (p / w) | 0, sx = s % w, sy = (s / w) | 0; let d = 0, n = 0;
    if (knownOnly) {
      for (let dy = -R; dy <= R; dy++) { const yy = py + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx++) { const xx = px + dx; if (xx < 0 || xx >= w) continue; const q = yy * w + xx; if (hole[q]) continue;
          const a = q * 3, b = ((sy + dy) * w + sx + dx) * 3; const e0 = img[a] - img[b], e1 = img[a + 1] - img[b + 1], e2 = img[a + 2] - img[b + 2]; d += e0 * e0 + e1 * e1 + e2 * e2; n++; } }
      return n ? d / n * 49 + (49 - n) * 2 : 1e12;
    }
    for (let dy = -R; dy <= R; dy++) {
      const yy = py + dy; if (yy < 0 || yy >= h) continue;
      for (let dx = -R; dx <= R; dx++) {
        const xx = px + dx; if (xx < 0 || xx >= w) continue;
        const a = (yy * w + xx) * 3, b = ((sy + dy) * w + sx + dx) * 3;
        const e0 = img[a] - img[b], e1 = img[a + 1] - img[b + 1], e2 = img[a + 2] - img[b + 2];
        d += e0 * e0 + e1 * e1 + e2 * e2;
      }
      if (d >= best) return d;
    }
    return d;
  };
  for (const p of tgt) {
    let s = -1;
    if (nnfPrev) { const px = p % w, py = (p / w) | 0; const c = nnfPrev(px, py); if (c >= 0 && valid[c]) s = c; }
    if (s < 0) s = rnd();
    nnf[p] = s; dist[p] = D(p, s, Infinity);
  }
  const tryS = (p, s) => { if (s < 0 || s >= N || !valid[s]) return; const d = D(p, s, dist[p]); if (d < dist[p]) { dist[p] = d; nnf[p] = s; } };
  const maxR = Math.max(w, h);
  for (let em = 0; em < emIters; em++) {
    for (let it = 0; it < pmIters; it++) {
      const fwd = it % 2 === 0, st = fwd ? 1 : -1;
      for (let k = fwd ? 0 : tgt.length - 1; fwd ? k < tgt.length : k >= 0; k += st) {
        const p = tgt[k], px = p % w;
        // propagation from the already-visited neighbours
        const l = p - st; if (px - st >= 0 && px - st < w && isT[l]) { const s = nnf[l] + st; if ((s % w) - (nnf[l] % w) === st) tryS(p, s); }
        const u = p - st * w; if (u >= 0 && u < N && isT[u]) tryS(p, nnf[u] + st * w);
        // random search around the current best
        let rad = maxR; const s0 = nnf[p], sx0 = s0 % w, sy0 = (s0 / w) | 0;
        while (rad >= 1) {
          const x = sx0 + ((Math.random() * 2 - 1) * rad | 0), y = sy0 + ((Math.random() * 2 - 1) * rad | 0);
          if (x >= R && y >= R && x < w - R && y < h - R) tryS(p, y * w + x);
          rad >>= 1;
        }
      }
    }
    // voting: every hole pixel = weighted average of what overlapping patches say it should be
    const acc = new Float32Array(N * 4);
    const ds = Array.from(tgt, p => dist[p]).sort((a, b) => a - b); const sig = Math.max(1, ds[(ds.length * 0.25) | 0]);   // decisive voting: trust the best quarter
    for (const p of tgt) {
      const px = p % w, py = (p / w) | 0, s = nnf[p], sx = s % w, sy = (s / w) | 0;
      const wt = Math.exp(-dist[p] / (2 * sig)) + 1e-4;
      for (let dy = -R; dy <= R; dy++) {
        const yy = py + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -R; dx <= R; dx++) {
          const xx = px + dx; if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx; if (!hole[q]) continue;
          const b = ((sy + dy) * w + sx + dx) * 3;
          acc[q * 4] += img[b] * wt; acc[q * 4 + 1] += img[b + 1] * wt; acc[q * 4 + 2] += img[b + 2] * wt; acc[q * 4 + 3] += wt;
        }
      }
    }
    for (let q = 0; q < N; q++) if (hole[q] && acc[q * 4 + 3] > 0) { const n = acc[q * 4 + 3]; img[q * 3] = acc[q * 4] / n; img[q * 3 + 1] = acc[q * 4 + 1] / n; img[q * 3 + 2] = acc[q * 4 + 2] / n; }
    knownOnly = false;
    for (const p of tgt) dist[p] = D(p, nnf[p], Infinity);
  }
  return nnf;
}

function inpaint(rgba, W, H, holeIn) {
  const N = W * H;
  const base = { w: W, h: H, img: new Float32Array(N * 3), hole: holeIn };
  for (let i = 0; i < N; i++) { base.img[i * 3] = rgba[i * 4]; base.img[i * 3 + 1] = rgba[i * 4 + 1]; base.img[i * 3 + 2] = rgba[i * 4 + 2]; }
  const levels = [base];
  while (Math.min(levels[levels.length - 1].w, levels[levels.length - 1].h) > 90 && levels.length < 9) levels.push(pyramidDown(levels[levels.length - 1]));
  const top = levels[levels.length - 1];
  rowSeed(top);
  let nnf = null, prevW = 0;
  for (let li = levels.length - 1; li >= 0; li--) {
    const L = levels[li];
    if (li < levels.length - 1) {
      const C = levels[li + 1];
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const i = y * L.w + x; if (!L.hole[i]) continue;
        // bilinear upsample of the coarser solution into the hole
        const fx = Math.min(C.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), fy = Math.min(C.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
        const x0 = fx | 0, y0 = fy | 0, x1 = Math.min(C.w - 1, x0 + 1), y1 = Math.min(C.h - 1, y0 + 1), ax = fx - x0, ay = fy - y0;
        for (let c = 0; c < 3; c++) {
          const v = (C.img[(y0 * C.w + x0) * 3 + c] * (1 - ax) + C.img[(y0 * C.w + x1) * 3 + c] * ax) * (1 - ay) + (C.img[(y1 * C.w + x0) * 3 + c] * (1 - ax) + C.img[(y1 * C.w + x1) * 3 + c] * ax) * ay;
          L.img[i * 3 + c] = v;
        }
      }
    }
    const prev = nnf, pw = prevW;
    const up = prev ? (x, y) => { const cx = Math.min(pw - 1, x >> 1), cy = y >> 1; const s = prev[cy * pw + cx]; if (s < 0) return -1; const sx = (s % pw) * 2 + (x & 1), sy = ((s / pw) | 0) * 2 + (y & 1); return sx < L.w && sy < L.h ? sy * L.w + sx : -1; } : null;
    const big = L.w * L.h > 2500000;
    const res = run(L, up, li === 0 ? (big ? 1 : 2) : li === levels.length - 1 ? 8 : 4, li === 0 ? (big ? 2 : 3) : 4, li === levels.length - 1);
    if (res) {
      nnf = res; prevW = L.w;
      if (li === 0) {
        // final pass: copy each hole pixel straight from its best-matching patch (keeps grain and texture
        // that the averaging vote smooths away), lightly blended with the vote to hide seams
        const copy = new Float32Array(L.img);
        for (let i = 0; i < L.w * L.h; i++) if (L.hole[i] && res[i] >= 0) { const s = res[i]; for (let c = 0; c < 3; c++) copy[i * 3 + c] = L.img[s * 3 + c] * 0.75 + L.img[i * 3 + c] * 0.25; }
        L.img.set(copy);
      }
    }
    else { diffuse(L); nnf = null; }
    postMessage({ progress: 1 - li / levels.length });
  }
  const out = new Uint8ClampedArray(rgba);
  for (let i = 0; i < N; i++) if (holeIn[i]) { out[i * 4] = base.img[i * 3]; out[i * 4 + 1] = base.img[i * 3 + 1]; out[i * 4 + 2] = base.img[i * 3 + 2]; out[i * 4 + 3] = 255; }
  return out;
}

onmessage = e => {
  const { rgba, w, h, hole } = e.data;
  try { const out = inpaint(rgba, w, h, hole); postMessage({ rgba: out }, [out.buffer]); }
  catch (err) { postMessage({ error: String(err && err.message || err) }); }
};
