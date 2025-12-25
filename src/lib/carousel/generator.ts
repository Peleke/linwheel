/**
 * Carousel Generator - HYBRID APPROACH
 *
 * Orchestrates the carousel generation process:
 * 1. Analyze article to determine format
 * 2. Generate prompts for each slide (textless backgrounds)
 * 3. Generate background images in parallel with T2I
 * 4. Overlay text reliably using Sharp
 * 5. Combine into PDF
 */

import { PDFDocument, rgb } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { db } from "@/db";
import { articles, articleCarouselIntents, type CarouselPage } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateImages } from "@/lib/t2i";
import type { T2IProviderType, StylePreset, ImageGenerationRequest } from "@/lib/t2i/types";
import { uploadImage } from "@/lib/storage";
import { analyzeCarouselFormat } from "./analyzer";
import { generateCarouselPages } from "./prompts";
import { overlayTextOnImageUrl, generateFallbackSlide } from "./text-overlay";
import { generateSlideCaptions } from "./captions";

export interface CarouselGenerationResult {
  success: boolean;
  carouselId?: string;
  pdfUrl?: string;
  pages?: CarouselPage[];
  error?: string;
  provider?: T2IProviderType;
}

export interface CarouselGenerationOptions {
  /** Override the default T2I provider */
  provider?: T2IProviderType;
  /** Model to use (e.g., 'flux-dev', 'gpt-image-1') */
  model?: string;
  /** Style preset for the carousel */
  stylePreset?: StylePreset;
  /** Skip PDF generation (just generate images) */
  skipPdf?: boolean;
  /** Force regeneration, bypassing cache */
  forceRegenerate?: boolean;
}

/**
 * Generate a carousel for an article
 */
