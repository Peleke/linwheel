# Tech-Spec: Multi-Agent Content Generation System

**Created:** 2024-12-22
**Status:** Ready for Development

## Overview

### Problem Statement
LinWheel currently generates a single post per insight with one angle (contrarian, field_note, etc.). Users need:
1. **Variety** - Multiple angles/perspectives for each insight (6 types × 5 versions = 30 options per insight)
2. **Selection** - Ability to browse, compare, and approve/discard generated content
3. **Better UX** - Loading states, organized dashboard, clear workflow
4. **Quality Image Prompts** - Current image intents produce poor results; need ComfyUI-optimized prompts

### Solution
Build a multi-agent writer system using LangChain's `RunnableParallel` to fan out to 6 specialized subwriters, each generating 5 versions. Redesign UI for list view → dashboard → approval workflow.

### Scope

**In Scope:**
- Multi-agent architecture with 6 post-type subwriters
- Each subwriter generates 5 variations per insight
- New UI: transcript list view with cards
- New UI: transcript dashboard with angle buckets
- New UI: approve/persist or discard workflow
- Angle selection before generation (all by default)
- Loading indicators throughout
- Playwright E2E tests for core flow
- Improved image intent prompts (ComfyUI-style)

**Out of Scope:**
- Actual image generation (Part II)
- User authentication (mock for now)
- Payment integration (mock for now)

## Context for Development

### Codebase Patterns

**Tech Stack:**
- Next.js 16 with App Router
- TypeScript
- Tailwind CSS v4
- Drizzle ORM + SQLite
- LangChain with `createAgent`, `providerStrategy`
- Zod for schema validation

**LLM Pattern:**
```typescript
// src/lib/llm.ts - uses createAgent + providerStrategy
const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4o-mini", temperature }),
  tools: [],
  responseFormat: providerStrategy(schema),
});
const result = await agent.invoke({ messages: [...] });
return result.structuredResponse;
```

**DB Pattern:**
```typescript
// Drizzle tables with text IDs, foreign keys
// JSON columns for arrays: { mode: "json" }.$type<string[]>()
```

**Component Pattern:**
- Server components by default
- "use client" for interactivity
- Tailwind for styling

### Files to Reference

| File | Purpose |
|------|---------|
| `src/lib/llm.ts` | LangChain agent wrapper |
| `src/lib/generate.ts` | Pipeline orchestration |
| `src/lib/prompts.ts` | System prompts |
| `src/db/schema.ts` | Database tables |
| `src/app/generate/page.tsx` | Input form |
| `src/app/results/[runId]/page.tsx` | Results display |

### Technical Decisions

1. **Multi-Agent Pattern**: Use `RunnableParallel` to fan out to subwriters simultaneously (not sequential)
2. **6 Post Angles:**
   - `contrarian` - Challenges widely-held belief
   - `field_note` - Observation from real work
   - `demystification` - Strips glamour from sacred cow
   - `identity_validation` - Makes outliers feel seen
   - `provocateur` - Stirs debate, edgy takes
   - `synthesizer` - Connects dots across domains
3. **5 Versions Each**: Temperature 0.8-0.9 for variety within each angle
4. **Image Prompt Structure** (ComfyUI best practices):
   - Concise (~60 chars / 75 tokens max)
   - Important elements first
   - Format: `subject, environment, medium, style (4W: when/who/what/where)`
   - Weighted keywords: `(keyword:1.2)` for emphasis

## Implementation Plan

### Tasks

#### Phase 1: Foundation & UX Quick Wins
- [ ] **Task 1**: Add loading indicator to /generate page
  - Spinner during API call
  - Disable form while processing
  - Show progress stages: "Chunking...", "Extracting...", "Generating..."

- [ ] **Task 2**: Set up Playwright E2E tests
  - Install Playwright: `npm init playwright@latest`
  - Test: navigate to /generate → paste content → submit → see results
  - Add to package.json scripts

#### Phase 2: Database Schema Updates
- [ ] **Task 3**: Update schema for multi-angle support
  - Add `postAngle` enum with 6 types
  - Add `approved` boolean to posts table
  - Add `versionNumber` (1-5) to posts table
  - Add `selectedAngles` JSON column to generation_runs
  - Run migration

#### Phase 3: Multi-Agent Architecture
- [ ] **Task 4**: Create subwriter prompts
  - Create `src/lib/prompts/angles.ts` with 6 angle-specific prompts
  - Each prompt emphasizes its unique perspective

- [ ] **Task 5**: Build subwriter agents
  - Create `src/lib/agents/subwriters.ts`
  - Export 6 agent factories, one per angle
  - Each generates 5 versions (temperature 0.85)

- [ ] **Task 6**: Build writer supervisor
  - Create `src/lib/agents/writer-supervisor.ts`
  - Use `RunnableParallel` to fan out to all selected subwriters
  - Collect and merge results

