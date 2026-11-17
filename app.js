/* Nova Studio — free, offline-first design editor. Original code, built on Fabric.js (MIT). */
'use strict';

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmt = v => Math.round(v * 100) / 100;
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

const ICONS = {
  templates: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  elements: 'M3 21l5-9 5 9zM17 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM14 14h7v7h-7z',
  text: 'M5 7V5h14v2M12 5v14M9 19h6',
  photos: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9h.01',
  icons: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
  uploads: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  draw: 'M4 20l4-1L19 8l-3-3L5 16zM14 6l3 3',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18h2',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', copy: 'M9 9h11v11H9zM5 15V4h11',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeoff: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.3 3.8M6.6 6.6C3.9 8.3 2 12 2 12s4 6 10 6a9.6 9.6 0 0 0 4.4-1',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', unlock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 7.5-2',
  al: 'M4 3v18M8 7h10v3H8zM8 14h6v3H8z', ac: 'M12 3v18M6 7h12v3H6zM8 14h8v3H8z', ar: 'M20 3v18M6 7h10v3H6zM10 14h6v3h-6z',
  at: 'M3 4h18M7 8h3v10H7zM14 8h3v6h-3z', am: 'M3 12h18M7 6h3v12H7zM14 8h3v8h-3z', ab: 'M3 20h18M7 6h3v10H7zM14 10h3v6h-3z',
  dh: 'M4 4v16M20 4v16M10 8h4v8h-4z', dv: 'M4 4h16M4 20h16M8 10h8v4H8z',
  tl: 'M4 6h16M4 10h10M4 14h16M4 18h10', tc: 'M4 6h16M7 10h10M4 14h16M7 18h10', tr: 'M4 6h16M10 10h10M4 14h16M10 18h10', tj: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  flipH: 'M12 3v18M9 7L3 12l6 5zM15 7l6 5-6 5z', flipV: 'M3 12h18M7 9l5-6 5 6zM7 15l5 6 5-6z',
  up: 'M12 19V5M5 12l7-7 7 7', down: 'M12 5v14M19 12l-7 7-7-7', top: 'M5 4h14M12 20V9M6 14l6-6 6 6', bottom: 'M5 20h14M12 4v11M6 10l6 6 6-6',
  group: 'M3 3h8v8H3zM13 13h8v8h-8zM11 7h6v6',
  dropper: 'M19 5l-2-2-4 4-1-1-2 2 1 1-7 7v3h3l7-7 1 1 2-2-1-1z',
  close: 'M6 6l12 12M18 6L6 18', left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6', download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  magic: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM19 14l.8 2.2 2.2.8-2.2.8L19 20l-.8-2.2L16 17l2.2-.8zM5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6z',
  backgrounds: 'M3 3h18v18H3zM3 15c4-4 7-4 10 0s5 3 8-1M15 8a1.5 1.5 0 1 0 0-.01',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4', scissors: 'M6 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.5 8.5L20 20M8.5 15.5L20 4', eraser: 'M16 3l5 5-11 11H5l-2-2zM9 9l6 6M10 19h11',
  layersplit: 'M12 3l9 5-9 5-9-5zM3 16l9 5 9-5', cmd: 'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z',
};
const ico = n => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'i'); s.innerHTML = `<path d="${ICONS[n]}"/>`; return s; };
function toast(msg, ms = 1800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), ms); }

/* ---------------- constants ---------------- */
const PROPS = ['id', 'name', 'locked', 'isBg', 'selectable', 'evented', 'hasControls', 'editable', 'lockMovementX', 'lockMovementY',
  'lockScalingX', 'lockScalingY', 'lockRotation', 'crossOrigin', 'maskType', 'gradAngle', 'cropL', 'cropR', 'cropT', 'cropB', 'magicKind', 'bgArt'];
const FONTS = ['Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Raleway', 'Nunito', 'Rubik', 'Space Grotesk', 'DM Sans',
  'Josefin Sans', 'Quicksand', 'Comfortaa', 'Fredoka', 'Oswald', 'Bebas Neue', 'Anton', 'Archivo Black', 'Bungee', 'Righteous',
  'Playfair Display', 'DM Serif Display', 'Abril Fatface', 'Lora', 'Merriweather', 'Cormorant Garamond', 'Libre Baskerville',
  'Pacifico', 'Lobster', 'Dancing Script', 'Great Vibes', 'Caveat', 'Satisfy', 'Permanent Marker', 'Shadows Into Light',
  'Press Start 2P', 'Space Mono', 'JetBrains Mono', 'Bangers', 'Monoton', 'Orbitron'];
