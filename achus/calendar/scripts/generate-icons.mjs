import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function roundedRect(x, y, width, height, radius, px, py) {
  const cx = Math.max(x + radius, Math.min(px, x + width - radius));
  const cy = Math.max(y + radius, Math.min(py, y + height - radius));
  return (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2;
}

function makeIcon(size, path) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 64;
  const set = (x, y, color) => {
    const offset = (y * size + x) * 4;
    pixels.set(color, offset);
  };
  const bgA = [255, 210, 163, 255];
  const bgB = [231, 127, 107, 255];
  const paper = [255, 247, 237, 255];
  const ink = [75, 41, 40, 255];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const mix = (x + y) / (size * 2);
      const background = bgA.map((value, index) => index === 3 ? 255 : Math.round(value * (1 - mix) + bgB[index] * mix));
      const sx = x / scale;
      const sy = y / scale;
      let color = background;
      if (roundedRect(13, 16, 38, 35, 7, sx, sy)) color = paper;
      if ((sy >= 24.6 && sy <= 27.4 && sx >= 13 && sx <= 51) ||
          (sx >= 20.5 && sx <= 23.5 && sy >= 10 && sy <= 21) ||
          (sx >= 40.5 && sx <= 43.5 && sy >= 10 && sy <= 21)) color = ink;
      const border = roundedRect(11.7, 14.7, 40.6, 37.6, 8, sx, sy) && !roundedRect(14.3, 17.3, 35.4, 32.4, 5.6, sx, sy);
      if (border) color = ink;
      const cells = [[22, 34], [31, 34], [40, 34], [22, 42], [31, 42]];
      if (cells.some(([cx, cy]) => sx >= cx && sx <= cx + 5 && sy >= cy && sy <= cy + 5)) color = ink;
      set(x, y, color);
    }
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
}

makeIcon(192, new URL("../assets/icons/icon-192.png", import.meta.url));
makeIcon(512, new URL("../assets/icons/icon-512.png", import.meta.url));
makeIcon(512, new URL("../assets/icons/maskable-512.png", import.meta.url));
