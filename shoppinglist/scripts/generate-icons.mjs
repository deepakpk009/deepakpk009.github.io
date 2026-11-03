import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const outputDirectory = new URL("../assets/icons/", import.meta.url);
mkdirSync(outputDirectory, { recursive: true });

const palette = {
  amber: [247, 183, 44, 255],
  cream: [255, 248, 223, 255],
  green: [60, 87, 75, 255],
  gold: [217, 154, 33, 255],
};

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    scanlines[y * (stride + 1)] = 0;
    pixels.copy(scanlines, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function generateIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const index = (Math.floor(y) * size + Math.floor(x)) * 4;
    pixels[index] = color[0];
    pixels[index + 1] = color[1];
    pixels[index + 2] = color[2];
    pixels[index + 3] = color[3];
  }

  function roundedRectangle(x, y, width, height, radius, color) {
    for (let py = Math.floor(y); py < Math.ceil(y + height); py += 1) {
      for (let px = Math.floor(x); px < Math.ceil(x + width); px += 1) {
        const closestX = Math.max(x + radius, Math.min(px, x + width - radius));
        const closestY = Math.max(y + radius, Math.min(py, y + height - radius));
        const dx = px - closestX;
        const dy = py - closestY;
        if (dx * dx + dy * dy <= radius * radius) setPixel(px, py, color);
      }
    }
  }

  function circle(cx, cy, radius, color) {
    const radiusSquared = radius * radius;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radiusSquared) setPixel(x, y, color);
      }
    }
  }

  function thickLine(x1, y1, x2, y2, thickness, color) {
    const steps = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)));
    for (let step = 0; step <= steps; step += 1) {
      const progress = steps ? step / steps : 0;
      circle(x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress, thickness / 2, color);
    }
  }

  roundedRectangle(0, 0, size, size, size * 0.24, palette.amber);
  roundedRectangle(size * 0.203, size * 0.148, size * 0.594, size * 0.704, size * 0.125, palette.cream);
  circle(size * 0.32, size * 0.36, size * 0.059, palette.green);
  thickLine(size * 0.291, size * 0.36, size * 0.314, size * 0.385, size * 0.026, palette.cream);
  thickLine(size * 0.314, size * 0.385, size * 0.363, size * 0.328, size * 0.026, palette.cream);
  thickLine(size * 0.422, size * 0.36, size * 0.672, size * 0.36, size * 0.035, palette.gold);
  thickLine(size * 0.32, size * 0.5, size * 0.672, size * 0.5, size * 0.035, palette.gold);
  thickLine(size * 0.32, size * 0.641, size * 0.672, size * 0.641, size * 0.035, palette.gold);

  return encodePng(size, size, pixels);
}

writeFileSync(new URL("icon-192.png", outputDirectory), generateIcon(192));
writeFileSync(new URL("icon-512.png", outputDirectory), generateIcon(512));
writeFileSync(new URL("maskable-512.png", outputDirectory), generateIcon(512));