const COLORS = ['#000000', '#ffffff', '#64748b', '#f43f5e', '#f97316', '#f59e0b', '#facc15', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'];
const GRADS = [['#8b5cf6', '#ec4899'], ['#06b6d4', '#3b82f6'], ['#f97316', '#facc15'], ['#22c55e', '#14b8a6'], ['#0f172a', '#334155'],
  ['#f43f5e', '#fb923c'], ['#fbc2eb', '#a6c1ee'], ['#000000', '#434343'], ['#ff9a9e', '#fecfef'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#30cfd0', '#330867']];
const SIZES = [['Instagram post', 1080, 1080], ['Instagram story', 1080, 1920], ['Presentation', 1920, 1080], ['YouTube thumbnail', 1280, 720],
  ['Poster', 1800, 2400], ['Flyer (Letter)', 1275, 1650], ['A4 document', 1240, 1754], ['Facebook post', 1200, 630], ['X post', 1600, 900],
  ['LinkedIn banner', 1584, 396], ['Business card', 1050, 600], ['Logo', 500, 500], ['Phone wallpaper', 1170, 2532], ['Facebook cover', 1640, 624]];
const EMOJI = '😀😂😍🥳😎🤩😭🔥✨💯❤️💜💙💚💛🧡🖤⭐🌟⚡🎉🎂🎈🎁🏆👑💎🚀🌈☀️🌙☁️🌸🌻🍀🍕🍩☕🎵🎮📸💡📌✅❌⚠️👉👍👏🙌💪'.match(/\p{Extended_Pictographic}️?/gu);

const gfl = document.getElementById('gfonts');
const fontsCSS = new Promise(r => { gfl.onload = r; gfl.onerror = r; setTimeout(r, 6000); });
gfl.href ='https://fonts.googleapis.com/css2?' +
  FONTS.map(f => 'family=' + f.replace(/ /g, '+') + (['Press Start 2P', 'Monoton', 'Bungee', 'Bangers', 'Anton', 'Bebas Neue', 'Archivo Black', 'Righteous', 'Abril Fatface', 'Pacifico', 'Lobster', 'Great Vibes', 'Satisfy', 'Permanent Marker', 'Shadows Into Light', 'Libre Baskerville'].includes(f) ? '' : ':ital,wght@0,400;0,700;1,400')).join('&') + '&display=swap';

/* ---------------- storage ---------------- */
const DB = {
  p: null,
  open() { return this.p ||= new Promise((res, rej) => { const r = indexedDB.open('novastudio', 1); r.onupgradeneeded = () => r.result.createObjectStore('docs', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('docs', mode); const req = fn(t.objectStore('docs')); t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); }); },
  put(d) { return this.tx('readwrite', s => s.put(d)); }, get(id) { return this.tx('readonly', s => s.get(id)); },
  all() { return this.tx('readonly', s => s.getAll()); }, del(id) { return this.tx('readwrite', s => s.delete(id)); },
};

/* ---------------- canvas ---------------- */
fabric.Object.prototype.set({ transparentCorners: false, cornerColor: '#ffffff', cornerStrokeColor: '#8b5cf6', borderColor: '#8b5cf6',
  cornerSize: 11, cornerStyle: 'circle', borderScaleFactor: 1.6, padding: 3, objectCaching: true });
fabric.Object.prototype.controls.mtr.offsetY = -34;
const canvas = new fabric.Canvas('c', { preserveObjectStacking: true, fireRightClick: true, stopContextMenu: true,
  selectionColor: 'rgba(139,92,246,.08)', selectionBorderColor: '#8b5cf6', selectionLineWidth: 1.2, enableRetinaScaling: true });

const S = { doc: null, page: 0, zoom: 1, loading: false, clip: null, hist: {}, tab: 'templates', guides: [], drawing: false };
const W = () => S.doc.w, H = () => S.doc.h, B = () => Math.min(S.doc.w, S.doc.h);
const cur = () => S.doc.pages[S.page];
const walk = (objs, fn) => objs.forEach(o => { fn(o); if (o._objects) walk(o._objects, fn); });
const isText = o => o && /text/.test(o.type);
const isImg = o => o && o.type === 'image';
const isLine = o => o && (o.type === 'line' || (o.type === 'path' && (!o.fill || o.fill === 'transparent' || o.fill === 'none' || o.fill === '')));
const isShape = o => o && ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'path', 'polyline'].includes(o.type) && !isLine(o);

function makeBg(w, h, fill = '#ffffff') {
  return new fabric.Rect({ left: 0, top: 0, width: w, height: h, fill, selectable: false, evented: false, isBg: true, name: 'Background', strokeWidth: 0, objectCaching: false, hoverCursor: 'default' });
}
const getBg = (c = canvas) => c.getObjects().find(o => o.isBg);
const snap = () => JSON.stringify(canvas.toJSON(PROPS));
function newPage(w, h, fill) { return { id: uid(), json: JSON.stringify({ version: fabric.version, objects: [makeBg(w, h, fill).toObject(PROPS)] }), thumb: '' }; }

/* fonts */
const loadedFonts = new Set();
async function ensureFont(f) {
  if (!f || loadedFonts.has(f) || !FONTS.includes(f)) return;
  await fontsCSS;
  if (loadedFonts.has(f)) return;
  try { await Promise.all([document.fonts.load(`40px "${f}"`), document.fonts.load(`bold 40px "${f}"`)]); } catch {}
  loadedFonts.add(f); fabric.util.clearFabricFontCache(f);
}
function fontsIn(objs, set = new Set()) { (objs || []).forEach(o => { if (o.fontFamily) set.add(o.fontFamily); if (o.objects) fontsIn(o.objects, set); }); return set; }
async function fixFonts(c = canvas) {
  const fams = new Set(); walk(c.getObjects(), o => o.fontFamily && fams.add(o.fontFamily));
  const need = [...fams].filter(f => !loadedFonts.has(f) && FONTS.includes(f));
  if (!need.length) return;
  await Promise.all(need.map(ensureFont));
  walk(c.getObjects(), o => { if (o.fontFamily && need.includes(o.fontFamily)) { o.initDimensions && o.initDimensions(); o.setCoords(); o.dirty = true; } });
  c.requestRenderAll();
}

/* ---------------- zoom ---------------- */
function setZoom(z) {
  S.zoom = z = clamp(z, 0.04, 5);
  canvas.setDimensions({ width: Math.round(W() * z), height: Math.round(H() * z) });
  canvas.setZoom(z);
  $('#zoomVal').textContent = Math.round(z * 100) + '%';
  canvas.calcOffset(); canvas.renderAll();
}
function fit() { const ws = $('#workspace'); setZoom(Math.min((ws.clientWidth - 96) / W(), (ws.clientHeight - 96) / H())); }

/* ---------------- pages / history ---------------- */
function hist() { return S.hist[cur().id] ||= { stack: [], idx: -1 }; }
function loadPage(i, cb) {
  S.page = clamp(i, 0, S.doc.pages.length - 1); S.loading = true;
  canvas.discardActiveObject();
  canvas.loadFromJSON(cur().json, () => {
    let bg = getBg(); if (!bg) { bg = makeBg(W(), H()); canvas.insertAt(bg, 0); }
    bg.set({ width: W(), height: H(), left: 0, top: 0 });
    S.loading = false;
    const Hh = hist(); if (!Hh.stack.length) { Hh.stack.push(cur().json); Hh.idx = 0; }
    canvas.renderAll(); fixFonts(); renderLayers(); renderProps(); renderPages(); updUndo();
    if (!cur().thumb) setTimeout(thumbNow, 300);
    cb && cb();
  });
}
function switchPage(i) { if (i === S.page) return; cur().json = snap(); loadPage(i); }
const thumbNow = () => { if (!S.doc) return; cur().thumb = canvas.toDataURL({ format: 'jpeg', quality: 0.7, multiplier: 220 / Math.max(W(), H()) / S.zoom }); renderPages(); };
const thumbSoon = debounce(thumbNow, 700);
function commit() {
  if (S.loading || !S.doc) return;
  const j = snap(); cur().json = j;
  const Hh = hist(); if (Hh.stack[Hh.idx] === j) return;
  Hh.stack = Hh.stack.slice(0, Hh.idx + 1); Hh.stack.push(j); if (Hh.stack.length > 100) Hh.stack.shift(); Hh.idx = Hh.stack.length - 1;
  dirty();
}
const commitSoon = debounce(commit, 60);
function dirty() { updUndo(); renderLayers(); thumbSoon(); saveSoon(); $('#saveState').textContent = 'Saving…'; }
function restore(j) {
  S.loading = true; canvas.discardActiveObject();
  canvas.loadFromJSON(j, () => { S.loading = false; cur().json = j; canvas.renderAll(); fixFonts(); renderLayers(); renderProps(); updUndo(); thumbSoon(); saveSoon(); });
}
function undo() { const Hh = hist(); if (Hh.idx > 0) restore(Hh.stack[--Hh.idx]); }
function redo() { const Hh = hist(); if (Hh.idx < Hh.stack.length - 1) restore(Hh.stack[++Hh.idx]); }
function updUndo() { const Hh = hist(); $('#undoBtn').disabled = Hh.idx <= 0; $('#redoBtn').disabled = Hh.idx >= Hh.stack.length - 1; }

const saveSoon = debounce(saveNow, 900);
async function saveNow() {
  if (!S.doc) return;
  if (!S.loading) cur().json = snap();
  S.doc.updated = Date.now(); S.doc.thumb = S.doc.pages[0].thumb;
  try { await DB.put(S.doc); $('#saveState').textContent = 'Saved'; } catch (e) { $('#saveState').textContent = 'Save failed'; console.error(e); }
  lsSet('ns_last', S.doc.id);
}

function openDoc(d) {
  S.doc = d; S.hist = {}; S.page = 0; d.uploads ||= [];
  $('#docName').value = d.name; lsSet('ns_last', d.id);
  setZoom(1); fit(); loadPage(0, () => fit());
  if (S.tab === 'uploads') renderPanel();
}
function newDoc(name, w, h) { const d = { id: uid(), name: name || 'Untitled design', w, h, pages: [newPage(w, h)], uploads: [], updated: Date.now() }; openDoc(d); saveNow(); closeModal(); }

/* ---------------- object helpers ---------------- */
function place(o, opts = {}) {
  if (!o.id) o.id = uid();
  if (opts.at) o.setPositionByOrigin(new fabric.Point(opts.at.x, opts.at.y), 'center', 'center');
  else if (!opts.keep) o.setPositionByOrigin(new fabric.Point(W() / 2, H() / 2), 'center', 'center');
  o.setCoords(); canvas.add(o); canvas.setActiveObject(o); canvas.requestRenderAll();
  return o;
}
function fitTo(o, frac = 0.5) { const s = Math.min(W() * frac / o.width, H() * frac / o.height); o.set({ scaleX: s, scaleY: s }); return o; }
function coverImg(img, w, h) {
  const el = img.getElement(); const iw = el.naturalWidth || el.width, ih = el.naturalHeight || el.height;
  const s = Math.max(w / iw, h / ih), cw = w / s, ch = h / s;
  img.set({ cropX: (iw - cw) / 2, cropY: (ih - ch) / 2, width: cw, height: ch, scaleX: s, scaleY: s });
  return img;
}
function loadImg(url, cross = true) {
  return new Promise((res, rej) => fabric.Image.fromURL(url, (img, err) => (!img || err || !img.width) ? rej(new Error('load')) : res(img), cross ? { crossOrigin: 'anonymous' } : {}));
}
async function addImageURL(url, opts = {}) {
  try {
    if (!url.startsWith('data:')) toast('Adding image…', 1200);
    let img; try { img = await loadImg(url); } catch (e) { if (!opts.fallback) throw e; img = await loadImg(opts.fallback); }
    img.name = opts.name || 'Image';
    fitTo(img, 0.6); place(img, opts); return img;
  } catch { toast('Could not load that image'); }
}
function addText(text, o = {}) {
  const t = new fabric.Textbox(text, Object.assign({ width: B() * 0.75, fontSize: B() * 0.06, fontFamily: 'Inter', fill: '#111111', textAlign: 'center', lineHeight: 1.16, splitByGrapheme: false }, o));
  ensureFont(t.fontFamily).then(() => { t.initDimensions(); t.setCoords(); canvas.requestRenderAll(); });
  return place(t);
}
function addSVG(svg, name, opts = {}) {
  return new Promise(res => fabric.loadSVGFromString(svg, (objs, o) => {
    if (!objs || !objs.length) { toast('Could not read SVG'); return res(); }
    const g = fabric.util.groupSVGElements(objs, o); g.name = name || 'Graphic';
    fitTo(g, opts.frac || 0.25); res(place(g, opts));
  }));
}
function grad(type, c1, c2, angle = 135) {
  const r = angle * Math.PI / 180, dx = Math.sin(r) / 2, dy = -Math.cos(r) / 2;
  const coords = type === 'radial' ? { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.6 } : { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy };
  return new fabric.Gradient({ type, gradientUnits: 'percentage', coords, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] });
}
const isGrad = f => f && typeof f === 'object' && f.colorStops;
function hex(c) { if (!c || c === 'transparent' || c === 'none') return '#000000'; try { return '#' + new fabric.Color(c).toHex().toLowerCase(); } catch { return '#000000'; } }
function nameOf(o) {
  if (o.name && o.name !== 'Image' && !isText(o)) return o.name;
  if (isText(o)) return (o.text || 'Text').replace(/\s+/g, ' ').slice(0, 28);
  return o.name || { rect: 'Rectangle', circle: 'Circle', triangle: 'Triangle', polygon: 'Polygon', path: 'Drawing', line: 'Line', group: 'Group', image: 'Image', ellipse: 'Ellipse' }[o.type] || o.type;
}

/* shapes */
function polyPts(n, r, inner) { const p = []; const k = inner ? n * 2 : n; for (let i = 0; i < k; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / k; const rr = inner && i % 2 ? inner : r; p.push({ x: Math.cos(a) * rr + r, y: Math.sin(a) * rr + r }); } return p; }
const PATHS = {
  heart: 'M50 90C20 70 0 52 0 30 0 12 14 0 28 0c10 0 18 6 22 14C54 6 62 0 72 0c14 0 28 12 28 30 0 22-20 40-50 60z',
  arrow: 'M0 35h60V10l40 40-40 40V65H0z',
  bubble: 'M12 0h76c7 0 12 5 12 12v46c0 7-5 12-12 12H42L20 90l4-20H12C5 70 0 65 0 58V12C0 5 5 0 12 0z',
  cloud: 'M25 70C11 70 0 60 0 47c0-12 9-22 21-23C24 10 36 0 50 0c15 0 27 10 30 24 11 2 20 11 20 23 0 13-11 23-24 23z',
  blob: 'M73 8c13 9 25 27 22 45s-17 35-35 40-38-2-50-16S-3 42 6 27 37-1 50 0s10 0 23 8z',
  burst: polyPts(12, 50, 36).map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join('') + 'z',
  moon: 'M60 0C35 6 18 28 18 50s17 44 42 50C33 100 0 78 0 50S33 0 60 0z',
  cross: 'M35 0h30v35h35v30H65v35H35V65H0V35h35z',
};
function shape(kind, fill = '#8b5cf6') {
  const s = B() * 0.3; let o;
  switch (kind) {
    case 'rect': o = new fabric.Rect({ width: s, height: s, fill }); break;
    case 'rounded': o = new fabric.Rect({ width: s, height: s, rx: s * 0.14, ry: s * 0.14, fill }); break;
    case 'circle': o = new fabric.Circle({ radius: s / 2, fill }); break;
    case 'ring': o = new fabric.Circle({ radius: s / 2, fill: '', stroke: fill, strokeWidth: s * 0.08 }); break;
    case 'triangle': o = new fabric.Triangle({ width: s, height: s * 0.87, fill }); break;
    case 'star': o = new fabric.Polygon(polyPts(5, s / 2, s / 4.6), { fill }); break;
    case 'pentagon': o = new fabric.Polygon(polyPts(5, s / 2), { fill }); break;
    case 'hexagon': o = new fabric.Polygon(polyPts(6, s / 2), { fill }); break;
    case 'diamond': o = new fabric.Polygon([{ x: s / 2, y: 0 }, { x: s, y: s / 2 }, { x: s / 2, y: s }, { x: 0, y: s / 2 }], { fill }); break;
    case 'line': o = new fabric.Line([0, 0, s * 1.4, 0], { stroke: '#111111', strokeWidth: Math.max(2, s * 0.025), strokeLineCap: 'round', fill: '' }); break;
    case 'dashed': o = new fabric.Line([0, 0, s * 1.4, 0], { stroke: '#111111', strokeWidth: Math.max(2, s * 0.025), strokeDashArray: [s * 0.08, s * 0.06], strokeLineCap: 'round', fill: '' }); break;
    case 'arrowline': {
      const w = Math.max(2, s * 0.025);
      const l = new fabric.Line([0, 0, s * 1.3, 0], { stroke: '#111111', strokeWidth: w, strokeLineCap: 'round', originY: 'center', top: 0, left: 0 });
      const t = new fabric.Triangle({ width: w * 5, height: w * 5, fill: '#111111', angle: 90, left: s * 1.3 + w * 2.5, top: -w * 2.5 });
      o = new fabric.Group([l, t]); o.name = 'Arrow'; break;
    }
    default: o = new fabric.Path(PATHS[kind], { fill }); o.scaleToWidth(s); break;
  }
  o.name = o.name || kind[0].toUpperCase() + kind.slice(1);
  return o;
}

/* ---------------- templates (original designs) ---------------- */
const PIC = (id, w, h) => `https://picsum.photos/id/${id}/${w}/${h}`;
const TEMPLATES = [
  { name: 'Golden hour', w: 1080, h: 1350, bg: '#1c1208', o: [
    { t: 'img', src: PIC(778, 1080, 1350), x: 0, y: 0, w: 1080, h: 1350 },
    { t: 'rect', x: 0, y: 700, w: 1080, h: 650, fill: ['rgba(28,18,8,0)', 'rgba(28,18,8,0.85)', 180] },
    { t: 'text', text: 'slow days', x: 80, y: 930, w: 920, size: 150, font: 'DM Serif Display', color: '#fff7ed' },
    { t: 'text', text: 'SUMMER JOURNAL · VOL. 03', x: 84, y: 1120, w: 920, size: 30, font: 'Inter', color: '#fdba74', ls: 320 }] },
  { name: 'Pastel quote', w: 1080, h: 1080, bg: '#fdf2f8', o: [
    { t: 'img', src: PIC(866, 1080, 1080), x: 0, y: 0, w: 1080, h: 1080 },
    { t: 'rect', x: 140, y: 300, w: 800, h: 480, rx: 36, fill: 'rgba(255,255,255,0.78)' },
    { t: 'text', text: 'bloom where you are planted', x: 200, y: 400, w: 680, size: 82, font: 'Cormorant Garamond', color: '#6b2147', align: 'center', lh: 1.05 },
    { t: 'text', text: '— ✿ —', x: 200, y: 640, w: 680, size: 34, font: 'Inter', color: '#db2777', align: 'center' }] },
  { name: 'Adventure', w: 1080, h: 1920, bg: '#0b1220', o: [
    { t: 'img', src: PIC(1036, 1080, 1920), x: 0, y: 0, w: 1080, h: 1920 },
    { t: 'rect', x: 0, y: 0, w: 1080, h: 760, fill: ['rgba(11,18,32,0.75)', 'rgba(11,18,32,0)', 180] },
    { t: 'text', text: 'GO', x: 0, y: 150, w: 1080, size: 340, font: 'Anton', color: '#ffffff', align: 'center', lh: 0.9 },
    { t: 'text', text: 'FIND YOUR NORTH', x: 0, y: 500, w: 1080, size: 48, font: 'Montserrat', bold: 1, color: '#bae6fd', align: 'center', ls: 400 }] },
  { name: 'Café menu', w: 1080, h: 1350, bg: '#f5efe6', o: [
    { t: 'img', src: PIC(431, 1080, 700), x: 0, y: 0, w: 1080, h: 700, mask: 'arch' },
    { t: 'text', text: 'Morning Brew', x: 0, y: 760, w: 1080, size: 110, font: 'Playfair Display', color: '#3f2a1d', align: 'center' },
    { t: 'text', text: 'Latte  4.5\nFlat white  4\nCold brew  5', x: 0, y: 930, w: 1080, size: 46, font: 'DM Sans', color: '#7c5a43', align: 'center', lh: 1.5 }] },
  { name: 'Summer sale', w: 1080, h: 1080, bg: ['#f857a6', '#ff5858', 135], o: [
    { t: 'circle', x: 640, y: -160, r: 320, fill: 'rgba(255,255,255,0.14)' }, { t: 'circle', x: -140, y: 760, r: 230, fill: 'rgba(255,255,255,0.12)' },
    { t: 'text', text: 'SUMMER', x: 90, y: 200, size: 190, font: 'Bebas Neue', color: '#ffffff', ls: 40 },
    { t: 'text', text: 'SALE', x: 84, y: 360, size: 330, font: 'Bebas Neue', color: '#ffffff', lh: 0.9 },
    { t: 'text', text: 'Up to 50% off everything', x: 90, y: 700, size: 50, font: 'Poppins', color: '#ffffff' },
    { t: 'rect', x: 90, y: 820, w: 360, h: 104, rx: 52, fill: '#ffffff' },
    { t: 'text', text: 'SHOP NOW', x: 90, y: 848, w: 360, size: 42, font: 'Poppins', bold: 1, color: '#f5576c', align: 'center', ls: 80 }] },
  { name: 'Quote', w: 1080, h: 1080, bg: '#111827', o: [
    { t: 'text', text: '“', x: 80, y: 40, size: 380, font: 'Playfair Display', color: '#a78bfa' },
    { t: 'text', text: 'Creativity is intelligence having fun.', x: 90, y: 370, w: 900, size: 88, font: 'Playfair Display', color: '#ffffff', lh: 1.12 },
    { t: 'rect', x: 90, y: 780, w: 90, h: 7, fill: '#a78bfa' },
    { t: 'text', text: 'Albert Einstein', x: 90, y: 820, size: 40, font: 'Inter', color: '#9ca3af' }] },
  { name: 'Event poster', w: 1080, h: 1350, bg: '#0f172a', o: [
    { t: 'img', src: PIC(1015, 1080, 820), x: 0, y: 0, w: 1080, h: 820 },
    { t: 'rect', x: 0, y: 560, w: 1080, h: 260, fill: ['rgba(15,23,42,0)', '#0f172a', 180] },
    { t: 'text', text: 'LIVE MUSIC', x: 80, y: 780, size: 150, font: 'Anton', color: '#ffffff', ls: 20 },
    { t: 'text', text: 'Friday Night Sessions', x: 80, y: 970, size: 54, font: 'Poppins', bold: 1, color: '#fbbf24' },
    { t: 'text', text: 'Doors 8PM  ·  Free entry  ·  All ages', x: 80, y: 1060, size: 38, font: 'Inter', color: '#cbd5e1' },
    { t: 'rect', x: 80, y: 1180, w: 140, h: 9, fill: '#fbbf24' }] },
  { name: 'Video thumbnail', w: 1280, h: 720, bg: '#facc15', o: [
    { t: 'img', src: PIC(1062, 640, 720), x: 0, y: 0, w: 620, h: 720 },
    { t: 'text', text: 'I TRIED IT FOR 30 DAYS', x: 670, y: 110, w: 570, size: 118, font: 'Anton', color: '#111111', lh: 0.95 },
    { t: 'rect', x: 670, y: 560, w: 270, h: 84, rx: 14, fill: '#ef4444' },
    { t: 'text', text: 'WATCH', x: 670, y: 576, w: 270, size: 46, font: 'Poppins', bold: 1, color: '#ffffff', align: 'center' }] },
  { name: 'Title slide', w: 1920, h: 1080, bg: ['#4f46e5', '#9333ea', 135], o: [
    { t: 'circle', x: 1350, y: 520, r: 380, fill: 'rgba(255,255,255,0.08)' },
    { t: 'text', text: 'Quarterly Review', x: 160, y: 360, w: 1500, size: 150, font: 'Poppins', bold: 1, color: '#ffffff' },
    { t: 'text', text: 'Q4 2026  ·  Team update', x: 160, y: 560, w: 1200, size: 58, font: 'Inter', color: 'rgba(255,255,255,0.8)' },
    { t: 'rect', x: 160, y: 700, w: 170, h: 10, fill: '#ffffff' }] },
  { name: 'Business card', w: 1050, h: 600, bg: '#fafaf9', o: [
    { t: 'rect', x: 0, y: 0, w: 360, h: 600, fill: '#1e293b' },
    { t: 'circle', x: 100, y: 220, r: 80, fill: '#f59e0b' },
    { t: 'text', text: 'AR', x: 100, y: 262, w: 160, size: 64, font: 'Poppins', bold: 1, color: '#1e293b', align: 'center' },
    { t: 'text', text: 'Alex Rivera', x: 420, y: 170, w: 600, size: 66, font: 'Playfair Display', color: '#1e293b' },
    { t: 'text', text: 'Product Designer', x: 420, y: 260, w: 600, size: 32, font: 'Inter', color: '#64748b' },
    { t: 'rect', x: 420, y: 330, w: 80, h: 5, fill: '#f59e0b' },
    { t: 'text', text: 'alex@example.com\n+1 555 0100\nexample.com', x: 420, y: 370, w: 600, size: 28, font: 'Inter', color: '#334155', lh: 1.5 }] },
  { name: 'Story drop', w: 1080, h: 1920, bg: '#000000', o: [
    { t: 'img', src: PIC(1043, 1080, 1920), x: 0, y: 0, w: 1080, h: 1920 },
    { t: 'rect', x: 0, y: 900, w: 1080, h: 1020, fill: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)', 180] },
    { t: 'text', text: 'NEW', x: 90, y: 1180, size: 60, font: 'Poppins', bold: 1, color: '#fde047', ls: 300 },
    { t: 'text', text: 'Collection Drop', x: 90, y: 1270, w: 900, size: 160, font: 'Playfair Display', color: '#ffffff', lh: 1 },
    { t: 'text', text: 'Swipe up to shop  →', x: 90, y: 1660, size: 46, font: 'Inter', color: '#ffffff' }] },
  { name: 'Minimal', w: 1080, h: 1080, bg: '#f5f0e8', o: [
    { t: 'circle', x: 340, y: 170, r: 200, fill: '#e07a5f' },
    { t: 'rect', x: 140, y: 470, w: 800, h: 4, fill: '#3d405b' },
    { t: 'text', text: 'Less, but better.', x: 90, y: 620, w: 900, size: 100, font: 'DM Serif Display', color: '#3d405b', align: 'center' },
    { t: 'text', text: 'A DESIGN PRINCIPLE', x: 90, y: 780, w: 900, size: 30, font: 'Inter', color: '#81b29a', align: 'center', ls: 300 }] },
  { name: 'Birthday', w: 1080, h: 1080, bg: ['#fbc2eb', '#a6c1ee', 180], o: [
    { t: 'text', text: 'Happy', x: 0, y: 250, w: 1080, size: 170, font: 'Great Vibes', color: '#7c3aed', align: 'center' },
    { t: 'text', text: 'BIRTHDAY', x: 0, y: 450, w: 1080, size: 190, font: 'Bebas Neue', color: '#ffffff', align: 'center', ls: 100 },
    { t: 'text', text: '🎉 🎂 🎈', x: 0, y: 700, w: 1080, size: 120, font: 'Inter', align: 'center' }] },
  { name: 'Recipe card', w: 1080, h: 1350, bg: '#fff7ed', o: [
    { t: 'img', src: PIC(292, 1000, 640), x: 40, y: 40, w: 1000, h: 640, mask: 'rounded' },
    { t: 'text', text: 'Weeknight Pasta', x: 80, y: 730, w: 920, size: 96, font: 'Lobster', color: '#9a3412' },
    { t: 'text', text: '20 min  ·  Serves 4  ·  Easy', x: 80, y: 860, w: 920, size: 36, font: 'Nunito', color: '#c2410c' },
    { t: 'text', text: 'Pasta, garlic, olive oil, chili flakes, lemon, parsley, parmesan.', x: 80, y: 950, w: 920, size: 40, font: 'Nunito', color: '#431407', lh: 1.4 }] },
  { name: 'Neon night', w: 1080, h: 1080, bg: ['#0f0c29', '#302b63', 160], o: [
    { t: 'text', text: 'OPEN LATE', x: 0, y: 380, w: 1080, size: 170, font: 'Monoton', color: '#f0abfc', align: 'center', glow: '#e879f9' },
    { t: 'text', text: 'arcade · bar · music', x: 0, y: 640, w: 1080, size: 46, font: 'Orbitron', color: '#67e8f9', align: 'center', ls: 200, glow: '#22d3ee' }] },
  { name: 'Hiring', w: 1080, h: 1080, bg: '#ecfeff', o: [
    { t: 'rect', x: 60, y: 60, w: 960, h: 960, rx: 40, fill: '#0e7490' },
    { t: 'text', text: "WE'RE", x: 140, y: 190, w: 800, size: 120, font: 'Archivo Black', color: '#a5f3fc' },
    { t: 'text', text: 'HIRING', x: 140, y: 320, w: 800, size: 210, font: 'Archivo Black', color: '#ffffff', lh: 0.9 },
    { t: 'text', text: 'Frontend Developer\nRemote · Full-time', x: 140, y: 600, w: 800, size: 50, font: 'DM Sans', color: '#cffafe', lh: 1.35 },
    { t: 'rect', x: 140, y: 820, w: 330, h: 90, rx: 45, fill: '#facc15' },
    { t: 'text', text: 'Apply now', x: 140, y: 842, w: 330, size: 40, font: 'DM Sans', bold: 1, color: '#0e7490', align: 'center' }] },
];
const fillOf = f => Array.isArray(f) ? grad('linear', f[0], f[1], f[2] ?? 135) : f;
function applyMask(o, type) {
  o.maskType = type || '';
  const w = o.width, hh = o.height, m = Math.min(w, hh);
  const base = { originX: 'center', originY: 'center', left: 0, top: 0 };
  o.clipPath = !type ? null
    : type === 'circle' ? new fabric.Circle({ radius: m / 2, ...base })
    : type === 'ellipse' ? new fabric.Ellipse({ rx: w / 2, ry: hh / 2, ...base })
    : type === 'rounded' ? new fabric.Rect({ width: w, height: hh, rx: m * 0.08, ry: m * 0.08, ...base })
    : type === 'arch' ? new fabric.Path(`M0 ${hh}V${w / 2}A${w / 2} ${w / 2} 0 0 1 ${w} ${w / 2}V${hh}z`, base)
    : type === 'star' ? new fabric.Polygon(polyPts(5, m / 2, m / 4.6), base)
    : type === 'heart' ? (() => { const p = new fabric.Path(PATHS.heart, base); p.scale(m / 100); return p; })()
    : null;
  o.dirty = true;
}
async function buildTpl(t) {
  await Promise.all([...new Set(t.o.map(x => x.font).filter(Boolean))].map(ensureFont));
  const out = [makeBg(t.w, t.h, fillOf(t.bg))];
  for (const s of t.o) {
    let o;
    if (s.t === 'text') {
      o = new fabric.Textbox(s.text, { left: s.x, top: s.y, width: s.w || t.w - s.x * 2, fontSize: s.size, fontFamily: s.font || 'Inter', fill: s.color || '#111',
        fontWeight: s.bold ? 'bold' : 'normal', textAlign: s.align || 'left', lineHeight: s.lh || 1.16, charSpacing: s.ls || 0 });
      if (s.glow) o.shadow = new fabric.Shadow({ color: s.glow, blur: s.size * 0.25, offsetX: 0, offsetY: 0 });
    } else if (s.t === 'rect') o = new fabric.Rect({ left: s.x, top: s.y, width: s.w, height: s.h, rx: s.rx || 0, ry: s.rx || 0, fill: fillOf(s.fill) });
    else if (s.t === 'circle') o = new fabric.Circle({ left: s.x, top: s.y, radius: s.r, fill: fillOf(s.fill) });
    else if (s.t === 'img') {
      try { o = coverImg(await loadImg(s.src), s.w, s.h); o.set({ left: s.x, top: s.y }); if (s.mask) applyMask(o, s.mask); o.name = 'Photo'; }
      catch { o = new fabric.Rect({ left: s.x, top: s.y, width: s.w, height: s.h, fill: '#94a3b8', name: 'Image placeholder' }); }
    }
    o.id = uid(); out.push(o);
  }
  return out;
}
const tplThumbs = {};
async function tplThumb(t) {
  if (tplThumbs[t.name]) return tplThumbs[t.name];
  const objs = await buildTpl(t);
  const sc = new fabric.StaticCanvas(null, { width: 1, height: 1, enableRetinaScaling: false, renderOnAddRemove: false });
  const z = 240 / Math.max(t.w, t.h); sc.setDimensions({ width: Math.round(t.w * z), height: Math.round(t.h * z) }); sc.setZoom(z);
  objs.forEach(o => sc.add(o)); sc.renderAll();
  const url = sc.toDataURL({ format: 'jpeg', quality: 0.8 }); sc.dispose();
  return tplThumbs[t.name] = url;
}
async function applyTemplate(t) {
  toast('Applying ' + t.name + '…');
  const objs = await buildTpl(t);
  const empty = !canvas.getObjects().some(o => !o.isBg);
  if (empty && S.doc.pages.length === 1 && (W() !== t.w || H() !== t.h)) { S.doc.w = t.w; S.doc.h = t.h; fit(); }
  const s = Math.min(W() / t.w, H() / t.h), ox = (W() - t.w * s) / 2, oy = (H() - t.h * s) / 2;
  S.loading = true; canvas.discardActiveObject();
  canvas.getObjects().slice().forEach(o => canvas.remove(o));
  objs.forEach(o => {
    if (o.isBg) o.set({ width: W(), height: H(), left: 0, top: 0 });
    else o.set({ left: o.left * s + ox, top: o.top * s + oy, scaleX: o.scaleX * s, scaleY: o.scaleY * s });
    o.setCoords(); canvas.add(o);
  });
  S.loading = false; canvas.renderAll(); commit(); renderProps();
}

/* ---------------- left panel ---------------- */
const TABS = [['templates', 'Templates'], ['magic', 'Magic'], ['photos', 'Photos'], ['backgrounds', 'Backdrops'], ['elements', 'Elements'], ['text', 'Text'], ['icons', 'Icons'],
  ['uploads', 'Uploads'], ['draw', 'Draw'], ['qr', 'QR code'], ['layers', 'Layers']];
function buildRail() {
  const r = $('#rail');
  TABS.forEach(([k, label]) => r.append(h('button', { class: 'rb' + (k === S.tab ? ' on' : ''), 'data-k': k, onclick: () => {
    if (S.tab === k && !$('#panel').classList.contains('closed')) { $('#panel').classList.add('closed'); return setTimeout(fit, 200); }
    $('#panel').classList.remove('closed'); S.tab = k; $$('.rb').forEach(b => b.classList.toggle('on', b.dataset.k === k)); renderPanel(); setTimeout(() => canvas.calcOffset(), 200);
  } }, ico(k), label)));
}
function renderPanel() {
  const P = $('#panelBody'); P.innerHTML = '';
  if (S.tab !== 'draw' && S.drawing) setDrawing(false);
  ({ templates: panelTemplates, magic: panelMagic, backgrounds: panelBackgrounds, elements: panelElements, text: panelText, photos: panelPhotos, icons: panelIcons, uploads: panelUploads, draw: panelDraw, qr: panelQR, layers: panelLayers })[S.tab](P);
}
function panelTemplates(P) {
  P.append(h('h3', {}, 'Templates'));
  const g = h('div', { class: 'grid g2' }); P.append(g);
  TEMPLATES.forEach(t => {
    const img = h('img', { alt: t.name });
    g.append(h('div', { class: 'tile tpl', title: `${t.name} · ${t.w}×${t.h}`, onclick: () => applyTemplate(t) }, img, h('div', { class: 'cap' }, t.name)));
    tplThumb(t).then(u => img.src = u).catch(() => {});
  });
}
function panelElements(P) {
  const kinds = ['rect', 'rounded', 'circle', 'ring', 'triangle', 'star', 'pentagon', 'hexagon', 'diamond', 'heart', 'arrow', 'bubble', 'cloud', 'blob', 'burst', 'moon', 'cross'];
  P.append(h('h3', {}, 'Shapes'));
  const g = h('div', { class: 'grid g4' }); P.append(g);
  kinds.forEach(k => {
    const prev = shapePreview(k);
    g.append(h('div', { class: 'tile shape', style: 'aspect-ratio:1', title: k, onclick: () => place(shape(k)), html: prev }));
  });
  P.append(h('h3', {}, 'Lines'));
  const l = h('div', { class: 'grid g3' }); P.append(l);
  [['line', '<svg viewBox="0 0 40 10" style="width:70%"><path d="M2 5h36" stroke="#ddd" stroke-width="2.5" stroke-linecap="round"/></svg>'],
   ['dashed', '<svg viewBox="0 0 40 10" style="width:70%"><path d="M2 5h36" stroke="#ddd" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round"/></svg>'],
   ['arrowline', '<svg viewBox="0 0 40 10" style="width:70%"><path d="M2 5h32M30 1l6 4-6 4" stroke="#ddd" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>']]
    .forEach(([k, s]) => l.append(h('div', { class: 'tile', style: 'height:44px', onclick: () => place(shape(k)), html: s })));
  P.append(h('h3', {}, 'Frames'), h('div', { class: 'note', style: 'margin-top:0' }, 'Add a photo, then pick a mask in its settings.'));
  P.append(h('h3', {}, 'Gradients'));
  const gg = h('div', { class: 'grid g4' }); P.append(gg);
  GRADS.forEach(([a, b]) => gg.append(h('div', { class: 'tile', style: `aspect-ratio:1;background:linear-gradient(135deg,${a},${b})`, onclick: () => { const r = shape('rounded'); r.set('fill', grad('linear', a, b, 135)); r.gradAngle = 135; place(r); } })));
}
function shapePreview(k) {
  const f = '#c4b5fd';
  const map = {
    rect: `<rect x="10" y="10" width="80" height="80" fill="${f}"/>`, rounded: `<rect x="10" y="10" width="80" height="80" rx="14" fill="${f}"/>`,
    circle: `<circle cx="50" cy="50" r="40" fill="${f}"/>`, ring: `<circle cx="50" cy="50" r="36" fill="none" stroke="${f}" stroke-width="8"/>`,
    triangle: `<path d="M50 12L90 86H10z" fill="${f}"/>`, diamond: `<path d="M50 5L95 50 50 95 5 50z" fill="${f}"/>`,
  };
  if (map[k]) return `<svg viewBox="0 0 100 100">${map[k]}</svg>`;
  const pts = { star: polyPts(5, 50, 21.7), pentagon: polyPts(5, 50), hexagon: polyPts(6, 50) }[k];
  if (pts) return `<svg viewBox="0 0 100 100"><polygon points="${pts.map(p => p.x + ',' + p.y).join(' ')}" fill="${f}"/></svg>`;
  return `<svg viewBox="-5 -5 110 110"><path d="${PATHS[k]}" fill="${f}"/></svg>`;
}
function panelText(P) {
  P.append(h('button', { class: 'btn acc block', onclick: () => addText('Your text here', { fontSize: B() * 0.05 }) }, ico('text'), 'Add a text box'));
  P.append(h('h3', {}, 'Defaults'));
  [['Add a heading', { fontSize: B() * 0.1, fontWeight: 'bold', fontFamily: 'Poppins' }, 'font:700 24px Poppins'],
   ['Add a subheading', { fontSize: B() * 0.06, fontWeight: 'bold', fontFamily: 'Inter' }, 'font:700 17px Inter'],
   ['Add body text', { fontSize: B() * 0.035, fontFamily: 'Inter' }, 'font:13px Inter']]
    .forEach(([t, o, css]) => P.append(h('button', { class: 'textpreset', style: css, onclick: () => addText(t, o) }, t)));
  P.append(h('h3', {}, 'Font combos'));
  const combos = [
    ['BIG SALE', 'Bebas Neue', '#ef4444', { charSpacing: 60 }], ['Hello there', 'Pacifico', '#ec4899'], ['Elegant', 'Playfair Display', '#111827', { fontStyle: 'italic' }],
    ['GAME ON', 'Press Start 2P', '#22c55e'], ['Neon', 'Monoton', '#f0abfc', { shadow: new fabric.Shadow({ color: '#e879f9', blur: 25 }) }],
    ['Handwritten', 'Caveat', '#1e3a8a'], ['BOLD', 'Archivo Black', '#111111'], ['Signature', 'Great Vibes', '#7c3aed'], ['FUTURE', 'Orbitron', '#06b6d4', { charSpacing: 200 }],
    ['Marker', 'Permanent Marker', '#f97316'],
  ];
  const g = h('div', { class: 'grid g2' }); P.append(g);
  combos.forEach(([t, f, c, extra]) => { ensureFont(f); g.append(h('div', { class: 'tile', style: `height:64px;font-family:'${f}';font-size:${f === 'Press Start 2P' ? 11 : 20}px;color:${c === '#111111' || c === '#111827' || c === '#1e3a8a' ? '#e5e7eb' : c}`,
    onclick: () => addText(t, Object.assign({ fontFamily: f, fill: c, fontSize: B() * 0.1 }, extra || {})) }, t)); });
  P.append(h('h3', {}, 'Emoji'));
  const e = h('div', { class: 'grid g6' }); P.append(e);
  EMOJI.forEach(x => e.append(h('div', { class: 'tile emoji', onclick: () => addText(x, { fontSize: B() * 0.15, width: B() * 0.2 }) }, x)));
}
/* ---------------- photos: curated sets + stock search ---------------- */
const STOCK_SRC = 'stocksnap,wordpress,nappy';
const picsumURL = (id, long) => { const [w, hh] = STOCK_PHOTOS[id]; const s = Math.min(1, long / Math.max(w, hh)); return `https://picsum.photos/id/${id}/${Math.round(w * s)}/${Math.round(hh * s)}`; };
function photoCard(thumb, ratio, add, cred, drag) {
  const t = h('div', { class: 'ph', title: cred, draggable: 'true', style: `aspect-ratio:${ratio}` }, h('img', { src: thumb, loading: 'lazy', alt: '', onload: e => e.target.classList.add('in') }), h('span', { class: 'cred' }, cred.replace(/ \(.*$/, '')));
  t.onclick = add; t.ondragstart = e => e.dataTransfer.setData('text/nova', JSON.stringify(drag));
  return t;
}
function curatedCard(id, asBg) {
  const [w, hh, author] = STOCK_PHOTOS[id]; const full = picsumURL(id, 2400);
  const cred = `Photo by ${author} (Unsplash)`;
  return photoCard(picsumURL(id, 420), w / hh, () => asBg ? setPhotoBg(full, cred) : addImageURL(full, { name: cred }), cred, { kind: 'img', url: full, name: cred });
}
function masonry() { return h('div', { class: 'masonry' }); }
async function panelPhotos(P) {
  const inp = h('input', { class: 'search', placeholder: 'Search photos', value: S.photoQ || '' });
  const chips = h('div', { class: 'chips' });
  const grid = masonry();
  const more = h('button', { class: 'btn block hidden', style: 'margin-top:10px' }, 'More');
  P.append(h('div', { class: 'searchwrap' }, ico('search'), inp), chips, grid, more);
  S.photoSet ||= 'Aesthetic';
  let page = 1, token = 0;
  const showSet = name => {
    S.photoSet = name; S.photoQ = ''; inp.value = ''; ++token; more.classList.add('hidden');
    $$('.chip', chips).forEach(c => c.classList.toggle('on', c.textContent === name));
    grid.innerHTML = ''; STOCK_SETS[name].forEach(id => grid.append(curatedCard(id)));
  };
  Object.keys(STOCK_SETS).forEach(n => chips.append(h('button', { class: 'chip', onclick: () => showSet(n) }, n)));
  const search = async reset => {
    const q = inp.value.trim(); S.photoQ = q;
    if (!q) return showSet(S.photoSet);
    if (reset) { grid.innerHTML = ''; page = 1; $$('.chip', chips).forEach(c => c.classList.remove('on')); }
    const my = ++token;
    // curated sets whose name matches go first
    if (reset) Object.entries(STOCK_SETS).filter(([n]) => n.toLowerCase().includes(q.toLowerCase())).forEach(([, ids]) => ids.forEach(id => grid.append(curatedCard(id))));
    try {
      const get = src => fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=20&page=${page}${src ? '&source=' + src : '&category=photograph'}`).then(r => r.json());
      let r = await get(STOCK_SRC);
      if (my !== token) return;
      if ((r.results || []).length < 8 && page === 1) { const r2 = await get(''); if (my !== token) return; r = { results: [...(r.results || []), ...(r2.results || [])] }; }
      (r.results || []).forEach(it => {
        const base = `https://api.openverse.org/v1/images/${it.id}/thumb/`;
        const cred = `${it.title || 'Photo'} by ${it.creator || 'unknown'} (${(it.license || '').toUpperCase()} ${it.license_version || ''})`;
        const full = base + '?full_size=true';
        grid.append(photoCard(base, it.width && it.height ? it.width / it.height : 1, () => addImageURL(full, { fallback: base, name: cred.slice(0, 80) }), cred, { kind: 'img', url: full, fallback: base, name: cred }));
      });
      if (!grid.children.length) grid.append(h('div', { class: 'empty' }, 'No results'));
      more.classList.toggle('hidden', !(r.results || []).length);
      page++;
    } catch { if (!grid.children.length) grid.append(h('div', { class: 'empty' }, 'Offline — try a collection')); }
  };
  inp.onkeydown = e => { if (e.key === 'Enter') search(true); };
  more.onclick = () => search(false);
  S.photoQ ? search(true) : showSet(S.photoSet);
}
const getBgArt = () => canvas.getObjects().find(o => o.bgArt);
function setPhotoBg(url, name) {
  toast('Setting background…', 1200);
  loadImg(url).then(img => {
    const old = getBgArt(); if (old) canvas.remove(old);
    coverImg(img, W(), H()); img.set({ left: 0, top: 0, name: name || 'Background photo', bgArt: true }); img.id = uid();
    canvas.insertAt(img, 1); setLock([img], true); canvas.discardActiveObject(); canvas.renderAll(); commit();
  }).catch(() => toast('Could not load that photo'));
}

