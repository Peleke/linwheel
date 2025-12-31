"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface CarouselPage {
  pageNumber: number;
  slideType: "title" | "content" | "cta";
  prompt: string;
  headlineText: string;
  bodyText?: string;
  imageUrl?: string;
}

interface CarouselPreviewProps {
  pages: CarouselPage[];
  pdfUrl?: string;
  articleId: string;
  onRegenerateSlide?: (slideNumber: number) => Promise<void>;
  regeneratingSlide?: number | null;
}

export function CarouselPreview({ pages, pdfUrl, articleId, onRegenerateSlide, regeneratingSlide }: CarouselPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const totalPages = pages.length;

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalPages) {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    }
  }, [currentIndex, totalPages]);

  const nextSlide = useCallback(() => {
    if (currentIndex < totalPages - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, totalPages]);

  const prevSlide = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Swipe handling
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      nextSlide();
    } else if (info.offset.x > threshold) {
      prevSlide();
    }
  };

  const currentPage = pages[currentIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="space-y-4">
      {/* Carousel Container */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 shadow-lg ring-1 ring-black/5">
        {/* Slide Display */}
        <div className="relative aspect-square overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              {currentPage.imageUrl ? (
                <Image
                  src={currentPage.imageUrl}
                  alt={currentPage.headlineText}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                  <div className="text-center p-6">
                    <span className="text-4xl mb-2 block">🖼️</span>
                    <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                      {currentPage.headlineText}
                    </p>
                    {currentPage.bodyText && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {currentPage.bodyText}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Regenerate button (top left) */}
              {onRegenerateSlide && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegenerateSlide(currentPage.pageNumber);
                  }}
                  disabled={regeneratingSlide !== null}
                  className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    regeneratingSlide === currentPage.pageNumber
                      ? "bg-amber-500 text-white cursor-wait"
                      : regeneratingSlide !== null
                      ? "bg-white/50 text-slate-400 cursor-not-allowed"
                      : "bg-white/90 hover:bg-white text-slate-700 hover:scale-105 shadow-lg"
                  }`}
                  title={`Regenerate slide ${currentPage.pageNumber}`}
                >
                  {regeneratingSlide === currentPage.pageNumber ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
                    </>
                  )}
                </button>
              )}

              {/* Slide info overlay */}
              {currentPage.imageUrl && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      currentPage.slideType === "title"
                        ? "bg-blue-500 text-white"
                        : currentPage.slideType === "cta"
                        ? "bg-emerald-500 text-white"
                        : "bg-violet-500 text-white"
                    }`}>
                      {currentPage.slideType === "title" ? "Title" :
                       currentPage.slideType === "cta" ? "CTA" : "Content"}
                    </span>
                  </div>
                  <p className="text-white text-sm font-medium drop-shadow-lg line-clamp-2">
                    {currentPage.headlineText}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center transition-all ${
              currentIndex === 0
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-white dark:hover:bg-slate-700 hover:scale-110"
            }`}
          >
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={nextSlide}
            disabled={currentIndex === totalPages - 1}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-lg flex items-center justify-center transition-all ${
              currentIndex === totalPages - 1
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-white dark:hover:bg-slate-700 hover:scale-110"
            }`}
          >
            <svg className="w-5 h-5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Slide Counter */}
          <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full">
            <span className="text-white text-xs font-medium">
              {currentIndex + 1} / {totalPages}
            </span>
          </div>
        </div>

        {/* Dots Navigation */}
        <div className="flex items-center justify-center gap-2 py-3 bg-white/50 dark:bg-slate-800/50">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-200 ${
                index === currentIndex
                  ? "w-6 h-2 rounded-full bg-amber-500"
                  : "w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          ← → Arrow keys or swipe to navigate
        </p>

        {pdfUrl && (
          <a
            href={pdfUrl}
            download={`carousel-${articleId}.pdf`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-amber-500/25 transition-all hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </a>
        )}
      </div>
    </div>
  );
}
