import { generateVersionsForAngle, type SubwriterPost } from "./subwriters";
import { POST_ANGLES, type PostAngle } from "@/db/schema";
import type { ExtractedInsight } from "../generate";

export interface SupervisorConfig {
  selectedAngles?: PostAngle[];
  versionsPerAngle?: number;
}

export interface SupervisorResult {
  insight: ExtractedInsight;
  posts: SubwriterPost[];
  anglesGenerated: PostAngle[];
  totalPosts: number;
}

/**
 * Writer Supervisor - Orchestrates parallel generation across all selected angles
 *
 * Uses Promise.all to fan out to multiple subwriters simultaneously:
 * - Each angle generates `versionsPerAngle` variations (default: 5)
 * - All angles run in parallel for maximum throughput
 * - Returns all posts grouped by angle
 */
export async function runWriterSupervisor(
  insight: ExtractedInsight,
  config: SupervisorConfig = {}
): Promise<SupervisorResult> {
  const {
    selectedAngles = [...POST_ANGLES], // Default: all 6 angles
    versionsPerAngle = 5,
  } = config;

  console.log(`Writer Supervisor: Generating ${selectedAngles.length} angles × ${versionsPerAngle} versions = ${selectedAngles.length * versionsPerAngle} total posts`);

  // Fan out to all subwriters in parallel
  const anglePromises = selectedAngles.map(async (angle) => {
    console.log(`  → Starting ${angle} subwriter...`);
    const posts = await generateVersionsForAngle(insight, angle, versionsPerAngle);
    console.log(`  ✓ ${angle}: ${posts.length} posts generated`);
    return posts;
  });

  // Wait for all subwriters to complete
  const results = await Promise.all(anglePromises);

  // Flatten results
  const allPosts = results.flat();

  console.log(`Writer Supervisor: Complete. Generated ${allPosts.length} total posts.`);

  return {
    insight,
    posts: allPosts,
    anglesGenerated: selectedAngles,
    totalPosts: allPosts.length,
  };
}

/**
 * Generate posts for multiple insights
 * Processes insights sequentially but angles in parallel within each insight
 */
export async function runWriterSupervisorBatch(
  insights: ExtractedInsight[],
  config: SupervisorConfig = {}
): Promise<SupervisorResult[]> {
  const results: SupervisorResult[] = [];

  for (const insight of insights) {
    const result = await runWriterSupervisor(insight, config);
    results.push(result);
  }

  return results;
}