/* ---------------- backdrops: generated aesthetic backgrounds ---------------- */
const PALETTES = [
  ['#ffd6e8', '#c4b5fd', '#a5f3fc', '#fef3c7'], ['#0f0c29', '#7c3aed', '#ec4899', '#22d3ee'], ['#fde2e4', '#fad2e1', '#bee1e6', '#cddafd'], ['#ff9a8b', '#ff6a88', '#ffd194', '#ff99ac'],
  ['#0b1020', '#1e3a8a', '#06b6d4', '#a7f3d0'], ['#f6d365', '#fda085', '#f093fb', '#f5576c'], ['#e0c3fc', '#8ec5fc', '#f9f586', '#96fbc4'], ['#1a1a2e', '#e94560', '#f5a623', '#0f3460'],
  ['#d4fc79', '#96e6a1', '#84fab0', '#8fd3f4'], ['#fbc2eb', '#a6c1ee', '#fdcbf1', '#e6dee9'], ['#232526', '#414345', '#bdc3c7', '#2c3e50'], ['#ffecd2', '#fcb69f', '#ff8177', '#cf556c'],
  ['#c1dfc4', '#deecdd', '#f3e7e9', '#e3eeff'], ['#3a1c71', '#d76d77', '#ffaf7b', '#2b5876'], ['#f8f4ec', '#e8d5b7', '#c9ada7', '#9a8c98'], ['#000000', '#3b82f6', '#a855f7', '#f43f5e'],
];
const BG_STYLES = ['Mesh', 'Aurora', 'Waves', 'Grain'];
function seeded(n) { let x = n * 9301 + 49297; return () => (x = (x * 9301 + 49297) % 233280) / 233280; }
function genBackdrop(style, pal, w, hh, seed = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d', { willReadFrequently: true }); const r = seeded(seed * 13 + style.length);
  const m = Math.max(w, hh);
  if (style === 'Mesh' || style === 'Aurora') {
    x.fillStyle = style === 'Aurora' ? '#05060f' : pal[0]; x.fillRect(0, 0, w, hh);
    const blobs = style === 'Aurora' ? 7 : 6;
    x.filter = `blur(${Math.round(m * (style === 'Aurora' ? 0.06 : 0.09))}px)`;
    for (let i = 0; i < blobs; i++) {
      const col = pal[(i + 1) % pal.length];
      if (style === 'Aurora') {
        x.globalAlpha = 0.75; x.fillStyle = col; x.beginPath();
        const cx = r() * w, wd = m * (0.08 + r() * 0.12);
        x.ellipse(cx, hh * (0.3 + r() * 0.3), wd, hh * (0.35 + r() * 0.3), (r() - 0.5) * 0.9, 0, Math.PI * 2); x.fill();
      } else {
        const cx = r() * w, cy = r() * hh, rad = m * (0.35 + r() * 0.35);
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, col); g.addColorStop(1, col + '00');
        x.globalAlpha = 0.95; x.fillStyle = g; x.fillRect(0, 0, w, hh);
      }
    }
    x.filter = 'none'; x.globalAlpha = 1;
  } else if (style === 'Waves') {
    const g = x.createLinearGradient(0, 0, 0, hh); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); x.fillStyle = g; x.fillRect(0, 0, w, hh);
    for (let i = 0; i < 4; i++) {
      const base = hh * (0.45 + i * 0.15), amp = hh * (0.04 + r() * 0.05), ph = r() * 6, fr = 1 + r() * 1.5;
      x.beginPath(); x.moveTo(0, hh);
      for (let px = 0; px <= w; px += Math.max(2, w / 200)) x.lineTo(px, base + Math.sin(px / w * Math.PI * 2 * fr + ph) * amp);
      x.lineTo(w, hh); x.closePath(); x.fillStyle = pal[(i + 2) % pal.length]; x.globalAlpha = 0.55 + i * 0.12;
      x.shadowColor = 'rgba(0,0,0,0.18)'; x.shadowBlur = m * 0.02; x.fill();
    }
    x.globalAlpha = 1; x.shadowBlur = 0;
  } else {
    const a = r() * Math.PI * 2, g = x.createLinearGradient(w / 2 - Math.cos(a) * m / 2, hh / 2 - Math.sin(a) * m / 2, w / 2 + Math.cos(a) * m / 2, hh / 2 + Math.sin(a) * m / 2);
    pal.forEach((col, i) => g.addColorStop(i / (pal.length - 1), col)); x.fillStyle = g; x.fillRect(0, 0, w, hh);
  }
  // film grain
  const id = x.getImageData(0, 0, w, hh), d = id.data, amt = style === 'Grain' ? 26 : 12;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(id, 0, 0);
  return c;
}
const backdropThumbs = {};
function panelBackgrounds(P) {
  S.bgStyle ||= 'Mesh';
  const seg = segBtns(BG_STYLES.map(s => [s, s, S.bgStyle === s]), v => { S.bgStyle = v; renderPanel(); });
  P.append(h('h3', {}, 'Generate'), seg);
  const g = h('div', { class: 'grid g2', style: 'margin-top:10px' }); P.append(g);
  PALETTES.forEach((pal, i) => {
    const k = S.bgStyle + i; const url = backdropThumbs[k] ||= genBackdrop(S.bgStyle, pal, 240, 240, i + 1).toDataURL('image/jpeg', 0.85);
    g.append(h('div', { class: 'tile tpl', style: 'aspect-ratio:1', onclick: () => {
      const s = Math.min(1, 2400 / Math.max(W(), H()));
      const c = genBackdrop(S.bgStyle, pal, Math.round(W() * s), Math.round(H() * s), i + 1);
      setPhotoBg(c.toDataURL('image/jpeg', 0.92), S.bgStyle + ' backdrop');
    } }, h('img', { src: url, alt: '' })));
  });
  P.append(h('button', { class: 'btn block', style: 'margin-top:10px', onclick: () => { const o = getBgArt(); if (o) { canvas.remove(o); canvas.renderAll(); commit(); } } }, 'Remove backdrop'));
  P.append(h('h3', {}, 'Photo backdrops'));
  const m = masonry(); P.append(m);
  [...STOCK_SETS['Minimal'], ...STOCK_SETS['Pastel']].filter((v, i, a) => a.indexOf(v) === i).forEach(id => m.append(curatedCard(id, true)));
}

