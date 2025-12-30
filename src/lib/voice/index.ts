/**
 * Voice Profile System
 *
 * Manages writing style profiles for few-shot style matching.
 * Stores example writing samples and injects them into generation prompts.
 */

import { db } from "@/db";
import { voiceProfiles, type VoiceProfile, type NewVoiceProfile } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the currently active voice profile
 */
export async function getActiveVoiceProfile(): Promise<VoiceProfile | null> {
  const profile = await db.query.voiceProfiles.findFirst({
    where: eq(voiceProfiles.isActive, true),
  });
  return profile ?? null;
}

/**
 * Get all voice profiles
 */
export async function getAllVoiceProfiles(): Promise<VoiceProfile[]> {
  return db.query.voiceProfiles.findMany({
    orderBy: (profiles, { desc }) => [desc(profiles.createdAt)],
  });
}

/**
 * Create a new voice profile
 */
export async function createVoiceProfile(
  profile: Omit<NewVoiceProfile, "id" | "createdAt" | "updatedAt">
): Promise<VoiceProfile> {
  const id = crypto.randomUUID();

  // If this is the first profile or marked as active, deactivate others
  if (profile.isActive) {
    await db
      .update(voiceProfiles)
      .set({ isActive: false })
      .where(eq(voiceProfiles.isActive, true));
  }

  await db.insert(voiceProfiles).values({
    id,
    ...profile,
  });

  const created = await db.query.voiceProfiles.findFirst({
    where: eq(voiceProfiles.id, id),
  });

  return created!;
}

/**
 * Update a voice profile
 */
export async function updateVoiceProfile(
  id: string,
  updates: Partial<Omit<NewVoiceProfile, "id" | "createdAt">>
): Promise<VoiceProfile | null> {
  // If activating this profile, deactivate others first
  if (updates.isActive) {
    await db
      .update(voiceProfiles)
      .set({ isActive: false })
      .where(eq(voiceProfiles.isActive, true));
  }

  await db
    .update(voiceProfiles)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(voiceProfiles.id, id));

  const result = await db.query.voiceProfiles.findFirst({
    where: eq(voiceProfiles.id, id),
  });

  return result ?? null;
}

/**
 * Delete a voice profile
 */
export async function deleteVoiceProfile(id: string): Promise<boolean> {
  const result = await db
    .delete(voiceProfiles)
    .where(eq(voiceProfiles.id, id));
  return true;
}

/**
 * Set a profile as active (deactivates all others)
 */
export async function setActiveProfile(id: string): Promise<void> {
  // Deactivate all
  await db
    .update(voiceProfiles)
    .set({ isActive: false })
    .where(eq(voiceProfiles.isActive, true));

  // Activate the selected one
  await db
    .update(voiceProfiles)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(voiceProfiles.id, id));
}

/**
 * Build a voice/style instruction block for prompts
 * Returns empty string if no active profile
 */
export async function buildVoicePromptBlock(): Promise<string> {
  const profile = await getActiveVoiceProfile();

  if (!profile || profile.samples.length === 0) {
    return "";
  }

  const samplesBlock = profile.samples
    .map((sample, i) => `<example_${i + 1}>\n${sample}\n</example_${i + 1}>`)
    .join("\n\n");

  return `
## VOICE & STYLE MATCHING

The user has provided examples of their writing style. Match this voice, tone, and personality closely.

${profile.description ? `Style notes: ${profile.description}\n` : ""}
### Writing Examples:
${samplesBlock}

IMPORTANT: Emulate the voice, sentence structure, vocabulary, and personality shown in these examples. The output should sound like it was written by the same person.
`;
}

/**
 * Inject voice profile into a system prompt
 */
export async function injectVoiceIntoPrompt(basePrompt: string): Promise<string> {
  const voiceBlock = await buildVoicePromptBlock();

  if (!voiceBlock) {
    return basePrompt;
  }

  // Insert voice block after the first paragraph/section
  return `${basePrompt}\n\n${voiceBlock}`;
}
