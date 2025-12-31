/**
 * Generate ALL decorative images for landing page
 * Run with: npx tsx scripts/generate-all-decorations.ts
 */

import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

// Configure FAL
const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
if (!apiKey) {
  console.error("FAL_KEY or FAL_API_KEY environment variable required");
  process.exit(1);
}
fal.config({ credentials: apiKey });

type ImageSize = "landscape_16_9" | "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3";

interface ImageSpec {
  name: string;
  prompt: string;
  size: ImageSize;
}

const IMAGES: ImageSpec[] = [
  // Visual Features Section Cards
  {
    name: "feature-ai-cover",
    prompt: `Abstract icon concept: AI-powered image creation.
    Central glowing paintbrush or magic wand emanating light particles.
    Soft emerald and teal glow on dark background.
    Minimalist, icon-like, premium aesthetic.
    No text, centered composition. Square format.`,
    size: "square_hd",
  },
  {
    name: "feature-carousel",
    prompt: `Abstract icon concept: multi-slide carousel.
    Five floating translucent cards/panels arranged in a gentle arc.
    Soft amber and gold glow on dark background.
    Minimalist, icon-like, premium aesthetic.
    No text, centered composition. Square format.`,
    size: "square_hd",
  },
  {
    name: "feature-download",
    prompt: `Abstract icon concept: instant download to mobile.
    Glowing arrow pointing down into a phone silhouette.
    Soft blue and cyan glow on dark background.
    Minimalist, icon-like, premium aesthetic.
    No text, centered composition. Square format.`,
    size: "square_hd",
  },
  {
    name: "feature-regenerate",
    prompt: `Abstract icon concept: regeneration and iteration.
    Circular arrows forming a refresh symbol with sparkles.
    Soft purple and pink glow on dark background.
    Minimalist, icon-like, premium aesthetic.
    No text, centered composition. Square format.`,
    size: "square_hd",
  },

  // Angles Section Background
  {
    name: "angles-bg",
    prompt: `Abstract background representing multiple perspectives and voices.
    Six subtle glowing orbs in different colors (red, green, blue, purple, yellow, indigo).
    Arranged in a gentle hexagonal pattern, interconnected with faint light threads.
    Dark background, ethereal, mysterious atmosphere.
    No text, abstract only. Very subtle, meant as background.`,
    size: "landscape_16_9",
  },

  // 6 Angle Card Images
  {
    name: "angle-contrarian",
    prompt: `Abstract concept art: challenging the consensus.
    A bright flame or torch against the current, standing alone.
    Bold red and orange glow on dark background.
    Represents courage, defiance, truth-telling.
    No text, dramatic lighting, centered composition.`,
    size: "square_hd",
  },
  {
    name: "angle-field-note",
    prompt: `Abstract concept art: observation and discovery.
    An open notebook with glowing handwritten insights floating upward.
    Soft green and emerald tones on dark background.
    Represents learning, documentation, firsthand experience.
    No text, contemplative mood, centered composition.`,
    size: "square_hd",
  },
  {
    name: "angle-demystify",
    prompt: `Abstract concept art: revealing hidden truth.
    A magnifying glass with light beams cutting through fog/mist.
    Cool blue and cyan tones on dark background.
    Represents clarity, transparency, understanding.
    No text, illuminating mood, centered composition.`,
    size: "square_hd",
  },
  {
    name: "angle-identity",
    prompt: `Abstract concept art: self-reflection and validation.
    A glowing mirror or reflective surface with a confident silhouette.
    Soft purple and pink tones on dark background.
    Represents authenticity, belonging, recognition.
    No text, empowering mood, centered composition.`,
    size: "square_hd",
  },
  {
    name: "angle-provocateur",
    prompt: `Abstract concept art: stirring debate and challenging norms.
    A glowing spark or explosion of ideas, controlled chaos.
    Bold yellow and amber tones on dark background.
    Represents boldness, controversy, thought-provoking.
    No text, energetic mood, centered composition.`,
    size: "square_hd",
  },
  {
    name: "angle-synthesizer",
    prompt: `Abstract concept art: connecting ideas across domains.
    Multiple glowing threads or neural pathways converging to a central point.
    Deep indigo and violet tones on dark background.
    Represents wisdom, pattern-recognition, insight.
    No text, harmonious mood, centered composition.`,
    size: "square_hd",
  },

  // Visual Features Section Background
  {
    name: "visual-features-bg",
    prompt: `Abstract background for visual content section.
    Flowing streams of creative energy in emerald and teal.
    Subtle image frames and photo shapes floating in space.
    Dark background, creative and inspiring atmosphere.
    Very subtle, meant as background. No text.`,
    size: "landscape_16_9",
  },
];

async function generateImage(spec: ImageSpec): Promise<string | null> {
  console.log(`\n🎨 Generating: ${spec.name}...`);

  try {
    const response = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: spec.prompt,
        image_size: spec.size,
        num_images: 1,
        output_format: "png",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: true,
      },
    });

    const result = response.data as { images: Array<{ url: string }> };
    const imageUrl = result.images?.[0]?.url;

    if (!imageUrl) {
      console.error(`  ❌ No image URL returned for ${spec.name}`);
      return null;
    }

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to public folder
    const outputPath = path.join(process.cwd(), "public", "promo", `${spec.name}.png`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);

    console.log(`  ✅ Saved: /promo/${spec.name}.png`);
    return `/promo/${spec.name}.png`;
  } catch (error) {
    console.error(`  ❌ Error generating ${spec.name}:`, error);
    return null;
  }
}

async function main() {
  console.log("🚀 Generating ALL decorative images for landing page\n");
  console.log("=".repeat(60));
  console.log(`Total images to generate: ${IMAGES.length}`);
  console.log("=".repeat(60));

  const results: Record<string, string | null> = {};
  let success = 0;
  let failed = 0;

  for (const spec of IMAGES) {
    results[spec.name] = await generateImage(spec);
    if (results[spec.name]) success++;
    else failed++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`\n📋 Summary: ${success} succeeded, ${failed} failed\n`);

  for (const [name, path] of Object.entries(results)) {
    console.log(`  ${path ? "✅" : "❌"} ${name}`);
  }

  console.log("\n🎉 Done! Update your components to use these images.");
}

main().catch(console.error);
