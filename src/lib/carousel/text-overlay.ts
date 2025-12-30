/**
 * Text Overlay Utility for Carousel Images
 *
 * Overlays headline text on T2I backgrounds with a subtle gradient scrim
 * for readability - NO white boxes.
 *
 * Uses embedded Inter font for Vercel serverless compatibility (no fontconfig).
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";

// Cache the embedded font to avoid reading file on every request
let embeddedFontBase64: string | null = null;

/**
 * Get the embedded font as base64 for SVG @font-face
 * Falls back to system fonts if font file not found
 */
function getEmbeddedFont(): string | null {
  if (embeddedFontBase64 !== null) {
    return embeddedFontBase64;
  }

  try {
    // Try multiple paths for the font file (local dev vs Vercel)
    const possiblePaths = [
      path.join(process.cwd(), "public", "fonts", "Inter-Bold.woff2"),
      path.join(__dirname, "..", "..", "..", "public", "fonts", "Inter-Bold.woff2"),
      "/var/task/public/fonts/Inter-Bold.woff2", // Vercel serverless path
    ];

    for (const fontPath of possiblePaths) {
      if (fs.existsSync(fontPath)) {
        const fontBuffer = fs.readFileSync(fontPath);
        embeddedFontBase64 = fontBuffer.toString("base64");
        console.log(`[TextOverlay] Loaded embedded font from: ${fontPath}`);
        return embeddedFontBase64;
      }
    }

    console.warn("[TextOverlay] Font file not found, will use system fonts");
    embeddedFontBase64 = ""; // Empty string means not found, don't retry
    return null;
  } catch (error) {
    console.warn("[TextOverlay] Failed to load font:", error);
    embeddedFontBase64 = "";
    return null;
  }
}

interface TextOverlayOptions {
  /** The headline text to render */
  headline: string;
  /** Slide type affects styling */
  slideType: "title" | "content" | "cta";
  /** Style preset for colors */
  stylePreset: string;
  /** Image dimensions (square for LinkedIn carousel) */
  size?: number;
}

/**
 * Create headline overlay with gradient scrim (NO white box)
 * Embeds font as base64 for serverless compatibility
 */
function createHeadlineOverlay(options: TextOverlayOptions): string {
  const { headline, slideType, size = 1080 } = options;

  // Font sizes per slide type
  const fontSizes = {
    title: 72,
    content: 60,
    cta: 64,
  };
  const fontSize = fontSizes[slideType];
  const padding = 80;
  const maxWidth = size - padding * 2;

  // Calculate max chars per line
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.52));
  const lines = wrapText(headline, charsPerLine);

  // Limit to 4 lines max
  const displayLines = lines.slice(0, 4);
  if (lines.length > 4) {
    displayLines[3] = displayLines[3].substring(0, displayLines[3].length - 3) + "...";
  }

  const lineHeight = fontSize * 1.3;
  const textBlockHeight = displayLines.length * lineHeight;

  // Position text in lower third of image
  const startY = size - padding - textBlockHeight + fontSize;

  // Build tspans for each line
  const tspans = displayLines.map((line, i) =>
    `<tspan x="${padding}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
  ).join("");

  // Gradient scrim height (covers bottom portion)
  const scrimHeight = textBlockHeight + padding * 2.5;

  // Get embedded font (or null if not available)
  const fontBase64 = getEmbeddedFont();

  // Font face definition - only include if we have the embedded font
  const fontFaceStyle = fontBase64
    ? `
        <style type="text/css">
          @font-face {
            font-family: 'Inter';
            font-weight: 700;
            src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
          }
        </style>
      `
    : "";

  // Use Inter if embedded, fallback to system fonts
  const fontFamily = fontBase64
    ? "Inter, sans-serif"
    : "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${fontFaceStyle}
        <!-- Gradient scrim for readability -->
        <linearGradient id="scrim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="black" stop-opacity="0"/>
          <stop offset="40%" stop-color="black" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.7"/>
        </linearGradient>

        <!-- Text shadow filter -->
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="black" flood-opacity="0.8"/>
        </filter>
      </defs>

      <!-- Dark gradient scrim at bottom -->
      <rect
        x="0"
        y="${size - scrimHeight}"
        width="${size}"
        height="${scrimHeight}"
        fill="url(#scrim)"
      />

      <!-- Headline text - white with shadow -->
      <text
        x="${padding}"
        y="${startY}"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        font-weight="700"
        fill="white"
        text-anchor="start"
        filter="url(#textShadow)"
      >
        ${tspans}
      </text>
    </svg>
  `;
}

/**
 * Overlay headline text on an image buffer
 */
export async function overlayTextOnImage(
  imageBuffer: Buffer,
  options: TextOverlayOptions
): Promise<Buffer> {
  const size = options.size || 1080;

  const overlaySvg = createHeadlineOverlay(options);
  const overlayBuffer = Buffer.from(overlaySvg);

  const result = await sharp(imageBuffer)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: overlayBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return result;
}

/**
 * Overlay headline text on an image from URL
 */
export async function overlayTextOnImageUrl(
  imageUrl: string,
  options: TextOverlayOptions
): Promise<Buffer> {
  console.log(`[TextOverlay] Fetching image from: ${imageUrl.substring(0, 80)}...`);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  console.log(`[TextOverlay] Received ${contentType}, status ${response.status}`);

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`[TextOverlay] Image buffer size: ${imageBuffer.length} bytes`);

  return overlayTextOnImage(imageBuffer, options);
}

/**
 * Generate a gradient background slide with headline (fallback if T2I fails)
 */
export async function generateFallbackSlide(
  options: TextOverlayOptions
): Promise<Buffer> {
  const size = options.size || 1080;
  const { slideType } = options;

  // Vibrant gradient backgrounds
  const gradients = [
    { stops: ["#667eea", "#764ba2"], angle: 135 },  // Purple
    { stops: ["#f093fb", "#f5576c"], angle: 120 },  // Pink
    { stops: ["#4facfe", "#00f2fe"], angle: 135 },  // Cyan
    { stops: ["#43e97b", "#38f9d7"], angle: 150 },  // Green
    { stops: ["#fa709a", "#fee140"], angle: 90 },   // Sunset
  ];

  const gradient = gradients[Math.floor(Math.random() * gradients.length)];

  // Gradient background with subtle shapes
  const bgSvg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${gradient.stops[0]}" />
          <stop offset="100%" stop-color="${gradient.stops[1]}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      ${slideType === "title" ? `
        <circle cx="${size * 0.15}" cy="${size * 0.2}" r="${size * 0.18}" fill="white" fill-opacity="0.1"/>
        <circle cx="${size * 0.85}" cy="${size * 0.75}" r="${size * 0.22}" fill="white" fill-opacity="0.08"/>
      ` : `
        <circle cx="${size * 0.9}" cy="${size * 0.1}" r="${size * 0.12}" fill="white" fill-opacity="0.1"/>
      `}
    </svg>
  `;

  const bgBuffer = Buffer.from(bgSvg);
  const textOverlay = createHeadlineOverlay(options);
  const textBuffer = Buffer.from(textOverlay);

  const result = await sharp(bgBuffer)
    .resize(size, size)
    .composite([{ input: textBuffer, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return result;
}

// Simple word wrap
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word.length > maxChars ? word.substring(0, maxChars - 3) + "..." : word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.length > 0 ? lines : [text.substring(0, maxChars)];
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
