/**
 * Brand Style Presets
 *
 * Static preset data that can be safely imported in client components.
 * Separated from index.ts to avoid pulling in db dependencies.
 */

export const BRAND_STYLE_PRESETS = {
  corporate_professional: {
    name: "Corporate Professional",
    description: "Clean, trustworthy, business-appropriate visuals",
    primaryColors: [
      { hex: "#1e40af", name: "Navy Blue", usage: "primary" as const },
      { hex: "#f8fafc", name: "Off White", usage: "background" as const },
    ],
    colorMood: "cool and professional",
    imageryApproach: "photography" as const,
    lightingPreference: "soft studio lighting",
    compositionStyle: "centered and balanced",
    moodDescriptors: ["trustworthy", "professional", "clean"],
    texturePreference: "clean and flat",
    styleSuffix: "premium corporate quality, editorial photograph",
  },
  creative_bold: {
    name: "Creative Bold",
    description: "Vibrant, dynamic visuals that stand out",
    primaryColors: [
      { hex: "#7c3aed", name: "Vibrant Purple", usage: "primary" as const },
      { hex: "#f97316", name: "Electric Orange", usage: "accent" as const },
    ],
    colorMood: "bold and vibrant",
    imageryApproach: "illustration" as const,
    lightingPreference: "dramatic with color accents",
    compositionStyle: "dynamic and asymmetric",
    moodDescriptors: ["bold", "creative", "energetic"],
    texturePreference: "smooth gradients",
    styleSuffix: "high-contrast, visually striking, modern design",
  },
  tech_minimal: {
    name: "Tech Minimal",
    description: "Sleek, modern tech aesthetic",
    primaryColors: [
      { hex: "#0f172a", name: "Dark Slate", usage: "background" as const },
      { hex: "#38bdf8", name: "Electric Blue", usage: "accent" as const },
    ],
    colorMood: "dark and futuristic",
    imageryApproach: "3d_render" as const,
    lightingPreference: "rim lighting with neon accents",
    compositionStyle: "minimalist centered",
    moodDescriptors: ["innovative", "cutting-edge", "sleek"],
    texturePreference: "glossy and reflective",
    styleSuffix: "premium tech product aesthetic, 4K ultra detailed",
  },
  warm_personal: {
    name: "Warm Personal",
    description: "Approachable, authentic, human-centered",
    primaryColors: [
      { hex: "#fef3c7", name: "Warm Cream", usage: "background" as const },
      { hex: "#d97706", name: "Amber", usage: "accent" as const },
    ],
    colorMood: "warm and inviting",
    imageryApproach: "photography" as const,
    lightingPreference: "soft natural golden hour",
    compositionStyle: "organic and approachable",
    moodDescriptors: ["warm", "authentic", "personal"],
    texturePreference: "natural and organic",
    styleSuffix: "authentic, approachable, lifestyle photography",
  },
};
