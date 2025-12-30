"use client";

import { useEffect, useState, useCallback } from "react";
import { useImagePreferences, type ImagePreferences } from "@/hooks/use-image-preferences";
import { AppHeader } from "@/components/app-header";
import type { T2IProviderType } from "@/lib/t2i/types";

interface ProviderStatus {
  openai: boolean;
  fal: boolean;
  comfyui: boolean;
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
    preferences,
    isLoaded,
    setProvider,
    setMode,
    setFalModel,
    setOpenaiModel,
  } = useImagePreferences();

  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    openai: false,
    fal: false,
    comfyui: false,
  });

  // Voice profile state
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDescription, setNewProfileDescription] = useState("");
  const [newProfileSamples, setNewProfileSamples] = useState<string[]>([""]);

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

  // Fetch provider status on mount
  useEffect(() => {
    fetch("/api/images/generate")
      .then((res) => res.json())
      .then((data) => {
        if (data.providers) {
          setProviderStatus(data.providers);
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

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1">
              Configure your image generation preferences.
            </p>
          </div>

        {/* Image Generation Section */}
        <section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Image Generation</h2>

          {/* Generation Mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Generation Mode
            </label>
            <div className="flex gap-3">
              <ModeButton
                mode="cloud"
                currentMode={preferences.mode}
                onClick={() => setMode("cloud")}
                label="Cloud"
                description="Use cloud APIs (FAL.ai, OpenAI)"
              />
              <ModeButton
                mode="local"
                currentMode={preferences.mode}
                onClick={() => setMode("local")}
                label="Local"
                description="Use local ComfyUI server"
                disabled={!providerStatus.comfyui}
              />
            </div>
          </div>

          {/* Cloud Provider Selection */}
          {preferences.mode === "cloud" && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Cloud Provider
              </label>
              <div className="flex gap-3">
                <ProviderButton
                  provider="fal"
                  currentProvider={preferences.provider}
                  onClick={() => setProvider("fal")}
                  label="FAL.ai"
                  description="FLUX models"
                  available={providerStatus.fal}
                />
                <ProviderButton
                  provider="openai"
                  currentProvider={preferences.provider}
                  onClick={() => setProvider("openai")}
                  label="OpenAI"
                  description="GPT Image"
                  available={providerStatus.openai}
                />
              </div>
            </div>
          )}

          {/* FAL Model Selection */}
          {preferences.mode === "cloud" && preferences.provider === "fal" && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                FAL Model
              </label>
              <div className="grid grid-cols-3 gap-3">
                <ModelButton
                  model="flux-dev"
                  currentModel={preferences.falModel}
                  onClick={() => setFalModel("flux-dev")}
                  label="FLUX.1 Dev"
                  description="Best quality"
                />
                <ModelButton
                  model="flux-pro"
                  currentModel={preferences.falModel}
                  onClick={() => setFalModel("flux-pro")}
                  label="FLUX Pro"
                  description="Faster"
                />
                <ModelButton
                  model="recraft-v3"
                  currentModel={preferences.falModel}
                  onClick={() => setFalModel("recraft-v3")}
                  label="Recraft V3"
                  description="Best for text"
                />
              </div>
            </div>
          )}

          {/* OpenAI Model Selection */}
          {preferences.mode === "cloud" && preferences.provider === "openai" && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                OpenAI Model
              </label>
              <div className="grid grid-cols-3 gap-3">
                <ModelButton
                  model="gpt-image-1"
                  currentModel={preferences.openaiModel}
                  onClick={() => setOpenaiModel("gpt-image-1")}
                  label="GPT Image 1"
                  description="Default"
                />
                <ModelButton
                  model="gpt-image-1.5"
                  currentModel={preferences.openaiModel}
                  onClick={() => setOpenaiModel("gpt-image-1.5")}
                  label="GPT Image 1.5"
                  description="Improved"
                />
                <ModelButton
                  model="dall-e-3"
                  currentModel={preferences.openaiModel}
                  onClick={() => setOpenaiModel("dall-e-3")}
                  label="DALL-E 3"
                  description="Legacy"
                />
              </div>
            </div>
          )}

          {/* Local Mode Info */}
          {preferences.mode === "local" && (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {providerStatus.comfyui ? (
                  <>ComfyUI server detected. Images will be generated locally.</>
                ) : (
                  <>
                    ComfyUI not configured. Set <code className="bg-neutral-200 dark:bg-neutral-600 px-1 rounded">COMFYUI_SERVER_URL</code> in your environment.
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        {/* Voice Profile Section */}
        <section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Writing Voice</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Add writing samples to match your style
              </p>
            </div>
            {!isCreatingProfile && (
              <button
                onClick={() => setIsCreatingProfile(true)}
                className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Profile
              </button>
            )}
          </div>

          {/* Create Profile Form */}
          {isCreatingProfile && (
            <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg border border-neutral-200 dark:border-neutral-600">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Profile Name</label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g., My LinkedIn Voice"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Style Notes (optional)</label>
                  <input
                    type="text"
                    value={newProfileDescription}
                    onChange={(e) => setNewProfileDescription(e.target.value)}
                    placeholder="e.g., Conversational, uses short sentences, avoids jargon"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Writing Samples ({newProfileSamples.length}/5)
                  </label>
                  <p className="text-xs text-neutral-500 mb-2">
                    Paste 2-3 examples of your writing. LinkedIn posts, paragraphs from articles, etc.
                  </p>
                  {newProfileSamples.map((sample, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <textarea
                        value={sample}
                        onChange={(e) => updateSample(i, e.target.value)}
                        placeholder={`Writing sample ${i + 1}...`}
                        rows={3}
                        className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm resize-none"
                      />
                      {newProfileSamples.length > 1 && (
                        <button
                          onClick={() => removeSample(i)}
                          className="px-2 text-neutral-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {newProfileSamples.length < 5 && (
                    <button
                      onClick={addSampleField}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add another sample
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
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
                    className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
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
                      : "border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{profile.name}</span>
                        {profile.id === activeProfileId && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      {profile.description && (
                        <p className="text-sm text-neutral-500 mt-1">{profile.description}</p>
                      )}
                      <p className="text-xs text-neutral-400 mt-2">
                        {profile.samples.length} sample{profile.samples.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.id !== activeProfileId && (
                        <button
                          onClick={() => activateProfile(profile.id)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        >
                          Use
                        </button>
                      )}
                      <button
                        onClick={() => deleteProfile(profile.id)}
                        className="px-2 py-1 text-xs text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !isCreatingProfile ? (
            <div className="text-center py-8 text-neutral-500">
              <p className="mb-2">No voice profiles yet</p>
              <p className="text-sm">Create a profile with your writing samples to match your style</p>
            </div>
          ) : null}
        </section>

        {/* Provider Status */}
        <section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Provider Status</h2>
          <div className="space-y-3">
            <StatusRow label="OpenAI" available={providerStatus.openai} envVar="OPENAI_API_KEY" />
            <StatusRow label="FAL.ai" available={providerStatus.fal} envVar="FAL_KEY" />
            <StatusRow label="ComfyUI" available={providerStatus.comfyui} envVar="COMFYUI_SERVER_URL" />
          </div>
        </section>

        {/* Account Section (Placeholder) */}
        <section className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 opacity-50">
          <h2 className="text-lg font-semibold mb-2">Account</h2>
          <p className="text-sm text-neutral-500">
            Coming soon with Supabase authentication.
          </p>
        </section>

        {/* Current Config Debug */}
        <div className="mt-8 p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg">
          <p className="text-xs text-neutral-500 mb-2">Current Configuration:</p>
          <pre className="text-xs text-neutral-600 dark:text-neutral-400">
            {JSON.stringify(preferences, null, 2)}
          </pre>
        </div>
        </div>
      </main>
    </div>
  );
}

// Helper Components

function ModeButton({
  mode,
  currentMode,
  onClick,
  label,
  description,
  disabled,
}: {
  mode: ImagePreferences["mode"];
  currentMode: ImagePreferences["mode"];
  onClick: () => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  const isActive = mode === currentMode;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
        isActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : disabled
          ? "border-neutral-200 dark:border-neutral-700 opacity-50 cursor-not-allowed"
          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className="text-xs text-neutral-500 mt-1">{description}</div>
    </button>
  );
}

function ProviderButton({
  provider,
  currentProvider,
  onClick,
  label,
  description,
  available,
}: {
  provider: T2IProviderType;
  currentProvider: T2IProviderType;
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
          ? "border-neutral-200 dark:border-neutral-700 opacity-50 cursor-not-allowed"
          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{label}</span>
        <span
          className={`w-2 h-2 rounded-full ${
            available ? "bg-green-500" : "bg-red-500"
          }`}
        />
      </div>
      <div className="text-xs text-neutral-500 mt-1">{description}</div>
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
          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
      }`}
    >
      <div className="font-medium text-sm">{label}</div>
      <div className="text-xs text-neutral-500">{description}</div>
    </button>
  );
}

function StatusRow({
  label,
  available,
  envVar,
}: {
  label: string;
  available: boolean;
  envVar: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            available ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span>{label}</span>
      </div>
      <code className="text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded">
        {envVar}
      </code>
    </div>
  );
}
