/**
 * Generates a 256x256 purple PNG icon for tvchat-ai.
 * Uses only Node.js built-ins (zlib for deflate, crypto for nothing — just fs + zlib).
 * No external dependencies required.
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const WIDTH  = 256;
const HEIGHT = 256;

// tvchat-ai accent purple: #a855f7
const R = 168, G = 85, B = 247;

// ─── CRC32 ────────────────────────────────────────────────────────────────────

function buildCRCTable() {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
}

const CRC_TABLE = buildCRCTable();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── PNG chunk builder ────────────────────────────────────────────────────────

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.alloc(4);
  const crcBuf    = Buffer.alloc(4);

  lenBuf.writeUInt32BE(data.length, 0);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);

  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ─── Build image data ────────────────────────────────────────────────────────

// Each scanline: 1 filter byte (0 = None) + WIDTH * 3 RGB bytes
const scanlineLen = 1 + WIDTH * 3;
const raw         = Buffer.alloc(HEIGHT * scanlineLen);

for (let y = 0; y < HEIGHT; y++) {
  const base = y * scanlineLen;
  raw[base] = 0; // filter: None
  for (let x = 0; x < WIDTH; x++) {
    const off = base + 1 + x * 3;
    raw[off]     = R;
    raw[off + 1] = G;
    raw[off + 2] = B;
  }
}

// ─── Assemble PNG ─────────────────────────────────────────────────────────────

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(WIDTH,  0);
ihdrData.writeUInt32BE(HEIGHT, 4);
ihdrData.writeUInt8(8, 8);  // bit depth: 8
ihdrData.writeUInt8(2, 9);  // color type: 2 = truecolor RGB
ihdrData.writeUInt8(0, 10); // compression: deflate
ihdrData.writeUInt8(0, 11); // filter method: adaptive
ihdrData.writeUInt8(0, 12); // interlace: none

const compressed = zlib.deflateSync(raw, { level: 6 });

const png = Buffer.concat([
  PNG_SIG,
  chunk('IHDR', ihdrData),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

// ─── Write outputs ────────────────────────────────────────────────────────────

const root    = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'packages', 'tv-app', 'tizen', 'icon.png'),
  path.join(root, 'packages', 'tv-app', 'public', 'icon.png'),
];

targets.forEach(function(dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, png);
  console.log('wrote ' + dest + ' (' + png.length + ' bytes)');
});
