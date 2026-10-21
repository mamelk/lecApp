// Generates the PWA icons in public/icons/ without any dependency.
// Design: the actual lecApp logo — the dark shield (écu) with its amber
// outline, amber cross, gradient inner detail and slate flame curves —
// placed on the dark rounded square (full square for the maskable variant).
// Usage: node scripts/generate-pwa-icons.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';

const OUT_DIR = path.resolve('public/icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BG = [11, 17, 32]; // #0B1120
const AMBER = [245, 158, 11]; // #f59e0b
const BLUE = [59, 130, 246]; // #3b82f6 (bottom of the shield gradient)
const SLATE = [148, 163, 184]; // #94a3b8 (flame curves)

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

/* ---------- Geometry helpers ---------- */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const sdSegment = (px, py, ax, ay, bx, by) => {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const len2 = bax * bax + bay * bay;
  if (len2 === 0) return Math.hypot(pax, pay); // degenerate segment (0/0 → NaN)
  const h = clamp((pax * bax + pay * bay) / len2, 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h);
};
const sdRoundedRect = (px, py, halfW, halfH, r) => {
  const qx = Math.abs(px) - (halfW - r);
  const qy = Math.abs(py) - (halfH - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

/** Cubic Bézier point at t. */
const cubicAt = (p0, c1, c2, p1, t) => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0],
    u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1],
  ];
};

/** Flatten a chain of cubic segments [[p0,c1,c2,p1], ...] into a polyline. */
const flattenCubics = (chain, perCurve = 28) => {
  const pts = [];
  for (const [p0, c1, c2, p1] of chain) {
    const start = pts.length ? 1 : 0; // skip duplicated join points
    for (let i = start; i <= perCurve; i++) {
      pts.push(cubicAt(p0, c1, c2, p1, i / perCurve));
    }
  }
  return pts;
};

/** Non-zero winding point-in-polygon test. */
const pointInPoly = (x, y, poly) => {
  let wn = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi <= y) {
      if (yj > y && (xj - xi) * (y - yi) - (x - xi) * (yj - yi) > 0) wn++;
    } else if (yj <= y && (xj - xi) * (y - yi) - (x - xi) * (yj - yi) < 0) {
      wn--;
    }
  }
  return wn !== 0;
};