/* ---------------- magic panel ---------------- */
function panelMagic(P) {
  const a = canvas.getActiveObject(); const img = isImg(a) ? a : null;
  P.append(h('div', { class: 'magic-hero' }, h('div', { class: 'orb' }), h('b', {}, 'Magic studio'), h('span', {}, img ? nameOf(img).slice(0, 34) : 'Select a photo')));
  const card = (icon, title, hint, fn) => h('button', { class: 'mcard', disabled: !img, onclick: () => fn(img) }, h('span', { class: 'mi' }, ico(icon)), h('span', { class: 'mt' }, h('b', {}, title), h('small', {}, hint)));
  P.append(card('layersplit', 'Magic layers', 'People, objects & text', o => Magic.openMagic(o, 'separate')),
    card('scissors', 'Remove background', 'One-click cutout', o => Magic.removeBackground(o)),
    card('eraser', 'Magic eraser', 'Paint it away', o => Magic.openMagic(o, 'erase')),
    card('magic', 'Split pieces', 'Letters & stickers', o => Magic.splitPieces(o)));
  if (!img) {
    P.append(h('h3', {}, 'Try it on'));
    const m = masonry(); P.append(m);
    [1011, 656, 669, 1005, 64, 823].forEach(id => { const c = curatedCard(id); c.onclick = () => { const au = STOCK_PHOTOS[id][2]; addImageURL(picsumURL(id, 1600), { name: `Photo by ${au} (Unsplash)` }); }; m.append(c); });
  }
  P.append(h('div', { class: 'note' }, 'Runs on your device · free'));
}
function panelIcons(P) {
  const inp = h('input', { class: 'search', placeholder: 'Search 200,000+ free icons', value: S.iconQ || 'star' });
  const g = h('div', { class: 'grid g4', style: 'margin-top:10px' });
  P.append(inp, g, h('div', { class: 'note' }, 'Open-source icon sets via Iconify. Recolor them after adding.'));
  let token = 0;
  const run = async () => {
    g.innerHTML = ''; const q = inp.value.trim() || 'star'; S.iconQ = q; const my = ++token;
    try {
      const r = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=96`).then(r => r.json());
      if (my !== token) return;
      (r.icons || []).forEach(id => {
        const [pre, name] = id.split(':');
        const t = h('div', { class: 'tile ico', title: id, draggable: 'true' }, h('img', { src: `https://api.iconify.design/${pre}/${name}.svg?height=48`, loading: 'lazy', alt: id }));
        t.onclick = () => addIcon(pre, name);
        t.ondragstart = e => e.dataTransfer.setData('text/nova', JSON.stringify({ kind: 'icon', pre, name }));
        g.append(t);
      });
      if (!r.icons?.length) g.append(h('div', { class: 'empty', style: 'grid-column:span 4' }, 'No icons found'));
    } catch { g.append(h('div', { class: 'empty', style: 'grid-column:span 4' }, 'Offline — try Shapes or Emoji')); }
  };
  inp.onkeydown = e => { if (e.key === 'Enter') run(); };
  run();
}
async function addIcon(pre, name, opts = {}) {
  try {
    let svg = await fetch(`https://api.iconify.design/${pre}/${name}.svg?height=240`).then(r => r.text());
    svg = svg.replace(/currentColor/g, '#111111');
    return addSVG(svg, name.replace(/-/g, ' '), Object.assign({ frac: 0.25 }, opts));
  } catch { toast('Could not load icon'); }
}
function panelUploads(P) {
  P.append(h('button', { class: 'btn acc block', onclick: () => $('#fileImg').click() }, ico('uploads'), 'Upload images'));
  P.append(h('div', { class: 'drop' }, 'Drop files on the page, or paste with Ctrl+V'));
  if (S.doc.uploads.length) {
    P.append(h('h3', {}, 'In this design'));
    const g = h('div', { class: 'grid g2' }); P.append(g);
    S.doc.uploads.forEach((u, i) => g.append(h('div', { class: 'tile photo', onclick: () => u.svg ? addSVG(u.svg, u.name) : addImageURL(u.src, { name: u.name }) },
      h('img', { src: u.thumb || u.src, alt: '' }),
      h('button', { class: 'x', title: 'Remove', onclick: e => { e.stopPropagation(); S.doc.uploads.splice(i, 1); saveSoon(); renderPanel(); } }, '×'))));
  }
}
function readFile(f, as) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r[as](f); }); }
async function addFiles(files, at) {
  for (const f of files) {
    if (f.type === 'image/svg+xml' || /\.svg$/i.test(f.name)) {
      const svg = await readFile(f, 'readAsText');
      S.doc.uploads.unshift({ name: f.name, svg, thumb: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) });
      await addSVG(svg, f.name, { at, frac: 0.5 });
    } else if (f.type.startsWith('image/')) {
      const src = await readFile(f, 'readAsDataURL');
      S.doc.uploads.unshift({ name: f.name, src });
      await addImageURL(src, { name: f.name, at });
    } else if (/\.(nova|json)$/i.test(f.name)) { openProjectFile(f); }
  }
  saveSoon(); if (S.tab === 'uploads') renderPanel();
}
function setDrawing(on) {
  S.drawing = on; canvas.isDrawingMode = on;
  if (on) { canvas.discardActiveObject(); applyBrush(); }
  canvas.requestRenderAll();
}
S.brush = { kind: 'pen', color: '#8b5cf6', size: 8 };
function applyBrush() {
  const b = S.brush;
  const br = b.kind === 'spray' ? new fabric.SprayBrush(canvas) : b.kind === 'dots' ? new fabric.CircleBrush(canvas) : new fabric.PencilBrush(canvas);
  const c = new fabric.Color(b.color);
  if (b.kind === 'highlighter') c.setAlpha(0.35);
  br.color = c.toRgba(); br.width = b.kind === 'highlighter' ? b.size * 3 : b.size;
  if (br.decimate !== undefined) br.decimate = 2;
  canvas.freeDrawingBrush = br;
}
function panelDraw(P) {
  const tog = h('button', { class: 'btn block ' + (S.drawing ? 'on' : 'acc'), onclick: () => { setDrawing(!S.drawing); renderPanel(); } }, ico('draw'), S.drawing ? 'Stop drawing' : 'Start drawing');
  P.append(tog, h('h3', {}, 'Brush'));
  const seg = h('div', { class: 'seg' });
  [['pen', 'Pen'], ['highlighter', 'Marker'], ['spray', 'Spray'], ['dots', 'Dots']].forEach(([k, l]) => seg.append(h('button', { class: S.brush.kind === k ? 'on' : '', onclick: () => { S.brush.kind = k; applyBrush(); renderPanel(); } }, l)));
  P.append(seg, h('h3', {}, 'Size'));
  P.append(row(null, ...slider(S.brush.size, 1, 80, 1, v => { S.brush.size = v; if (S.drawing) applyBrush(); })));
  P.append(h('h3', {}, 'Color'), colorCtl(S.brush.color, v => { S.brush.color = v; if (S.drawing) applyBrush(); }));
}
function panelQR(P) {
  const ta = h('textarea', { class: 'search', placeholder: 'https://…', value: S.qrText || '' });
  let color = '#111111';
  P.append(h('h3', {}, 'Link or text'), ta, h('h3', {}, 'Color'), colorCtl(color, v => color = v),
    h('button', { class: 'btn acc block', style: 'margin-top:14px', onclick: () => {
      const t = ta.value.trim(); if (!t) return toast('Type a link first'); S.qrText = t;
      const qr = qrcode(0, 'M'); qr.addData(unescape(encodeURIComponent(t))); qr.make();
      const n = qr.getModuleCount(); let d = '';
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
      const bg = new fabric.Rect({ left: -2, top: -2, width: n + 4, height: n + 4, fill: '#ffffff' });
      const p = new fabric.Path(d, { fill: color, left: 0, top: 0 });
      const g = new fabric.Group([bg, p], { name: 'QR code', objectCaching: false });
      fitTo(g, 0.35); place(g);
    } }, 'Add QR code'));
}
function panelLayers(P) { P.append(h('h3', {}, 'Layers'), h('div', { id: 'layerList' })); renderLayers(); }
function renderLayers() {
  const L = $('#layerList'); if (!L) return; L.innerHTML = '';
  const act = new Set(canvas.getActiveObjects());
  const objs = canvas.getObjects().filter(o => !o.isBg).reverse();
  if (!objs.length) return L.append(h('div', { class: 'empty' }, 'Nothing here yet'));
  let dragged = null;
  objs.forEach(o => {
    const nm = h('span', { class: 'nm' }, nameOf(o));
    const sw = h('span', { class: 'th', style: isImg(o) ? `background-image:url(${o.getSrc()})` : `background:${isText(o) ? '#fff' : (typeof o.fill === 'string' && o.fill ? o.fill : (o.stroke || '#ccc'))}` }, isText(o) ? h('span', { style: 'color:#111;font:700 13px serif;display:flex;justify-content:center' }, 'T') : null);
    const row = h('div', { class: 'layer' + (act.has(o) ? ' on' : ''), draggable: 'true' }, sw, nm,
      h('button', { title: o.visible ? 'Hide' : 'Show', onclick: e => { e.stopPropagation(); o.visible = !o.visible; if (!o.visible) canvas.discardActiveObject(); canvas.requestRenderAll(); commit(); } }, ico(o.visible ? 'eye' : 'eyeoff')),
      h('button', { title: o.locked ? 'Unlock' : 'Lock', onclick: e => { e.stopPropagation(); setLock([o], !o.locked); } }, ico(o.locked ? 'lock' : 'unlock')));
    row.onclick = () => { if (!o.visible) return; canvas.setActiveObject(o); canvas.requestRenderAll(); };
    nm.ondblclick = () => { const n = prompt('Layer name', nameOf(o)); if (n != null) { o.name = n; commit(); } };
    row.ondragstart = () => { dragged = o; row.classList.add('drag'); };
    row.ondragend = () => row.classList.remove('drag');
    row.ondragover = e => { e.preventDefault(); row.classList.add('over'); };
    row.ondragleave = () => row.classList.remove('over');
    row.ondrop = e => { e.preventDefault(); row.classList.remove('over'); if (!dragged || dragged === o) return; canvas.moveTo(dragged, Math.max(1, canvas.getObjects().indexOf(o))); canvas.requestRenderAll(); commit(); };
    L.append(row);
  });
}

