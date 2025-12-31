"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";

type BeforeInstallPromptEvent = Event & {
  platforms?: string[];
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

const STORAGE_KEY = "linwheel-pwa-install-dismissed-v1";

function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  // Exclude Chrome/Firefox/Opera on iOS which still report WebKit
  const isSafari = iOS && webkit && !/(CriOS|FxiOS|OPiOS|mercury)/.test(ua);
  return isSafari;
}

function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Standard check
    const dm = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    // iOS fallback
    const navStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return !!dm || !!navStandalone;
  } catch {
    return false;
  }
}

// Icons as components (no lucide-react dependency)
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function SmartphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

export function PWAInstallBanner(): React.ReactElement | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setIsIOS(isIOSSafari());

    // Check installed state
    setIsInstalled(getIsStandalone());

    // If already dismissed or installed, don't show
    if (dismissed || getIsStandalone()) {
      return;
    }

    // iOS: we can't use beforeinstallprompt — show iOS UI
    if (isIOSSafari()) {
      setShowBanner(true);
      return;
    }

    // Non-iOS: listen for beforeinstallprompt
    function onBeforeInstallPrompt(e: Event) {
      // Prevent the browser from showing the native prompt immediately
      try {
        (e as BeforeInstallPromptEvent).preventDefault?.();
      } catch {
        // ignore
      }
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);

    // Also listen for appinstalled to hide banner if it was installed via other means
    function onAppInstalled() {
      setIsInstalled(true);
      setShowBanner(false);
    }
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dismiss and persist
  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
    setShowBanner(false);
  }, []);

  // Trigger the install prompt for non-iOS
  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
    } catch {
      // ignore errors
    } finally {
      setShowBanner(false);
    }
  }, [deferredPrompt]);

  if (dismissed || isInstalled || !showBanner) return null;

  // --- iOS UI ---
  if (isIOS) {
    return (
      <div className="fixed bottom-4 inset-x-4 z-50 animate-fade-up">
        <div className="mx-auto max-w-lg rounded-2xl bg-zinc-900/95 backdrop-blur-lg shadow-2xl ring-1 ring-white/10 p-4 flex items-start gap-4">
          {/* Logo */}
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
            <Image src="/logo.png" alt="LinWheel" fill className="object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <SmartphoneIcon className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-white">Install LinWheel</span>
            </div>
            <p className="text-sm text-neutral-300">
              Tap <ShareIcon className="w-4 h-4 inline-block mx-1 text-indigo-400" /> then{" "}
              <strong className="text-white">&quot;Add to Home Screen&quot;</strong>
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Use Safari (not private browsing) for best results
            </p>
          </div>

          <button
            aria-label="Dismiss"
            onClick={handleDismiss}
            className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <XIcon className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
      </div>
    );
  }

  // --- Non-iOS UI (uses beforeinstallprompt) ---
  return (
    <div className="fixed bottom-4 inset-x-4 z-50 animate-fade-up">
      <div className="mx-auto max-w-md rounded-2xl bg-zinc-900/95 backdrop-blur-lg shadow-2xl ring-1 ring-white/10 p-3 flex items-center gap-3">
        {/* Logo */}
        <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0">
          <Image src="/logo.png" alt="LinWheel" fill className="object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm">Install LinWheel</div>
          <p className="text-xs text-neutral-400">Get the full app experience</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            disabled={!deferredPrompt}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-4 h-4" />
            Install
          </button>
          <button
            aria-label="Dismiss"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <XIcon className="w-4 h-4 text-neutral-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallBanner;
