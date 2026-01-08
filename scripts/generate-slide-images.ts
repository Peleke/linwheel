/**
 * Generate images for LinWheel pitch deck
 * Run with: npx tsx scripts/generate-slide-images.ts
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
  category: "background" | "embedded" | "icon";
}

const SLIDE_IMAGES: ImageSpec[] = [
  // ==================== BACKGROUNDS ====================
  {
    name: "hero-bg",
    category: "background",
    prompt: `Stunning abstract digital art representing AI-powered content creation and transformation.
    Flowing streams of luminous energy in deep indigo, electric purple, and hot pink.
    Thousands of tiny golden particles swirling and converging into brilliant light.
    Neural network patterns subtly visible in the background.
    Cinematic depth with volumetric lighting, ethereal glow effects.
    Dark space background transitioning to vibrant energy at center.
    Ultra premium 8K quality, dramatic lighting, awe-inspiring scale.
    No text, no logos, no faces. Pure abstract visual art.`,
    size: "landscape_16_9",
  },
  {
    name: "problem-bg",
    category: "background",
    prompt: `Abstract visualization of content creation chaos and frustration.
    Scattered, fragmented geometric shapes in muted grays and dull oranges.
    Papers and documents flying chaotically, disorganized swirls.
    Dark moody atmosphere with dramatic shadows.
    Tension and complexity visualized through tangled lines and broken patterns.
    Overwhelm represented by overlapping, cluttered visual elements.
    Deep red and orange accents suggesting urgency and pain.
    Cinematic quality, dramatic lighting from above.
    No text, no faces, abstract metaphor only.`,
    size: "landscape_16_9",
  },
  {
    name: "solution-bg",
    category: "background",
    prompt: `Abstract visualization of elegant transformation and order emerging from chaos.
    Left side: fading gray particles dispersing.
    Center and right: beautiful crystalline structures forming, luminous blue and cyan.
    Flowing energy streams organizing into perfect geometric patterns.
    Clean, serene, powerful sense of clarity and control.
    Soft ethereal glow, premium tech aesthetic.
    Deep navy to bright teal gradient atmosphere.
    Represents raw content becoming polished, organized output.
    8K cinematic quality, volumetric lighting.
    No text, no logos, abstract visual only.`,
    size: "landscape_16_9",
  },
  {
    name: "competitive-bg",
    category: "background",
    prompt: `Abstract visualization of competitive dominance and market leadership.
    Central glowing golden/amber structure rising triumphantly.
    Surrounding fallen, faded gray geometric shapes representing defeated competitors.
    Dramatic lighting from above illuminating the winner.
    Deep crimson and burnt orange accents for intensity.
    Dark dramatic background with spotlight effect.
    Power, victory, and market domination visualized abstractly.
    Epic scale, cinematic quality, dramatic contrast.
    No text, no logos, no faces. Abstract metaphor only.`,
    size: "landscape_16_9",
  },
  {
    name: "ask-bg",
    category: "background",
    prompt: `Abstract visualization of launch, momentum, and future potential.
    Brilliant rocket-like energy surge ascending through space.
    Trail of luminous particles in purple, blue, and gold streaming upward.
    Stars and cosmic elements in the background.
    Sense of explosive growth, acceleration, and infinite possibility.
    Inspiring, optimistic, energizing visual.
    Deep space purples transitioning to brilliant golden light at top.
    Premium quality, cinematic lighting, awe-inspiring scale.
    No text, no logos. Pure abstract visual metaphor.`,
    size: "landscape_16_9",
  },

  // ==================== EMBEDDED IMAGES ====================
  {
    name: "content-chaos",
    category: "embedded",
    prompt: `Abstract representation of content chaos and information overload.
    Scattered papers, documents, and notes flying in disarray.
    Tangled cables and fragmented data streams.
    Muted colors - grays, whites, dull yellows.
    Sense of overwhelm and disorganization.
    Soft lighting, slightly blurred motion.
    Clean dark background for contrast.
    Editorial quality, metaphorical visualization.
    No text visible on papers, no faces.`,
    size: "square_hd",
  },
  {
    name: "content-transformed",
    category: "embedded",
    prompt: `Abstract representation of perfectly organized content output.
    Beautiful grid of glowing content cards floating in space.
    Each card has a subtle gradient - purple, blue, teal, amber, emerald.
    Clean geometric arrangement, perfect alignment.
    Soft ambient glow emanating from each card.
    Sense of order, clarity, professional polish.
    Dark background with premium tech aesthetic.
    Represents organized, ready-to-publish content.
    No text visible, no faces. Abstract visualization.`,
    size: "square_hd",
  },
  {
    name: "seven-angles-prism",
    category: "embedded",
    prompt: `Abstract visualization of a single input splitting into 7 distinct outputs.
    Central glowing white/golden orb or prism.
    Seven luminous beams radiating outward in different colors:
    - Red (Contrarian)
    - Blue (Field Note)
    - Amber (Demystify)
    - Purple (Identity)
    - Orange (Provocateur)
    - Emerald (Synthesizer)
    - Pink (Curious Cat)
    Each beam transforms into a different shape/pattern.
    Represents perspective multiplication, content alchemy.
    Dark background, premium quality, magical feel.
    No text, no faces. Pure abstract art.`,
    size: "square_hd",
  },
  {
    name: "ai-image-magic",
    category: "embedded",
    prompt: `Abstract visualization of AI image generation in action.
    Luminous neural network patterns generating visual content.
    Streams of colorful pixels and light forming into image frames.
    Multiple floating picture frames materializing from energy.
    Purple, blue, and pink energy flows.
    Magical, creative, generative process visualized.
    Dark background with ethereal glow.
    Premium tech aesthetic, cinematic quality.
    Represents AI creating visual content instantly.
    No text, no real photos. Abstract metaphor.`,
    size: "square_hd",
  },
  {
    name: "voice-identity",
    category: "embedded",
    prompt: `Abstract visualization of unique voice and personal identity.
    Central glowing figure or avatar silhouette (abstract, not realistic).
    Surrounding sound waves, voice patterns, and personality traits visualized.
    Multiple color streams representing different aspects of voice.
    DNA helix subtly integrated, representing unique fingerprint.
    Warm amber, gold, and soft purple tones.
    Represents capturing and replicating personal writing style.
    Ethereal, personal, intimate feel.
    Dark background, premium quality.
    No realistic faces. Abstract identity visualization.`,
    size: "square_hd",
  },
  {
    name: "competitor-graveyard",
    category: "embedded",
    prompt: `Abstract visualization of competitive dominance.
    Central triumphant golden/amber crystal or trophy glowing brightly.
    Surrounding faded, crumbling gray structures representing defeated competitors.
    Dramatic spotlight on the winner.
    Scattered debris and fallen geometric shapes.
    Dark, dramatic atmosphere with crimson accents.
    Victory, dominance, market leadership visualized.
    Epic, powerful, confident energy.
    No text, no logos, no faces. Abstract metaphor.`,
    size: "square_hd",
  },
  {
    name: "value-explosion",
    category: "embedded",
    prompt: `Abstract visualization of incredible value and ROI.
    Small input (tiny seed or coin) on one side.
    Massive explosion of golden particles, coins, and value streaming outward.
    Multiplication effect, exponential growth visualized.
    Rich gold, amber, and emerald tones.
    Dark background with dramatic lighting.
    Represents $29 turning into massive content output.
    Premium quality, inspiring, impactful.
    No text, no faces. Abstract value metaphor.`,
    size: "square_hd",
  },
  {
    name: "rocket-launch",
    category: "embedded",
    prompt: `Abstract visualization of powerful launch and growth.
    Stylized rocket or arrow shape made of pure energy ascending.
    Trail of luminous particles and stars.
    Purple to golden gradient energy.
    Sense of speed, momentum, unstoppable force.
    Cosmic background with distant stars.
    Inspiring, optimistic, action-oriented.
    Premium quality, cinematic lighting.
    No realistic rocket, abstract energy visualization.
    No text, no faces.`,
    size: "square_hd",
  },

  // ==================== FEATURE ICONS ====================
  {
    name: "icon-posts",
    category: "icon",
    prompt: `Abstract minimalist icon representing multiple content posts.
    Three or four stacked glowing cards/rectangles.
    Soft blue and purple gradient.
    Clean geometric shapes, floating in space.
    Subtle glow effect, premium aesthetic.
    Dark transparent background.
    Simple, elegant, immediately recognizable.
    No text, pure visual symbol.`,
    size: "square",
  },
  {
    name: "icon-images",
    category: "icon",
    prompt: `Abstract minimalist icon representing AI image generation.
    Glowing frame with sparkles or magic particles inside.
    Soft pink and purple gradient.
    Clean geometric mountain/landscape silhouette.
    Ethereal, magical, creative energy.
    Dark transparent background.
    Simple, elegant, immediately recognizable.
    No text, pure visual symbol.`,
    size: "square",
  },
  {
    name: "icon-articles",
    category: "icon",
    prompt: `Abstract minimalist icon representing long-form article content.
    Single glowing document or scroll shape.
    Soft teal and emerald gradient.
    Lines suggesting text content (abstract, not readable).
    Clean, professional, editorial feel.
    Dark transparent background.
    Simple, elegant, immediately recognizable.
    No actual text, pure visual symbol.`,
    size: "square",
  },
  {
    name: "icon-voice",
    category: "icon",
    prompt: `Abstract minimalist icon representing voice and identity.
    Glowing sound wave or voice pattern.
    Soft amber and gold gradient.
    Clean flowing curves.
    Personal, warm, authentic feel.
    Dark transparent background.
    Simple, elegant, immediately recognizable.
    No text, pure visual symbol.`,
    size: "square",
  },
];

async function generateImage(spec: ImageSpec): Promise<string | null> {
  console.log(`\n🎨 Generating: ${spec.name} (${spec.category})...`);

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

    // Save to slides/public folder
    const outputPath = path.join(process.cwd(), "slides", "public", spec.category, `${spec.name}.png`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);

    console.log(`  ✅ Saved: ${outputPath}`);
    return `/${spec.category}/${spec.name}.png`;
  } catch (error) {
    console.error(`  ❌ Error generating ${spec.name}:`, error);
    return null;
  }
}

async function main() {
  console.log("🚀 Generating images for LinWheel pitch deck\n");
  console.log("=".repeat(60));
  console.log(`Total images to generate: ${SLIDE_IMAGES.length}`);
  console.log("=".repeat(60));

  const results: Record<string, string | null> = {};

  // Group by category for organized output
  const byCategory = {
    background: SLIDE_IMAGES.filter(s => s.category === "background"),
    embedded: SLIDE_IMAGES.filter(s => s.category === "embedded"),
    icon: SLIDE_IMAGES.filter(s => s.category === "icon"),
  };

  for (const [category, specs] of Object.entries(byCategory)) {
    console.log(`\n\n${"=".repeat(60)}`);
    console.log(`📁 Category: ${category.toUpperCase()} (${specs.length} images)`);
    console.log("=".repeat(60));

    for (const spec of specs) {
      results[spec.name] = await generateImage(spec);
      // Small delay between requests to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
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
  console.log(`✅ Success: ${successCount}/${SLIDE_IMAGES.length}`);
  console.log(`❌ Failed: ${failCount}/${SLIDE_IMAGES.length}`);
  console.log("=".repeat(60));

  if (successCount > 0) {
    console.log("\n🎉 Images saved to slides/public/");
    console.log("   Use them in slides.md with: ![alt](/background/hero-bg.png)");
    console.log("   Or as backgrounds: background: /background/hero-bg.png");
  }
}

main().catch(console.error);