/* ---------------- props panel ---------------- */
function sec(title, ...kids) { return h('div', { class: 'sec' }, title ? h('h4', {}, title) : null, ...kids); }
function row(label, ...kids) { return h('div', { class: 'row' }, label != null ? h('label', {}, label) : null, ...kids); }
function slider(val, min, max, step, on) {
  const r = h('input', { type: 'range', min, max, step, value: val });
  const n = h('input', { class: 'num', type: 'number', min, max, step, value: fmt(val) });
  r.oninput = () => { n.value = fmt(+r.value); on(+r.value, false); };
  r.onchange = () => on(+r.value, true);
  n.onchange = () => { r.value = n.value; on(+n.value, true); };
  return [r, n];
}
function numIn(val, on, w) { const n = h('input', { class: 'num', type: 'number', value: Math.round(val), style: w ? `width:${w}px` : '' }); n.onchange = () => on(+n.value); return n; }
function colorCtl(val, on, opts = {}) {
  const wrap = h('div');
  const i = h('i', { style: `background:${val}` });
  const inp = h('input', { type: 'color', value: hex(val) });
  inp.oninput = () => { i.style.background = inp.value; on(inp.value, false); };
  inp.onchange = () => on(inp.value, true);
  const r = h('div', { class: 'row', style: 'margin:0' }, h('label', { class: 'swatch' }, i, inp),
    h('input', { class: 'num', style: 'width:84px;text-align:left', value: hex(val), onchange: e => { i.style.background = e.target.value; on(e.target.value, true); } }));
  if (window.EyeDropper) r.append(h('button', { class: 'tb icon', title: 'Pick color from screen', onclick: async () => { try { const { sRGBHex } = await new EyeDropper().open(); i.style.background = sRGBHex; on(sRGBHex, true); } catch {} } }, ico('dropper')));
  if (opts.none) r.append(h('button', { class: 'tb', title: 'No color', onclick: () => on('', true) }, 'None'));
  wrap.append(r);
  const sw = h('div', { class: 'swatches' });
  const docCols = docColors().filter(c => !COLORS.includes(c)).slice(0, 8);
  [...docCols, ...COLORS].forEach(c => sw.append(h('div', { class: 'sw', style: `background:${c}`, title: c, onclick: () => { i.style.background = c; on(c, true); } })));
  wrap.append(sw);
  return wrap;
}
function docColors() { const s = new Set(); walk(canvas.getObjects(), o => { if (typeof o.fill === 'string' && /^#|^rgb/.test(o.fill)) s.add(hex(o.fill)); if (typeof o.stroke === 'string' && o.stroke) s.add(hex(o.stroke)); }); return [...s]; }
function segBtns(items, on) { const s = h('div', { class: 'seg' }); items.forEach(([k, label, active, title]) => s.append(h('button', { class: active ? 'on' : '', title: title || '', onclick: () => on(k) }, ICONS[label] ? ico(label) : label))); return s; }

function sel() { const a = canvas.getActiveObject(); const bg = getBg(); return a ? (a.type === 'activeSelection' ? a.getObjects() : [a]) : (bg ? [bg] : []); }
function apply(fn, final = true, filter = () => true) {
  sel().filter(filter).forEach(o => { fn(o); o.dirty = true; if (isText(o)) { o.initDimensions(); } o.setCoords(); });
  const a = canvas.getActiveObject(); if (a && a.type === 'activeSelection') { a.addWithUpdate && a.addWithUpdate(); }
  canvas.requestRenderAll(); if (final) commit();
}
function fillCtl(objs, key = 'fill') {
  const o = objs[0]; const f = o[key]; const g = isGrad(f);
  const type = g ? f.type : 'solid';
  const box = h('div');
  box.append(row(null, segBtns([['solid', 'Solid', type === 'solid'], ['linear', 'Linear', type === 'linear'], ['radial', 'Radial', type === 'radial']], t => {
    const c1 = g ? f.colorStops[0].color : (typeof f === 'string' && f ? f : '#8b5cf6');
    const c2 = g ? f.colorStops[f.colorStops.length - 1].color : '#ec4899';
    apply(x => { x.set(key, t === 'solid' ? c1 : grad(t, c1, c2, x.gradAngle ?? 135)); if (t !== 'solid') x.gradAngle ??= 135; });
    renderProps();
  })));
  if (!g) box.append(colorCtl(typeof f === 'string' ? f || '#000000' : '#000000', (v, fin) => apply(x => x.set(key, v), fin), { none: key === 'fill' && !isText(o) }));
  else {
    const stops = f.colorStops;
    const setStop = (idx, v, fin) => apply(x => { const gg = x[key]; if (!isGrad(gg)) return; const cs = gg.colorStops.map(s => ({ ...s })); cs[idx].color = v; x.set(key, new fabric.Gradient({ type: gg.type, gradientUnits: 'percentage', coords: gg.coords, colorStops: cs })); }, fin);
    box.append(row('From', colorCtl(stops[0].color, (v, fin) => setStop(0, v, fin))));
    box.append(row('To', colorCtl(stops[stops.length - 1].color, (v, fin) => setStop(stops.length - 1, v, fin))));
    if (f.type === 'linear') box.append(row('Angle', ...slider(o.gradAngle ?? 135, 0, 360, 1, (v, fin) => apply(x => { const gg = x[key]; if (!isGrad(gg)) return; x.gradAngle = v; x.set(key, grad('linear', gg.colorStops[0].color, gg.colorStops[gg.colorStops.length - 1].color, v)); }, fin))));
  }
  return box;
}
function renderProps() {
  const P = $('#props'); P.innerHTML = '';
  const a = canvas.getActiveObject();
  if (!a) return pageProps(P);
  const objs = sel(); const o = objs[0]; const multi = objs.length > 1;
  const locked = objs.every(x => x.locked);
  // header actions
  P.append(h('div', { class: 'row', style: 'margin:0 0 4px;justify-content:space-between' },
    h('b', {}, multi ? `${objs.length} selected` : nameOf(o)),
    h('div', { style: 'display:flex;gap:2px' },
      h('button', { class: 'tb icon', title: locked ? 'Unlock' : 'Lock', onclick: () => setLock(objs, !locked) }, ico(locked ? 'lock' : 'unlock')),
      h('button', { class: 'tb icon', title: 'Duplicate (Ctrl+D)', onclick: duplicate }, ico('copy')),
      h('button', { class: 'tb icon', title: 'Delete', onclick: del }, ico('trash')))));
  if (locked) { P.append(h('div', { class: 'note' }, 'Locked. Unlock to edit.')); return; }

  if (multi) P.append(sec('Arrange',
    h('button', { class: 'btn block', onclick: group }, ico('group'), a.type === 'activeSelection' ? 'Group' : ''),
    row(null, segBtns([['left', 'al'], ['hc', 'ac'], ['right', 'ar'], ['top', 'at'], ['vc', 'am'], ['bottom', 'ab']], alignObjs)),
    objs.length > 2 ? row(null, segBtns([['h', 'dh', false, 'Distribute horizontally'], ['v', 'dv', false, 'Distribute vertically']], distribute)) : null));
  if (!multi && o.type === 'group') P.append(sec(null, h('button', { class: 'btn block', onclick: ungroup }, 'Ungroup')));

  // text
  const texts = objs.filter(isText);
  if (texts.length) {
    const t = texts[0];
    const fontBtn = h('button', { class: 'fontpick', style: `font-family:'${t.fontFamily}'` }, t.fontFamily, h('span', { class: 'muted' }, '▾'));
    const list = h('div', { class: 'fontlist hidden' });
    const fsearch = h('input', { class: 'search', placeholder: 'Search fonts', style: 'margin-top:4px', oninput: () => { const q = fsearch.value.toLowerCase(); $$('div', list).forEach(d => d.style.display = d.textContent.toLowerCase().includes(q) ? '' : 'none'); } });
    fsearch.classList.add('hidden');
    FONTS.forEach(f => { ensureFont(f); list.append(h('div', { style: `font-family:'${f}'`, class: f === t.fontFamily ? 'on' : '', onclick: async () => { await ensureFont(f); apply(x => x.set('fontFamily', f), true, isText); renderProps(); } }, f)); });
    fontBtn.onclick = () => { list.classList.toggle('hidden'); fsearch.classList.toggle('hidden'); if (!list.classList.contains('hidden')) fsearch.focus(); };
    const st = k => texts.every(x => k === 'b' ? x.fontWeight === 'bold' || x.fontWeight >= 600 : k === 'i' ? x.fontStyle === 'italic' : k === 'u' ? x.underline : x.linethrough);
    P.append(sec('Text', fontBtn, fsearch, list,
      row('Size', ...slider(Math.round(t.fontSize * t.scaleY), 4, 600, 1, (v, fin) => apply(x => x.set('fontSize', v / x.scaleY), fin, isText))),
      h('div', { style: 'margin:10px 0' }, fillCtl(texts)),
      row('Style', segBtns([['b', 'B', st('b')], ['i', 'I', st('i')], ['u', 'U', st('u')], ['s', 'S', st('s')]], k => {
        const on = !st(k); apply(x => k === 'b' ? x.set('fontWeight', on ? 'bold' : 'normal') : k === 'i' ? x.set('fontStyle', on ? 'italic' : 'normal') : k === 'u' ? x.set('underline', on) : x.set('linethrough', on), true, isText); renderProps();
      })),
      row('Align', segBtns([['left', 'tl', t.textAlign === 'left'], ['center', 'tc', t.textAlign === 'center'], ['right', 'tr', t.textAlign === 'right'], ['justify', 'tj', t.textAlign === 'justify']], v => { apply(x => x.set('textAlign', v), true, isText); renderProps(); })),
      row('Case', segBtns([['up', 'AA'], ['low', 'aa'], ['title', 'Aa']], k => apply(x => x.set('text', k === 'up' ? x.text.toUpperCase() : k === 'low' ? x.text.toLowerCase() : x.text.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase())), true, isText))),
      row('Spacing', ...slider(t.charSpacing || 0, -200, 1000, 10, (v, fin) => apply(x => x.set('charSpacing', v), fin, isText))),
      row('Line', ...slider(t.lineHeight, 0.5, 3, 0.02, (v, fin) => apply(x => x.set('lineHeight', v), fin, isText)))));
    P.append(textEffects(texts));
  }
  // shapes
  const shapes = objs.filter(x => isShape(x) || x.type === 'group');
  if (shapes.length && !texts.length) {
    const s = shapes[0];
    if (s.type === 'group') {
      const first = s.getObjects().find(c => c.fill && typeof c.fill === 'string') || s.getObjects()[0];
      P.append(sec('Color', colorCtl(first?.fill || first?.stroke || '#000000', (v, fin) => apply(x => { if (x.type !== 'group') return; walk(x.getObjects(), c => { if (c.type === 'rect' && x.name === 'QR code' && c === x.getObjects()[0]) return; if (c.fill && c.fill !== 'none' && typeof c.fill === 'string') c.set('fill', v); if (c.stroke && c.stroke !== 'none') c.set('stroke', v); c.dirty = true; }); x.dirty = true; }, fin))));
    } else {
      P.append(sec('Fill', fillCtl(shapes)));
      P.append(sec('Border',
        row('Color', colorCtl(s.stroke || '#000000', (v, fin) => apply(x => { x.set('stroke', v); if (!x.strokeWidth) x.set('strokeWidth', 4); }, fin))),
        row('Width', ...slider(s.strokeWidth || 0, 0, 80, 1, (v, fin) => apply(x => x.set({ strokeWidth: v, stroke: x.stroke || '#000000' }), fin))),
        row('Style', segBtns([['solid', 'Solid', !s.strokeDashArray], ['dash', 'Dash', !!s.strokeDashArray]], k => { apply(x => x.set('strokeDashArray', k === 'dash' ? [Math.max(4, x.strokeWidth * 2), Math.max(4, x.strokeWidth * 1.5)] : null)); renderProps(); })),
        s.type === 'rect' ? row('Corners', ...slider(s.rx || 0, 0, Math.min(s.width, s.height) / 2, 1, (v, fin) => apply(x => x.type === 'rect' && x.set({ rx: v, ry: v }), fin))) : null));
    }
  }
  const lines = objs.filter(isLine);
  if (lines.length && !texts.length) {
    const l = lines[0];
    P.append(sec('Line',
      row('Color', colorCtl(l.stroke || '#000000', (v, fin) => apply(x => x.set('stroke', v), fin, isLine))),
      row('Width', ...slider(l.strokeWidth || 1, 1, 100, 1, (v, fin) => apply(x => x.set('strokeWidth', v), fin, isLine))),
      row('Style', segBtns([['solid', 'Solid', !l.strokeDashArray], ['dash', 'Dash', !!l.strokeDashArray], ['dot', 'Dot']], k => { apply(x => x.set({ strokeDashArray: k === 'solid' ? null : k === 'dash' ? [x.strokeWidth * 3, x.strokeWidth * 2] : [0.1, x.strokeWidth * 2], strokeLineCap: 'round' }), true, isLine); renderProps(); }))));
  }
  // images
  if (!multi && isImg(o)) P.append(...imageProps(o));

  // effects for non-text
  if (!texts.length) P.append(shadowSec(objs));

  // common
  P.append(sec('Transparency', row(null, ...slider(Math.round((o.opacity ?? 1) * 100), 0, 100, 1, (v, fin) => apply(x => x.set('opacity', v / 100), fin)))));
  const box = a.getBoundingRect(true, true);
  P.append(sec('Position',
    row(null, segBtns([['left', 'al', false, 'Align left'], ['hc', 'ac', false, 'Center'], ['right', 'ar', false, 'Align right'], ['top', 'at', false, 'Top'], ['vc', 'am', false, 'Middle'], ['bottom', 'ab', false, 'Bottom']], m => alignObjs(m, true))),
    row('X / Y', numIn(a.left, v => { a.set('left', v); a.setCoords(); canvas.requestRenderAll(); commit(); }), numIn(a.top, v => { a.set('top', v); a.setCoords(); canvas.requestRenderAll(); commit(); })),
    row('W / H', numIn(a.getScaledWidth(), v => { a.scaleToWidth ? a.set('scaleX', v / a.width) : 0; a.setCoords(); canvas.requestRenderAll(); commit(); renderProps(); }), numIn(a.getScaledHeight(), v => { a.set('scaleY', v / a.height); a.setCoords(); canvas.requestRenderAll(); commit(); renderProps(); }),
      h('span', { class: 'muted small' }, `${Math.round(box.width)}×${Math.round(box.height)}`)),
    row('Rotate', ...slider(Math.round(a.angle || 0), 0, 360, 1, (v, fin) => { a.rotate(v); a.setCoords(); canvas.requestRenderAll(); if (fin) commit(); })),
    row('Flip', segBtns([['h', 'flipH', false, 'Flip horizontal'], ['v', 'flipV', false, 'Flip vertical']], k => { a.set(k === 'h' ? 'flipX' : 'flipY', !a[k === 'h' ? 'flipX' : 'flipY']); canvas.requestRenderAll(); commit(); })),
    row('Layer', segBtns([['front', 'top', false, 'Bring to front'], ['fwd', 'up', false, 'Forward'], ['back', 'down', false, 'Backward'], ['bottom', 'bottom', false, 'Send to back']], order))));
}
function textEffects(texts) {
  const t = texts[0];
  const cur = t._fx || 'none';
  const fx = {
    none: x => x.set({ shadow: null, stroke: null, strokeWidth: 0, textBackgroundColor: '', backgroundColor: '' }),
    shadow: x => x.set({ shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.45)', blur: x.fontSize * 0.08, offsetX: x.fontSize * 0.04, offsetY: x.fontSize * 0.04 }) }),
    lift: x => x.set({ shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: x.fontSize * 0.25, offsetX: 0, offsetY: x.fontSize * 0.06 }) }),
    neon: x => x.set({ shadow: new fabric.Shadow({ color: typeof x.fill === 'string' ? x.fill : '#e879f9', blur: x.fontSize * 0.3, offsetX: 0, offsetY: 0 }) }),
    hollow: x => x.set({ stroke: typeof x.fill === 'string' && x.fill ? x.fill : '#111111', strokeWidth: Math.max(1, x.fontSize * 0.025), fill: 'rgba(0,0,0,0)', paintFirst: 'fill' }),
    outline: x => x.set({ stroke: '#111111', strokeWidth: Math.max(2, x.fontSize * 0.06), paintFirst: 'stroke', strokeLineJoin: 'round' }),
    echo: x => x.set({ shadow: new fabric.Shadow({ color: 'rgba(236,72,153,0.7)', blur: 0, offsetX: x.fontSize * 0.06, offsetY: x.fontSize * 0.06 }) }),
    highlight: x => x.set({ textBackgroundColor: '#fde047' }),
  };
  const g = h('div', { class: 'grid g4' });
  Object.keys(fx).forEach(k => g.append(h('button', { class: 'btn' + (cur === k ? ' on' : ''), style: 'padding:7px 2px;font-size:11px', onclick: () => {
    apply(x => { fx.none(x); if (k === 'none' && x.fill === 'rgba(0,0,0,0)') x.set('fill', x.stroke || '#111111'); fx[k](x); x._fx = k; }, true, isText); renderProps();
  } }, k[0].toUpperCase() + k.slice(1))));
  const kids = [g];
  if (t.shadow) kids.push(row('Glow', colorCtl(t.shadow.color, (v, fin) => apply(x => x.shadow && (x.shadow.color = v), fin, isText))),
    row('Blur', ...slider(t.shadow.blur, 0, 200, 1, (v, fin) => apply(x => x.shadow && (x.shadow.blur = v), fin, isText))),
    row('Offset', ...slider(t.shadow.offsetX, -100, 100, 1, (v, fin) => apply(x => x.shadow && (x.shadow.offsetX = x.shadow.offsetY = v), fin, isText))));
  if (t.stroke && t.strokeWidth) kids.push(row('Outline', colorCtl(t.stroke, (v, fin) => apply(x => x.set('stroke', v), fin, isText))),
    row('Thick', ...slider(t.strokeWidth, 0, 60, 0.5, (v, fin) => apply(x => x.set('strokeWidth', v), fin, isText))));
  if (t.textBackgroundColor) kids.push(row('Highlight', colorCtl(t.textBackgroundColor, (v, fin) => apply(x => x.set('textBackgroundColor', v), fin, isText))));
  return sec('Effects', ...kids);
}
function shadowSec(objs) {
  const o = objs[0]; const s = o.shadow;
  const kids = [h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!s, onchange: e => { apply(x => x.set('shadow', e.target.checked ? new fabric.Shadow({ color: 'rgba(0,0,0,0.35)', blur: 30, offsetX: 8, offsetY: 12 }) : null)); renderProps(); } }), 'Drop shadow')];
  if (s) kids.push(row('Color', colorCtl(s.color, (v, fin) => apply(x => x.shadow && (x.shadow.color = v), fin))),
    row('Blur', ...slider(s.blur, 0, 200, 1, (v, fin) => apply(x => x.shadow && (x.shadow.blur = v), fin))),
    row('X', ...slider(s.offsetX, -200, 200, 1, (v, fin) => apply(x => x.shadow && (x.shadow.offsetX = v), fin))),
    row('Y', ...slider(s.offsetY, -200, 200, 1, (v, fin) => apply(x => x.shadow && (x.shadow.offsetY = v), fin))));
  return sec('Shadow', ...kids);
}
const F = fabric.Image.filters;
const ADJ = [['Brightness', 'Brightness', 'brightness', -1, 1], ['Contrast', 'Contrast', 'contrast', -1, 1], ['Saturation', 'Saturation', 'saturation', -1, 1],
  ['Vibrance', 'Vibrance', 'vibrance', -1, 1], ['Hue', 'HueRotation', 'rotation', -1, 1], ['Blur', 'Blur', 'blur', 0, 1], ['Noise', 'Noise', 'noise', 0, 500], ['Pixelate', 'Pixelate', 'blocksize', 1, 40]];