export async function generateCarousel(
  articleId: string,
  options: CarouselGenerationOptions = {}
): Promise<CarouselGenerationResult> {
  const { provider, model, stylePreset = "typographic_minimal", skipPdf = false, forceRegenerate = false } = options;

  try {
    // 1. Fetch the article
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return { success: false, error: "Article not found" };
    }

    // 2. Check for existing carousel intent
    let carouselIntent = await db.query.articleCarouselIntents.findFirst({
      where: eq(articleCarouselIntents.articleId, articleId),
    });

    // If already generated and NOT forcing regeneration, return cached result
    if (carouselIntent?.generatedPdfUrl && !forceRegenerate) {
      return {
        success: true,
        carouselId: carouselIntent.id,
        pdfUrl: carouselIntent.generatedPdfUrl,
        pages: carouselIntent.pages || undefined,
        provider: carouselIntent.generationProvider as T2IProviderType,
      };
    }

    // If forcing regeneration, log it
    if (forceRegenerate && carouselIntent?.generatedPdfUrl) {
      console.log(`[Carousel] Force regenerating carousel for article ${articleId}`);
    }

    // 3. Analyze article to determine format
    const format = await analyzeCarouselFormat(article);

    // 4. Generate LLM-based content for slides (headlines + prompts)
    console.log(`[Carousel] Generating slide content with LLM...`);
    const captionResult = await generateSlideCaptions(article);
    const captions = captionResult.captions || [];

    // 5. Build pages using LLM-generated content
    const pages = generateCarouselPages(article, format, stylePreset);

    // Override headlines AND prompts with LLM-generated content
    pages.forEach((page, i) => {
      if (captions[i]) {
        page.headlineText = captions[i].headline;
        // Use LLM-generated prompts (topic-specific, weighted keywords)
        page.prompt = captions[i].imagePrompt;
      }
    });
    console.log(`[Carousel] Using headlines:`, pages.map(p => p.headlineText));
    console.log(`[Carousel] Using prompts:`, pages.map(p => p.prompt));

    // 6. Create or update carousel intent
    const carouselId = carouselIntent?.id || crypto.randomUUID();
    if (!carouselIntent) {
      await db.insert(articleCarouselIntents).values({
        id: carouselId,
        articleId,
        pageCount: format.pageCount,
        pages,
        stylePreset,
      });
    } else {
      await db
        .update(articleCarouselIntents)
        .set({ pages, pageCount: format.pageCount, stylePreset })
        .where(eq(articleCarouselIntents.id, carouselIntent.id));
    }

    // 7. Generate BACKGROUND images for each page (text added via overlay)
    const imageRequests: ImageGenerationRequest[] = pages.map((page) => ({
      prompt: page.prompt,
      negativePrompt: "cluttered, busy, text, words, letters, cartoon, stock photo, generic, lightbulb, gears, brain",
      headlineText: "", // Don't pass headline to T2I - we overlay it ourselves
      stylePreset,
      aspectRatio: "1:1" as const, // LinkedIn carousels are square
      quality: "hd" as const,
    }));

    console.log(`[Carousel] Generating ${imageRequests.length} background images for article ${articleId} with provider: ${provider || 'default'}`);
    const imageResults = await generateImages(imageRequests, provider, model);

    // Log what we got back from T2I
    console.log(`[Carousel] T2I Results:`, imageResults.map((r, i) => ({
      page: i + 1,
      success: r.success,
      hasUrl: !!r.imageUrl,
      urlPreview: r.imageUrl?.substring(0, 80),
      error: r.error,
    })));

    // 7. Apply text overlays to each background image
    console.log(`[Carousel] Applying text overlays to ${imageResults.length} images...`);
    const updatedPages: CarouselPage[] = await Promise.all(
      pages.map(async (page, index) => {
        const result = imageResults[index];
        let finalImageUrl: string | undefined;
        let error: string | undefined;

        try {
          if (result.success && result.imageUrl) {
            console.log(`[Carousel] Page ${page.pageNumber}: Fetching T2I image from ${result.imageUrl.substring(0, 60)}...`);
            // Apply text overlay to the background image - HEADLINE ONLY for clean design
            const overlaidBuffer = await overlayTextOnImageUrl(result.imageUrl, {
              headline: page.headlineText,
              // No body text - keep it clean
              slideType: page.slideType,
              stylePreset,
              size: 1080,
            });
            console.log(`[Carousel] Page ${page.pageNumber}: Overlay successful, buffer size: ${overlaidBuffer.length}`);
            // Save to persistent storage
            const filename = `carousel-${carouselId}-page-${page.pageNumber}.png`;
            finalImageUrl = await uploadImage(overlaidBuffer, filename, "image/png");
            console.log(`[Carousel] Page ${page.pageNumber}: Saved to ${finalImageUrl}`);
          } else {
            // Background generation failed - create fallback slide with text on gradient
            console.log(`[Carousel] Page ${page.pageNumber}: T2I failed (${result.error}), generating fallback...`);
            const fallbackBuffer = await generateFallbackSlide({
              headline: page.headlineText,
              // No body text - keep it clean
              slideType: page.slideType,
              stylePreset,
              size: 1080,
            });
            // Save fallback to storage too
            const filename = `carousel-${carouselId}-page-${page.pageNumber}-fallback.png`;
            finalImageUrl = await uploadImage(fallbackBuffer, filename, "image/png");
          }
        } catch (overlayError) {
          console.error(`[Carousel] Page ${page.pageNumber}: Overlay FAILED:`, overlayError);
          error = overlayError instanceof Error ? overlayError.message : "Overlay failed";

          // Try fallback
          try {
            const fallbackBuffer = await generateFallbackSlide({
              headline: page.headlineText,
              slideType: page.slideType,
              stylePreset,
              size: 1080,
            });
            const filename = `carousel-${carouselId}-page-${page.pageNumber}-fallback.png`;
            finalImageUrl = await uploadImage(fallbackBuffer, filename, "image/png");
            error = undefined; // Fallback succeeded
            console.log(`[Carousel] Page ${page.pageNumber}: Fallback succeeded, saved to ${finalImageUrl}`);
          } catch (fallbackError) {
            console.error(`[Carousel] Page ${page.pageNumber}: Fallback also FAILED`);
          }
        }

        return {
          ...page,
          imageUrl: finalImageUrl,
          generatedAt: new Date(),
          generationError: error || result.error,
        };
      })
    );

    // Check if all overlays were successful (not the backgrounds, but the final images)
    const failedCount = updatedPages.filter((p) => !p.imageUrl).length;
    if (failedCount === updatedPages.length) {
      // All failed
      await db
        .update(articleCarouselIntents)
        .set({
          pages: updatedPages,
          generationError: "All image generations failed",
          generatedAt: new Date(),
          generationProvider: provider || imageResults[0]?.provider,
        })
        .where(eq(articleCarouselIntents.id, carouselId));

      return {
        success: false,
        carouselId,
        pages: updatedPages,
        error: "All image generations failed",
      };
    }

    // 7. Generate PDF from images (if not skipped)
    let pdfUrl: string | undefined;
    if (!skipPdf) {
      const successfulPages = updatedPages.filter((p) => p.imageUrl);
      if (successfulPages.length > 0) {
        try {
          pdfUrl = await generatePdf(successfulPages);
        } catch (pdfError) {
          console.error("[Carousel] PDF generation failed:", pdfError);
          // Continue without PDF - images are still available
        }
      }
    }

    // 8. Update carousel intent with results
    await db
      .update(articleCarouselIntents)
      .set({
        pages: updatedPages,
        generatedPdfUrl: pdfUrl,
        generatedAt: new Date(),
        generationProvider: provider || imageResults[0]?.provider,
        generationError: failedCount > 0 ? `${failedCount} images failed` : null,
      })
      .where(eq(articleCarouselIntents.id, carouselId));

    console.log(`[Carousel] Generated carousel for article ${articleId}: ${updatedPages.length} pages`);

    return {
      success: true,
      carouselId,
      pdfUrl,
      pages: updatedPages,
      provider: provider || (imageResults[0]?.provider as T2IProviderType),
    };
  } catch (error) {
    console.error("[Carousel] Generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Carousel generation failed",
    };
  }
}

