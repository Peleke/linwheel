"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface LinkedInStatus {
  connected: boolean;
  profileName: string | null;
  profilePicture: string | null;
  expiresAt: string | null;
  isExpired: boolean;
}

export function LinkedInConnection() {
  const [status, setStatus] = useState<LinkedInStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle URL params for OAuth callback results
  useEffect(() => {
    const linkedinConnected = searchParams.get("linkedin_connected");
    const linkedinError = searchParams.get("linkedin_error");

    if (linkedinConnected === "true") {
      setSuccessMessage("LinkedIn account connected successfully!");
      // Clear the URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("linkedin_connected");
      router.replace(url.pathname);
    }

    if (linkedinError) {
      const errorMessages: Record<string, string> = {
        access_denied: "LinkedIn authorization was denied.",
        invalid_state: "Security check failed. Please try again.",
        invalid_request: "Invalid request. Please try again.",
        connection_failed: "Failed to connect. Please try again.",
      };
      setError(errorMessages[linkedinError] || "An error occurred. Please try again.");
      // Clear the URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("linkedin_error");
      router.replace(url.pathname);
    }
  }, [searchParams, router]);

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/linkedin/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch LinkedIn status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const handleConnect = () => {
    // Redirect to OAuth start
    window.location.href = "/api/auth/linkedin";
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your LinkedIn account?")) return;

    setIsDisconnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/linkedin/disconnect", {
        method: "POST",
      });

      if (res.ok) {
        setStatus({ connected: false, profileName: null, profilePicture: null, expiresAt: null, isExpired: false });
        setSuccessMessage("LinkedIn account disconnected.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to disconnect.");
      }
    } catch (err) {
      console.error("Failed to disconnect LinkedIn:", err);
      setError("Failed to disconnect. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-2"></div>
        <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Connection Status */}
      <div className={`p-4 rounded-lg border-2 transition-all ${
        status?.connected && !status.isExpired
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500"
          : status?.isExpired
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500"
          : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Profile Picture or LinkedIn Icon */}
            {status?.connected && status.profilePicture ? (
              <img
                src={status.profilePicture}
                alt={status.profileName || "LinkedIn profile"}
                className={`w-10 h-10 rounded-lg object-cover ring-2 ${
                  status.isExpired
                    ? "ring-amber-500"
                    : "ring-blue-500"
                }`}
              />
            ) : (
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                status?.connected && !status?.isExpired
                  ? "bg-blue-600 text-white"
                  : status?.isExpired
                  ? "bg-amber-500 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
              }`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              </div>
            )}

            <div>
              <p className={`font-medium ${
                status?.connected && !status.isExpired
                  ? "text-blue-800 dark:text-blue-200"
                  : status?.isExpired
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}>
                {status?.connected
                  ? status.isExpired
                    ? "Connection Expired"
                    : `Connected as ${status.profileName || "LinkedIn User"}`
                  : "Not Connected"}
              </p>
              <p className={`text-xs ${
                status?.connected && !status.isExpired
                  ? "text-blue-600 dark:text-blue-400"
                  : status?.isExpired
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-500"
              }`}>
                {status?.connected
                  ? status.isExpired
                    ? "Please reconnect to continue publishing"
                    : "You can publish posts directly to LinkedIn"
                  : "Connect to publish posts to LinkedIn"}
              </p>
            </div>
          </div>

          {status?.connected ? (
            <div className="flex items-center gap-2">
              {status.isExpired && (
                <button
                  onClick={handleConnect}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reconnect
                </button>
              )}
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-4 py-2 text-sm font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
              Connect LinkedIn
            </button>
          )}
        </div>
      </div>

      {/* Info box */}
      {!status?.connected && (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-500">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Why connect?</span>{" "}
            Connecting your LinkedIn account lets you publish approved posts directly with one click. We only request permission to post on your behalf.
          </p>
        </div>
      )}
    </div>
  );
}