const PRESETS = [['None'], ['Mono', 'Grayscale'], ['Sepia', 'Sepia'], ['Vintage', 'Vintage'], ['Kodak', 'Kodachrome'], ['Techni', 'Technicolor'], ['Polaroid', 'Polaroid'], ['Brownie', 'Brownie'], ['Noir', 'BlackWhite'], ['Invert', 'Invert']];
const PRESET_TYPES = PRESETS.map(p => p[1]).filter(Boolean);
function getF(o, type) { return (o.filters || []).find(f => f && f.type === type); }
function setF(o, type, prop, v, neutral) {
  o.filters = (o.filters || []).filter(f => f && f.type !== type);
  if (v !== neutral && v != null) o.filters.push(new F[type]({ [prop]: v }));
  o.applyFilters();
}
function imageProps(o) {
  const out = [];
  const mb = (icon, label, fn, cls = '') => h('button', { class: 'mbtn ' + cls, onclick: () => fn(o) }, ico(icon), label);
  out.push(h('div', { class: 'sec magicsec' }, h('h4', {}, h('span', { class: 'glow' }, '✨ Magic')),
    h('div', { class: 'grid g2' }, mb('layersplit', 'Magic layers', x => Magic.openMagic(x, 'separate'), 'hero'), mb('scissors', 'Remove BG', x => Magic.removeBackground(x)),
      mb('eraser', 'Eraser', x => Magic.openMagic(x, 'erase')), mb('magic', 'Split', x => Magic.splitPieces(x)))));
  const curPreset = (o.filters || []).find(f => f && PRESET_TYPES.includes(f.type))?.type;
  const g = h('div', { class: 'grid g5' });
  PRESETS.forEach(([label, type]) => g.append(h('button', { class: 'btn' + ((curPreset || undefined) === type ? ' on' : ''), style: 'padding:6px 0;font-size:10.5px', onclick: () => {
    o.filters = (o.filters || []).filter(f => f && !PRESET_TYPES.includes(f.type));
    if (type) o.filters.push(new F[type]());
    o.applyFilters(); canvas.requestRenderAll(); commit(); renderProps();
  } }, label)));
  out.push(sec('Filters', g));
  out.push(sec('Adjust', ...ADJ.map(([label, type, prop, min, max]) => {
    const neutral = type === 'Pixelate' ? 1 : 0;
    const f = getF(o, type); const val = f ? f[prop] : neutral;
    return row(label, ...slider(val, min, max, type === 'Noise' ? 5 : type === 'Pixelate' ? 1 : 0.01, (v, fin) => { setF(o, type, prop, v, neutral); canvas.requestRenderAll(); if (fin) commit(); }));
  }), h('button', { class: 'btn block', style: 'margin-top:6px', onclick: () => { o.filters = (o.filters || []).filter(f => f && (PRESET_TYPES.includes(f.type) || f.type === 'RemoveColor')); o.applyFilters(); canvas.requestRenderAll(); commit(); renderProps(); } }, 'Reset adjustments')));
  // remove color
  const rc = getF(o, 'RemoveColor');
  const rcKids = [h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!rc, onchange: e => {
    o.filters = (o.filters || []).filter(f => f && f.type !== 'RemoveColor');
    if (e.target.checked) o.filters.push(new F.RemoveColor({ color: cornerColor(o), distance: 0.15 }));
    o.applyFilters(); canvas.requestRenderAll(); commit(); renderProps();
  } }), 'Remove a background color')];
  if (rc) rcKids.push(row('Color', colorCtl(rc.color, (v, fin) => { rc.color = v; o.applyFilters(); canvas.requestRenderAll(); if (fin) commit(); })),
    row('Range', ...slider(rc.distance, 0, 1, 0.01, (v, fin) => { rc.distance = v; o.applyFilters(); canvas.requestRenderAll(); if (fin) commit(); })));
  out.push(sec('Background remover', ...rcKids));
  // mask
  out.push(sec('Frame / mask', h('div', { class: 'grid g4' }, ...[['', 'None'], ['circle', 'Circle'], ['rounded', 'Rounded'], ['ellipse', 'Ellipse'], ['arch', 'Arch'], ['star', 'Star'], ['heart', 'Heart']]
    .map(([k, l]) => h('button', { class: 'btn' + ((o.maskType || '') === k ? ' on' : ''), style: 'padding:6px 0;font-size:11px', onclick: () => { applyMask(o, k); canvas.requestRenderAll(); commit(); renderProps(); } }, l)))));
  // crop
  const el = o.getElement(); const nw = el.naturalWidth || el.width, nh = el.naturalHeight || el.height;
  const setCrop = (k, v, fin) => {
    o[k] = v; const L = o.cropL || 0, R = o.cropR || 0, T = o.cropT || 0, Bm = o.cropB || 0;
    if (L + R > 0.95 || T + Bm > 0.95) return;
    o.set({ cropX: L * nw, cropY: T * nh, width: nw * (1 - L - R), height: nh * (1 - T - Bm) });
    if (o.maskType) applyMask(o, o.maskType);
    o.setCoords(); canvas.requestRenderAll(); if (fin) commit();
  };
  out.push(sec('Crop', ...[['Left', 'cropL'], ['Right', 'cropR'], ['Top', 'cropT'], ['Bottom', 'cropB']].map(([l, k]) => row(l, ...slider(o[k] || 0, 0, 0.9, 0.01, (v, fin) => setCrop(k, v, fin)))),
    h('button', { class: 'btn block', style: 'margin-top:6px', onclick: () => {
      o.set({ left: 0, top: 0, angle: 0, flipX: false, flipY: false, cropL: 0, cropR: 0, cropT: 0, cropB: 0 }); coverImg(o, W(), H()); applyMask(o, '');
      canvas.moveTo(o, 1); setLock([o], true); canvas.discardActiveObject(); canvas.requestRenderAll(); commit();
    } }, 'Set as background')));
  return out;
}
function cornerColor(o) {
  try { const el = o.getElement(); const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); x.drawImage(el, 0, 0, 1, 1, 0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''); } catch { return '#ffffff'; }
}
function pageProps(P) {
  const bg = getBg();
  P.append(h('div', { class: 'row', style: 'margin:0 0 4px;justify-content:space-between' }, h('b', {}, `Page ${S.page + 1}`), h('span', { class: 'muted small' }, `${W()} × ${H()} px`)));
  if (bg) {
    const sec1 = sec('Background', fillCtlFor(bg));
    const gg = h('div', { class: 'grid g6', style: 'margin-top:8px' });
    GRADS.forEach(([a, b]) => gg.append(h('div', { class: 'sw', style: `width:auto;aspect-ratio:1;background:linear-gradient(135deg,${a},${b})`, onclick: () => { bg.set('fill', grad('linear', a, b, 135)); bg.gradAngle = 135; canvas.requestRenderAll(); commit(); renderProps(); } })));
    sec1.append(gg);
    P.append(sec1);
  }
  P.append(sec('Design', h('button', { class: 'btn block', onclick: openResize }, 'Resize'), h('div', { style: 'height:6px' }),
    h('button', { class: 'btn block', onclick: () => { cur().json = snap(); const p = { id: uid(), json: cur().json, thumb: cur().thumb }; S.doc.pages.splice(S.page + 1, 0, p); loadPage(S.page + 1); saveSoon(); } }, 'Duplicate page')));
  P.append(sec('Shortcuts', h('div', { class: 'note', style: 'margin:0;line-height:1.8', html:
    'T text · R rectangle · C circle · L line<br>Ctrl+D duplicate · Ctrl+G group<br>Ctrl+wheel zoom · Alt-drag no snap<br>Shift+arrows nudge 10px' })));
}
// with nothing selected, sel() returns the background, so fillCtl edits the page
function fillCtlFor(o) { return fillCtl([o]); }