/**
 * Generate a PDF from carousel pages
 *
 * Handles both data URLs (base64) and external URLs.
 * Note: This creates a data URL for the PDF.
 * In production, you'd upload to blob storage and return a URL.
 */
async function generatePdf(pages: CarouselPage[]): Promise<string> {
  const pdfDoc = await PDFDocument.create();

  // LinkedIn carousel dimensions: 1080x1080 (we'll scale down for PDF)
  const pageSize = 400; // Points (PDF units)

  for (const page of pages) {
    if (!page.imageUrl) continue;

    // Add a page
    const pdfPage = pdfDoc.addPage([pageSize, pageSize]);

    try {
      let imageBytes: ArrayBuffer;
      let imageType: string;

      // Check if it's a data URL, local path, or external URL
      if (page.imageUrl.startsWith("data:")) {
        // Parse data URL
        const matches = page.imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error("Invalid data URL format");
        }
        imageType = matches[1];
        imageBytes = Buffer.from(matches[2], "base64").buffer;
      } else if (page.imageUrl.startsWith("/")) {
        // Local file path - read from disk
        const localPath = path.join(process.cwd(), "public", page.imageUrl);
        const fileBuffer = await fs.readFile(localPath);
        imageBytes = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
        imageType = page.imageUrl.endsWith(".jpg") || page.imageUrl.endsWith(".jpeg") ? "image/jpeg" : "image/png";
      } else {
        // Fetch external URL
        const imageResponse = await fetch(page.imageUrl);
        if (!imageResponse.ok) {
          console.warn(`[Carousel] Failed to fetch image for page ${page.pageNumber}`);
          continue;
        }
        imageBytes = await imageResponse.arrayBuffer();
        imageType = imageResponse.headers.get("content-type") || "image/png";
      }

      // Embed the image based on type
      let image;
      if (imageType.includes("jpeg") || imageType.includes("jpg")) {
        image = await pdfDoc.embedJpg(imageBytes);
      } else {
        image = await pdfDoc.embedPng(imageBytes);
      }

      // Draw the image to fill the page
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: pageSize,
        height: pageSize,
      });
    } catch (imageError) {
      console.warn(`[Carousel] Failed to embed image for page ${page.pageNumber}:`, imageError);

      // Draw a placeholder
      pdfPage.drawRectangle({
        x: 10,
        y: 10,
        width: pageSize - 20,
        height: pageSize - 20,
        color: rgb(0.9, 0.9, 0.9),
      });
    }
  }

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();

  // Convert to base64 data URL
  // Note: In production, upload to blob storage instead
  const base64 = Buffer.from(pdfBytes).toString("base64");
  return `data:application/pdf;base64,${base64}`;
}

/**
 * Get carousel status for an article
 */
export async function getCarouselStatus(articleId: string) {
  const intent = await db.query.articleCarouselIntents.findFirst({
    where: eq(articleCarouselIntents.articleId, articleId),
  });

  if (!intent) {
    return { exists: false };
  }

  return {
    exists: true,
    id: intent.id,
    pageCount: intent.pageCount,
    pages: intent.pages,
    pdfUrl: intent.generatedPdfUrl,
    generatedAt: intent.generatedAt,
    provider: intent.generationProvider,
    error: intent.generationError,
  };
}

/**
 * Delete carousel for an article
 */
export async function deleteCarousel(articleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const intent = await db.query.articleCarouselIntents.findFirst({
      where: eq(articleCarouselIntents.articleId, articleId),
    });

    if (!intent) {
      return { success: false, error: "Carousel not found" };
    }

    await db.delete(articleCarouselIntents).where(eq(articleCarouselIntents.id, intent.id));

    console.log(`[Carousel] Deleted carousel for article ${articleId}`);
    return { success: true };
  } catch (error) {
    console.error("[Carousel] Delete failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}
