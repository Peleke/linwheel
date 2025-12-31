/**
 * Carousel Module - HYBRID APPROACH
 *
 * Generates carousels by:
 * 1. Creating textless backgrounds with T2I (FLUX/FAL)
 * 2. Overlaying text reliably with Satori (@vercel/og)
 * 3. Compositing with Sharp
 *
 * This guarantees readable text while keeping artistic AI backgrounds.
 * Works on Vercel serverless (no fontconfig dependency).
 */

export { analyzeCarouselFormat, getRecommendedFormat, type CarouselFormat, type SlideType } from "./analyzer";
export { generateCarouselPages } from "./prompts";
export { generateCarousel, getCarouselStatus, deleteCarousel, type CarouselGenerationResult, type CarouselGenerationOptions } from "./generator";
export { overlayCarouselText, overlayCarouselTextFromUrl, overlayCoverText, overlayCoverTextFromUrl, generateFallbackSlide } from "./text-overlay-satori";
export { generateSlideCaptions } from "./captions";
