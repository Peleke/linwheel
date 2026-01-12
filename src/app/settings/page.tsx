"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useImagePreferences, type ImagePreferences } from "@/hooks/use-image-preferences";
import { useLLMPreferences, type LLMPreferences, type LLMProvider } from "@/hooks/use-llm-preferences";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { AppHeader } from "@/components/app-header";
import { SubscriptionStatus } from "@/components/subscription/subscription-status";
import { LinkedInConnection } from "@/components/settings/linkedin-connection";
import { BrandStylesSection } from "@/components/settings/brand-styles-section";

// Common timezones for scheduling content
const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (AZ)" },
  { value: "America/Anchorage", label: "Alaska (AK)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HI)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
];

interface LLMProviderStatus {
  claude: boolean;
  openai: boolean;
}

interface UserInfo {
  email: string | null;
  id: string;
  // Content generations
  contentUsed: number;
  contentLimit: number | string;
  contentRemaining: number | string;
  // Image generations
  imageUsed: number;
  imageLimit: number | string;
  imageRemaining: number | string;
  // Legacy fields
  used: number;
  limit: number | string;
  remaining: number | string;
  subscriptionStatus: "free" | "pro";
}

interface VoiceProfile {
  id: string;
  name: string;
  description: string | null;
  samples: string[];
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const {
    preferences: imagePreferences,
    isLoaded: isImageLoaded,
    setProvider: setImageProvider,
    setMode,
    setFalModel,
    setOpenaiModel: setImageOpenaiModel,
  } = useImagePreferences();