/* ---------------- actions ---------------- */
function setLock(objs, on) {
  objs.forEach(o => o.set({ locked: on, lockMovementX: on, lockMovementY: on, lockScalingX: on, lockScalingY: on, lockRotation: on, hasControls: !on, editable: !on }));
  canvas.requestRenderAll(); commit(); renderProps();
}
function del() {
  const objs = canvas.getActiveObjects().filter(o => !o.locked); if (!objs.length) return;
  canvas.discardActiveObject(); objs.forEach(o => canvas.remove(o)); canvas.requestRenderAll();
}
const cloneP = o => new Promise(r => o.clone(r, PROPS));
async function copy() { const a = canvas.getActiveObject(); if (!a) return; S.clip = await cloneP(a); }
async function pasteObj(src, off = 20) {
  const c = await cloneP(src);
  canvas.discardActiveObject();
  c.set({ left: c.left + off, top: c.top + off, evented: true });
  if (c.type === 'activeSelection') { c.canvas = canvas; c.forEachObject(o => { o.id = uid(); canvas.add(o); }); c.setCoords(); }
  else { c.id = uid(); canvas.add(c); }
  canvas.setActiveObject(c); canvas.requestRenderAll();
}
async function paste() { if (!S.clip) return; await pasteObj(S.clip); S.clip.set({ left: S.clip.left + 20, top: S.clip.top + 20 }); }
async function duplicate() { const a = canvas.getActiveObject(); if (a) await pasteObj(a, 24); }
function group() { const a = canvas.getActiveObject(); if (a?.type !== 'activeSelection') return; const g = a.toGroup(); g.id = uid(); g.name = 'Group'; canvas.requestRenderAll(); commit(); renderProps(); }
function ungroup() { const a = canvas.getActiveObject(); if (a?.type !== 'group') return; a.toActiveSelection(); canvas.requestRenderAll(); commit(); renderProps(); }
function selectAll() { canvas.discardActiveObject(); const objs = canvas.getObjects().filter(o => !o.isBg && !o.locked && o.visible); if (!objs.length) return; canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas })); canvas.requestRenderAll(); }
function order(k) {
  const a = canvas.getActiveObject(); if (!a) return;
  const objs = a.type === 'activeSelection' ? a.getObjects() : [a];
  if (a.type === 'activeSelection') canvas.discardActiveObject();
  objs.forEach(o => { if (k === 'front') canvas.bringToFront(o); else if (k === 'fwd') canvas.bringForward(o); else if (k === 'back') { canvas.sendBackwards(o); if (canvas.getObjects().indexOf(o) < 1) canvas.moveTo(o, 1); } else { canvas.moveTo(o, 1); } });
  if (a.type === 'activeSelection') canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));
  canvas.requestRenderAll(); commit();
}
function alignObjs(mode, toPage) {
  const a = canvas.getActiveObject(); if (!a) return;
  let objs, box;
  if (a.type === 'activeSelection' && !toPage) { objs = a.getObjects(); box = a.getBoundingRect(true, true); canvas.discardActiveObject(); }
  else { objs = [a]; box = { left: 0, top: 0, width: W(), height: H() }; }
  objs.forEach(o => {
    const r = o.getBoundingRect(true, true); let dx = 0, dy = 0;
    if (mode === 'left') dx = box.left - r.left; if (mode === 'right') dx = box.left + box.width - (r.left + r.width); if (mode === 'hc') dx = box.left + box.width / 2 - (r.left + r.width / 2);
    if (mode === 'top') dy = box.top - r.top; if (mode === 'bottom') dy = box.top + box.height - (r.top + r.height); if (mode === 'vc') dy = box.top + box.height / 2 - (r.top + r.height / 2);
    o.set({ left: o.left + dx, top: o.top + dy }); o.setCoords();
  });
  if (objs.length > 1 || a.type === 'activeSelection') canvas.setActiveObject(objs.length > 1 ? new fabric.ActiveSelection(objs, { canvas }) : objs[0]);
  canvas.requestRenderAll(); commit(); renderProps();
}
function distribute(axis) {
  const a = canvas.getActiveObject(); if (a?.type !== 'activeSelection') return;
  const objs = a.getObjects().slice(); canvas.discardActiveObject();
  const R = o => o.getBoundingRect(true, true);
  const k = axis === 'h' ? 'left' : 'top', sz = axis === 'h' ? 'width' : 'height';
  objs.sort((p, q) => R(p)[k] - R(q)[k]);
  const first = R(objs[0]), last = R(objs[objs.length - 1]);
  const total = objs.reduce((s, o) => s + R(o)[sz], 0);
  const gap = (last[k] + last[sz] - first[k] - total) / (objs.length - 1);
  let pos = first[k];
  objs.forEach(o => { const r = R(o); o.set(k, o[k] + (pos - r[k])); o.setCoords(); pos += r[sz] + gap; });
  canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas })); canvas.requestRenderAll(); commit();
}

/* ---------------- snapping guides ---------------- */
canvas.on('object:moving', e => {
  const o = e.target; S.guides = [];
  if (e.e && e.e.altKey) return;
  const t = 7 / S.zoom, b = o.getBoundingRect(true, true);
  const xs = [0, W() / 2, W()], ys = [0, H() / 2, H()];
  canvas.getObjects().forEach(p => {
    if (p === o || p.isBg || !p.visible || (o.type === 'activeSelection' && o.contains(p))) return;
    const r = p.getBoundingRect(true, true); xs.push(r.left, r.left + r.width / 2, r.left + r.width); ys.push(r.top, r.top + r.height / 2, r.top + r.height);
  });
  const best = (targets, edges) => { let bst = null; for (const x of targets) for (const v of edges) { const d = x - v; if (Math.abs(d) < t && (!bst || Math.abs(d) < Math.abs(bst.d))) bst = { d, x }; } return bst; };
  const bx = best(xs, [b.left, b.left + b.width / 2, b.left + b.width]);
  const by = best(ys, [b.top, b.top + b.height / 2, b.top + b.height]);
  if (bx) { o.left += bx.d; S.guides.push({ x: bx.x }); }
  if (by) { o.top += by.d; S.guides.push({ y: by.y }); }
  o.setCoords();
});
canvas.on('object:rotating', e => { if (e.e?.altKey) return; const o = e.target; const a = ((o.angle % 360) + 360) % 360; for (const s of [0, 45, 90, 135, 180, 225, 270, 315, 360]) if (Math.abs(a - s) < 4) { o.rotate(s % 360); break; } });
canvas.on('mouse:up', () => { if (S.guides.length) { S.guides = []; canvas.requestRenderAll(); } });
canvas.on('after:render', () => {
  if (!S.guides.length) return;
  const ctx = canvas.getContext(), v = canvas.viewportTransform;
  ctx.save(); ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
  ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 1 / S.zoom; ctx.setLineDash([4 / S.zoom, 3 / S.zoom]);
  S.guides.forEach(g => { ctx.beginPath(); if (g.x != null) { ctx.moveTo(g.x, 0); ctx.lineTo(g.x, H()); } else { ctx.moveTo(0, g.y); ctx.lineTo(W(), g.y); } ctx.stroke(); });
  ctx.restore();
});

/* ---------------- canvas events ---------------- */
canvas.on('object:added', e => { if (!e.target.id) e.target.id = uid(); if (e.target.type === 'path' && !e.target.name) e.target.name = 'Drawing'; if (!S.loading) commitSoon(); });
canvas.on('object:removed', () => { if (!S.loading) commitSoon(); });
canvas.on('object:modified', e => {
  const o = e.target;
  if (o && o.type === 'textbox' && Math.abs(o.scaleX - o.scaleY) < 0.001 && o.scaleX !== 1) {
    o.set({ fontSize: o.fontSize * o.scaleX, width: o.width * o.scaleX, scaleX: 1, scaleY: 1 });
    if (o.strokeWidth) o.strokeWidth *= 1; o.initDimensions(); o.setCoords();
  }
  commit(); renderProps();
});
canvas.on('text:changed', debounce(commit, 400));
canvas.on('text:editing:exited', commit);
['selection:created', 'selection:updated', 'selection:cleared'].forEach(ev => canvas.on(ev, () => { renderProps(); renderLayers(); hideCtx(); if (S.tab === 'magic' && !S.loading) renderPanel(); }));
canvas.on('mouse:down', e => {
  if (e.button === 3 || e.e.button === 2) {
    if (e.target && !e.target.isBg && !canvas.getActiveObjects().includes(e.target)) canvas.setActiveObject(e.target);
    showCtx(e.e.clientX, e.e.clientY);
  } else hideCtx();
});

/* context menu */
function showCtx(x, y) {
  const m = $('#ctx'); m.innerHTML = ''; const a = canvas.getActiveObject();
  const item = (label, kbd, fn) => m.append(h('button', { onclick: () => { hideCtx(); fn(); } }, label, h('kbd', {}, kbd || '')));
  if (a) {
    item('Copy', 'Ctrl+C', copy); item('Duplicate', 'Ctrl+D', duplicate); item('Delete', 'Del', del);
    m.append(h('hr'));
    item('Bring to front', 'Ctrl+]', () => order('front')); item('Send to back', 'Ctrl+[', () => order('bottom'));
    if (a.type === 'activeSelection') item('Group', 'Ctrl+G', group);
    if (a.type === 'group') item('Ungroup', 'Ctrl+Shift+G', ungroup);
    item(a.locked ? 'Unlock' : 'Lock', '', () => setLock(sel(), !a.locked));
    if (isImg(a) && !a.locked) { m.append(h('hr')); item('✨ Magic layers', 'M', () => Magic.openMagic(a)); item('✨ Remove background', '', () => Magic.removeBackground(a)); item('✨ Magic eraser', 'E', () => Magic.openMagic(a, 'erase')); if (a.magicKind) item('✨ Split into pieces', '', () => Magic.splitPieces(a)); }
  }
  if (S.clip) item('Paste', 'Ctrl+V', paste);
  item('Select all', 'Ctrl+A', selectAll);
  m.classList.remove('hidden');
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
}
function hideCtx() { $('#ctx').classList.add('hidden'); }
document.addEventListener('mousedown', e => { if (!e.target.closest('#ctx') && !e.target.closest('.canvas-container')) hideCtx(); });

/* keyboard */
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
  const a = canvas.getActiveObject(); if (a && a.isEditing) return;
  if (!$('#modal').classList.contains('hidden')) { if (e.key === 'Escape') { if ($('.ml')) Magic.close(); else closeModal(); } return; }
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z' && !e.shiftKey) undo();
  else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) redo();
  else if (mod && k === 'c') copy();
  else if (mod && k === 'x') copy().then(del);
  else if (mod && k === 'v') return; // handled by paste event
  else if (mod && k === 'd') duplicate();
  else if (mod && k === 'a') selectAll();
  else if (mod && k === 'g') e.shiftKey ? ungroup() : group();
  else if (mod && k === 's') saveFile();
  else if (mod && k === 'k') openPalette();
  else if (mod && k === ']') order('front');
  else if (mod && k === '[') order('bottom');
  else if (mod && (k === '=' || k === '+')) setZoom(S.zoom * 1.2);
  else if (mod && k === '-') setZoom(S.zoom / 1.2);
  else if (mod && k === '0') fit();
  else if (mod) return;
  else if (k === 'delete' || k === 'backspace') del();
  else if (k === 'escape') { if (S.drawing) { setDrawing(false); if (S.tab === 'draw') renderPanel(); } canvas.discardActiveObject(); canvas.requestRenderAll(); }
  else if (k.startsWith('arrow') && a) { const d = e.shiftKey ? 10 : 1; if (a.locked) return; if (k === 'arrowleft') a.left -= d; if (k === 'arrowright') a.left += d; if (k === 'arrowup') a.top -= d; if (k === 'arrowdown') a.top += d; a.setCoords(); canvas.requestRenderAll(); commitSoon(); }
  else if (k === 'm' && isImg(a)) Magic.openMagic(a);
  else if (k === 'e' && isImg(a)) Magic.openMagic(a, 'erase');
  else if (k === 't') addText('Your text here');
  else if (k === 'r') place(shape('rect'));
  else if (k === 'c') place(shape('circle'));
  else if (k === 'l') place(shape('line'));
  else if (k === ']') order('fwd');
  else if (k === '[') order('back');
  else return;
  e.preventDefault();
});
document.addEventListener('paste', async e => {
  if (/INPUT|TEXTAREA/.test(e.target.tagName) || canvas.getActiveObject()?.isEditing) return;
  const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
  if (files.length) { e.preventDefault(); return addFiles(files); }
  if (S.clip) { e.preventDefault(); return paste(); }
  const t = e.clipboardData?.getData('text/plain');
  if (t) { e.preventDefault(); if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg)(\?\S*)?$/i.test(t.trim())) addImageURL(t.trim()); else addText(t.slice(0, 2000)); }
});

/* workspace: zoom, drop, deselect */
const ws = $('#workspace');
ws.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(S.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); } }, { passive: false });
ws.addEventListener('mousedown', e => { if (e.target === ws || e.target.id === 'stage') { canvas.discardActiveObject(); canvas.requestRenderAll(); } });
ws.addEventListener('dragover', e => e.preventDefault());
ws.addEventListener('drop', async e => {
  e.preventDefault();
  const p = canvas.getPointer(e); const at = (p.x >= 0 && p.y >= 0 && p.x <= W() && p.y <= H()) ? { x: p.x, y: p.y } : undefined;
  const nova = e.dataTransfer.getData('text/nova');
  if (nova) { const d = JSON.parse(nova); if (d.kind === 'img') addImageURL(d.url, { fallback: d.fallback, name: d.name, at }); else if (d.kind === 'icon') addIcon(d.pre, d.name, { at }); return; }
  if (e.dataTransfer.files.length) addFiles([...e.dataTransfer.files], at);
});
new ResizeObserver(debounce(() => S.doc && canvas.calcOffset(), 100)).observe(ws);
$('#stage').addEventListener('scroll', () => canvas.calcOffset());
ws.addEventListener('scroll', () => canvas.calcOffset());

/* ---------------- pages bar ---------------- */
let thumbBusy = false;
async function fillThumbs() {
  if (thumbBusy) return; thumbBusy = true;
  try {
    for (const [i, p] of S.doc.pages.entries()) {
      if (p.thumb || i === S.page) continue;
      const sc = await renderOff(p.json, false);
      p.thumb = sc.toDataURL({ format: 'jpeg', quality: 0.7, multiplier: 220 / Math.max(W(), H()) }); sc.dispose();
    }
  } finally { thumbBusy = false; }
  renderPages();
}
function renderPages() {
  const P = $('#pages'); P.innerHTML = '';
  if (S.doc.pages.some((p, i) => !p.thumb && i !== S.page)) setTimeout(fillThumbs, 400);
  const tw = Math.round(64 * W() / H());
  S.doc.pages.forEach((p, i) => {
    const el = h('div', { class: 'pg' + (i === S.page ? ' on' : ''), style: `width:${clamp(tw, 36, 150)}px;background-image:url(${p.thumb || ''})`, onclick: () => switchPage(i) }, h('span', {}, i + 1),
      h('div', { class: 'pa' },
        h('button', { title: 'Duplicate', onclick: ev => { ev.stopPropagation(); if (i === S.page) cur().json = snap(); S.doc.pages.splice(i + 1, 0, { id: uid(), json: p.json, thumb: p.thumb }); if (i < S.page) S.page++; loadPage(i + 1); saveSoon(); } }, ico('copy')),
        S.doc.pages.length > 1 ? h('button', { title: 'Delete page', onclick: ev => { ev.stopPropagation(); if (!confirm('Delete page ' + (i + 1) + '?')) return; if (i === S.page) cur().json = snap(); S.doc.pages.splice(i, 1); S.page = Math.min(S.page > i ? S.page - 1 : S.page, S.doc.pages.length - 1); loadPage(S.page); saveSoon(); } }, ico('trash')) : null));
    P.append(el);
  });
  P.append(h('button', { class: 'pgadd', title: 'Add page', onclick: () => { cur().json = snap(); const bgFill = getBg()?.fill; const np = newPage(W(), H(), typeof bgFill === 'string' ? bgFill : '#ffffff'); S.doc.pages.splice(S.page + 1, 0, np); loadPage(S.page + 1); saveSoon(); } }, ico('plus')));
}

