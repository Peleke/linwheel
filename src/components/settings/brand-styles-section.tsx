"use client";

import { useState, useEffect, useCallback } from "react";
import { BRAND_STYLE_PRESETS } from "@/lib/brand-styles/presets";
import type { ColorDefinition, ImageryApproach } from "@/db/schema";

interface BrandStyleProfile {
  id: string;
  name: string;
  description: string | null;
  primaryColors: ColorDefinition[];
  secondaryColors: ColorDefinition[] | null;
  colorMood: string | null;
  imageryApproach: ImageryApproach;
  artisticReferences: string[] | null;
  lightingPreference: string | null;
  compositionStyle: string | null;
  moodDescriptors: string[] | null;
  stylePrefix: string | null;
  styleSuffix: string | null;
  isActive: boolean;
  createdAt: string;
}

const IMAGERY_APPROACH_OPTIONS: { value: ImageryApproach; label: string; description: string }[] = [
  { value: "photography", label: "Photography", description: "Professional photo style" },
  { value: "illustration", label: "Illustration", description: "Hand-drawn or digital art" },
  { value: "abstract", label: "Abstract", description: "Geometric and artistic" },
  { value: "3d_render", label: "3D Render", description: "Sleek 3D graphics" },
  { value: "mixed", label: "Mixed Media", description: "Combination of styles" },
];

