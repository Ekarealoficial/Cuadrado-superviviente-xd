'use strict';
/* =============== MUNDO PROCEDURAL =============== */
function hash2D(x, y) {
  let h = ((x | 0) * 374761393 + (y | 0) * 668265263) | 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}
function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function getChunk(cx, cy) {
  const key = cx + ',' + cy;
  let c = chunkCache.get(key);
  if (c) return c;
  const rng = makeRng(hash2D(cx, cy));
  const isSpawn = (cx === 0 && cy === 0);
  const walls = [];
  if (!isSpawn) {
    const roll = rng();
    const n = roll < 0.4 ? 0 : (roll < 0.75 ? 1 : (roll < 0.92 ? 2 : 3));
    const margin = 90;
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const w = 70 + rng() * 180;
      const h = 70 + rng() * 180;
      const x = cx * CHUNK_SIZE + rng() * (CHUNK_SIZE - w);
      const y = cy * CHUNK_SIZE + rng() * (CHUNK_SIZE - h);
      if (x < cx * CHUNK_SIZE + margin || x + w > (cx + 1) * CHUNK_SIZE - margin) continue;
      if (y < cy * CHUNK_SIZE + margin || y + h > (cy + 1) * CHUNK_SIZE - margin) continue;
      let overlaps = false;
      for (const ow of walls) {
        if (x < ow.x + ow.w + 40 && x + w > ow.x - 40 && y < ow.y + ow.h + 40 && y + h > ow.y - 40) { overlaps = true; break; }
      }
      if (overlaps) continue;
      walls.push({ x, y, w, h });
      i++;
    }
  }
  c = { walls };
  chunkCache.set(key, c);
  return c;
}
function getVisibleChunks(cam) {
  const visW = W / cam.zoom, visH = H / cam.zoom;
  const margin = 150;
  const l = cam.x - visW/2 - margin, r = cam.x + visW/2 + margin;
  const t = cam.y - visH/2 - margin, b = cam.y + visH/2 + margin;
  const cxMin = Math.floor(l / CHUNK_SIZE), cxMax = Math.floor(r / CHUNK_SIZE);
  const cyMin = Math.floor(t / CHUNK_SIZE), cyMax = Math.floor(b / CHUNK_SIZE);
  const walls = [];
  for (let row=0;row<=cyMax-cyMin;row++)
    for (let col=0;col<=cxMax-cxMin;col++) {
      const c = getChunk(cxMin+col, cyMin+row);
      for (const w of c.walls) walls.push(w);
    }
  return walls;
}

