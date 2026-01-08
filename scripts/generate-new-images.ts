/**
 * Generate additional images for LinWheel pitch deck
 * Run with: npx tsx scripts/generate-new-images.ts
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

const NEW_IMAGES: ImageSpec[] = [
  {
    name: "grind-hamster-wheel",
    prompt: `Abstract visualization of endless repetitive work and burnout.
    Circular energy pattern suggesting a hamster wheel or infinite loop.
    Muted gray, burnt orange, and deep red tones.
    Figure silhouette running endlessly (abstract, not realistic).
    Scattered clock fragments, calendar pages, exhaustion visualized.
    Dramatic shadows, cinematic moody lighting.
    Sense of futility, frustration, being trapped.
    Dark background with subtle red glow.
    No text, no realistic faces. Abstract metaphor.`,
    size: "square_hd",
  },
  {
    name: "market-gap-bridge",
    prompt: `Abstract visualization of a gap or chasm being bridged.
    Two platforms/cliffs on either side - one dark (old way), one glowing (new way).
    Central bridge made of luminous purple and blue energy connecting them.
    Left side: scattered gray fragments, chaos.
    Right side: organized golden light, order.
    LinWheel as the bridge concept - transformation pathway.
    Dramatic depth, cinematic scale, premium quality.
    Dark space background with stars.
    No text, no faces. Abstract concept art.`,
    size: "square_hd",
  },
  {
    name: "linkedin-growth",
    prompt: `Abstract visualization of professional network growth and reach.
    Central node expanding outward with connection lines.
    Blue and teal color scheme (LinkedIn brand adjacent).
    Network graph pattern with glowing nodes.
    Exponential growth suggested by expanding rings of light.
    Professional, clean, business-oriented aesthetic.
    Premium tech visualization style.
    Dark background with blue ambient glow.
    No logos, no text, no faces. Abstract network art.`,
    size: "square_hd",
  },
  {
    name: "roadmap-journey",
    prompt: `Abstract visualization of a product roadmap or journey forward.
    Glowing pathway stretching into a bright horizon.
    Milestone markers along the path as luminous orbs.
    Purple, blue, and golden gradient sky.
    Sense of progress, momentum, exciting future.
    Path winds through abstract landscape.
    Stars and cosmic elements suggesting infinite possibility.
    Inspiring, forward-looking, optimistic.
    Premium quality, cinematic lighting.
    No text, no faces. Abstract journey visualization.`,
    size: "square_hd",
  },
  {
    name: "content-factory",
    prompt: `Abstract visualization of an automated content production system.
    Central machine or processor glowing with energy.
    Raw materials (abstract shapes) entering one side.
    Polished content cards streaming out the other side.
    Gears, circuits, and energy flows visible.
    Purple, blue, and emerald color scheme.
    Efficient, powerful, automated production feel.
    Premium tech aesthetic, clean lines.
    Dark background with ambient glow.
    No text, no faces. Abstract factory metaphor.`,
    size: "square_hd",
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

    // Save to slides/public/embedded folder
    const outputPath = path.join(process.cwd(), "slides", "public", "embedded", `${spec.name}.png`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);

    console.log(`  ✅ Saved: ${outputPath}`);
    return `/embedded/${spec.name}.png`;
  } catch (error) {
    console.error(`  ❌ Error generating ${spec.name}:`, error);
    return null;
  }
}

async function main() {
  console.log("🚀 Generating additional images for LinWheel pitch deck\n");
  console.log("=".repeat(60));
  console.log(`Total images to generate: ${NEW_IMAGES.length}`);
  console.log("=".repeat(60));

  const results: Record<string, string | null> = {};

  for (const spec of NEW_IMAGES) {
    results[spec.name] = await generateImage(spec);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n\n" + "=".repeat(60));
  console.log("📋 SUMMARY");
  console.log("=".repeat(60));

  let successCount = 0;
  let failCount = 0;

  for (const [name, imagePath] of Object.entries(results)) {
    if (imagePath) {
      console.log(`  ✅ ${name}: ${imagePath}`);
      successCount++;
    } else {
      console.log(`  ❌ ${name}: FAILED`);
      failCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Success: ${successCount}/${NEW_IMAGES.length}`);
  console.log(`❌ Failed: ${failCount}/${NEW_IMAGES.length}`);
  console.log("=".repeat(60));
}

main().catch(console.error);
