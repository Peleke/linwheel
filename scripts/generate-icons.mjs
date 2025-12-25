#!/usr/bin/env node
/**
 * Generate favicon and PWA icons from the source logo
 */
import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const sourceLogo = join(projectRoot, 'assets', 'linwheel.png');
const publicDir = join(projectRoot, 'public');

async function generateIcons() {
  console.log('Generating icons from', sourceLogo);

  // Ensure public directory exists
  await mkdir(publicDir, { recursive: true });

  // Load source image
  const source = sharp(sourceLogo);
  const metadata = await source.metadata();
  console.log(`Source image: ${metadata.width}x${metadata.height}`);

  // Generate favicon sizes (PNG versions for modern browsers)
  const faviconSizes = [16, 32, 48];
  for (const size of faviconSizes) {
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toFile(join(publicDir, `favicon-${size}.png`));
    console.log(`Generated favicon-${size}.png`);
  }

  // Generate 32x32 as the main favicon.png
  await sharp(sourceLogo)
    .resize(32, 32, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png');

  // Generate ICO (using 32x32 PNG as base - browsers will use PNG anyway)
  await sharp(sourceLogo)
    .resize(32, 32, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(join(publicDir, 'favicon.ico'));
  console.log('Generated favicon.ico');

  // Generate Apple Touch Icon (180x180)
  await sharp(sourceLogo)
    .resize(180, 180, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate PWA icons
  const pwaSizes = [192, 512];
  for (const size of pwaSizes) {
    // Standard icon
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toFile(join(publicDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);

    // Maskable icon (with safe zone padding - logo at 80% in center)
    const padding = Math.floor(size * 0.1);
    const innerSize = size - (padding * 2);
    await sharp(sourceLogo)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 0 } })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 15, g: 23, b: 42, alpha: 1 }
      })
      .png()
      .toFile(join(publicDir, `icon-maskable-${size}.png`));
    console.log(`Generated icon-maskable-${size}.png`);
  }

  // Also copy the original as a high-res version for the header
  await copyFile(sourceLogo, join(publicDir, 'logo.png'));
  console.log('Copied logo.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
