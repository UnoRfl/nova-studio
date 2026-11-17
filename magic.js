/* Nova Studio — Magic tools. All AI runs locally in the browser (transformers.js + tesseract.js).
   Models download once from Hugging Face / jsDelivr and are cached by the browser. Nothing is uploaded. */
'use strict';

const TJS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';
const TESS_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const AI = { tjs: null, sam: null, det: null, rmbg: null, tess: null, emb: null, files: {} };

/* ---------- status HUD ---------- */
function aiStatus(text, frac) {
  let hud = $('#aihud');
  if (!hud) { hud = h('div', { id: 'aihud' }, h('span', { class: 'spark' }), h('b'), h('div', { class: 'bar' }, h('i'))); document.body.append(hud); }
  $$('.ai-status').forEach(el => el.textContent = text || '');
  if (!text) { hud.classList.remove('show'); return; }
  hud.classList.add('show'); $('b', hud).textContent = text;
  $('.bar i', hud).style.width = frac == null ? '' : Math.round(clamp(frac, 0, 1) * 100) + '%';
  hud.classList.toggle('indef', frac == null);
}
function progressFor(label) {
  return p => {
    if (p.status === 'progress' && p.total) {
      AI.files[p.file] = [p.loaded, p.total];
      let a = 0, b = 0; for (const [l, t] of Object.values(AI.files)) { a += l; b += t; }
      aiStatus(`${label} · ${(a / 1048576).toFixed(0)} / ${(b / 1048576).toFixed(0)} MB`, a / b);
    }
  };
}
async function tjs() {
  if (AI.tjs) return AI.tjs;
  aiStatus('Starting AI engine…');
  AI.tjs = import(TJS_URL).then(m => { m.env.allowLocalModels = false; try { m.env.backends.onnx.wasm.proxy = true; } catch {} return m; });
  try { return await AI.tjs; } catch (e) { AI.tjs = null; throw e; }
}
const once = (k, fn) => AI[k] ||= fn().catch(e => { AI[k] = null; throw e; });
const loadSAM = () => once('sam', async () => {
  const { SamModel, AutoProcessor } = await tjs();
  const cb = progressFor('Downloading selection model');
  const r = await Promise.all([SamModel.from_pretrained('Xenova/slimsam-77-uniform', { dtype: 'q8', progress_callback: cb }), AutoProcessor.from_pretrained('Xenova/slimsam-77-uniform', { progress_callback: cb })]);
  AI.files = {}; return r;
});
const loadDet = () => once('det', async () => {
  const { pipeline } = await tjs();
  const r = await pipeline('object-detection', 'Xenova/detr-resnet-50', { dtype: 'q8', progress_callback: progressFor('Downloading detector') });
  AI.files = {}; return r;
});
const loadRMBG = () => once('rmbg', async () => {
  const { AutoModel, AutoProcessor } = await tjs();
  const cb = progressFor('Downloading cut-out model');
  const r = await Promise.all([
    AutoModel.from_pretrained('briaai/RMBG-1.4', { config: { model_type: 'custom' }, dtype: 'q8', progress_callback: cb }),
    AutoProcessor.from_pretrained('briaai/RMBG-1.4', { config: { do_normalize: true, do_pad: false, do_rescale: true, do_resize: true, image_mean: [0.5, 0.5, 0.5], feature_extractor_type: 'ImageFeatureExtractor', image_std: [1, 1, 1], resample: 2, rescale_factor: 0.00392156862745098, size: { width: 1024, height: 1024 } } })]);
  AI.files = {}; return r;
});
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.append(s); }); }
const loadOCR = () => once('tess', async () => {
  if (!window.Tesseract) await loadScript(TESS_URL);
  return Tesseract.createWorker('eng', 1, { logger: m => { if (m.status && m.progress != null && /loading|initializ/.test(m.status)) aiStatus('Loading text reader…', m.progress); } });
});

