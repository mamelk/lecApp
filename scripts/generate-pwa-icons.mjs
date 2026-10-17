// Generates the PWA icons in public/icons/ without any dependency.
// Design: dark rounded square, amber ring, amber cross on a soft glow —
// the shield/cross identity of the lecApp logo, flattened for small sizes.
// Usage: node scripts/generate-pwa-icons.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const OUT_DIR = path.resolve('public/icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BG = [11, 17, 32]; // #0B1120
const AMBER = [245, 158, 11]; // #f59e0b

/* ---------- PNG encoder (8-bit RGBA, no dependencies) ---------- */

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const encodePng = (width, height, rgba) => {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter type 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * stride + 1);
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const body = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([body, data])), 0);
    return Buffer.concat([length, body, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/* ---------- SDF helpers ---------- */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const sdSegment = (px, py, ax, ay, bx, by) => {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h);
};
const sdRoundedRect = (px, py, halfW, halfH, r) => {
  const qx = Math.abs(px) - (halfW - r);
  const qy = Math.abs(py) - (halfH - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

const over = (base, layerColor, alpha) => {
  const a = alpha + base[3] * (1 - alpha);
  if (a <= 0) return [0, 0, 0, 0];
  const mix = (c, bc) => (c * alpha + bc * base[3] * (1 - alpha)) / a;
  return [mix(layerColor[0], base[0]), mix(layerColor[1], base[1]), mix(layerColor[2], base[2]), a];
};

/* ---------- Rendering ---------- */

const renderIcon = (size, { maskable = false } = {}) => {
  const rgba = new Uint8Array(size * size * 4);
  const SS = 3; // supersampling for smooth edges
  const cx = size / 2;
  const cy = size / 2;
  const arm = size * (maskable ? 0.19 : 0.235); // half length of the cross arms
  const thick = (size * (maskable ? 0.085 : 0.1)) / 2; // half thickness
  const corner = size * 0.22;
  const ringInset = size * 0.055;
  const ringHalf = size * 0.012;

  const sample = (px, py) => {
    let pixel = [0, 0, 0, 0];
    if (!maskable) {
      const d = sdRoundedRect(px - cx, py - cy, size / 2, size / 2, corner);
      const cover = 1 - smoothstep(-0.75, 0.75, d);
      if (cover <= 0) return pixel;
      pixel = [BG[0], BG[1], BG[2], cover];
    } else {
      pixel = [BG[0], BG[1], BG[2], 1];
    }

    // soft amber glow behind the cross
    const r = Math.hypot(px - cx, py - cy) / (size * 0.45);
    const glow = 0.3 * Math.exp(-r * r);
    pixel = over(pixel, AMBER, glow);

    // amber outline (non-maskable only)
    if (!maskable) {
      const d = sdRoundedRect(px - cx, py - cy, size / 2, size / 2, corner) + ringInset;
      const ring = 1 - smoothstep(ringHalf - 0.5, ringHalf + 0.5, Math.abs(d));
      pixel = over(pixel, AMBER, ring);
    }

    // the cross
    const d1 = sdSegment(px, py, cx, cy - arm, cx, cy + arm);
    const d2 = sdSegment(px, py, cx - arm, cy, cx + arm, cy);
    const cross = 1 - smoothstep(thick - 0.6, thick + 0.6, Math.min(d1, d2));
    pixel = over(pixel, AMBER, cross);

    return pixel;
  };

  const perRow = size * SS * 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let accR = 0, accG = 0, accB = 0, accA = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [r, g, b, a] = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
          accR += r; accG += g; accB += b; accA += a;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(accR / n);
      rgba[i + 1] = Math.round(accG / n);
      rgba[i + 2] = Math.round(accB / n);
      rgba[i + 3] = Math.round(accA / n);
    }
  }
  return encodePng(size, size, rgba);
};

/* ---------- Write files ---------- */

const targets = [
  ['icon-180.png', renderIcon(180)],
  ['icon-192.png', renderIcon(192)],
  ['icon-512.png', renderIcon(512)],
  ['icon-512-maskable.png', renderIcon(512, { maskable: true })],
];

for (const [name, buffer] of targets) {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, buffer);
  console.log(`${name}: ${buffer.length} octets`);
}