# Nova Studio

A free, offline-first design editor that runs in your browser. No account, no watermarks, no paywalled features.

**Use it online:** https://unorfl.github.io/nova-studio/

**Run it locally:** double-click `Start Nova Studio.bat` (needs Python), or serve this folder with any static server.

## Magic (runs on your device, free)
- **Magic layers**: turn one flat photo into movable layers. It finds people, animals and objects, reads text on the photo, cuts each into its own layer, and fills the hole it leaves behind. Click anything else in the photo to select it too.
- **Remove background**: one-click subject cutout.
- **Magic eraser**: paint over something (or click it) and it disappears.
- **Split pieces**: break a text cutout or sticker into individual letters or pieces.

Models download once and are cached by your browser (selection ~14 MB, detector ~43 MB, cutout ~44 MB, text reader ~10 MB). Nothing is uploaded.
Uses transformers.js with SlimSAM, DETR (ResNet-50) and BRIA RMBG-1.4 (non-commercial licence), plus tesseract.js. The content-aware fill is our own PatchMatch implementation (`inpaint-worker.js`).

## What's in it
- 300+ hand-picked high-res photos in 17 aesthetic collections (Unsplash via Lorem Picsum), plus free stock search (StockSnap, WordPress Photo Directory, nappy via Openverse)
- Generated backdrops: mesh, aurora, waves and grain gradients in 16 palettes
- Command palette (Ctrl+K)
- 14 size presets plus custom sizes, multi-page designs, and one-click resize of a whole design
- 16 original templates, 17 shapes, lines and arrows, gradients, 42 Google Fonts, text effects (shadow, lift, neon, hollow, outline, echo, highlight)
- Free photo search (Openverse CC images + Lorem Picsum) and 200,000+ open-source icons (Iconify)
- Image filters, adjustments, crop, frame masks (circle, arch, star, heart…), color-key background remover
- Freehand drawing, QR codes, layers panel with drag reorder, lock and hide, grouping, align and distribute
- Snapping guides, rotation snapping, undo/redo, right-click menu, keyboard shortcuts, paste and drag-drop images
- Export PNG (incl. transparent), JPG, multi-page PDF, SVG, up to 4x; save and open `.nova` project files
- Autosaves every design in your browser (IndexedDB)

Built on Fabric.js (MIT), jsPDF (MIT) and qrcode-generator (MIT); copies live in `lib/`.
