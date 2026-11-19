// Vygeneruje ikony appky (PNG + SVG) bez externých knižníc: biely opasok s červenou páskou a 2 stripes.
// Spustenie: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const INK = [0x0e, 0x12, 0x20];
const COTTON = [0xee, 0xe9, 0xdd];
const RED = [0xe0, 0x39, 0x3e];

// geometria v jednotkách 0..1 (rovnaké proporcie ako .brand-mark v CSS)
const BAND = { x0: 0.14, x1: 0.86, y0: 0.39, y1: 0.61 };
const BAR = { x0: 0.5, x1: 0.754 };
const STRIPES = [
  [0.556, 0.5965],
  [0.657, 0.698],
];

function colorAt(x, y, rounded) {
  if (rounded && !inRoundedRect(x, y, 0.2)) return null;
  if (y >= BAND.y0 && y <= BAND.y1 && x >= BAND.x0 && x <= BAND.x1) {
    if (x >= BAR.x0 && x <= BAR.x1) return STRIPES.some(([a, b]) => x >= a && x <= b) ? COTTON : RED;
    return COTTON;
  }
  return INK;
}

function inRoundedRect(x, y, r) {
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function render(size, rounded) {
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let i = 0; i < SS; i++) {
        for (let j = 0; j < SS; j++) {
          const c = colorAt((pxi + (i + 0.5) / SS) / size, (py + (j + 0.5) / SS) / size, rounded);
          if (!c) continue;
          r += c[0];
          g += c[1];
          b += c[2];
          a += 1;
        }
      }
      const o = (py * size + pxi) * 4;
      if (a) {
        px[o] = Math.round(r / a);
        px[o + 1] = Math.round(g / a);
        px[o + 2] = Math.round(b / a);
      }
      px[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
  return png(size, size, px);
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const u = (v) => +(v * 64).toFixed(2);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="13" fill="${hex(INK)}"/>
  <rect x="${u(BAND.x0)}" y="${u(BAND.y0)}" width="${u(BAND.x1 - BAND.x0)}" height="${u(BAND.y1 - BAND.y0)}" fill="${hex(COTTON)}"/>
  <rect x="${u(BAR.x0)}" y="${u(BAND.y0)}" width="${u(BAR.x1 - BAR.x0)}" height="${u(BAND.y1 - BAND.y0)}" fill="${hex(RED)}"/>
${STRIPES.map(([a, b]) => `  <rect x="${u(a)}" y="${u(BAND.y0)}" width="${u(b - a)}" height="${u(BAND.y1 - BAND.y0)}" fill="${hex(COTTON)}"/>`).join('\n')}
</svg>
`;

const out = {
  'icons/icon-192.png': render(192, true),
  'icons/icon-512.png': render(512, true),
  'icons/maskable-512.png': render(512, false),
  'apple-touch-icon.png': render(180, false),
  'favicon.svg': svg,
};
for (const [name, data] of Object.entries(out)) {
  const p = join(root, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, data);
  console.log('✓', name, typeof data === 'string' ? `${data.length} B` : `${data.length} B`);
}
