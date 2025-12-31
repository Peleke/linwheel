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
import { articles, articleCarouselIntents, carouselSlideVersions, type CarouselPage, type CarouselSlideVersion } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateImages } from "@/lib/t2i";
import type { T2IProviderType, StylePreset, ImageGenerationRequest } from "@/lib/t2i/types";
import { uploadImage } from "@/lib/storage";
import { analyzeCarouselFormat } from "./analyzer";
import { generateCarouselPages } from "./prompts";
import { overlayCarouselTextFromUrl, generateFallbackSlide } from "./text-overlay-satori";
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

    // Override headlines, captions, AND prompts with LLM-generated content
    pages.forEach((page, i) => {
      if (captions[i]) {
        page.headlineText = captions[i].headline;
        page.caption = captions[i].caption; // Optional caption for some slides
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
      negativePrompt: "text, words, letters, numbers, digits, numerals, typography, writing, labels, captions, watermarks, logos, symbols, icons, cluttered, busy, cartoon, stock photo, generic, lightbulb, gears, brain, people, faces, hands, human figures",
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
            // Apply text overlay to the background image using Satori (works on Vercel)
            const overlaidBuffer = await overlayCarouselTextFromUrl(result.imageUrl, {
              headline: page.headlineText,
              caption: page.caption,
              slideType: page.slideType,
              slideNumber: page.pageNumber,
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
              caption: page.caption,
              slideType: page.slideType,
              slideNumber: page.pageNumber,
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
              caption: page.caption,
              slideType: page.slideType,
              slideNumber: page.pageNumber,
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

    // 8. Create version 1 for each successfully generated slide
    const usedProvider = provider || imageResults[0]?.provider;
    for (const page of updatedPages) {
      if (page.imageUrl) {
        const versionId = crypto.randomUUID();
        await db.insert(carouselSlideVersions).values({
          id: versionId,
          carouselIntentId: carouselId,
          slideNumber: page.pageNumber,
          versionNumber: 1,
          prompt: page.prompt,
          headlineText: page.headlineText,
          caption: page.caption,
          imageUrl: page.imageUrl,
          isActive: true,
          generatedAt: new Date(),
          generationProvider: usedProvider,
          generationError: page.generationError,
        });
        // Update page with version info
        page.activeVersionId = versionId;
        page.versionCount = 1;
      }
    }

    // 9. Update carousel intent with results
    await db
      .update(articleCarouselIntents)
      .set({
        pages: updatedPages,
        generatedPdfUrl: pdfUrl,
        generatedAt: new Date(),
        generationProvider: usedProvider,
        generationError: failedCount > 0 ? `${failedCount} images failed` : null,
      })
      .where(eq(articleCarouselIntents.id, carouselId));

    console.log(`[Carousel] Generated carousel for article ${articleId}: ${updatedPages.length} pages (with v1 for each slide)`);

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

export interface SlideRegenerationOptions {
  /** Override the default T2I provider */
  provider?: T2IProviderType;
  /** Model to use */
  model?: string;
  /** Custom prompt for this slide (if not provided, generates new one via LLM) */
  customPrompt?: string;
  /** Regenerate the prompt via LLM (default: true if no customPrompt) */
  regeneratePrompt?: boolean;
}

/**
 * Regenerate a single slide in an existing carousel
 */
export async function regenerateCarouselSlide(
  articleId: string,
  slideNumber: number,
  options: SlideRegenerationOptions = {}
): Promise<CarouselGenerationResult> {
  const { provider, model, customPrompt, regeneratePrompt = !customPrompt } = options;

  try {
    // 1. Fetch the article
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, articleId),
    });

    if (!article) {
      return { success: false, error: "Article not found" };
    }

    // 2. Get existing carousel intent
    const carouselIntent = await db.query.articleCarouselIntents.findFirst({
      where: eq(articleCarouselIntents.articleId, articleId),
    });

    if (!carouselIntent || !carouselIntent.pages) {
      return { success: false, error: "Carousel not found. Generate a full carousel first." };
    }

    const pages = carouselIntent.pages as CarouselPage[];
    const slideIndex = slideNumber - 1;

    if (slideIndex < 0 || slideIndex >= pages.length) {
      return { success: false, error: `Invalid slide number. Must be 1-${pages.length}` };
    }

    const targetPage = pages[slideIndex];
    const stylePreset = (carouselIntent.stylePreset || "typographic_minimal") as StylePreset;

    // 3. Determine the prompt to use
    let newPrompt = targetPage.prompt;

    if (customPrompt) {
      // Use provided custom prompt
      newPrompt = customPrompt;
    } else if (regeneratePrompt) {
      // Generate a new prompt via LLM for just this slide
      console.log(`[Carousel] Regenerating prompt for slide ${slideNumber} via LLM...`);
      const captionResult = await generateSlideCaptions(article);
      if (captionResult.success && captionResult.captions?.[slideIndex]) {
        const newCaption = captionResult.captions[slideIndex];
        newPrompt = newCaption.imagePrompt;
        // Also update headline/caption if LLM gave us new ones
        targetPage.headlineText = newCaption.headline;
        targetPage.caption = newCaption.caption;
      }
    }

    targetPage.prompt = newPrompt;
    console.log(`[Carousel] Regenerating slide ${slideNumber} with prompt: ${newPrompt.substring(0, 100)}...`);

    // 4. Generate the new background image
    const imageRequest: ImageGenerationRequest = {
      prompt: newPrompt,
      negativePrompt: "text, words, letters, numbers, digits, numerals, typography, writing, labels, captions, watermarks, logos, symbols, icons, cluttered, busy, cartoon, stock photo, generic, lightbulb, gears, brain, people, faces, hands, human figures",
      headlineText: "",
      stylePreset,
      aspectRatio: "1:1" as const,
      quality: "hd" as const,
    };

    const [imageResult] = await generateImages([imageRequest], provider, model);

    // 5. Apply text overlay
    let finalImageUrl: string | undefined;
    let error: string | undefined;

    try {
      if (imageResult.success && imageResult.imageUrl) {
        console.log(`[Carousel] Slide ${slideNumber}: Applying text overlay...`);
        const overlaidBuffer = await overlayCarouselTextFromUrl(imageResult.imageUrl, {
          headline: targetPage.headlineText,
          caption: targetPage.caption,
          slideType: targetPage.slideType,
          slideNumber: targetPage.pageNumber,
          size: 1080,
        });

        const filename = `carousel-${carouselIntent.id}-page-${slideNumber}-v${Date.now()}.png`;
        finalImageUrl = await uploadImage(overlaidBuffer, filename, "image/png");
        console.log(`[Carousel] Slide ${slideNumber}: Saved to ${finalImageUrl}`);
      } else {
        // T2I failed - create fallback
        console.log(`[Carousel] Slide ${slideNumber}: T2I failed, generating fallback...`);
        const fallbackBuffer = await generateFallbackSlide({
          headline: targetPage.headlineText,
          caption: targetPage.caption,
          slideType: targetPage.slideType,
          slideNumber: targetPage.pageNumber,
          size: 1080,
        });
        const filename = `carousel-${carouselIntent.id}-page-${slideNumber}-fallback-v${Date.now()}.png`;
        finalImageUrl = await uploadImage(fallbackBuffer, filename, "image/png");
      }
    } catch (overlayError) {
      console.error(`[Carousel] Slide ${slideNumber}: Overlay failed:`, overlayError);
      error = overlayError instanceof Error ? overlayError.message : "Overlay failed";

      // Try fallback
      try {
        const fallbackBuffer = await generateFallbackSlide({
          headline: targetPage.headlineText,
          caption: targetPage.caption,
          slideType: targetPage.slideType,
          slideNumber: targetPage.pageNumber,
          size: 1080,
        });
        const filename = `carousel-${carouselIntent.id}-page-${slideNumber}-fallback-v${Date.now()}.png`;
        finalImageUrl = await uploadImage(fallbackBuffer, filename, "image/png");
        error = undefined;
      } catch {
        console.error(`[Carousel] Slide ${slideNumber}: Fallback also failed`);
      }
    }

    // 6. Version management: deactivate old versions and create new one
    const usedProvider = provider || imageResult.provider;

    // Deactivate all existing versions for this slide
    await db
      .update(carouselSlideVersions)
      .set({ isActive: false })
      .where(
        and(
          eq(carouselSlideVersions.carouselIntentId, carouselIntent.id),
          eq(carouselSlideVersions.slideNumber, slideNumber)
        )
      );

    // Get next version number
    const existingVersions = await db.query.carouselSlideVersions.findMany({
      where: and(
        eq(carouselSlideVersions.carouselIntentId, carouselIntent.id),
        eq(carouselSlideVersions.slideNumber, slideNumber)
      ),
      orderBy: [desc(carouselSlideVersions.versionNumber)],
      limit: 1,
    });
    const nextVersionNumber = (existingVersions[0]?.versionNumber ?? 0) + 1;

    // Insert new version as active
    const versionId = crypto.randomUUID();
    await db.insert(carouselSlideVersions).values({
      id: versionId,
      carouselIntentId: carouselIntent.id,
      slideNumber,
      versionNumber: nextVersionNumber,
      prompt: targetPage.prompt,
      headlineText: targetPage.headlineText,
      caption: targetPage.caption,
      imageUrl: finalImageUrl,
      isActive: true,
      generatedAt: new Date(),
      generationProvider: usedProvider,
      generationError: error || imageResult.error,
    });

    // 7. Update the page in the array with version info
    targetPage.imageUrl = finalImageUrl;
    targetPage.generatedAt = new Date();
    targetPage.generationError = error || imageResult.error;
    targetPage.activeVersionId = versionId;
    targetPage.versionCount = nextVersionNumber;

    pages[slideIndex] = targetPage;

    // 8. Regenerate PDF with updated pages
    let pdfUrl: string | undefined;
    const successfulPages = pages.filter((p) => p.imageUrl);
    if (successfulPages.length > 0) {
      try {
        pdfUrl = await generatePdf(successfulPages);
      } catch (pdfError) {
        console.error("[Carousel] PDF regeneration failed:", pdfError);
      }
    }

    // 9. Update carousel intent
    await db
      .update(articleCarouselIntents)
      .set({
        pages,
        generatedPdfUrl: pdfUrl || carouselIntent.generatedPdfUrl,
        generatedAt: new Date(),
        generationProvider: usedProvider,
      })
      .where(eq(articleCarouselIntents.id, carouselIntent.id));

    console.log(`[Carousel] Successfully regenerated slide ${slideNumber} (now v${nextVersionNumber})`);

    return {
      success: true,
      carouselId: carouselIntent.id,
      pdfUrl: pdfUrl || carouselIntent.generatedPdfUrl || undefined,
      pages,
      provider: provider || (imageResult.provider as T2IProviderType),
    };
  } catch (error) {
    console.error("[Carousel] Slide regeneration failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Slide regeneration failed",
    };
  }
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

  // Fetch version counts for each slide
  let pagesWithVersions = intent.pages;
  if (intent.pages && intent.pages.length > 0) {
    const versionCounts = await db
      .select({
        slideNumber: carouselSlideVersions.slideNumber,
        count: sql<number>`count(*)`,
      })
      .from(carouselSlideVersions)
      .where(eq(carouselSlideVersions.carouselIntentId, intent.id))
      .groupBy(carouselSlideVersions.slideNumber);

    const countMap = new Map(versionCounts.map(v => [v.slideNumber, v.count]));

    pagesWithVersions = intent.pages.map(page => ({
      ...page,
      versionCount: countMap.get(page.pageNumber) || 1,
    }));
  }

  return {
    exists: true,
    id: intent.id,
    pageCount: intent.pageCount,
    pages: pagesWithVersions,
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

    // Versions are deleted via CASCADE, but let's be explicit
    await db.delete(carouselSlideVersions).where(eq(carouselSlideVersions.carouselIntentId, intent.id));
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

/**
 * Get all versions for a specific slide
 */
export async function getSlideVersions(
  carouselIntentId: string,
  slideNumber: number
): Promise<CarouselSlideVersion[]> {
  const versions = await db.query.carouselSlideVersions.findMany({
    where: and(
      eq(carouselSlideVersions.carouselIntentId, carouselIntentId),
      eq(carouselSlideVersions.slideNumber, slideNumber)
    ),
    orderBy: [desc(carouselSlideVersions.versionNumber)],
  });
  return versions;
}

/**
 * Activate a specific version for a slide
 */
export async function activateSlideVersion(
  carouselIntentId: string,
  slideNumber: number,
  versionId: string
): Promise<CarouselGenerationResult> {
  try {
    // 1. Verify version exists and belongs to this carousel/slide
    const version = await db.query.carouselSlideVersions.findFirst({
      where: and(
        eq(carouselSlideVersions.id, versionId),
        eq(carouselSlideVersions.carouselIntentId, carouselIntentId),
        eq(carouselSlideVersions.slideNumber, slideNumber)
      ),
    });

    if (!version) {
      return { success: false, error: "Version not found" };
    }

    // 2. Deactivate all versions for this slide
    await db
      .update(carouselSlideVersions)
      .set({ isActive: false })
      .where(
        and(
          eq(carouselSlideVersions.carouselIntentId, carouselIntentId),
          eq(carouselSlideVersions.slideNumber, slideNumber)
        )
      );

    // 3. Activate the selected version
    await db
      .update(carouselSlideVersions)
      .set({ isActive: true })
      .where(eq(carouselSlideVersions.id, versionId));

    // 4. Get version count for this slide
    const allVersions = await db.query.carouselSlideVersions.findMany({
      where: and(
        eq(carouselSlideVersions.carouselIntentId, carouselIntentId),
        eq(carouselSlideVersions.slideNumber, slideNumber)
      ),
    });
    const versionCount = allVersions.length;

    // 5. Update the pages array in carousel intent
    const carouselIntent = await db.query.articleCarouselIntents.findFirst({
      where: eq(articleCarouselIntents.id, carouselIntentId),
    });

    if (!carouselIntent?.pages) {
      return { success: false, error: "Carousel not found" };
    }

    const pages = carouselIntent.pages as CarouselPage[];
    const slideIndex = slideNumber - 1;

    if (slideIndex < 0 || slideIndex >= pages.length) {
      return { success: false, error: "Invalid slide number" };
    }

    // Update the page with the selected version's content
    pages[slideIndex] = {
      ...pages[slideIndex],
      prompt: version.prompt,
      headlineText: version.headlineText,
      caption: version.caption ?? undefined,
      imageUrl: version.imageUrl ?? undefined,
      generatedAt: version.generatedAt ?? undefined,
      generationError: version.generationError ?? undefined,
      activeVersionId: version.id,
      versionCount,
    };

    // 6. Regenerate PDF with updated pages
    let pdfUrl: string | undefined;
    const successfulPages = pages.filter((p) => p.imageUrl);
    if (successfulPages.length > 0) {
      try {
        pdfUrl = await generatePdf(successfulPages);
      } catch (pdfError) {
        console.error("[Carousel] PDF regeneration failed:", pdfError);
      }
    }

    // 7. Update carousel intent
    await db
      .update(articleCarouselIntents)
      .set({
        pages,
        generatedPdfUrl: pdfUrl || carouselIntent.generatedPdfUrl,
        generatedAt: new Date(),
      })
      .where(eq(articleCarouselIntents.id, carouselIntentId));

    console.log(`[Carousel] Activated version ${version.versionNumber} for slide ${slideNumber}`);

    return {
      success: true,
      carouselId: carouselIntentId,
      pdfUrl: pdfUrl || carouselIntent.generatedPdfUrl || undefined,
      pages,
    };
  } catch (error) {
    console.error("[Carousel] Version activation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Version activation failed",
    };
  }
}