/* ---------------- modals ---------------- */
function modal(content, small) { const s = $('#sheet'); s.className = 'sheet' + (small ? ' sm' : ''); s.innerHTML = ''; s.append(...[content].flat()); $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal' && S.doc) closeModal(); });
function sizeCard(name, w, h_, on) {
  const m = 54 / Math.max(w, h_);
  return h('div', { class: 'size', onclick: on }, h('div', { style: 'height:56px;display:flex;align-items:center' }, h('div', { class: 'box', style: `width:${Math.round(w * m)}px;height:${Math.round(h_ * m)}px` })), h('b', {}, name), h('small', {}, `${w} × ${h_}`));
}
function customRow(label, on) {
  const wI = h('input', { class: 'num', type: 'number', value: 1080, min: 16, max: 8000, style: 'width:90px' }), hI = h('input', { class: 'num', type: 'number', value: 1080, min: 16, max: 8000, style: 'width:90px' });
  return h('div', { class: 'custom' }, h('span', { class: 'muted' }, 'Custom'), wI, h('span', { class: 'muted' }, '×'), hI, h('span', { class: 'muted' }, 'px'),
    h('button', { class: 'btn acc', onclick: () => on(clamp(+wI.value, 16, 8000), clamp(+hI.value, 16, 8000)) }, label));
}
async function openHome() {
  let docs = []; try { docs = (await DB.all()).sort((a, b) => b.updated - a.updated); } catch {}
  const sizes = h('div', { class: 'sizes' }, SIZES.map(([n, w, hh]) => sizeCard(n, w, hh, () => newDoc(n, w, hh))));
  const kids = [h('div', { class: 'row', style: 'justify-content:space-between;margin:0' }, h('h2', { style: 'margin:0' }, 'Create a design'),
    S.doc ? h('button', { class: 'tb icon', onclick: closeModal }, ico('close')) : null), h('div', { style: 'height:12px' }), sizes, customRow('Create', (w, hh) => newDoc('Custom design', w, hh))];
  if (docs.length) {
    kids.push(h('h3', {}, 'Your designs'));
    kids.push(h('div', { class: 'docs' }, docs.map(d => h('div', { class: 'doc', onclick: () => { if (S.doc) saveNow(); openDoc(d); closeModal(); } },
      h('div', { class: 'th', style: `background-image:url(${d.thumb || d.pages?.[0]?.thumb || ''})` }),
      h('div', { class: 'meta' }, h('b', {}, d.name), h('span', { class: 'muted small' }, `${d.w}×${d.h} · ${d.pages.length} page${d.pages.length > 1 ? 's' : ''} · ${new Date(d.updated).toLocaleDateString()}`)),
      h('button', { class: 'x', title: 'Delete design', onclick: async e => { e.stopPropagation(); if (!confirm(`Delete "${d.name}"? This can't be undone.`)) return; await DB.del(d.id); if (S.doc?.id === d.id) { S.doc = null; } openHome(); } }, ico('trash'))))));
  }
  modal(kids);
}
function resizeDoc(doc, nw, nh) {
  const s = Math.min(nw / doc.w, nh / doc.h), ox = (nw - doc.w * s) / 2, oy = (nh - doc.h * s) / 2;
  doc.pages.forEach(p => {
    const j = JSON.parse(p.json);
    j.objects.forEach(o => { if (o.isBg) Object.assign(o, { left: 0, top: 0, width: nw, height: nh, scaleX: 1, scaleY: 1 }); else Object.assign(o, { left: o.left * s + ox, top: o.top * s + oy, scaleX: o.scaleX * s, scaleY: o.scaleY * s }); });
    p.json = JSON.stringify(j); p.thumb = '';
  });
  doc.w = nw; doc.h = nh;
}
function openResize() {
  const go = (w, hh, copyIt) => {
    cur().json = snap();
    let d = S.doc;
    if (copyIt) { d = JSON.parse(JSON.stringify(S.doc)); d.id = uid(); d.name = S.doc.name + ` (${w}×${hh})`; d.pages.forEach(p => p.id = uid()); }
    resizeDoc(d, w, hh); closeModal(); openDoc(d); saveNow(); toast(`Resized to ${w} × ${hh}`);
  };
  let copyIt = false;
  const chk = h('label', { class: 'chk', style: 'margin-bottom:12px' }, h('input', { type: 'checkbox', onchange: e => copyIt = e.target.checked }), 'Keep the original (resize a copy)');
  modal([h('h2', {}, 'Resize design'), chk, h('div', { class: 'sizes' }, SIZES.map(([n, w, hh]) => sizeCard(n, w, hh, () => go(w, hh, copyIt)))), customRow('Resize', (w, hh) => go(w, hh, copyIt)),
    h('div', { class: 'foot' }, h('button', { class: 'btn', onclick: closeModal }, 'Cancel'))]);
}

/* ---------------- export ---------------- */
async function renderOff(json, transparent) {
  try { await Promise.all([...fontsIn(JSON.parse(json).objects)].map(ensureFont)); } catch {}
  return new Promise(res => {
    const sc = new fabric.StaticCanvas(null, { width: W(), height: H(), enableRetinaScaling: false, renderOnAddRemove: false });
    sc.loadFromJSON(json, () => {
      const bg = getBg(sc); if (bg && transparent) bg.visible = false;
      walk(sc.getObjects(), o => { if (o.fontFamily && o.initDimensions) o.initDimensions(); });
      sc.renderAll(); res(sc);
    });
  });
}
function download(name, blobOrUrl) { const a = h('a', { download: name, href: typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl) }); document.body.append(a); a.click(); a.remove(); }
const safeName = () => (S.doc.name || 'design').replace(/[\\/:*?"<>|]+/g, '').trim() || 'design';
function openExport() {
  const st = Object.assign({ fmt: 'png', scale: 2, transparent: false, all: S.doc.pages.length > 1 }, S.exp || {}); S.exp = st;
  const body = h('div');
  const draw = () => {
    body.innerHTML = '';
    body.append(h('h2', {}, 'Download'),
      row('Format', segBtns([['png', 'PNG', st.fmt === 'png'], ['jpg', 'JPG', st.fmt === 'jpg'], ['pdf', 'PDF', st.fmt === 'pdf'], ['svg', 'SVG', st.fmt === 'svg'], ['nova', 'Project', st.fmt === 'nova']], v => { st.fmt = v; draw(); })));
    if (st.fmt !== 'svg' && st.fmt !== 'nova') body.append(row('Quality', segBtns([[1, '1×', st.scale === 1], [2, '2×', st.scale === 2], [3, '3×', st.scale === 3], [4, '4×', st.scale === 4]], v => { st.scale = v; draw(); })),
      h('div', { class: 'note', style: 'margin:-2px 0 8px 82px' }, `${W() * st.scale} × ${H() * st.scale} px`));
    if (st.fmt === 'png' || st.fmt === 'svg') body.append(row('', h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: st.transparent, onchange: e => st.transparent = e.target.checked }), 'Transparent background')));
    if (S.doc.pages.length > 1 && st.fmt !== 'nova') body.append(row('Pages', segBtns([[false, 'This page', !st.all], [true, `All ${S.doc.pages.length}`, st.all]], v => { st.all = v; draw(); })));
    body.append(h('div', { class: 'foot' }, h('button', { class: 'btn', onclick: closeModal }, 'Cancel'), h('button', { class: 'btn acc', onclick: () => doExport(st) }, ico('download'), 'Download')));
  };
  draw(); modal(body, true);
}
async function doExport(st) {
  closeModal(); cur().json = snap();
  if (st.fmt === 'nova') return saveFile();
  toast('Preparing download…', 4000);
  const idx = st.all ? S.doc.pages.map((_, i) => i) : [S.page];
  const base = safeName();
  try {
    if (st.fmt === 'pdf') {
      const { jsPDF } = window.jspdf; const orient = W() > H() ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation: orient, unit: 'px', format: [W(), H()], hotfixes: ['px_scaling'], compress: true });
      for (let n = 0; n < idx.length; n++) {
        const sc = await renderOff(S.doc.pages[idx[n]].json, false);
        const c = sc.toCanvasElement(st.scale);
        if (n) pdf.addPage([W(), H()], orient);
        pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, W(), H(), undefined, 'FAST'); sc.dispose();
      }
      pdf.save(base + '.pdf');
    } else {
      for (const i of idx) {
        const sc = await renderOff(S.doc.pages[i].json, st.transparent && st.fmt !== 'jpg');
        const suffix = idx.length > 1 ? `-${i + 1}` : '';
        if (st.fmt === 'svg') download(`${base}${suffix}.svg`, new Blob([sc.toSVG()], { type: 'image/svg+xml' }));
        else {
          const c = sc.toCanvasElement(st.scale);
          const blob = await new Promise(r => c.toBlob(r, st.fmt === 'jpg' ? 'image/jpeg' : 'image/png', 0.95));
          download(`${base}${suffix}.${st.fmt}`, blob);
        }
        sc.dispose(); await new Promise(r => setTimeout(r, 250));
      }
    }
    toast('Downloaded ✓');
  } catch (e) { console.error(e); toast('Export failed: ' + (e.message || e)); }
}
function saveFile() { cur().json = snap(); download(safeName() + '.nova', new Blob([JSON.stringify({ app: 'nova-studio', v: 1, doc: S.doc })], { type: 'application/json' })); toast('Project file saved'); }
async function openProjectFile(f) {
  try {
    const j = JSON.parse(await readFile(f, 'readAsText')); const d = j.doc || j;
    if (!d || !Array.isArray(d.pages) || !d.w || !d.h) throw new Error('Not a Nova Studio file');
    d.id = uid(); d.updated = Date.now(); d.pages.forEach(p => { p.id = uid(); if (typeof p.json !== 'string') p.json = JSON.stringify(p.json); });
    if (S.doc) await saveNow();
    openDoc(d); saveNow(); closeModal(); toast('Opened ' + d.name);
  } catch (e) { toast('Could not open: ' + e.message); }
}

/* ---------------- command palette ---------------- */
function paletteActions() {
  const a = canvas.getActiveObject(), img = isImg(a) ? a : null;
  const go = tab => () => { $('#panel').classList.remove('closed'); S.tab = tab; $$('.rb').forEach(b => b.classList.toggle('on', b.dataset.k === tab)); renderPanel(); };
  const acts = [
    ['Magic layers', 'magic', img && (() => Magic.openMagic(img))], ['Remove background', 'scissors', img && (() => Magic.removeBackground(img))],
    ['Magic eraser', 'eraser', img && (() => Magic.openMagic(img, 'erase'))], ['Split into pieces', 'magic', img && (() => Magic.splitPieces(img))],
    ['Add heading', 'text', () => addText('Add a heading', { fontSize: B() * 0.1, fontWeight: 'bold', fontFamily: 'Poppins' })], ['Add text', 'text', () => addText('Your text here')],
    ['Rectangle', 'elements', () => place(shape('rounded'))], ['Circle', 'elements', () => place(shape('circle'))], ['Star', 'elements', () => place(shape('star'))],
    ['Templates', 'templates', go('templates')], ['Photos', 'photos', go('photos')], ['Backdrops', 'backgrounds', go('backgrounds')], ['Icons', 'icons', go('icons')], ['Layers', 'layers', go('layers')],
    ['Upload images', 'uploads', () => $('#fileImg').click()], ['Download', 'download', openExport], ['Resize design', 'templates', openResize], ['New design', 'plus', openHome],
    ['Undo', 'undo', undo], ['Redo', 'redo', redo], ['Duplicate', 'copy', duplicate], ['Delete', 'trash', del], ['Zoom to fit', 'plus', fit],
  ];
  Object.keys(STOCK_SETS).forEach(n => acts.push([n + ' photos', 'photos', () => { S.photoSet = n; S.photoQ = ''; go('photos')(); }]));
  return acts.filter(x => x[2]);
}
function openPalette() {
  const inp = h('input', { class: 'search pal-in', placeholder: 'Type a command…' });
  const list = h('div', { class: 'pal-list' });
  let items = [], idx = 0;
  const draw = () => {
    const q = inp.value.toLowerCase().trim();
    items = paletteActions().filter(([n]) => !q || q.split(/\s+/).every(w => n.toLowerCase().includes(w)));
    idx = Math.min(idx, Math.max(0, items.length - 1)); list.innerHTML = '';
    items.forEach(([n, i, fn], k) => list.append(h('button', { class: 'pal-item' + (k === idx ? ' on' : ''), onmouseenter: () => { idx = k; $$('.pal-item', list).forEach((b, j) => b.classList.toggle('on', j === k)); }, onclick: () => { closeModal(); fn(); } }, ico(i), n)));
    if (!items.length) list.append(h('div', { class: 'empty' }, 'No match'));
    const on = $('.pal-item.on', list); if (on) on.scrollIntoView({ block: 'nearest' });
  };
  inp.oninput = () => { idx = 0; draw(); };
  inp.onkeydown = e => {
    if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); draw(); e.preventDefault(); }
    else if (e.key === 'Enter' && items[idx]) { closeModal(); items[idx][2](); }
    else if (e.key === 'Escape') closeModal();
  };
  draw(); modal([h('div', { class: 'pal' }, h('div', { class: 'searchwrap' }, ico('cmd'), inp), list)], true);
  $('#sheet').classList.add('palette'); setTimeout(() => inp.focus(), 30);
}

/* ---------------- wire up ---------------- */
$$('[data-i]').forEach(b => b.prepend(ico(b.dataset.i)));
$('#homeBtn').onclick = openHome; $('#newBtn').onclick = openHome; $('#resizeBtn').onclick = openResize;
$('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
$('#zoomIn').onclick = () => setZoom(S.zoom * 1.2); $('#zoomOut').onclick = () => setZoom(S.zoom / 1.2); $('#zoomVal').onclick = fit;
$('#exportBtn').onclick = openExport; $('#cmdBtn').onclick = openPalette;
$('#magicBtn').onclick = () => { const a = canvas.getActiveObject(); if (isImg(a)) Magic.openMagic(a); else { $('#panel').classList.remove('closed'); S.tab = 'magic'; $$('.rb').forEach(b => b.classList.toggle('on', b.dataset.k === 'magic')); renderPanel(); } }; $('#saveBtn').onclick = saveFile; $('#openBtn').onclick = () => $('#fileProj').click();
$('#fileImg').onchange = e => { addFiles([...e.target.files]); e.target.value = ''; };
$('#fileProj').onchange = e => { if (e.target.files[0]) openProjectFile(e.target.files[0]); e.target.value = ''; };
$('#docName').onchange = e => { S.doc.name = e.target.value.trim() || 'Untitled design'; saveSoon(); };
window.addEventListener('resize', debounce(() => { if (S.doc) fit(); }, 150));
window.addEventListener('beforeunload', () => { if (S.doc) { cur().json = snap(); saveNow(); } });

(async function boot() {
  buildRail();
  let d = null;
  try { const last = lsGet('ns_last'); if (last) d = await DB.get(last); if (!d) d = (await DB.all()).sort((a, b) => b.updated - a.updated)[0]; } catch {}
  if (d) { openDoc(d); renderPanel(); }
  else { newDoc('My first design', 1080, 1080); renderPanel(); openHome(); }
})();
