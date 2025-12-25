"use client";

import { useEffect, useState } from "react";
import { useImagePreferences, type ImagePreferences } from "@/hooks/use-image-preferences";
import { AppHeader } from "@/components/app-header";
import type { T2IProviderType } from "@/lib/t2i/types";
import Link from "next/link";

interface ProviderStatus {
  openai: boolean;
  fal: boolean;
  comfyui: boolean;
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
  }, []);

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
