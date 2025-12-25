/**
 * Carousel Module - HYBRID APPROACH
 *
 * Generates carousels by:
 * 1. Creating textless backgrounds with T2I
 * 2. Overlaying text reliably with Sharp
 *
 * This guarantees readable text while keeping artistic AI backgrounds.
 */

export { analyzeCarouselFormat, getRecommendedFormat, type CarouselFormat, type SlideType } from "./analyzer";
export { generateCarouselPages } from "./prompts";
export { generateCarousel, getCarouselStatus, deleteCarousel, type CarouselGenerationResult, type CarouselGenerationOptions } from "./generator";
export { overlayTextOnImage, overlayTextOnImageUrl, generateFallbackSlide } from "./text-overlay";
export { generateSlideCaptions } from "./captions";
