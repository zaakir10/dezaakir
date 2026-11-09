import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Helper to create a multi-size .ico file using PNG frames
function createIco(images) {
  // images: array of { width, height, buffer }
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;
  let offset = headerSize + dirEntrySize * numImages;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO format
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  const buffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset

    dirEntries.push(entry);
    buffers.push(img.buffer);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...buffers]);
}

async function run() {
  console.log('Extracting Dezaakir emblem from frontend/public/logo.png...');
  // Precise emblem coordinates
  const emblemCrop = await sharp('frontend/public/logo.png')
    .extract({ left: 407, top: 186, width: 257, height: 269 })
    .toBuffer();

  // Create high-res 512x512 icon with Navy Blue #0B1628 squircle
  // The squircle has a sleek, smooth 112px radius and a subtle 2px border (rgba(255,255,255,0.18))
  const squircleSvg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="504" height="504" rx="116" ry="116" fill="#0B1628" stroke="rgba(255, 255, 255, 0.18)" stroke-width="4" />
    </svg>
  `;

  const bg = await sharp(Buffer.from(squircleSvg)).png().toBuffer();

  // Resize emblem to comfortably fit inside the 512x512 squircle (height 310, width 296)
  const emblemTargetHeight = 310;
  const emblemTargetWidth = Math.round(emblemTargetHeight * (257 / 269));

  const resizedEmblem = await sharp(emblemCrop)
    .resize(emblemTargetWidth, emblemTargetHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  const top = Math.round((512 - emblemTargetHeight) / 2);
  const left = Math.round((512 - emblemTargetWidth) / 2);

  // Composite emblem into the exact visual center
  const master512 = await sharp(bg)
    .composite([{ input: resizedEmblem, top, left }])
    .png()
    .toBuffer();

  // Save 512x512 icons
  fs.writeFileSync('frontend/app/icon.png', master512);
  fs.writeFileSync('frontend/public/icon.png', master512);
  console.log('✓ frontend/app/icon.png & frontend/public/icon.png (512x512)');

  // 180x180 Apple Touch Icon
  const apple180 = await sharp(master512)
    .resize(180, 180, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  fs.writeFileSync('frontend/app/apple-icon.png', apple180);
  fs.writeFileSync('frontend/public/apple-touch-icon.png', apple180);
  console.log('✓ frontend/app/apple-icon.png & frontend/public/apple-touch-icon.png (180x180)');

  // 32x32 Favicon PNG
  const fav32 = await sharp(master512)
    .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  fs.writeFileSync('frontend/public/favicon-32x32.png', fav32);
  console.log('✓ frontend/public/favicon-32x32.png (32x32)');

  // 16x16 Favicon PNG
  const fav16 = await sharp(master512)
    .resize(16, 16, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  fs.writeFileSync('frontend/public/favicon-16x16.png', fav16);
  console.log('✓ frontend/public/favicon-16x16.png (16x16)');

  // 48x48 Favicon PNG (for Windows desktop/bookmarks)
  const fav48 = await sharp(master512)
    .resize(48, 48, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  // Generate multi-resolution .ico containing 16x16, 32x32, and 48x48
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: fav16 },
    { width: 32, height: 32, buffer: fav32 },
    { width: 48, height: 48, buffer: fav48 }
  ]);
  fs.writeFileSync('frontend/app/favicon.ico', icoBuffer);
  fs.writeFileSync('frontend/public/favicon.ico', icoBuffer);
  console.log('✓ frontend/app/favicon.ico & frontend/public/favicon.ico (multi-res 16/32/48)');

  console.log('\nAll favicons generated successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