- [ ] **Task 7**: Update pipeline
  - Modify `runPipeline()` to accept `selectedAngles: string[]`
  - Call writer supervisor instead of single post generator
  - Return 30 posts per insight (6 angles × 5 versions)

#### Phase 4: Image Intent Improvements
- [ ] **Task 8**: Rewrite image intent prompt
  - Follow ComfyUI best practices
  - Output format: `{ prompt: string, negative_prompt: string, style_preset: string }`
  - Concise prompts with weighted keywords
  - Structure: subject → environment → medium → style (4W)

#### Phase 5: UI Redesign
- [ ] **Task 9**: Create transcript list page `/results`
  - Card grid showing all generation runs
  - Each card: title, excerpt, date, post count, status badge
  - Click → navigate to `/results/[runId]`

- [ ] **Task 10**: Redesign transcript dashboard `/results/[runId]`
  - Header: title, date, expand/collapse transcript
  - Angle selector tabs/pills (show which angles were generated)
  - For each angle: collapsible section with 5 version cards
  - Each card: hook preview, expand to see full post
  - Approve/Discard buttons per post

- [ ] **Task 11**: Add angle selection to /generate
  - Checkbox grid for 6 angles (all checked by default)
  - Brief description of each angle
  - Pass selections to API

- [ ] **Task 12**: Update API routes
  - `/api/generate`: Accept `selectedAngles` parameter
  - `/api/results/[runId]`: Return posts grouped by angle
  - `/api/posts/[postId]/approve`: Toggle approval status

### Acceptance Criteria

- [ ] **AC1**: Given user on /generate, when they paste content and submit, then loading indicator shows with progress stages
- [ ] **AC2**: Given E2E test runs, when executing core flow, then test passes without manual intervention
- [ ] **AC3**: Given user selects 3 angles, when generation completes, then 15 posts exist (3 × 5)
- [ ] **AC4**: Given user on /results, when they view list, then all runs display as cards with metadata
- [ ] **AC5**: Given user on dashboard, when they expand an angle bucket, then 5 versions display with approve/discard buttons
- [ ] **AC6**: Given user approves a post, when they refresh, then approval persists
- [ ] **AC7**: Given generated image intent, when viewed, then prompt is <75 tokens and follows subject→env→medium→style structure

## Additional Context

### Dependencies

**New packages:**
```bash
npm install @playwright/test --save-dev
```

**LangChain imports needed:**
```typescript
import { RunnableParallel } from "@langchain/core/runnables";
```

### Testing Strategy

1. **E2E (Playwright)**:
   - Core flow: /generate → submit → /results/[runId]
   - Angle selection preservation
   - Approval workflow

2. **Integration** (future):
   - API routes with mock LLM
   - Database operations

3. **Unit** (future):
   - Prompt formatting
   - Deduplication logic

### Notes

**Image Intent Prompt Example (Before):**
```
headline_text: "The wrong people are learning AI"
visual_style: "typographic_minimal"
background: "solid deep navy"
mood: "provocative"
```

**Image Intent Prompt Example (After - ComfyUI style):**
```
prompt: "(bold white text:1.3), minimal typography, dark navy background, professional tech aesthetic, clean layout, (no people:1.2), modern design"
negative_prompt: "cluttered, busy, cartoon, low quality, blurry text"
style_preset: "professional_minimal"
```

### File Structure (New/Modified)

```
src/
├── lib/
│   ├── agents/
│   │   ├── subwriters.ts      # NEW: 6 angle-specific agents
│   │   └── writer-supervisor.ts # NEW: RunnableParallel orchestrator
│   ├── prompts/
│   │   ├── angles.ts          # NEW: 6 angle prompts
│   │   └── image-intent.ts    # NEW: ComfyUI-style prompt
│   ├── llm.ts                 # MODIFY: export RunnableParallel util
│   └── generate.ts            # MODIFY: use supervisor, accept angles
├── app/
│   ├── generate/
│   │   └── page.tsx           # MODIFY: loading state, angle checkboxes
│   ├── results/
│   │   ├── page.tsx           # NEW: list view of all runs
│   │   └── [runId]/
│   │       └── page.tsx       # MODIFY: dashboard with buckets
│   └── api/
│       ├── generate/
│       │   └── route.ts       # MODIFY: accept selectedAngles
│       ├── results/
│       │   └── [runId]/
│       │       └── route.ts   # MODIFY: group by angle
│       └── posts/
│           └── [postId]/
│               └── approve/
│                   └── route.ts # NEW: toggle approval
├── db/
│   └── schema.ts              # MODIFY: add angle, approved, version cols
└── e2e/
    └── core-flow.spec.ts      # NEW: Playwright test
```
