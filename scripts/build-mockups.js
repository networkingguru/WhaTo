#!/usr/bin/env node

/**
 * Build App Store screenshot mockups with bold captions.
 * Large headline + subtitle, brand colors, high contrast.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const DESKTOP = path.join(require('os').homedir(), 'Desktop');
const OUTPUT_DIR = path.join(DESKTOP, 'AppStore-Screenshots');

// Brand colors
const BG_COLOR = '#FFF5EB';
const HEADLINE_COLOR = '#FF6B4A'; // WhaTo coral/orange
const SUBTITLE_COLOR = '#4A4A4A';

// Final output size for 6.5" display (1284 × 2778)
const OUTPUT_WIDTH = 1284;
const OUTPUT_HEIGHT = 2778;

// Layout
const CAPTION_HEIGHT = 560;
const SCREENSHOT_PADDING = 50;
const CORNER_RADIUS = 44;

const SCREENSHOTS = [
  {
    file: 'Simulator Screenshot - iPhone 17 Pro - 2026-03-22 at 14.27.08.png',
    headline: "Can't Decide?",
    subtitle: 'We\'ll fix that.',
    output: '01-home.png',
  },
  {
    file: 'Simulator Screenshot - iPhone 17 Pro - 2026-03-22 at 14.27.14.png',
    headline: 'Solo or Squad',
    subtitle: 'Your call.',
    output: '02-mode-choice.png',
  },
  {
    file: 'Simulator Screenshot - iPhone 17 Pro - 2026-03-22 at 14.44.56.png',
    headline: 'Rally the Crew',
    subtitle: 'Everyone joins in seconds.',
    output: '03-group-lobby.png',
  },
  {
    file: 'Simulator Screenshot - iPhone 17 Pro - 2026-03-22 at 14.56.56.png',
    headline: 'Swipe to Match',
    subtitle: 'The group decides together.',
    output: '04-group-swipe.png',
  },
  {
    file: 'Simulator Screenshot - iPhone 17 Pro - 2026-03-22 at 14.57.55.png',
    headline: 'Decided.',
    subtitle: 'No more arguing. Let\'s go.',
    output: '05-results.png',
  },
];

function createCaptionSVG(headline, subtitle, width, height) {
  const headlineFontSize = 108;
  const subtitleFontSize = 48;
  const gap = 32;

  // Center the headline + subtitle block vertically
  const totalTextHeight = headlineFontSize + gap + subtitleFontSize;
  const startY = (height - totalTextHeight) / 2 + headlineFontSize;

  return Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="${BG_COLOR}"/>
      <text x="${width / 2}" y="${startY}" text-anchor="middle"
            font-family="SF Pro Display, -apple-system, Helvetica Neue, Arial, sans-serif"
            font-size="${headlineFontSize}" font-weight="800" fill="${HEADLINE_COLOR}"
            letter-spacing="-1">${escapeXml(headline)}</text>
      <text x="${width / 2}" y="${startY + headlineFontSize + gap}" text-anchor="middle"
            font-family="SF Pro Display, -apple-system, Helvetica Neue, Arial, sans-serif"
            font-size="${subtitleFontSize}" font-weight="500" fill="${SUBTITLE_COLOR}">${escapeXml(subtitle)}</text>
    </svg>
  `);
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&apos;').replace(/"/g, '&quot;');
}

function createRoundedMask(width, height, radius) {
  return Buffer.from(`
    <svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>
  `);
}

async function buildMockup({ file, headline, subtitle, output }) {
  const inputPath = path.join(DESKTOP, file);
  if (!fs.existsSync(inputPath)) {
    console.error(`  Missing: ${file}`);
    return;
  }

  const meta = await sharp(inputPath).metadata();

  // Calculate screenshot area
  const screenshotAreaWidth = OUTPUT_WIDTH - SCREENSHOT_PADDING * 2;
  const screenshotAreaHeight = OUTPUT_HEIGHT - CAPTION_HEIGHT - SCREENSHOT_PADDING * 2;

  // Scale screenshot to fit
  const scale = Math.min(
    screenshotAreaWidth / meta.width,
    screenshotAreaHeight / meta.height
  );
  const scaledWidth = Math.round(meta.width * scale);
  const scaledHeight = Math.round(meta.height * scale);

  // Resize screenshot
  const resized = await sharp(inputPath)
    .resize(scaledWidth, scaledHeight)
    .toBuffer();

  // Round corners
  const mask = createRoundedMask(scaledWidth, scaledHeight, CORNER_RADIUS);
  const rounded = await sharp(resized)
    .composite([{ input: await sharp(mask).toBuffer(), blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Shadow
  const shadowOffset = 6;
  const shadowBlur = 30;
  const shadowPadding = shadowBlur * 2;
  const shadowWidth = scaledWidth + shadowPadding;
  const shadowHeight = scaledHeight + shadowPadding;

  const shadowSVG = Buffer.from(`
    <svg width="${shadowWidth}" height="${shadowHeight}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="${shadowOffset}" stdDeviation="${shadowBlur / 2}" flood-color="#000000" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect x="${shadowPadding / 2}" y="${shadowPadding / 2}" width="${scaledWidth}" height="${scaledHeight}"
            rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="white" filter="url(#shadow)"/>
    </svg>
  `);

  // Create caption
  const captionSVG = createCaptionSVG(headline, subtitle, OUTPUT_WIDTH, CAPTION_HEIGHT);

  // Position screenshot centered below caption
  const screenshotX = Math.round((OUTPUT_WIDTH - scaledWidth) / 2);
  const screenshotY = CAPTION_HEIGHT;
  const shadowX = screenshotX - shadowPadding / 2;
  const shadowY = screenshotY - shadowPadding / 2;

  // Compose final image
  const background = await sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      channels: 4,
      background: BG_COLOR,
    },
  }).png().toBuffer();

  const result = await sharp(background)
    .composite([
      { input: await sharp(captionSVG).png().toBuffer(), top: 0, left: 0 },
      { input: await sharp(shadowSVG).png().toBuffer(), top: shadowY, left: shadowX },
      { input: rounded, top: screenshotY, left: screenshotX },
    ])
    .png()
    .toBuffer();

  const outputPath = path.join(OUTPUT_DIR, output);
  await sharp(result).toFile(outputPath);
  console.log(`  Created: ${output}`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Building App Store mockups...\n');

  for (const screenshot of SCREENSHOTS) {
    await buildMockup(screenshot);
  }

  console.log(`\nDone! Output in: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