/* ---------- pixels ---------- */
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function workFrom(o, maxDim = 1600) {
  const el = o.getElement();
  const cx = o.cropX || 0, cy = o.cropY || 0, cw = o.width, ch = o.height;
  const f = Math.min(1, maxDim / Math.max(cw, ch));
  const w = Math.max(1, Math.round(cw * f)), hh = Math.max(1, Math.round(ch * f));
  const c = mkCanvas(w, hh); const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(el, cx, cy, cw, ch, 0, 0, w, hh);
  let data; try { data = x.getImageData(0, 0, w, hh); } catch { throw new Error('This image is protected by the site it came from. Try another photo or upload it.'); }
  return { obj: o, canvas: c, ctx: x, data, w, h: hh, f, key: o.id + ':' + cx + ':' + cy + ':' + cw + ':' + ch + ':' + (o.getSrc() || '').length + ':' + (o.filters || []).length };
}
async function rawOf(work) { const { RawImage } = await tjs(); return new RawImage(new Uint8ClampedArray(work.data.data), work.w, work.h, 4).rgb(); }
function bboxOf(m, w, h, thr = 1) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) { const r = y * w; for (let x = 0; x < w; x++) if (m[r + x] >= thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; y1 = y; } }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function dilate(m, w, h, r, thr = 1) {
  if (r < 1) return Uint8Array.from(m, v => v >= thr ? 1 : 0);
  const a = new Uint8Array(w * h), b = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { let last = -1e9; const row = y * w; for (let x = 0; x < w; x++) { if (m[row + x] >= thr) last = x; if (x - last <= r) a[row + x] = 1; } last = 1e9; for (let x = w - 1; x >= 0; x--) { if (m[row + x] >= thr) last = x; if (last - x <= r) a[row + x] = 1; } }
  for (let x = 0; x < w; x++) { let last = -1e9; for (let y = 0; y < h; y++) { if (a[y * w + x]) last = y; if (y - last <= r) b[y * w + x] = 1; } last = 1e9; for (let y = h - 1; y >= 0; y--) { if (a[y * w + x]) last = y; if (last - y <= r) b[y * w + x] = 1; } }
  return b;
}
function feather(m, w, h) {
  const o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; s += m[yy * w + xx]; n++; } }
    o[y * w + x] = s / n;
  }
  return o;
}
function cutOut(work, alpha, pad = 2) {
  const bb = bboxOf(alpha, work.w, work.h, 8); if (!bb) return null;
  const x0 = Math.max(0, bb.x0 - pad), y0 = Math.max(0, bb.y0 - pad), x1 = Math.min(work.w - 1, bb.x1 + pad), y1 = Math.min(work.h - 1, bb.y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, c = mkCanvas(cw, ch), x = c.getContext('2d'), id = x.createImageData(cw, ch), src = work.data.data;
  for (let y = 0; y < ch; y++) for (let xx = 0; xx < cw; xx++) {
    const si = (y + y0) * work.w + xx + x0, di = (y * cw + xx) * 4;
    id.data[di] = src[si * 4]; id.data[di + 1] = src[si * 4 + 1]; id.data[di + 2] = src[si * 4 + 2]; id.data[di + 3] = src[si * 4 + 3] * alpha[si] / 255;
  }
  x.putImageData(id, 0, 0);
  return { canvas: c, x: x0, y: y0, w: cw, h: ch };
}
function runInpaint(work, hole) {
  return new Promise((res, rej) => {
    const wk = new Worker('inpaint-worker.js?v=3');
    const rgba = new Uint8ClampedArray(work.data.data);
    wk.onmessage = e => {
      if (e.data.progress != null) return aiStatus('Filling in the background…', e.data.progress);
      wk.terminate(); e.data.error ? rej(new Error(e.data.error)) : res(e.data.rgba);
    };
    wk.onerror = e => { wk.terminate(); rej(new Error(e.message || 'fill failed')); };
    wk.postMessage({ rgba, w: work.w, h: work.h, hole }, [rgba.buffer]);
  });
}

/* ---------- fabric placement ---------- */
const objMatrix = o => o.calcTransformMatrix();
function toCanvasPt(o, work, px, py) { return fabric.util.transformPoint({ x: px / work.f - o.width / 2, y: py / work.f - o.height / 2 }, objMatrix(o)); }
async function pieceImage(o, work, cut, name, extra = {}) {
  const url = cut.canvas.toDataURL('image/png');
  const img = await loadImg(url, false);
  const p = toCanvasPt(o, work, cut.x + cut.w / 2, cut.y + cut.h / 2);
  img.set(Object.assign({ originX: 'center', originY: 'center', left: p.x, top: p.y, scaleX: o.scaleX / work.f, scaleY: o.scaleY / work.f, angle: o.angle, flipX: o.flipX, flipY: o.flipY, opacity: o.opacity, name }, extra));
  img.id = uid(); img.setCoords();
  return img;
}
async function replaceWith(o, work, canvasEl, opts = {}) {
  const url = opts.png ? canvasEl.toDataURL('image/png') : canvasEl.toDataURL('image/jpeg', 0.93);
  const img = await loadImg(url, false);
  const c = o.getCenterPoint();
  img.set({ originX: 'center', originY: 'center', left: c.x, top: c.y, scaleX: o.scaleX / work.f, scaleY: o.scaleY / work.f, angle: o.angle, flipX: o.flipX, flipY: o.flipY, opacity: o.opacity, shadow: o.shadow, name: opts.name || o.name });
  img.id = uid();
  if (o.maskType) applyMask(img, o.maskType);
  if (o.locked) img.set({ locked: true, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasControls: false });
  img.setCoords();
  return img;
}
function swapObjects(o, list) {
  S.loading = true;
  const idx = canvas.getObjects().indexOf(o);
  canvas.discardActiveObject(); canvas.remove(o);
  list.forEach((x, k) => canvas.insertAt(x, idx + k));
  S.loading = false;
}

/* ---------- detection + segmentation ---------- */
async function samEmbed(work) {
  if (AI.emb && AI.emb.key === work.key) return AI.emb;
  const [model, proc] = await loadSAM();
  aiStatus('Mapping the picture…');
  const raw = await rawOf(work);
  const inputs = await proc(raw);
  const emb = await model.get_image_embeddings(inputs);
  return AI.emb = { key: work.key, inputs, emb };
}
async function samMask(work, points, labels, clipBox) {
  const { inputs, emb } = await samEmbed(work);
  const [model, proc] = await loadSAM();
  const { Tensor } = await tjs();
  const rs = inputs.reshaped_input_sizes[0], sx = rs[1] / work.w, sy = rs[0] / work.h;
  const out = await model({ ...emb,
    input_points: new Tensor('float32', points.flatMap(p => [p[0] * sx, p[1] * sy]), [1, 1, points.length, 2]),
    input_labels: new Tensor('int64', labels.map(v => BigInt(v)), [1, 1, labels.length]) });
  const masks = await proc.post_process_masks(out.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
  const m = masks[0], scores = out.iou_scores.data, n = scores.length, N = work.w * work.h;
  let best = null, bestScore = -1;
  for (let k = 0; k < n; k++) {
    const a = new Uint8Array(N); let cnt = 0;
    for (let i = 0; i < N; i++) if (m.data[k * N + i]) { a[i] = 255; cnt++; }
    if (!cnt) continue;
    let s = scores[k];
    if (clipBox) {
      // prefer the mask that fills the detector's box (stops SAM picking just a shirt or the whole scene)
      const bb = bboxOf(a, work.w, work.h);
      const ix = Math.max(0, Math.min(bb.x1, clipBox[2]) - Math.max(bb.x0, clipBox[0])), iy = Math.max(0, Math.min(bb.y1, clipBox[3]) - Math.max(bb.y0, clipBox[1]));
      const inter = ix * iy, uni = bb.w * bb.h + (clipBox[2] - clipBox[0]) * (clipBox[3] - clipBox[1]) - inter;
      s *= inter / uni;
    }
    if (s > bestScore) { bestScore = s; best = a; }
  }
  if (best && clipBox) {
    const px = (clipBox[2] - clipBox[0]) * 0.04, py = (clipBox[3] - clipBox[1]) * 0.04;
    const X0 = clipBox[0] - px, Y0 = clipBox[1] - py, X1 = clipBox[2] + px, Y1 = clipBox[3] + py;
    for (let y = 0; y < work.h; y++) for (let x = 0; x < work.w; x++) if (x < X0 || x > X1 || y < Y0 || y > Y1) best[y * work.w + x] = 0;
  }
  return best;
}
const NICE = { 'person': 'Person', 'dog': 'Dog', 'cat': 'Cat', 'car': 'Car', 'bird': 'Bird', 'horse': 'Horse' };
async function detectObjects(work) {
  const det = await loadDet();
  aiStatus('Looking for people & objects…');
  const raw = await rawOf(work);
  const res = await det(raw, { threshold: 0.8, percentage: false });
  const A = work.w * work.h;
  return res.filter(r => {
    const b = r.box, area = (b.xmax - b.xmin) * (b.ymax - b.ymin) / A;
    return area > 0.006 && area < 0.9 && r.score >= (r.label === 'person' ? 0.82 : 0.9);
  }).sort((a, b) => (b.box.xmax - b.box.xmin) * (b.box.ymax - b.box.ymin) - (a.box.xmax - a.box.xmin) * (a.box.ymax - a.box.ymin)).slice(0, 12);
}
async function maskForBox(work, b) {
  const bw = b.xmax - b.xmin, bh = b.ymax - b.ymin, cx = (b.xmin + b.xmax) / 2, cy = (b.ymin + b.ymax) / 2;
  const pts = bh >= bw ? [[cx, b.ymin + bh * 0.3], [cx, b.ymin + bh * 0.62]] : [[b.xmin + bw * 0.35, cy], [b.xmin + bw * 0.65, cy]];
  const lab = [1, 1];
  // negative hints just outside the box corners keep the cut tight
  const o = 0.06;
  [[b.xmin - bw * o, b.ymin - bh * o], [b.xmax + bw * o, b.ymin - bh * o]].forEach(p => { if (p[0] >= 0 && p[1] >= 0 && p[0] < work.w && p[1] < work.h) { pts.push(p); lab.push(0); } });
  return samMask(work, pts, lab, [b.xmin, b.ymin, b.xmax, b.ymax]);
}

/* ---------- text ---------- */
// a word's mask splits into letter-sized blobs; a mis-picked background is one huge blob
function looksLikeLetters(alpha, w, bb, letters) {
  const bw = bb.x1 - bb.x0 + 1, bh = bb.y1 - bb.y0 + 1, seen = new Uint8Array(bw * bh), area = bw * bh;
  let comps = 0, biggest = 0, ink = 0; const minA = bh * bh * 0.004;
  for (let k = 0; k < area; k++) {
    if (seen[k] || alpha[(bb.y0 + ((k / bw) | 0)) * w + bb.x0 + k % bw] < 128) continue;
    let n = 0; const st = [k]; seen[k] = 1;
    while (st.length) { const q = st.pop(), qx = q % bw, qy = (q / bw) | 0; n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = qx + dx, yy = qy + dy; if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue; const r = yy * bw + xx; if (seen[r] || alpha[(bb.y0 + yy) * w + bb.x0 + xx] < 128) continue; seen[r] = 1; st.push(r); } }
    ink += n; if (n >= minA) { comps++; biggest = Math.max(biggest, n); }
  }
  if (!comps || ink / area > 0.75) return false;
  if (letters >= 3 && (comps < Math.max(2, letters * 0.3) || biggest / area > 0.4)) return false;
  return true;
}
function textMask(work, bb, word = '') {
  // 2-colour split inside the word box; the colour that owns the box border is the background
  const { w, data } = work, d = data.data, H = work.h;
  const pad = Math.round(bb.h * 0.18);
  const x0 = Math.max(0, bb.x0 - pad), y0 = Math.max(0, bb.y0 - pad), x1 = Math.min(w - 1, bb.x1 + pad), y1 = Math.min(H - 1, bb.y1 + pad);
  const px = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px.push((y * w + x) * 4);
  if (px.length < 20) return null;
  const lum = i => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  let lo = 255, hi = 0; for (const i of px) { const l = lum(i); if (l < lo) lo = l; if (l > hi) hi = l; }
  let c = [[d[px[0]], d[px[0] + 1], d[px[0] + 2]], [0, 0, 0]];
  const pick = t => { let best = px[0], bd = 1e9; for (const i of px) { const dd = Math.abs(lum(i) - t); if (dd < bd) { bd = dd; best = i; } } return [d[best], d[best + 1], d[best + 2]]; };
  c = [pick(lo), pick(hi)];
  const asg = new Uint8Array(px.length);
  for (let it = 0; it < 8; it++) {
    const s = [[0, 0, 0, 0], [0, 0, 0, 0]];
    px.forEach((i, k) => { const d0 = (d[i] - c[0][0]) ** 2 + (d[i + 1] - c[0][1]) ** 2 + (d[i + 2] - c[0][2]) ** 2, d1 = (d[i] - c[1][0]) ** 2 + (d[i + 1] - c[1][1]) ** 2 + (d[i + 2] - c[1][2]) ** 2; const a = d1 < d0 ? 1 : 0; asg[k] = a; s[a][0] += d[i]; s[a][1] += d[i + 1]; s[a][2] += d[i + 2]; s[a][3]++; });
    for (let a = 0; a < 2; a++) if (s[a][3]) c[a] = [s[a][0] / s[a][3], s[a][1] / s[a][3], s[a][2] / s[a][3]];
  }
  // polarity: the text colour is the one concentrated inside the word box rather than in the ring around it
  const bw = x1 - x0 + 1, inn = [0, 0], ring = [0, 0]; let nIn = 0, nRing = 0;
  px.forEach((i, k) => { const x = x0 + k % bw, y = y0 + ((k / bw) | 0); if (x >= bb.x0 && x <= bb.x1 && y >= bb.y0 && y <= bb.y1) { inn[asg[k]]++; nIn++; } else { ring[asg[k]]++; nRing++; } });
  const score = a => inn[a] / Math.max(1, nIn) - ring[a] / Math.max(1, nRing);
  const tI = score(1) > score(0) ? 1 : 0, bgI = 1 - tI, tc = c[tI], bg = c[bgI];
  if (score(tI) < 0.08) return null;             // colour isn't concentrated in the box: not lettering
  const ob = { ...bb };
  const v = [tc[0] - bg[0], tc[1] - bg[1], tc[2] - bg[2]], vv = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
  if (Math.sqrt(vv) < 24) return null;           // no real colour split: not text
  let frac = inn[tI] / Math.max(1, nIn);
  if (frac < 0.04 || frac > 0.86) return null;
  const tOf = i => ((d[i] - bg[0]) * v[0] + (d[i + 1] - bg[1]) * v[1] + (d[i + 2] - bg[2]) * v[2]) / vv;
  const isInk = (x, y) => { const t = tOf((y * w + x) * 4); return t > 0.6 && t < 1.4; };
  const colInk = (x, ya, yb) => { let n = 0; for (let y = ya; y <= yb; y++) if (isInk(x, y)) n++; return n / Math.max(1, yb - ya + 1); };
  let gx1 = x1, gx0 = x0; const maxGrow = bb.w * 1.5;
  for (let dir of [1, -1]) {
    let x = dir > 0 ? x1 + 1 : x0 - 1, gap = 0, grown = 0, solid = 0;
    while (x >= 0 && x < w && gap < bb.h * 0.6 && grown < maxGrow) {
      const ink = colInk(x, bb.y0, bb.y1), ringInk = (colInk(x, y0, Math.max(y0, bb.y0 - 1)) + colInk(x, Math.min(y1, bb.y1 + 1), y1)) / 2;
      solid = ink > 0.8 ? solid + 1 : 0;
      if (ringInk > 0.45 || solid > bb.h * 0.45) break;   // spills above/below the line, or a block wider than any stem
      if (ink > 0.06) { gap = 0; dir > 0 ? gx1 = x : gx0 = x; } else gap++;
      x += dir; grown++;
    }
  }
  if (gx1 > x1 || gx0 < x0) for (let y = y0; y <= y1; y++) for (let x = gx0; x <= gx1; x++) if (x < x0 || x > x1) px.push((y * w + x) * 4);
  if (gx0 < x0) bb.x0 = gx0; if (gx1 > x1) bb.x1 = gx1; bb.w = bb.x1 - bb.x0 + 1;
  const alpha = new Uint8Array(w * H);
  const m = Math.max(2, Math.round(bb.h * 0.1)), ax0 = bb.x0 - m, ax1 = bb.x1 + m, ay0 = bb.y0 - m, ay1 = bb.y1 + m;
  px.forEach(i => { const p = i / 4, px_ = p % w, py_ = (p / w) | 0; if (px_ < ax0 || px_ > ax1 || py_ < ay0 || py_ > ay1) return; const t = ((d[i] - bg[0]) * v[0] + (d[i + 1] - bg[1]) * v[1] + (d[i + 2] - bg[2]) * v[2]) / vv; const s = clamp((t - 0.22) / 0.5, 0, 1); alpha[p] = Math.round(s * s * (3 - 2 * s) * 255); });
  if (!looksLikeLetters(alpha, w, ob, (word.match(/[\p{L}\p{N}]/gu) || []).length)) return null;
  return { alpha, color: '#' + tc.map(x => Math.round(x).toString(16).padStart(2, '0')).join(''), frac };
}
// Text over photos defeats plain OCR (bright text on a bright sky binarizes to nothing), so we also feed it a
// local-contrast map: any pixel whose colour differs strongly from its neighbourhood becomes ink.
function contrastMap(src, div = 14, T = 40) {
  const w = src.width, hh = src.height, d = src.getContext('2d').getImageData(0, 0, w, hh).data;
  const W1 = w + 1, I = [0, 1, 2].map(() => new Float64Array(W1 * (hh + 1)));
  for (let y = 0; y < hh; y++) { const rs = [0, 0, 0]; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; for (let c = 0; c < 3; c++) { rs[c] += d[i + c]; I[c][(y + 1) * W1 + x + 1] = I[c][y * W1 + x + 1] + rs[c]; } } }
  const r = Math.max(8, Math.round(Math.min(w, hh) / div));
  const out = mkCanvas(w, hh), ox = out.getContext('2d'), od = ox.createImageData(w, hh);
  for (let y = 0; y < hh; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(hh, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), n = (x1 - x0) * (y1 - y0), i = (y * w + x) * 4;
      let dist = 0;
      for (let c = 0; c < 3; c++) { const m = (I[c][y1 * W1 + x1] - I[c][y0 * W1 + x1] - I[c][y1 * W1 + x0] + I[c][y0 * W1 + x0]) / n; dist += (d[i + c] - m) ** 2; }
      const v = Math.sqrt(dist) > T ? 0 : 255;
      od.data[i] = od.data[i + 1] = od.data[i + 2] = v; od.data[i + 3] = 255;
    }
  }
  ox.putImageData(od, 0, 0);
  return out;
}
async function findText(work) {
  const worker = await loadOCR();
  aiStatus('Reading text…');
  const s = Math.min(1, 1200 / Math.max(work.w, work.h));
  let src = work.canvas;
  if (s < 1) { src = mkCanvas(Math.round(work.w * s), Math.round(work.h * s)); src.getContext('2d').drawImage(work.canvas, 0, 0, src.width, src.height); }
  const words = [];
  // sparse-text mode, three binarizations: adaptive Otsu, Sauvola, and our local-contrast map. Each catches text the others miss.
  const passes = [[src, '1'], [src, '2'], [contrastMap(src, 7, 30), '0']];
  for (const [k, [img, tm]] of passes.entries()) {
    aiStatus('Reading text…', k / passes.length);
    await worker.setParameters({ tessedit_pageseg_mode: '11', thresholding_method: tm });
    const { data } = await worker.recognize(img);
    for (const wd of data.words || []) {
      const t = wd.text.replace(/[^\p{L}\p{N}'’!?&.,:%$#@+-]/gu, '');
      const alnum = (t.match(/[\p{L}\p{N}]/gu) || []).length;
      if (!alnum || wd.confidence < 70 || (alnum < 2 && wd.confidence < 90)) continue;
      const bb = { x0: Math.floor(wd.bbox.x0 / s), y0: Math.floor(wd.bbox.y0 / s), x1: Math.ceil(wd.bbox.x1 / s), y1: Math.ceil(wd.bbox.y1 / s) }; bb.w = bb.x1 - bb.x0 + 1; bb.h = bb.y1 - bb.y0 + 1;
      if (bb.h < work.h * 0.012) continue;
      const dup = words.find(o => { const ix = Math.min(o.bb.x1, bb.x1) - Math.max(o.bb.x0, bb.x0), iy = Math.min(o.bb.y1, bb.y1) - Math.max(o.bb.y0, bb.y0); return ix > 0 && iy > 0 && ix * iy > 0.4 * Math.min(o.bb.w * o.bb.h, bb.w * bb.h); });
      if (dup) { if (dup.conf >= wd.confidence) continue; words.splice(words.indexOf(dup), 1); }
      const tm = textMask(work, bb, t); if (!tm) continue;
      words.push({ text: t, conf: wd.confidence, bb, ...tm });
    }
  }
  // group words into lines: overlapping vertically, similar height, small horizontal gap
  words.sort((a, b) => a.bb.x0 - b.bb.x0);
  const lines = [];
  for (const wd of words) {
    const cy = wd.bb.y0 + wd.bb.h / 2;
    const L = lines.find(l => { const last = l[l.length - 1]; const lcy = last.bb.y0 + last.bb.h / 2; return Math.abs(cy - lcy) < Math.min(last.bb.h, wd.bb.h) * 0.45 && Math.max(last.bb.h, wd.bb.h) / Math.min(last.bb.h, wd.bb.h) < 1.6 && wd.bb.x0 - last.bb.x1 < Math.max(last.bb.h, wd.bb.h) * 1.4; });
    L ? L.push(wd) : lines.push([wd]);
  }
  return lines.map(items => {
    const alpha = new Uint8Array(work.w * work.h);
    items.forEach(it => { for (let i = 0; i < alpha.length; i++) if (it.alpha[i] > alpha[i]) alpha[i] = it.alpha[i]; });
    const bb = { x0: Math.min(...items.map(i => i.bb.x0)), y0: Math.min(...items.map(i => i.bb.y0)), x1: Math.max(...items.map(i => i.bb.x1)), y1: Math.max(...items.map(i => i.bb.y1)) }; bb.w = bb.x1 - bb.x0 + 1; bb.h = bb.y1 - bb.y0 + 1;
    return { text: items.map(i => i.text).join(' '), bb, alpha, color: items[0].color, frac: items.reduce((s2, i) => s2 + i.frac, 0) / items.length, words: items };
  });
}

/* ---------- Magic Layers editor ---------- */
const HUES = ['#a78bfa', '#f472b6', '#22d3ee', '#facc15', '#4ade80', '#fb923c', '#60a5fa', '#e879f9', '#2dd4bf', '#f87171'];
let ML = null;
async function openMagic(o, mode = 'separate') {
  o = o || canvas.getActiveObject();
  if (!isImg(o)) { toast('Select a photo first'); return; }
  let work; try { work = workFrom(o); } catch (e) { toast(e.message, 3500); return; }
  ML = { o, work, items: [], brush: null, tool: mode === 'erase' ? 'brush' : 'pick', textMode: 'cutout', fill: true, busy: 0, size: 26, mode };
  const pv = mkCanvas(work.w, work.h); pv.className = 'ml-canvas';
  const ov = mkCanvas(work.w, work.h); ov.className = 'ml-overlay';
  ML.brush = new Uint8Array(work.w * work.h); ML.pv = pv; ML.ov = ov;
  pv.getContext('2d').drawImage(work.canvas, 0, 0);
  const stage = h('div', { class: 'ml-stage' }, pv, ov, h('div', { class: 'ml-scan' }));
  const list = h('div', { class: 'ml-list' });
  const side = h('div', { class: 'ml-side' },
    h('div', { class: 'ml-head' }, h('span', { class: 'spark' }), h('b', {}, mode === 'erase' ? 'Magic eraser' : 'Magic layers'), h('button', { class: 'tb icon', onclick: closeMagic }, ico('close'))),
    h('div', { class: 'ai-status ml-status' }, ''),
    h('div', { class: 'seg', style: 'flex:none;margin:6px 0 10px' },
      h('button', { class: ML.tool === 'pick' ? 'on' : '', 'data-t': 'pick', onclick: () => setTool('pick') }, 'Select'),
      h('button', { class: ML.tool === 'brush' ? 'on' : '', 'data-t': 'brush', onclick: () => setTool('brush') }, 'Brush erase')),
    h('div', { class: 'ml-brush' + (ML.tool === 'brush' ? '' : ' hidden') }, row('Size', ...slider(ML.size, 6, 120, 1, v => ML.size = v)), h('button', { class: 'btn block', onclick: () => { ML.brush.fill(0); drawOverlay(); } }, 'Clear brush')),
    list,
    h('div', { class: 'ml-opts' },
      row('Text', segBtns([['cutout', 'Cutout', true], ['edit', 'Editable']], v => { ML.textMode = v; $$('.ml-opts .seg button').forEach(b => b.classList.toggle('on', (b.textContent === 'Editable') === (v === 'edit'))); })),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: true, onchange: e => ML.fill = e.target.checked }), 'Fill the gaps')),
    h('div', { class: 'foot', style: 'margin-top:12px' }, h('button', { class: 'btn', onclick: closeMagic }, 'Cancel'), h('button', { class: 'btn acc', id: 'mlApply', onclick: applyMagic }, mode === 'erase' ? 'Erase' : 'Separate')));
  modal(h('div', { class: 'ml' }, stage, side));
  $('#sheet').classList.add('wide');
  ML.list = list; ML.stage = stage;
  bindStage(stage, ov);
  renderItems();
  if (mode === 'erase') { aiStatus('Paint over anything to erase · or Select it'); samEmbed(work).then(() => ML && aiStatus('Paint over anything to erase · or Select it')).catch(() => {}); return; }
  analyze().catch(e => { console.error(e); aiStatus('AI failed: ' + (e.message || e)); stage.classList.remove('scanning'); });
}
function closeMagic() { ML = null; aiStatus(''); closeModal(); const sh = $('#sheet'); sh.classList.remove('wide'); sh.innerHTML = ''; }
function setTool(t) { ML.tool = t; $$('.ml-side [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === t)); $('.ml-brush').classList.toggle('hidden', t !== 'brush'); }
async function analyze() {
  const my = ML; my.stage.classList.add('scanning');
  const dets = await detectObjects(my.work); if (ML !== my) return;
  if (dets.length) await samEmbed(my.work);
  const count = {};
  for (const d of dets) {
    if (ML !== my) return;
    aiStatus(`Cutting out ${dets.indexOf(d) + 1} of ${dets.length}…`, dets.indexOf(d) / dets.length);
    const m = await maskForBox(my.work, d.box); if (!m) continue;
    const nm = NICE[d.label] || d.label[0].toUpperCase() + d.label.slice(1);
    count[nm] = (count[nm] || 0) + 1;
    addItem({ kind: 'object', name: nm + (dets.filter(x => x.label === d.label).length > 1 ? ' ' + count[nm] : ''), alpha: m, mode: 'lift' });
  }
  if (ML !== my) return;
  let texts = [];
  try { texts = await findText(my.work); } catch (e) { console.warn('ocr', e); }
  if (ML !== my) return;
  texts.forEach(t => addItem({ kind: 'text', name: '“' + t.text.slice(0, 26) + '”', alpha: t.alpha, mode: 'lift', text: t }));
  my.stage.classList.remove('scanning');
  aiStatus(my.items.length ? `Found ${my.items.length} · click the photo to add more` : 'Click anything in the photo to select it');
  if (!AI.emb || AI.emb.key !== my.work.key) samEmbed(my.work).catch(() => {});
}
function addItem(it) { it.id = uid(); it.color = HUES[ML.items.length % HUES.length]; it.bb = bboxOf(it.alpha, ML.work.w, ML.work.h, 64); if (!it.bb) return; ML.items.push(it); renderItems(); drawOverlay(); }
function renderItems() {
  const L = ML.list; L.innerHTML = '';
  if (!ML.items.length) L.append(h('div', { class: 'empty', style: 'padding:14px 4px' }, ML.mode === 'erase' ? 'Nothing selected yet' : 'Scanning…'));
  ML.items.forEach(it => {
    const sw = h('i', { style: `background:${it.color}` });
    L.append(h('div', { class: 'ml-item' + (it.mode === 'off' ? ' off' : '') }, sw, h('span', { class: 'nm' }, it.name),
      segBtns([['lift', 'Lift', it.mode === 'lift', 'Make it a movable layer'], ['erase', 'Erase', it.mode === 'erase', 'Remove it'], ['off', '✕', it.mode === 'off', 'Ignore']], v => { it.mode = v; renderItems(); drawOverlay(); })));
  });
  const n = ML.items.filter(i => i.mode !== 'off').length + (ML.brush.some(v => v) ? 1 : 0);
  const b = $('#mlApply'); if (b) b.disabled = !n;
}
function drawOverlay() {
  if (!ML) return;
  const { w, h: hh } = ML.work, x = ML.ov.getContext('2d'), id = x.createImageData(w, hh), d = id.data;
  const hexRGB = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  for (const it of ML.items) {
    if (it.mode === 'off') continue;
    const [r, g, b] = it.mode === 'erase' ? [239, 68, 68] : hexRGB(it.color);
    const a = it.mode === 'erase' ? 150 : 105;
    const { x0, y0, x1, y1 } = it.bb;
    for (let y = y0; y <= y1; y++) for (let xx = x0; xx <= x1; xx++) {
      const i = y * w + xx, m = it.alpha[i]; if (m < 64) continue;
      const edge = xx > 0 && xx < w - 1 && y > 0 && y < hh - 1 && (it.alpha[i - 1] < 64 || it.alpha[i + 1] < 64 || it.alpha[i - w] < 64 || it.alpha[i + w] < 64);
      d[i * 4] = edge ? 255 : r; d[i * 4 + 1] = edge ? 255 : g; d[i * 4 + 2] = edge ? 255 : b; d[i * 4 + 3] = edge ? 255 : a;
    }
  }
  for (let i = 0; i < ML.brush.length; i++) if (ML.brush[i]) { d[i * 4] = 239; d[i * 4 + 1] = 68; d[i * 4 + 2] = 68; d[i * 4 + 3] = 150; }
  x.putImageData(id, 0, 0);
  renderItemsCount();
}
function renderItemsCount() { const n = ML.items.filter(i => i.mode !== 'off').length + (ML.brush.some(v => v) ? 1 : 0); const b = $('#mlApply'); if (b) b.disabled = !n; }
function bindStage(stage, ov) {
  const pt = e => { const r = ov.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * ML.work.w, (e.clientY - r.top) / r.height * ML.work.h]; };
  let painting = false, last = null;
  const paint = (p) => {
    const R = ML.size * ML.work.w / ov.getBoundingClientRect().width / 2, { w, h: hh } = ML.work;
    const steps = last ? Math.max(1, Math.ceil(Math.hypot(p[0] - last[0], p[1] - last[1]) / (R / 3))) : 1;
    for (let s = 1; s <= steps; s++) {
      const cx = last ? last[0] + (p[0] - last[0]) * s / steps : p[0], cy = last ? last[1] + (p[1] - last[1]) * s / steps : p[1];
      for (let y = Math.max(0, cy - R | 0); y <= Math.min(hh - 1, cy + R | 0); y++) for (let x = Math.max(0, cx - R | 0); x <= Math.min(w - 1, cx + R | 0); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= R * R) ML.brush[y * w + x] = 1;
    }
    last = p;
  };
  const cursor = h('div', { class: 'ml-cursor' }); stage.append(cursor);
  ov.addEventListener('pointerdown', async e => {
    if (!ML) return; const p = pt(e);
    if (ML.tool === 'brush') { painting = true; last = null; ov.setPointerCapture(e.pointerId); paint(p); drawOverlay(); return; }
    const i = (p[1] | 0) * ML.work.w + (p[0] | 0);
    const hit = !e.shiftKey && [...ML.items].reverse().find(it => it.alpha[i] >= 64);
    if (hit) { hit.mode = hit.mode === 'lift' ? 'erase' : hit.mode === 'erase' ? 'off' : 'lift'; renderItems(); drawOverlay(); return; }
    if (ML.busy) return;
    ML.busy++; stage.classList.add('thinking');
    const my = ML;
    try {
      const m = await samMask(my.work, [p], [1]);
      if (ML !== my || !m) return;
      const n = my.items.filter(x => x.kind === 'pick').length + 1;
      addItem({ kind: 'pick', name: 'Selection ' + n, alpha: m, mode: my.mode === 'erase' ? 'erase' : 'lift' });
      aiStatus('Selected · click again to switch Lift / Erase / off');
    } catch (err) { console.error(err); aiStatus('AI failed: ' + (err.message || err)); }
    finally { if (ML === my) { ML.busy--; stage.classList.remove('thinking'); } }
  });
  ov.addEventListener('pointermove', e => {
    const r = ov.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    cursor.style.display = ML && ML.tool === 'brush' ? 'block' : 'none';
    if (ML) { cursor.style.width = cursor.style.height = ML.size + 'px'; cursor.style.left = (e.clientX - sr.left) + 'px'; cursor.style.top = (e.clientY - sr.top) + 'px'; }
    if (painting && ML) { paint(pt(e)); drawOverlay(); }
  });
  ov.addEventListener('pointerleave', () => cursor.style.display = 'none');
  ov.addEventListener('pointerup', () => { painting = false; last = null; });
}
async function applyMagic() {
  if (!ML || ML.applying) return;
  const my = ML; my.applying = true; $('#mlApply').disabled = true;
  try {
    const { work, o } = my, { w, h: hh } = work, N = w * hh;
    const live = my.items.filter(i => i.mode !== 'off');
    const hole = new Uint8Array(N);
    const maxD = Math.max(w, hh);
    for (const it of live) {
      const r = it.kind === 'text' ? Math.max(2, Math.round(it.bb.h * 0.09)) : Math.max(3, Math.round(maxD * 0.006));
      const dm = dilate(it.alpha, w, hh, r, it.kind === 'text' ? 40 : 64);
      for (let i = 0; i < N; i++) if (dm[i]) hole[i] = 1;
    }
    const bm = dilate(my.brush, w, hh, 2); for (let i = 0; i < N; i++) if (bm[i]) hole[i] = 1;
    const out = [];
    // background with the gaps filled
    let bgCanvas = work.canvas, filled = false;
    if (my.fill && hole.some(v => v)) {
      aiStatus('Filling in the background…', 0);
      const rgba = await runInpaint(work, hole);
      bgCanvas = mkCanvas(w, hh); bgCanvas.getContext('2d').putImageData(new ImageData(rgba, w, hh), 0, 0); filled = true;
    }
    const hasAlpha = (() => { const d = work.data.data; for (let i = 3; i < d.length; i += 16) if (d[i] < 250) return true; return false; })();
    const bg = await replaceWith(o, work, bgCanvas, { png: hasAlpha, name: filled ? (o.name && o.name !== 'Image' ? o.name : 'Photo') : o.name });
    out.push(bg);
    const lifted = [];
    for (const it of live.filter(i => i.mode === 'lift')) {
      if (it.kind === 'text' && my.textMode === 'edit') { lifted.push(textFromItem(o, work, it)); continue; }
      const alpha = it.kind === 'text' ? it.alpha : feather(it.alpha, w, hh);
      const cut = cutOut(work, alpha); if (!cut) continue;
      const img = await pieceImage(o, work, cut, it.kind === 'text' ? 'Text ' + it.name : it.name);
      if (it.kind === 'text') img.magicKind = 'text';
      lifted.push(img);
    }
    out.push(...lifted);
    if (ML !== my) return;
    swapObjects(o, out);
    if (lifted.length) canvas.setActiveObject(lifted.length > 1 ? new fabric.ActiveSelection(lifted, { canvas }) : lifted[0]);
    else canvas.setActiveObject(bg);
    canvas.renderAll(); commit(); renderProps();
    closeMagic();
    toast(lifted.length ? `✨ ${lifted.length} layer${lifted.length > 1 ? 's' : ''} lifted — drag them anywhere` : '✨ Erased', 2800);
    if (lifted.length) flashObjects(lifted);
  } catch (e) { console.error(e); aiStatus('Failed: ' + (e.message || e)); my.applying = false; const b = $('#mlApply'); if (b) b.disabled = false; }
}
function textFromItem(o, work, it) {
  const t = it.text, bb = it.bb, s = o.scaleY / work.f;
  const desc = /[gjpqy]/.test(t.text), lower = /[a-z]/.test(t.text);
  const em = bb.h / (desc ? 0.95 : lower ? 0.78 : 0.72);
  const font = t.frac > 0.42 ? 'Archivo Black' : t.frac > 0.27 ? 'Poppins' : 'Inter';
  const p = toCanvasPt(o, work, bb.x0 + bb.w / 2, bb.y0 + bb.h / 2);
  const tb = new fabric.Textbox(t.text, { originX: 'center', originY: 'center', left: p.x, top: p.y, width: bb.w * s * 1.12 + em * s * 0.5, fontSize: em * s, fontFamily: font,
    fontWeight: font === 'Poppins' ? 'bold' : 'normal', fill: t.color, textAlign: 'center', lineHeight: 1.05, angle: o.angle, name: 'Text' });
  tb.id = uid(); ensureFont(font).then(() => { tb.initDimensions(); tb.setCoords(); canvas.requestRenderAll(); });
  return tb;
}
function flashObjects(list) {
  let t0 = performance.now();
  const tick = () => {
    const k = (performance.now() - t0) / 900; if (k > 1) { S.flash = null; canvas.requestRenderAll(); return; }
    S.flash = { list, k }; canvas.renderAll(); requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
canvas.on('after:render', () => {
  if (!S.flash) return;
  const ctx = canvas.getContext(), v = canvas.viewportTransform, { list, k } = S.flash;
  ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
  ctx.strokeStyle = `rgba(236,72,153,${1 - k})`; ctx.lineWidth = (2 + 10 * k) / S.zoom; ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 20;
  list.forEach(o => { if (!o.canvas) return; const r = o.getBoundingRect(true, true), g = 8 * k / S.zoom; ctx.strokeRect(r.left - g, r.top - g, r.width + g * 2, r.height + g * 2); });
  ctx.restore();
});

/* ---------- one-click tools ---------- */
async function removeBackground(o) {
  o = o || canvas.getActiveObject(); if (!isImg(o)) return toast('Select a photo first');
  let work; try { work = workFrom(o, 2048); } catch (e) { return toast(e.message, 3500); }
  try {
    const [model, proc] = await loadRMBG();
    aiStatus('Cutting out the subject…');
    const { RawImage } = await tjs();
    const raw = await rawOf(work);
    const { pixel_values } = await proc(raw);
    const { output } = await model({ input: pixel_values });
    const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(work.w, work.h);
    const d = work.data.data; for (let i = 0; i < work.w * work.h; i++) d[i * 4 + 3] = Math.round(d[i * 4 + 3] * mask.data[i] / 255);
    const c = mkCanvas(work.w, work.h); c.getContext('2d').putImageData(work.data, 0, 0);
    // trim empty edges so the selection box hugs the subject
    const a = new Uint8Array(work.w * work.h); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
    const cut = cutOut({ ...work, data: work.data }, a, 0) || { canvas: c, x: 0, y: 0, w: work.w, h: work.h };
    const img = await pieceImage(o, work, cut, (o.name && o.name !== 'Image' ? o.name : 'Photo') + ' (cut out)');
    img.magicKind = 'cutout';
    swapObjects(o, [img]); canvas.setActiveObject(img); canvas.renderAll(); commit(); renderProps();
    aiStatus(''); toast('✨ Background removed'); flashObjects([img]);
  } catch (e) { console.error(e); aiStatus(''); toast('Background removal failed: ' + (e.message || e), 4000); }
}
async function splitPieces(o) {
  o = o || canvas.getActiveObject(); if (!isImg(o)) return;
  const el = o.getElement(); const w = el.naturalWidth || el.width, hh = el.naturalHeight || el.height;
  const work = { canvas: mkCanvas(w, hh), w, h: hh, f: 1 }; const x = work.canvas.getContext('2d'); x.drawImage(el, 0, 0); work.data = x.getImageData(0, 0, w, hh);
  if (o.cropX || o.cropY || o.width !== w || o.height !== hh) return toast('Reset the crop first');
  const N = w * hh, d = work.data.data, lab = new Int32Array(N).fill(-1);
  const comps = [];
  for (let s = 0; s < N; s++) {
    if (lab[s] >= 0 || d[s * 4 + 3] < 96) continue;
    const id = comps.length, st = [s]; lab[s] = id; let x0 = w, y0 = hh, x1 = 0, y1 = 0, n = 0;
    while (st.length) { const p = st.pop(), px = p % w, py = (p / w) | 0; n++; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = px + dx, yy = py + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= hh) continue; const q = yy * w + xx; if (lab[q] < 0 && d[q * 4 + 3] >= 96) { lab[q] = id; st.push(q); } } }
    comps.push({ id, x0, y0, x1, y1, n, root: id });
  }
  const minN = Math.max(6, N * 0.00004), big = comps.filter(c => c.n >= minN);
  if (big.length < 2) return toast('Nothing to split here');
  if (big.length > 80) return toast('Too many tiny pieces to split');
  // glue dots (i, j, accents) onto the letter below them
  const find = c => c.root === c.id ? c : (c.root = find(comps[c.root]).id, comps[c.root]);
  for (const a of big) for (const b of big) {
    if (a === b || a.n > b.n * 0.35) continue;
    const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    if (ox > (a.x1 - a.x0) * 0.5 && a.y1 < b.y0 + (b.y1 - b.y0) * 0.3 && b.y0 - a.y1 < (b.y1 - b.y0) * 0.6) a.root = find(b).id;
  }
  // soft edge pixels join their nearest labelled neighbour
  for (let pass = 0; pass < 3; pass++) for (let p = 0; p < N; p++) { if (lab[p] >= 0 || d[p * 4 + 3] === 0) continue; const px = p % w; for (const q of [p - 1, p + 1, p - w, p + w]) { if (q < 0 || q >= N || Math.abs((q % w) - px) > 1) continue; if (lab[q] >= 0) { lab[p] = lab[q]; break; } } }
  const groups = new Map(); for (const c of big) { const r = find(c).id; if (!groups.has(r)) groups.set(r, []); groups.get(r).push(c.id); }
  const keep = new Set(big.map(c => c.id)); const rootOf = new Int32Array(comps.length).fill(-1); for (const c of comps) if (keep.has(c.id)) rootOf[c.id] = find(c).id;
  const out = [];
  for (const [r] of groups) {
    const alpha = new Uint8Array(N); for (let p = 0; p < N; p++) if (lab[p] >= 0 && rootOf[lab[p]] === r) alpha[p] = 255;
    const cut = cutOut(work, alpha, 1); if (!cut) continue;
    out.push(await pieceImage(o, work, cut, 'Piece', { magicKind: 'piece' }));
  }
  out.sort((a, b) => a.left - b.left).forEach((p, i) => p.name = (o.magicKind === 'text' ? 'Letter ' : 'Piece ') + (i + 1));
  swapObjects(o, out);
  canvas.setActiveObject(new fabric.ActiveSelection(out, { canvas })); canvas.renderAll(); commit(); renderProps();
  toast(`✨ Split into ${out.length} pieces`); flashObjects(out);
}
function warmUp() { tjs().then(() => aiStatus('')).catch(() => {}); }

window.Magic = { openMagic, removeBackground, splitPieces, warmUp, aiStatus, close: closeMagic };