/** Distance from a point to a polyline (0 inside the segments' capsules). */
const distToPoly = (x, y, poly) => {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    d = Math.min(d, sdSegment(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  }
  return d;
};

const over = (base, layerColor, alpha) => {
  const a = alpha + base[3] * (1 - alpha);
  if (a <= 0) return [0, 0, 0, 0];
  const mix = (c, bc) => (c * alpha + bc * base[3] * (1 - alpha)) / a;
  return [mix(layerColor[0], base[0]), mix(layerColor[1], base[1]), mix(layerColor[2], base[2]), a];
};

/* ---------- The lecApp shield logo, in its 100-unit design space ----------
   Same paths as the <Logo> component in src/App.tsx. */

const SHIELD_OUTER = [
  [[50, 5], [50, 5], [15, 15], [15, 45]],
  [[15, 45], [15, 75], [50, 95], [50, 95]],
  [[50, 95], [50, 95], [85, 75], [85, 45]],
  [[85, 45], [85, 15], [50, 5], [50, 5]],
];
const SHIELD_INNER = [
  [[50, 12], [50, 12], [22, 20], [22, 45]],
  [[22, 45], [22, 70], [50, 88], [50, 88]],
  [[50, 88], [50, 88], [78, 70], [78, 45]],
  [[78, 45], [78, 20], [50, 12], [50, 12]],
];
const FLAME_LEFT = [[[50, 15], [40, 30], [35, 50], [50, 85]]];
const FLAME_RIGHT = [[[50, 15], [60, 30], [65, 50], [50, 85]]];

/* ---------- Rendering ---------- */

const renderIcon = (size, { maskable = false } = {}) => {
  const rgba = new Uint8Array(size * size * 4);
  const SS = 3; // supersampling for smooth edges
  const cx = size / 2;
  const cy = size / 2;
  // Logo-space (100 units tall) → icon space. Maskable keeps the whole
  // shield inside the central 80% safe zone.
  const sc = (size * (maskable ? 0.7 : 0.76)) / 100;
  const boost = size < 96 ? 1.5 : 1; // small sizes need thicker strokes
  const L = (x, y) => [(x - 50) * sc + cx, (y - 50) * sc + cy];
  const toPoly = (chain) => flattenCubics(chain).map(([x, y]) => L(x, y));

  const outerPoly = toPoly(SHIELD_OUTER);
  const innerPoly = toPoly(SHIELD_INNER);
  const flameLeft = toPoly(FLAME_LEFT);
  const flameRight = toPoly(FLAME_RIGHT);
  const [crossTopX, crossTopY] = L(50, 25);
  const [crossBotX, crossBotY] = L(50, 75);
  const [crossLeftX, crossBarY] = L(35, 45);
  const [crossRightX] = L(65, 45);
  const [glowX, glowY] = L(50, 45);
  const glowR = 15 * sc;

  const outerStroke = 2 * sc * boost; // px
  const crossHalf = (4 * sc * boost) / 2;
  const flameHalf = (2 * sc * boost) / 2;
  const shieldTopY = L(0, 5)[1];
  const shieldBotY = L(0, 95)[1];

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

    // soft amber glow behind the shield
    const r = Math.hypot(px - cx, py - cy) / (size * 0.45);
    pixel = over(pixel, AMBER, 0.12 * Math.exp(-r * r));

    // amber outline of the shield tile (non-maskable only)
    if (!maskable) {
      const d = sdRoundedRect(px - cx, py - cy, size / 2, size / 2, corner) + ringInset;
      const ring = 1 - smoothstep(ringHalf - 0.5, ringHalf + 0.5, Math.abs(d));
      pixel = over(pixel, AMBER, ring * 0.8);
    }

    // shield base fill + inner amber→blue gradient (opacity 0.2, as in-app)
    if (pointInPoly(px, py, outerPoly)) {
      pixel = over(pixel, BG, 1);
      if (pointInPoly(px, py, innerPoly)) {
        const t = clamp((py - shieldTopY) / (shieldBotY - shieldTopY), 0, 1);
        const grad = AMBER.map((c, i) => c + (BLUE[i] - c) * t);
        pixel = over(pixel, grad, 0.2);
      }
    }

    // shield outline
    const dOuter = distToPoly(px, py, outerPoly);
    pixel = over(pixel, AMBER, 1 - smoothstep(outerStroke / 2 - 0.6, outerStroke / 2 + 0.6, dOuter));

    // cross (round caps, as in-app)
    const cross = Math.min(
      sdSegment(px, py, crossTopX, crossTopY, crossBotX, crossBotY),
      sdSegment(px, py, crossLeftX, crossBarY, crossRightX, crossBarY),
    );
    pixel = over(pixel, AMBER, 1 - smoothstep(crossHalf - 0.6, crossHalf + 0.6, cross));

    // flame curves
    const flame = Math.min(distToPoly(px, py, flameLeft), distToPoly(px, py, flameRight));
    pixel = over(pixel, SLATE, 0.6 * (1 - smoothstep(flameHalf - 0.6, flameHalf + 0.6, flame)));

    // subtle glow circle at the cross centre (topmost, as in-app)
    const dGlow = Math.hypot(px - glowX, py - glowY);
    pixel = over(pixel, AMBER, 0.1 * (1 - smoothstep(glowR * 0.85, glowR, dGlow)));

    return pixel;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Premultiplied accumulation: colours weighted by coverage so edge
      // samples (which are transparent black) don't darken the outline.
      let accR = 0, accG = 0, accB = 0, accA = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [r, g, b, a] = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
          accR += r * a; accG += g * a; accB += b * a; accA += a;
        }
      }
      const n = SS * SS;
      const meanA = accA / n; // coverage in 0..1
      const i = (y * size + x) * 4;
      if (meanA <= 0) {
        rgba[i] = 0; rgba[i + 1] = 0; rgba[i + 2] = 0; rgba[i + 3] = 0;
        continue;
      }
      rgba[i] = Math.round(accR / accA);
      rgba[i + 1] = Math.round(accG / accA);
      rgba[i + 2] = Math.round(accB / accA);
      rgba[i + 3] = Math.round(meanA * 255); // 0..1 → 0..255
    }
  }
  return encodePng(size, size, rgba);
};

/* ---------- ICO wrapper (PNG payload, supported since Vista) ---------- */

const encodeIco = (png) => {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry[0] = 32; // width
  entry[1] = 32; // height
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12); // offset = header(6) + entry(16)
  return Buffer.concat([header, entry, png]);
};

/* ---------- SVG icon (vector fallback: never blurry, never blank) ---------- */

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shield-grad" x1="50" y1="5" x2="50" y2="95" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="#0B1120"/>
  <circle cx="256" cy="256" r="230" fill="url(#glow)"/>
  <rect x="28" y="28" width="456" height="456" rx="84" fill="none" stroke="#f59e0b" stroke-width="10" opacity="0.8"/>
  <g transform="translate(256 256) scale(3.9) translate(-50 -50)">
    <path d="M50 5C50 5 15 15 15 45C15 75 50 95 50 95C50 95 85 75 85 45C85 15 50 5 50 5Z" fill="#0B1120" stroke="#f59e0b" stroke-width="2"/>
    <path d="M50 12C50 12 22 20 22 45C22 70 50 88 50 88C50 88 78 70 78 45C78 20 50 12 50 12Z" fill="url(#shield-grad)" fill-opacity="0.2"/>
    <path d="M50 25V75M35 45H65" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 15C40 30 35 50 50 85" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <path d="M50 15C60 30 65 50 50 85" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
    <circle cx="50" cy="45" r="15" fill="#f59e0b" fill-opacity="0.1"/>
  </g>
</svg>
`;

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

fs.writeFileSync(path.join(OUT_DIR, 'icon.svg'), svgIcon);
console.log('icon.svg: écrit');

const ico = encodeIco(renderIcon(32));
fs.writeFileSync(path.join(path.resolve('public'), 'favicon.ico'), ico);
console.log(`favicon.ico: ${ico.length} octets`);
