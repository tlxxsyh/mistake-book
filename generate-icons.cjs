const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

function createBMPData(width, height, r, g, b) {
  const rowSize = Math.ceil((width * 24) / 32) * 4;
  const pixelDataSize = rowSize * height;
  const infoHeader = Buffer.alloc(40);
  infoHeader.writeUInt32LE(40, 0);
  infoHeader.writeInt32LE(width, 4);
  infoHeader.writeInt32LE(height * 2, 8);
  infoHeader.writeUInt16LE(1, 12);
  infoHeader.writeUInt16LE(24, 14);
  infoHeader.writeUInt32LE(pixelDataSize, 20);
  infoHeader.writeInt32LE(2835, 24);
  infoHeader.writeInt32LE(2835, 28);
  const pixelData = Buffer.alloc(pixelDataSize);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const off = y * rowSize + x * 3;
      pixelData[off] = b;
      pixelData[off + 1] = g;
      pixelData[off + 2] = r;
    }
  }
  return Buffer.concat([infoHeader, pixelData]);
}

function createBMPICO(sizes, color) {
  const n = sizes.length;
  const header = Buffer.from([0, 0, 1, 0, n & 0xff, (n >> 8) & 0xff]);
  const bmpDatas = sizes.map(s => createBMPData(s, s, color.r, color.g, color.b));
  let dataOff = 6 + n * 16;
  const parts = [header];
  for (let i = 0; i < n; i++) {
    const e = Buffer.alloc(16);
    e[0] = sizes[i] >= 256 ? 0 : sizes[i];
    e[1] = sizes[i] >= 256 ? 0 : sizes[i];
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(24, 6);
    e.writeUInt32LE(bmpDatas[i].length, 8);
    e.writeUInt32LE(dataOff, 12);
    parts.push(e);
    dataOff += bmpDatas[i].length;
  }
  return Buffer.concat([...parts, ...bmpDatas]);
}

async function main() {
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });
  const c = { r: 59, g: 130, b: 246 };
  const svg = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="rgb(${c.r},${c.g},${c.b})"/><text x="128" y="160" font-size="120" font-family="Arial" font-weight="bold" fill="white" text-anchor="middle">M</text></svg>`;
  const sb = Buffer.from(svg);
  await sharp(sb).resize(32, 32).png().toFile(path.join(iconsDir, '32x32.png'));
  await sharp(sb).resize(128, 128).png().toFile(path.join(iconsDir, '128x128.png'));
  await sharp(sb).resize(256, 256).png().toFile(path.join(iconsDir, '128x128@2x.png'));
  await sharp(sb).resize(256, 256).png().toFile(path.join(iconsDir, 'icon.icns'));
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), createBMPICO([256, 48, 32, 16], c));
  console.log('Done!');
}
main().catch(console.error);