export function BrandStylesSection() {
  const [profiles, setProfiles] = useState<BrandStyleProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BrandStyleProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    primaryColors: ColorDefinition[];
    colorMood: string;
    imageryApproach: ImageryApproach;
    artisticReferences: string;
    lightingPreference: string;
    compositionStyle: string;
    moodDescriptors: string;
    stylePrefix: string;
    styleSuffix: string;
  }>({
    name: "",
    description: "",
    primaryColors: [{ hex: "#3b82f6", name: "Blue", usage: "primary" }],
    colorMood: "",
    imageryApproach: "photography",
    artisticReferences: "",
    lightingPreference: "",
    compositionStyle: "",
    moodDescriptors: "",
    stylePrefix: "",
    styleSuffix: "",
  });

  const fetchProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/brand-styles");
      if (!res.ok) throw new Error("Failed to fetch brand styles");
      const data = await res.json();
      setProfiles(data.profiles || []);
      setActiveProfileId(data.activeProfileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brand styles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleCreateProfile = async () => {
    try {
      setError(null);
      const res = await fetch("/api/brand-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          primaryColors: formData.primaryColors,
          colorMood: formData.colorMood || null,
          imageryApproach: formData.imageryApproach,
          artisticReferences: formData.artisticReferences
            ? formData.artisticReferences.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
          lightingPreference: formData.lightingPreference || null,
          compositionStyle: formData.compositionStyle || null,
          moodDescriptors: formData.moodDescriptors
            ? formData.moodDescriptors.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
          stylePrefix: formData.stylePrefix || null,
          styleSuffix: formData.styleSuffix || null,
          isActive: profiles.length === 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create brand style");
      }

      setIsCreating(false);
      resetForm();
      fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brand style");
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;
    try {
      setError(null);
      const res = await fetch(`/api/brand-styles/${editingProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          primaryColors: formData.primaryColors,
          colorMood: formData.colorMood || null,
          imageryApproach: formData.imageryApproach,
          artisticReferences: formData.artisticReferences
            ? formData.artisticReferences.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
          lightingPreference: formData.lightingPreference || null,
          compositionStyle: formData.compositionStyle || null,
          moodDescriptors: formData.moodDescriptors
            ? formData.moodDescriptors.split(",").map((s) => s.trim()).filter(Boolean)
            : null,
          stylePrefix: formData.stylePrefix || null,
          styleSuffix: formData.styleSuffix || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update brand style");
      }

      setEditingProfile(null);
      resetForm();
      fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update brand style");
    }
  };

  const startEditing = (profile: BrandStyleProfile) => {
    setEditingProfile(profile);
    setIsCreating(false);
    setFormData({
      name: profile.name,
      description: profile.description || "",
      primaryColors: profile.primaryColors,
      colorMood: profile.colorMood || "",
      imageryApproach: profile.imageryApproach,
      artisticReferences: profile.artisticReferences?.join(", ") || "",
      lightingPreference: profile.lightingPreference || "",
      compositionStyle: profile.compositionStyle || "",
      moodDescriptors: profile.moodDescriptors?.join(", ") || "",
      stylePrefix: profile.stylePrefix || "",
      styleSuffix: profile.styleSuffix || "",
    });
  };

  const handleActivate = async (id: string) => {
    try {
      await fetch(`/api/brand-styles/${id}/activate`, { method: "POST" });
      fetchProfiles();
    } catch (err) {
      console.error("Failed to activate profile:", err);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await fetch(`/api/brand-styles/${id}/activate`, { method: "DELETE" });
      fetchProfiles();
    } catch (err) {
      console.error("Failed to deactivate profile:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand style?")) return;
    try {
      const res = await fetch(`/api/brand-styles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete brand style");
    }
  };

  const applyPreset = (presetKey: keyof typeof BRAND_STYLE_PRESETS) => {
    const preset = BRAND_STYLE_PRESETS[presetKey];
    setFormData({
      name: preset.name,
      description: preset.description,
      primaryColors: preset.primaryColors,
      colorMood: preset.colorMood,
      imageryApproach: preset.imageryApproach,
      artisticReferences: "",
      lightingPreference: preset.lightingPreference,
      compositionStyle: preset.compositionStyle,
      moodDescriptors: preset.moodDescriptors.join(", "),
      stylePrefix: "",
      styleSuffix: preset.styleSuffix,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      primaryColors: [{ hex: "#3b82f6", name: "Blue", usage: "primary" }],
      colorMood: "",
      imageryApproach: "photography",
      artisticReferences: "",
      lightingPreference: "",
      compositionStyle: "",
      moodDescriptors: "",
      stylePrefix: "",
      styleSuffix: "",
    });
  };

  const updatePrimaryColor = (index: number, field: "hex" | "name", value: string) => {
    const updated = [...formData.primaryColors];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, primaryColors: updated });
  };

  const addColor = () => {
    if (formData.primaryColors.length < 3) {
      setFormData({
        ...formData,
        primaryColors: [
          ...formData.primaryColors,
          { hex: "#10b981", name: "", usage: "accent" as const },
        ],
      });
    }
  };

  const removeColor = (index: number) => {
    if (formData.primaryColors.length > 1) {
      setFormData({
        ...formData,
        primaryColors: formData.primaryColors.filter((_, i) => i !== index),
      });
    }
  };

  if (isLoading) {
    return (
      <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
          <div className="h-4 w-64 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Brand Style</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Define your visual identity for AI-generated images
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            + New Style
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingProfile) && (
        <div className="mb-6 p-5 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800/50">
          {/* Preset Buttons */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
              Quick Start Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(BRAND_STYLE_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key as keyof typeof BRAND_STYLE_PRESETS)}
                  className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Style Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Tech Innovator"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Imagery Approach */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Imagery Approach *
              </label>
              <select
                value={formData.imageryApproach}
                onChange={(e) => setFormData({ ...formData, imageryApproach: e.target.value as ImageryApproach })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {IMAGERY_APPROACH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} - {opt.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this style"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* Colors */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Brand Colors *
            </label>
            <div className="space-y-2">
              {formData.primaryColors.map((color, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(e) => updatePrimaryColor(i, "hex", e.target.value)}
                    className="w-10 h-10 rounded-lg border border-zinc-300 dark:border-zinc-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color.name}
                    onChange={(e) => updatePrimaryColor(i, "name", e.target.value)}
                    placeholder="Color name (e.g., Brand Blue)"
                    className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <span className="text-xs text-zinc-500 w-16">{color.hex}</span>
                  {formData.primaryColors.length > 1 && (
                    <button onClick={() => removeColor(i)} className="text-zinc-400 hover:text-red-500">
                      ×
                    </button>
                  )}
                </div>
              ))}
              {formData.primaryColors.length < 3 && (
                <button
                  onClick={addColor}
                  className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
                >
                  + Add color
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Color Mood */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Color Mood
              </label>
              <input
                type="text"
                value={formData.colorMood}
                onChange={(e) => setFormData({ ...formData, colorMood: e.target.value })}
                placeholder="e.g., cool and professional"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Lighting */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Lighting Preference
              </label>
              <input
                type="text"
                value={formData.lightingPreference}
                onChange={(e) => setFormData({ ...formData, lightingPreference: e.target.value })}
                placeholder="e.g., soft natural, dramatic studio"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Composition */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Composition Style
              </label>
              <input
                type="text"
                value={formData.compositionStyle}
                onChange={(e) => setFormData({ ...formData, compositionStyle: e.target.value })}
                placeholder="e.g., minimalist centered"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* Mood Descriptors */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Mood Keywords
              </label>
              <input
                type="text"
                value={formData.moodDescriptors}
                onChange={(e) => setFormData({ ...formData, moodDescriptors: e.target.value })}
                placeholder="e.g., bold, innovative, sleek"
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Style Suffix (advanced) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Quality Keywords (appended to all prompts)
            </label>
            <input
              type="text"
              value={formData.styleSuffix}
              onChange={(e) => setFormData({ ...formData, styleSuffix: e.target.value })}
              placeholder="e.g., 4K, ultra detailed, professional quality"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={editingProfile ? handleUpdateProfile : handleCreateProfile}
              disabled={!formData.name.trim() || formData.primaryColors.length === 0}
              className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingProfile ? "Save Changes" : "Create Brand Style"}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingProfile(null);
                resetForm();
                setError(null);
              }}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing Profiles */}
      {profiles.length > 0 ? (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                profile.isActive
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Color swatches */}
                    <div className="flex -space-x-1">
                      {profile.primaryColors.slice(0, 3).map((color, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{profile.name}</span>
                    {profile.isActive && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  {profile.description && (
                    <p className="text-sm text-zinc-500 mb-1">{profile.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="capitalize">{profile.imageryApproach.replace("_", " ")}</span>
                    {profile.lightingPreference && <span>• {profile.lightingPreference}</span>}
                    {profile.moodDescriptors && profile.moodDescriptors.length > 0 && (
                      <span>• {profile.moodDescriptors.slice(0, 2).join(", ")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditing(profile)}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  {profile.isActive ? (
                    <button
                      onClick={() => handleDeactivate(profile.id)}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(profile.id)}
                      className="px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    >
                      Activate
                    </button>
                  )}
                  {!profile.isActive && (
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="px-2 py-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !isCreating ? (
        <div className="text-center py-8 text-zinc-500">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
          </div>
          <p className="mb-1 font-medium">No brand styles yet</p>
          <p className="text-sm text-zinc-400">Create a style to maintain consistent visuals across all your content</p>
        </div>
      ) : null}
    </section>
  );
}
