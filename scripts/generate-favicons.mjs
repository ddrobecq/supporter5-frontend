import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const FRONT_ROOT = process.cwd();
const PUBLIC_DIR = path.resolve(FRONT_ROOT, 'public');
const SOURCE_URL = process.env.FAVICON_SOURCE_URL || 'http://localhost:3000/api/images/club/0001';

const SIZES = [16, 32, 48, 180, 192, 512];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fetchSourceBuffer(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Unable to download source image (${response.status}) from ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function createPng(sourceBuffer, size, outputFile) {
  await sharp(sourceBuffer)
    .rotate()
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outputFile);
}

async function run() {
  await ensureDir(PUBLIC_DIR);

  const sourceBuffer = await fetchSourceBuffer(SOURCE_URL);

  for (const size of SIZES) {
    const output = path.join(PUBLIC_DIR, `icon-${size}x${size}.png`);
    await createPng(sourceBuffer, size, output);
  }

  await fs.copyFile(path.join(PUBLIC_DIR, 'icon-16x16.png'), path.join(PUBLIC_DIR, 'favicon-16x16.png'));
  await fs.copyFile(path.join(PUBLIC_DIR, 'icon-32x32.png'), path.join(PUBLIC_DIR, 'favicon-32x32.png'));
  await fs.copyFile(path.join(PUBLIC_DIR, 'icon-180x180.png'), path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  await fs.copyFile(path.join(PUBLIC_DIR, 'icon-192x192.png'), path.join(PUBLIC_DIR, 'android-chrome-192x192.png'));
  await fs.copyFile(path.join(PUBLIC_DIR, 'icon-512x512.png'), path.join(PUBLIC_DIR, 'android-chrome-512x512.png'));

  const icoBuffer = await pngToIco([
    path.join(PUBLIC_DIR, 'icon-16x16.png'),
    path.join(PUBLIC_DIR, 'icon-32x32.png'),
    path.join(PUBLIC_DIR, 'icon-48x48.png'),
  ]);
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);

  console.log('Favicons generated in public/.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
