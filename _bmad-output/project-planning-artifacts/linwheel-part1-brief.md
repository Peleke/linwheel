# LinWheel Part I: Content Generation Engine

## Product Brief

**Version**: 0.1.0
**Status**: Draft
**Priority**: P0 (Build First)

---

## Executive Summary

LinWheel is a content distillation engine that transforms AI podcast transcripts into ready-to-publish LinkedIn posts. Users paste a transcript, receive 4-5 polished posts with matching image intents, and edit as needed before publishing.

**Core philosophy**: Generate *publishable* content. Human reviews and tweaks, but output should be 90% done.

---

## Problem Statement

Content creators who consume AI news (podcasts, newsletters) face:
- **Time sink**: 30-60 min listening, 2+ hours extracting post ideas
- **Compression bottleneck**: Turning dense info into punchy LinkedIn format
- **Consistency gap**: Maintaining voice across multiple posts

LinWheel compresses this into: paste transcript → get posts.

---

## Target User

- **Primary**: Tech professionals building LinkedIn presence around AI topics
- **Behavior**: Listens to AI Daily Brief or similar; wants to post 3-4x/week
- **Pain**: Has insights but lacks time to format them for LinkedIn

---

## Core Features (MVP)

### 1. Transcript Ingestion
- **Input**: Paste raw transcript (Podscribe format)
- **Processing**:
  - Strip timestamps and speaker IDs
  - Chunk into 200-400 word semantic blocks
  - Handle ads/intros gracefully

**Note: JS-Rendered Source Handling**

Podscribe transcripts are JS-rendered (no static HTML). Options:

| Approach | MVP | Future |
|----------|-----|--------|
| Manual copy-paste | Yes | - |
| Playwright scraper | - | Yes |
| Podscribe API (if exists) | - | Investigate |
| Browser extension | - | Maybe |

**MVP**: User manually copies transcript text from rendered page.
**Future**: Automated fetch via headless browser or API.

### 2. Insight Extraction
- Extract 5-8 non-obvious professional claims per transcript
- Each insight includes:
  - Topic
  - Core claim
  - Why it matters
  - Common misconception it challenges
  - Professional implication

### 3. Post Generation
- Generate 4-5 **complete, ready-to-publish** LinkedIn posts
- Each post includes:
  - Hook (1-2 lines, scroll-stopping)
  - Body (3-5 declarative beats)
  - Open question (engagement driver)
  - Post type classification

### 4. Image Intent Generation
- For each post, generate visual intent:
  - Headline text (≤9 words)
  - Visual style directive
  - Background suggestion
  - Mood indicator
  - Layout hint

### 5. Results Management
- Persist runs for reload
- Copy buttons per post
- Export as markdown
- Re-generate individual posts

---

## Product Flow

```
Landing (/) → Generate (/generate) → Results (/results/[runId])
                    ↓
              [Mock Auth Gate]
                    ↓
              [Mock Pricing]
```

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page, value prop, CTA |
| `/login` | Mock auth (sets session flag) |
| `/pricing` | Free tier only (placeholder for Pro) |
| `/generate` | Transcript paste + generate |
| `/results/[runId]` | View posts, copy, export |

---

## Data Models

### TranscriptChunk
```typescript
{
  id: string
  runId: string
  index: number
  text: string
  speakerId?: string
  startTime?: string
}
```

### Insight
```typescript
{
  id: string
  runId: string
  topic: string
  claim: string
  whyItMatters: string
  misconception: string | null
  professionalImplication: string
}
```

### LinkedInPost
```typescript
{
  id: string
  insightId: string
  hook: string
  bodyBeats: string[]
  openQuestion: string
  postType: "contrarian" | "field_note" | "demystification" | "identity_validation"
  fullText: string  // Pre-assembled, ready to copy
}
```

### ImageIntent
```typescript
{
  id: string
  postId: string
  headlineText: string
  visualStyle: string
  background: string
  mood: string
  layoutHint: string
}
```

### GenerationRun
```typescript
{
  id: string
  createdAt: Date
  sourceLabel: string
  status: "pending" | "processing" | "complete" | "failed"
  postCount: number
}
```

---

## API Endpoints

### `POST /api/generate`
**Input**:
```json
{
  "transcript": "string",
  "sourceLabel": "string"
}
```

**Output**:
```json
{
  "runId": "string",
  "status": "processing"
}
```

### `GET /api/results/[runId]`
**Output**:
```json
{
  "run": GenerationRun,
  "posts": LinkedInPost[],
  "imageIntents": ImageIntent[]
}
```

### `POST /api/regenerate/[postId]`
Regenerate a single post with same insight.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 14 (App Router) | Full-stack, fast iteration |
| Styling | Tailwind CSS | Utility-first, editorial aesthetic |
| Database | SQLite + Drizzle | Zero-config persistence |
| LLM | Claude API | Quality output, good at LinkedIn voice |
| Schema | Zod | Runtime validation |

---

## Persistence Strategy

**SQLite** via Drizzle ORM:
- Single file DB
- No external dependencies
- Easy backup/restore
- Good enough for MVP scale

**What to persist**:
- Generation runs
- Posts
- Image intents

**What NOT to persist**:
- Raw transcripts (ephemeral)
- Intermediate chunks (ephemeral)
- User analytics

---

## Mock Auth

**Purpose**: UX flow only, not security.

**Implementation**:
- `/login` page with "Continue as Demo User" button
- Sets `localStorage.linwheel_user = "demo"`
- Gate `/generate` and `/results` behind this check
- No passwords, no sessions, no tokens

---

## Mock Stripe

**Purpose**: Test willingness-to-pay flow.

**Implementation**:
- `/pricing` shows:
  - Free: Unlimited (current)
  - Pro: $19/mo (coming soon) - includes image rendering
- "Upgrade" button → `/checkout?plan=pro`
- Checkout page with fake Stripe UI
- "Complete" sets `localStorage.linwheel_plan = "pro"`

---

## LinkedIn Post Voice Guidelines

Posts should:
- Be declarative, not advisory
- Use short lines, lots of whitespace
- Hook with cognitive dissonance or recognition
- End with open question, not conclusion
- Avoid: emojis, hashtags, "hot take", advice language

Post types:
1. **Contrarian**: Challenge widely-held weak belief
2. **Field Note**: Observation from real work, low ego
3. **Demystification**: Strip glamour from sacred cow
4. **Identity Validation**: "If you feel X, you're probably ahead"

---

## Success Metrics (MVP)

- User can generate 4-5 posts from one transcript paste
- Posts are 90%+ publishable without editing
- Results persist and reload
- Full flow works: landing → auth → generate → results

---

## Non-Goals (MVP)

- Real authentication
- Real payments
- Auto-posting to LinkedIn
- Scheduling
- Analytics dashboard
- Voice customization
- Image rendering (Part II)

---

## Timeline

**Target**: 1 day build

| Phase | Hours | Deliverable |
|-------|-------|-------------|
| Setup | 1 | Next.js scaffold, DB schema |
| Backend | 3 | API routes, LLM pipeline |
| Frontend | 3 | All pages, copy flow |
| Polish | 1 | Mock auth/stripe, landing |

---

## Phase II Handoff

Part I exposes `ImageIntent` objects. Part II consumes them via:
```
POST /api/render-image
{
  imageIntentId: string,
  templateId: string
}
```

Part II is a separate worktree/branch built in parallel.