  const {
    preferences: llmPreferences,
    isLoaded: isLLMLoaded,
    setProvider: setLLMProvider,
    setClaudeModel,
    setOpenaiModel: setLLMOpenaiModel,
  } = useLLMPreferences();

  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
  } = usePushNotifications();

  const [llmProviderStatus, setLLMProviderStatus] = useState<LLMProviderStatus>({
    claude: false,
    openai: false,
  });

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Voice profile state
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDescription, setNewProfileDescription] = useState("");
  const [newProfileSamples, setNewProfileSamples] = useState<string[]>([""]);

  // Timezone state (stored in localStorage)
  const [userTimezone, setUserTimezone] = useState<string>("");

  // Detect browser timezone on mount
  useEffect(() => {
    const stored = localStorage.getItem("linwheel:timezone");
    if (stored) {
      setUserTimezone(stored);
    } else {
      // Default to browser timezone
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setUserTimezone(browserTz);
      localStorage.setItem("linwheel:timezone", browserTz);
    }
  }, []);

  const handleTimezoneChange = (tz: string) => {
    setUserTimezone(tz);
    localStorage.setItem("linwheel:timezone", tz);
  };

  // Current time in selected timezone
  const currentTimeInTz = useMemo(() => {
    if (!userTimezone) return "";
    try {
      return new Date().toLocaleTimeString("en-US", {
        timeZone: userTimezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  }, [userTimezone]);

  // Fetch voice profiles
  const fetchVoiceProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/voice-profiles");
      const data = await res.json();
      setVoiceProfiles(data.profiles || []);
      setActiveProfileId(data.activeProfileId);
    } catch (error) {
      console.error("Failed to fetch voice profiles:", error);
    }
  }, []);

  // Fetch user info and provider status on mount
  useEffect(() => {
    // Fetch LLM provider status
    fetch("/api/llm/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.providers) {
          setLLMProviderStatus(data.providers);
        }
      })
      .catch(console.error);

    // Fetch user info and usage
    fetch("/api/usage")
      .then((res) => res.json())
      .then((data) => {
        if (data.used !== undefined) {
          setUserInfo(data);
        }
      })
      .catch(console.error);

    fetchVoiceProfiles();
  }, [fetchVoiceProfiles]);

  // Voice profile actions
  const createVoiceProfile = async () => {
    if (!newProfileName.trim() || newProfileSamples.every(s => !s.trim())) return;

    try {
      const res = await fetch("/api/voice-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProfileName,
          description: newProfileDescription || null,
          samples: newProfileSamples.filter(s => s.trim()),
          isActive: voiceProfiles.length === 0, // First profile is active by default
        }),
      });

      if (res.ok) {
        setNewProfileName("");
        setNewProfileDescription("");
        setNewProfileSamples([""]);
        setIsCreatingProfile(false);
        fetchVoiceProfiles();
      }
    } catch (error) {
      console.error("Failed to create voice profile:", error);
    }
  };

  const activateProfile = async (id: string) => {
    try {
      await fetch(`/api/voice-profiles/${id}/activate`, { method: "POST" });
      fetchVoiceProfiles();
    } catch (error) {
      console.error("Failed to activate profile:", error);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!confirm("Delete this voice profile?")) return;
    try {
      await fetch(`/api/voice-profiles/${id}`, { method: "DELETE" });
      fetchVoiceProfiles();
    } catch (error) {
      console.error("Failed to delete profile:", error);
    }
  };

  const addSampleField = () => {
    if (newProfileSamples.length < 5) {
      setNewProfileSamples([...newProfileSamples, ""]);
    }
  };

  const updateSample = (index: number, value: string) => {
    const updated = [...newProfileSamples];
    updated[index] = value;
    setNewProfileSamples(updated);
  };

  const removeSample = (index: number) => {
    if (newProfileSamples.length > 1) {
      setNewProfileSamples(newProfileSamples.filter((_, i) => i !== index));
    }
  };

  const isLoaded = isImageLoaded && isLLMLoaded;

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-pulse text-zinc-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <AppHeader />

      <main className="flex-1 py-12 px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Configure your generation preferences.
            </p>
          </div>

        {/* Text Generation Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Text Generation</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Choose the LLM provider for generating posts and articles.
          </p>

          {/* LLM Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Provider
            </label>
            <div className="flex gap-3">
              <LLMProviderButton
                provider="openai"
                currentProvider={llmPreferences.provider}
                onClick={() => setLLMProvider("openai")}
                label="OpenAI"
                description="GPT-4o - Reliable"
                available={llmProviderStatus.openai}
              />
              <LLMProviderButton
                provider="claude"
                currentProvider={llmPreferences.provider}
                onClick={() => setLLMProvider("claude")}
                label="Claude"
                description="Better writing quality"
                available={llmProviderStatus.claude}
              />
            </div>
          </div>

          {/* Claude Model Selection */}
          {llmPreferences.provider === "claude" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Claude Model
              </label>
              <div className="grid grid-cols-2 gap-3">
                <ModelButton
                  model="claude-sonnet-4-20250514"
                  currentModel={llmPreferences.claudeModel}
                  onClick={() => setClaudeModel("claude-sonnet-4-20250514")}
                  label="Claude Sonnet 4"
                  description="Latest (default)"
                />
                <ModelButton
                  model="claude-3-5-sonnet-20241022"
                  currentModel={llmPreferences.claudeModel}
                  onClick={() => setClaudeModel("claude-3-5-sonnet-20241022")}
                  label="Claude 3.5 Sonnet"
                  description="Previous gen"
                />
              </div>
            </div>
          )}

          {/* OpenAI Model Selection */}
          {llmPreferences.provider === "openai" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                OpenAI Model
              </label>
              <div className="grid grid-cols-2 gap-3">
                <ModelButton
                  model="gpt-4o"
                  currentModel={llmPreferences.openaiModel}
                  onClick={() => setLLMOpenaiModel("gpt-4o")}
                  label="GPT-4o"
                  description="Best quality"
                />
                <ModelButton
                  model="gpt-4o-mini"
                  currentModel={llmPreferences.openaiModel}
                  onClick={() => setLLMOpenaiModel("gpt-4o-mini")}
                  label="GPT-4o Mini"
                  description="Faster, cheaper"
                />
              </div>
            </div>
          )}

        </section>

        {/* Image Generation Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Image Generation</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Images are generated using FAL.ai FLUX models.
          </p>

          {/* FAL Model Selection */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Model
            </label>
            <div className="grid grid-cols-3 gap-3">
              <ModelButton
                model="flux-dev"
                currentModel={imagePreferences.falModel}
                onClick={() => setFalModel("flux-dev")}
                label="FLUX.1 Dev"
                description="Best quality"
              />
              <ModelButton
                model="flux-pro"
                currentModel={imagePreferences.falModel}
                onClick={() => setFalModel("flux-pro")}
                label="FLUX Pro"
                description="Faster"
              />
              <ModelButton
                model="recraft-v3"
                currentModel={imagePreferences.falModel}
                onClick={() => setFalModel("recraft-v3")}
                label="Recraft V3"
                description="Best for text"
              />
            </div>
          </div>
        </section>

        {/* Scheduling & Notifications Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Scheduling</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Set your timezone for content scheduling and reminders.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Your Timezone
            </label>
            <select
              value={userTimezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
              {/* Include user's browser timezone if not in list */}
              {!COMMON_TIMEZONES.find(tz => tz.value === userTimezone) && userTimezone && (
                <option value={userTimezone}>{userTimezone}</option>
              )}
            </select>
            {currentTimeInTz && (
              <p className="text-xs text-zinc-500 mt-2">
                Current time in this timezone: <span className="font-medium text-zinc-700 dark:text-zinc-300">{currentTimeInTz}</span>
              </p>
            )}
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Tip:</span> Your scheduled content reminders will be sent based on this timezone. Make sure it matches where you'll be posting from.
            </p>
          </div>
        </section>

        {/* Push Notifications Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Notifications</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Get reminded when your scheduled content is ready to publish.
          </p>

          {!pushSupported ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Notifications not supported
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Your browser doesn&apos;t support push notifications. Try using Chrome, Firefox, or Safari.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status indicator */}
              <div className={`p-4 rounded-lg border-2 transition-all ${
                pushSubscribed
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500"
                  : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      pushSubscribed
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                    }`}>
                      {pushSubscribed ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`font-medium ${
                        pushSubscribed
                          ? "text-emerald-800 dark:text-emerald-200"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}>
                        {pushSubscribed ? "Notifications Enabled" : "Notifications Disabled"}
                      </p>
                      <p className={`text-xs ${
                        pushSubscribed
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-500"
                      }`}>
                        {pushSubscribed
                          ? "You'll receive reminders for scheduled content"
                          : "Enable to get reminded when content is ready to post"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => pushSubscribed ? pushUnsubscribe() : pushSubscribe()}
                    disabled={pushLoading}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 ${
                      pushSubscribed
                        ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {pushLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        {pushSubscribed ? "Disabling..." : "Enabling..."}
                      </span>
                    ) : (
                      pushSubscribed ? "Disable" : "Enable Notifications"
                    )}
                  </button>
                </div>
              </div>

              {pushSubscribed && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-medium">How it works:</span> When you schedule content, we&apos;ll send you a reminder 15 minutes before it&apos;s time to post. Make sure to keep this browser tab open or allow background notifications.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Voice Profile Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Writing Voice</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Add writing samples to match your style
              </p>
            </div>
            {!isCreatingProfile && (
              <button
                onClick={() => setIsCreatingProfile(true)}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Profile
              </button>
            )}
          </div>

          {/* Create Profile Form */}
          {isCreatingProfile && (
            <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Profile Name</label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g., My LinkedIn Voice"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Style Notes (optional)</label>
                  <input
                    type="text"
                    value={newProfileDescription}
                    onChange={(e) => setNewProfileDescription(e.target.value)}
                    placeholder="e.g., Conversational, uses short sentences, avoids jargon"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Writing Samples ({newProfileSamples.length}/5)
                  </label>
                  <p className="text-xs text-zinc-500 mb-2">
                    Paste 2-3 examples of your writing. LinkedIn posts, paragraphs from articles, etc.
                  </p>
                  {newProfileSamples.map((sample, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <textarea
                        value={sample}
                        onChange={(e) => updateSample(i, e.target.value)}
                        placeholder={`Writing sample ${i + 1}...`}
                        rows={3}
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                      {newProfileSamples.length > 1 && (
                        <button
                          onClick={() => removeSample(i)}
                          className="px-2 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {newProfileSamples.length < 5 && (
                    <button
                      onClick={addSampleField}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    >
                      + Add another sample
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={createVoiceProfile}
                    disabled={!newProfileName.trim() || newProfileSamples.every(s => !s.trim())}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingProfile(false);
                      setNewProfileName("");
                      setNewProfileDescription("");
                      setNewProfileSamples([""]);
                    }}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Existing Profiles */}
          {voiceProfiles.length > 0 ? (
            <div className="space-y-3">
              {voiceProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    profile.id === activeProfileId
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{profile.name}</span>
                        {profile.id === activeProfileId && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      {profile.description && (
                        <p className="text-sm text-zinc-500 mt-1">{profile.description}</p>
                      )}
                      <p className="text-xs text-zinc-400 mt-2">
                        {profile.samples.length} sample{profile.samples.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.id !== activeProfileId && (
                        <button
                          onClick={() => activateProfile(profile.id)}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          Use
                        </button>
                      )}
                      <button
                        onClick={() => deleteProfile(profile.id)}
                        className="px-2 py-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !isCreatingProfile ? (
            <div className="text-center py-8 text-zinc-500">
              <p className="mb-2">No voice profiles yet</p>
              <p className="text-sm text-zinc-400">Create a profile with your writing samples to match your style</p>
            </div>
          ) : null}
        </section>

        {/* Brand Management Section */}
        <BrandStylesSection />

        {/* LinkedIn Integration Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">LinkedIn</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Connect your LinkedIn account to publish posts directly
            </p>
          </div>
          <LinkedInConnection />
        </section>

        {/* Account Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Account</h2>
          {userInfo ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm text-zinc-500">Email</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{userInfo.email || "—"}</span>
              </div>

              {/* Content Generations */}
              <div className="pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Content Generations
                </h3>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-zinc-500">Used</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {userInfo.contentUsed ?? userInfo.used} / {userInfo.contentLimit ?? userInfo.limit}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-zinc-500">Remaining</span>
                  {(() => {
                    const remaining = userInfo.contentRemaining ?? userInfo.remaining;
                    const isLow = typeof remaining === "number" && remaining <= 2;
                    return (
                      <span className={`text-sm font-medium ${isLow ? "text-amber-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {remaining}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Image Generations */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Image Generations
                </h3>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-zinc-500">Used</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {userInfo.imageUsed ?? 0} / {userInfo.imageLimit ?? 25}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-zinc-500">Remaining</span>
                  {(() => {
                    const remaining = userInfo.imageRemaining ?? 25;
                    const isLow = typeof remaining === "number" && remaining <= 2;
                    return (
                      <span className={`text-sm font-medium ${isLow ? "text-amber-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {remaining}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Loading account info...</p>
          )}
        </section>

        {/* Subscription Section */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Subscription</h2>
          <SubscriptionStatus />
        </section>

        {/* Current Config Debug */}
        <div className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Current Configuration:</p>
          <pre className="text-xs text-zinc-600 dark:text-zinc-400">
            {JSON.stringify({ llm: llmPreferences, image: imagePreferences }, null, 2)}
          </pre>
        </div>
        </div>
      </main>
    </div>
  );
}

// Helper Components

function LLMProviderButton({
  provider,
  currentProvider,
  onClick,
  label,
  description,
  available,
}: {
  provider: LLMProvider;
  currentProvider: LLMProvider;
  onClick: () => void;
  label: string;
  description: string;
  available: boolean;
}) {
  const isActive = provider === currentProvider;
  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
        isActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : !available
          ? "border-zinc-200 dark:border-zinc-700 opacity-50 cursor-not-allowed"
          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
        <span
          className={`w-2 h-2 rounded-full ${
            available ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
      </div>
      <div className="text-xs text-zinc-500 mt-1">{description}</div>
    </button>
  );
}

function ModelButton({
  model,
  currentModel,
  onClick,
  label,
  description,
}: {
  model: string;
  currentModel?: string;
  onClick: () => void;
  label: string;
  description: string;
}) {
  const isActive = model === currentModel;
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border-2 text-left transition-all ${
        isActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
      }`}
    >
      <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{label}</div>
      <div className="text-xs text-zinc-500">{description}</div>
    </button>
  );
}

