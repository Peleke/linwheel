/**
 * Text Overlay using Satori (@vercel/og)
 *
 * Renders text overlays as PNG images using Vercel's Satori engine.
 * Works on Vercel serverless - no fontconfig dependency.
 *
 * Replaces the broken librsvg/SVG approach.
 */

import { ImageResponse } from "@vercel/og";
import fs from "fs";
import path from "path";
import sharp from "sharp";

// Load font once at module level
let fontData: Buffer | null = null;

function getFontData(): Buffer {
  if (fontData) return fontData;

  // Try multiple paths (local dev vs Vercel)
  const possiblePaths = [
    path.join(process.cwd(), "public/fonts/Inter-Bold.ttf"),
    "/var/task/public/fonts/Inter-Bold.ttf",
  ];

  for (const fontPath of possiblePaths) {
    if (fs.existsSync(fontPath)) {
      fontData = fs.readFileSync(fontPath);
      console.log(`[TextOverlay] Loaded font from: ${fontPath}`);
      return fontData;
    }
  }

  throw new Error("Inter-Bold.ttf font not found");
}

interface CarouselOverlayOptions {
  headline: string;
  slideType: "title" | "content" | "cta";
  size?: number;
}

interface CoverOverlayOptions {
  headline: string;
  width?: number;
  height?: number;
}

/**
 * Generate text overlay for carousel slides (1080x1080 square)
 */
export async function renderCarouselTextOverlay(
  options: CarouselOverlayOptions
): Promise<Buffer> {
  const { headline, slideType, size = 1080 } = options;
  const font = getFontData();

  const fontSizes = { title: 72, content: 60, cta: 64 };
  const fontSize = fontSizes[slideType];

  const response = new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
          fontFamily: "Inter",
          fontSize,
          fontWeight: 700,
          color: "white",
          lineHeight: 1.3,
          textShadow: "0px 2px 12px rgba(0,0,0,0.8)",
        }}
      >
        {headline}
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [
        {
          name: "Inter",
          data: font,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Generate text overlay for cover images (1200x628 landscape)
 */
export async function renderCoverTextOverlay(
  options: CoverOverlayOptions
): Promise<Buffer> {
  const { headline, width = 1200, height = 628 } = options;
  const font = getFontData();

  const response = new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 60,
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
          fontFamily: "Inter",
          fontSize: 48,
          fontWeight: 700,
          color: "white",
          lineHeight: 1.3,
          textShadow: "0px 2px 12px rgba(0,0,0,0.8)",
        }}
      >
        {headline}
      </div>
    ),
    {
      width,
      height,
      fonts: [
        {
          name: "Inter",
          data: font,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Overlay text on a carousel slide image
 */
export async function overlayCarouselText(
  imageBuffer: Buffer,
  options: CarouselOverlayOptions
): Promise<Buffer> {
  const size = options.size || 1080;
  const textLayer = await renderCarouselTextOverlay(options);

  return sharp(imageBuffer)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: textLayer }])
    .png()
    .toBuffer();
}

/**
 * Overlay text on a carousel slide from URL
 */
export async function overlayCarouselTextFromUrl(
  imageUrl: string,
  options: CarouselOverlayOptions
): Promise<Buffer> {
  console.log(`[TextOverlay] Fetching image from: ${imageUrl.substring(0, 80)}...`);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`[TextOverlay] Image buffer size: ${imageBuffer.length} bytes`);

  return overlayCarouselText(imageBuffer, options);
}

/**
 * Overlay text on a cover image
 */
export async function overlayCoverText(
  imageBuffer: Buffer,
  options: CoverOverlayOptions
): Promise<Buffer> {
  const { width = 1200, height = 628 } = options;
  const textLayer = await renderCoverTextOverlay(options);

  return sharp(imageBuffer)
    .resize(width, height, { fit: "cover" })
    .composite([{ input: textLayer }])
    .png()
    .toBuffer();
}

/**
 * Overlay text on a cover image from URL
 */
export async function overlayCoverTextFromUrl(
  imageUrl: string,
  options: CoverOverlayOptions
): Promise<Buffer> {
  console.log(`[TextOverlay] Fetching cover image from: ${imageUrl.substring(0, 80)}...`);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`[TextOverlay] Cover image buffer size: ${imageBuffer.length} bytes`);

  return overlayCoverText(imageBuffer, options);
}

/**
 * Generate a gradient background slide with headline (fallback if T2I fails)
 */
export async function generateFallbackSlide(
  options: CarouselOverlayOptions
): Promise<Buffer> {
  const { headline, slideType, size = 1080 } = options;
  const font = getFontData();

  const fontSizes = { title: 72, content: 60, cta: 64 };
  const fontSize = fontSizes[slideType];

  // Pick a random gradient
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(120deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(150deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(90deg, #fa709a 0%, #fee140 100%)",
  ];
  const gradient = gradients[Math.floor(Math.random() * gradients.length)];

  const response = new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          background: gradient,
          fontFamily: "Inter",
          fontSize,
          fontWeight: 700,
          color: "white",
          lineHeight: 1.3,
          textShadow: "0px 2px 12px rgba(0,0,0,0.4)",
        }}
      >
        {headline}
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [
        {
          name: "Inter",
          data: font,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  return Buffer.from(await response.arrayBuffer());
}
