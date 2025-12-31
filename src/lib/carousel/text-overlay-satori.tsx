/**
 * Text Overlay using Satori + Resvg
 *
 * Renders text overlays as PNG images using Satori (JSX to SVG)
 * and Resvg (SVG to PNG). Works on Vercel serverless.
 *
 * Uses the low-level libraries directly instead of @vercel/og's
 * ImageResponse wrapper which has native module bundling issues.
 */

import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import type { ReactNode } from "react";

// WASM initialization state
let wasmInitialized = false;

async function ensureWasmInitialized(): Promise<void> {
  if (wasmInitialized) return;

  try {
    // Try to load WASM from node_modules
    const wasmPath = path.join(
      process.cwd(),
      "node_modules/@resvg/resvg-wasm/index_bg.wasm"
    );

    if (fs.existsSync(wasmPath)) {
      const wasmBuffer = fs.readFileSync(wasmPath);
      await initWasm(wasmBuffer);
    } else {
      // Fallback: fetch from CDN (for edge runtime)
      const wasmResponse = await fetch(
        "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm"
      );
      const wasmBuffer = await wasmResponse.arrayBuffer();
      await initWasm(wasmBuffer);
    }

    wasmInitialized = true;
    console.log("[TextOverlay] WASM initialized");
  } catch (error) {
    // Already initialized is fine
    if (error instanceof Error && error.message.includes("Already initialized")) {
      wasmInitialized = true;
      return;
    }
    throw error;
  }
}

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
 * Render JSX to PNG buffer using Satori + Resvg
 */
async function renderToPng(
  element: ReactNode,
  width: number,
  height: number
): Promise<Buffer> {
  // Ensure WASM is initialized
  await ensureWasmInitialized();

  const font = getFontData();

  // Convert JSX to SVG using Satori
  const svg = await satori(element, {
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
  });

  // Convert SVG to PNG using Resvg
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: width,
    },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

/**
 * Generate text overlay for carousel slides (1080x1080 square)
 */
export async function renderCarouselTextOverlay(
  options: CarouselOverlayOptions
): Promise<Buffer> {
  const { headline, slideType, size = 1080 } = options;

  const fontSizes = { title: 72, content: 60, cta: 64 };
  const fontSize = fontSizes[slideType];

  const element = (
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
      }}
    >
      {headline}
    </div>
  );

  return renderToPng(element, size, size);
}

/**
 * Generate text overlay for cover images (1200x628 landscape)
 */
export async function renderCoverTextOverlay(
  options: CoverOverlayOptions
): Promise<Buffer> {
  const { headline, width = 1200, height = 628 } = options;

  const element = (
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
      }}
    >
      {headline}
    </div>
  );

  return renderToPng(element, width, height);
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

  const element = (
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
      }}
    >
      {headline}
    </div>
  );

  return renderToPng(element, size, size);
}
