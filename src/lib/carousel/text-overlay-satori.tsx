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
let wasmInitializing: Promise<void> | null = null;

// Semaphore to serialize Resvg rendering (WASM is not thread-safe)
class RenderQueue {
  private queue: Promise<void> = Promise.resolve();

  async run<T>(fn: () => Promise<T>): Promise<T> {
    let resolve: () => void;
    const myTurn = this.queue;
    this.queue = new Promise<void>((r) => { resolve = r; });

    await myTurn;
    try {
      return await fn();
    } finally {
      resolve!();
    }
  }
}

const renderQueue = new RenderQueue();

async function ensureWasmInitialized(): Promise<void> {
  if (wasmInitialized) return;

  // Prevent multiple concurrent initializations
  if (wasmInitializing) {
    await wasmInitializing;
    return;
  }

  wasmInitializing = (async () => {
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
  })();

  await wasmInitializing;
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
  caption?: string;
  slideType: "title" | "content" | "cta";
  slideNumber?: number; // 1-5, used to determine layout
  size?: number;
}

type TextPosition = "top" | "center" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface CoverOverlayOptions {
  headline: string;
  width?: number;
  height?: number;
  position?: TextPosition;
}

/**
 * Render JSX to PNG buffer using Satori + Resvg
 * Uses a queue to serialize WASM access (not thread-safe)
 */
async function renderToPng(
  element: ReactNode,
  width: number,
  height: number
): Promise<Buffer> {
  // Ensure WASM is initialized (with deduplication)
  await ensureWasmInitialized();

  const font = getFontData();

  // Convert JSX to SVG using Satori (this part is safe to run concurrently)
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

  // Queue Resvg rendering (WASM is not thread-safe)
  return renderQueue.run(async () => {
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: "width",
        value: width,
      },
    });

    const pngData = resvg.render();
    return Buffer.from(pngData.asPng());
  });
}

/**
 * Generate text overlay for carousel slides (1080x1080 square)
 *
 * Layout varies by slide:
 * - Slides 1, 3, 5: Headline at BOTTOM (gradient from bottom)
 * - Slides 2, 4: Headline at TOP, caption at BOTTOM (split layout)
 */
export async function renderCarouselTextOverlay(
  options: CarouselOverlayOptions
): Promise<Buffer> {
  const { headline, caption, slideType, slideNumber, size = 1080 } = options;

  const fontSizes = { title: 72, content: 60, cta: 64 };
  const fontSize = fontSizes[slideType];
  const captionFontSize = Math.round(fontSize * 0.5);

  // Slides 2 and 4 get split layout (headline top, caption bottom)
  const isSplitLayout = slideNumber === 2 || slideNumber === 4;

  const element = isSplitLayout ? (
    // SPLIT LAYOUT: headline at top, caption at bottom
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.7) 100%)",
        fontFamily: "Inter",
        color: "white",
      }}
    >
      {/* Headline at TOP */}
      <span
        style={{
          fontSize,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {headline}
      </span>
      {/* Caption at BOTTOM (or empty space) */}
      <span
        style={{
          fontSize: captionFontSize,
          fontWeight: 400,
          lineHeight: 1.4,
          opacity: caption ? 0.9 : 0,
        }}
      >
        {caption || " "}
      </span>
    </div>
  ) : (
    // STANDARD LAYOUT: headline at bottom
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
        color: "white",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {headline}
      </span>
    </div>
  );

  return renderToPng(element, size, size);
}

/**
 * Generate text overlay for cover images (1200x628 landscape)
 * Supports different text positions
 */
export async function renderCoverTextOverlay(
  options: CoverOverlayOptions
): Promise<Buffer> {
  const { headline, width = 1200, height = 628, position = "bottom" } = options;

  // Map positions to flexbox alignment and gradient direction
  const positionStyles: Record<TextPosition, {
    justifyContent: string;
    alignItems: string;
    textAlign: string;
    gradient: string;
  }> = {
    top: {
      justifyContent: "flex-start",
      alignItems: "center",
      textAlign: "center",
      gradient: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      gradient: "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
    },
    bottom: {
      justifyContent: "flex-end",
      alignItems: "center",
      textAlign: "center",
      gradient: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
    },
    "top-left": {
      justifyContent: "flex-start",
      alignItems: "flex-start",
      textAlign: "left",
      gradient: "linear-gradient(to bottom right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
    },
    "top-right": {
      justifyContent: "flex-start",
      alignItems: "flex-end",
      textAlign: "right",
      gradient: "linear-gradient(to bottom left, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
    },
    "bottom-left": {
      justifyContent: "flex-end",
      alignItems: "flex-start",
      textAlign: "left",
      gradient: "linear-gradient(to top right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
    },
    "bottom-right": {
      justifyContent: "flex-end",
      alignItems: "flex-end",
      textAlign: "right",
      gradient: "linear-gradient(to top left, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
    },
  };

  const styles = positionStyles[position];

  const element = (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: styles.justifyContent,
        alignItems: styles.alignItems,
        padding: 60,
        background: styles.gradient,
        fontFamily: "Inter",
        fontSize: 48,
        fontWeight: 700,
        color: "white",
        lineHeight: 1.3,
        textAlign: styles.textAlign as "left" | "center" | "right",
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
  console.log(`[TextOverlay] Fetching cover image from: ${imageUrl.substring(0, 80)}... (position: ${options.position || "bottom"})`);

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`[TextOverlay] Cover image buffer size: ${imageBuffer.length} bytes`);

  return overlayCoverText(imageBuffer, options);
}

// Export the TextPosition type for use in other modules
export type { TextPosition };

/**
 * Generate a gradient background slide with headline (fallback if T2I fails)
 */
export async function generateFallbackSlide(
  options: CarouselOverlayOptions
): Promise<Buffer> {
  const { headline, caption, slideType, slideNumber, size = 1080 } = options;

  const fontSizes = { title: 72, content: 60, cta: 64 };
  const fontSize = fontSizes[slideType];
  const captionFontSize = Math.round(fontSize * 0.5);

  // Pick a random gradient
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(120deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(150deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(90deg, #fa709a 0%, #fee140 100%)",
  ];
  const gradient = gradients[Math.floor(Math.random() * gradients.length)];

  // Slides 2 and 4 get split layout (headline top, caption bottom)
  const isSplitLayout = slideNumber === 2 || slideNumber === 4;

  const element = isSplitLayout ? (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: gradient,
        fontFamily: "Inter",
        color: "white",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {headline}
      </span>
      <span
        style={{
          fontSize: captionFontSize,
          fontWeight: 400,
          lineHeight: 1.4,
          opacity: caption ? 0.9 : 0,
        }}
      >
        {caption || " "}
      </span>
    </div>
  ) : (
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
        color: "white",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {headline}
      </span>
    </div>
  );

  return renderToPng(element, size, size);
}
