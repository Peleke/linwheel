<div align="center">

# LinWheel

### Multi-Agent Content Distillation Engine for LinkedIn

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://js.langchain.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

**Transform podcast transcripts into high-performing LinkedIn posts.**

[Get Started](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [Commands](#-commands)

---

</div>

## The Problem

Content creators, entrepreneurs, and thought leaders spend **hours** manually repurposing podcast content into social posts. The process is tedious:

1. Listen/read through a 60-minute transcript
2. Identify 3-5 compelling insights
3. Rewrite each insight multiple times for different angles
4. Hope one version resonates with the algorithm

That's 4-6 hours per episode. Every. Single. Week.

## The Solution

**LinWheel** automates this entire workflow with a multi-agent AI system:

1. **Paste your transcript** — Copy directly from Podscribe or any transcription service
2. **Select your angles** — Choose from 6 distinct content perspectives
3. **Get 90+ posts** — Each insight gets 5 versions across each angle
4. **Approve & export** — Cherry-pick winners, copy with one click

The magic is in the **parallel agent architecture**: six specialized subwriters, each trained on a specific LinkedIn content angle, generating simultaneously.

---

## Features

### Multi-Angle Content Generation

Six distinct content perspectives, each with its own voice and strategy:

| Angle | Description | Example Hook |
|-------|-------------|--------------|
| **Contrarian** | Challenges widely-held beliefs | "Everyone's wrong about AI. Here's why." |
| **Field Note** | Observations from real work | "Spent 6 months testing this. Here's what I found." |
| **Demystification** | Strips glamour from sacred cows | "The 'overnight success' story nobody tells you." |
| **Identity Validation** | Makes outliers feel seen | "If you've ever felt like a fraud at work..." |
| **Provocateur** | Stirs debate with edgy takes | "Hot take: Your KPIs are lying to you." |
| **Synthesizer** | Connects dots across domains | "What jazz improvisation teaches us about hiring." |

### Intelligent Transcript Processing

- **Automatic chunking** — Long transcripts split intelligently at sentence boundaries
- **Insight extraction** — Identifies genuinely interesting, share-worthy moments
- **Deduplication** — Filters overlapping insights to maximize variety

### ComfyUI-Optimized Image Prompts

Each post includes image intent metadata designed for ComfyUI/SDXL:
- Concise prompts (~75 tokens) with weighted keywords `(keyword:1.2)`
- Negative prompts to avoid common failure modes
- Style presets: typographic_minimal, gradient_text, dark_mode, accent_bar, abstract_shapes

### Approval Workflow

- **Optimistic UI** — Instant feedback on approval clicks
- **Bulk review** — Collapsible angle buckets for efficient scanning
- **One-click copy** — Approved posts ready for LinkedIn

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│              Next.js 16 · React 19 · TypeScript              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
│           /api/generate · /api/posts/:id/approve             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Generation Pipeline                        │
│     Chunker → Extractor → Deduper → Writer Supervisor        │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌───────────┐      ┌───────────┐      ┌───────────┐
  │ Subwriter │      │ Subwriter │      │ Subwriter │
  │ Contrarian│      │ Field Note│      │   ...×6   │
  └───────────┘      └───────────┘      └───────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Image Intent Agent                        │
│              ComfyUI prompts for each post                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   SQLite    │
                    │  (Drizzle)  │
                    └─────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | Next.js 16, React 19, TypeScript | App Router, RSC, type safety |
| **Styling** | Tailwind CSS v4 | Utility-first, rapid iteration |
| **Database** | SQLite + Drizzle ORM | Zero-config, embedded, type-safe |
| **AI/LLM** | LangChain + OpenAI | Structured output, agent orchestration |
| **Testing** | Playwright | E2E tests with Chromium |

### Agent Design

The **Writer Supervisor** uses `Promise.all` for parallel execution:

```typescript
// Each angle runs simultaneously
const anglePromises = selectedAngles.map(async (angle) => {
  return generateVersionsForAngle(insight, angle, versionsPerAngle);
});
const results = await Promise.all(anglePromises);
```

This is simpler than a full LangGraph StateGraph because:
- No inter-agent communication needed
- Each subwriter is stateless
- Results merge at the end without conflicts

---

## Quick Start

### Prerequisites

- Node.js 20+
- OpenAI API key

### Installation

```bash
# Clone
git clone https://github.com/Peleke/linwheel.git
cd linwheel

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
```

### Environment Configuration

```bash
# .env.local

OPENAI_API_KEY=your-openai-key
```

### Database Setup

```bash
# Generate initial migrations
npm run db:generate

# Apply migrations
npm run db:migrate
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
linwheel/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── generate/       # POST: run pipeline
│   │   │   └── posts/          # POST: approve/unapprove
│   │   ├── generate/           # Input form page
│   │   └── results/            # List + dashboard pages
│   ├── components/             # React components
│   │   ├── approval-buttons.tsx
│   │   └── copy-button.tsx
│   ├── db/                     # Drizzle schema & client
│   └── lib/
│       ├── agents/             # Writer supervisor + subwriters
│       ├── prompts/            # Angle prompts, image intent
│       └── generate.ts         # Main pipeline orchestration
├── e2e/                        # Playwright E2E tests
├── drizzle/                    # Generated migrations
└── local.db                    # SQLite database
```

---

## Commands

```bash
# Development
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run lint             # ESLint

# Database
npm run db:generate      # Generate migrations from schema
npm run db:migrate       # Apply migrations
npm run db:studio        # Drizzle Studio (GUI)

# Testing
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # E2E with interactive UI
npm run test:e2e:headed  # E2E in visible browser
```

---

## Database Schema

### Tables

**generation_runs**
- `id` — UUID primary key
- `sourceLabel` — User-provided name for the transcript
- `status` — pending | processing | complete | failed
- `selectedAngles` — JSON array of angle IDs
- `postCount` — Total posts generated
- `createdAt` — Timestamp

**linkedin_posts**
- `id` — UUID primary key
- `runId` — FK to generation_runs
- `hook` — First line / attention-grabber
- `fullText` — Complete post content
- `postType` — Angle (contrarian, field_note, etc.)
- `versionNumber` — 1-5 version index
- `approved` — Boolean approval status

**image_intents**
- `id` — UUID primary key
- `postId` — FK to linkedin_posts
- `headlineText` — Short punchy headline
- `prompt` — ComfyUI positive prompt
- `negativePrompt` — ComfyUI negative prompt
- `stylePreset` — Visual style category

---

## Design Decisions

<details>
<summary><strong>Why SQLite?</strong></summary>

Zero configuration, embedded, and fast enough for single-user workflows. Drizzle ORM provides type safety. Can migrate to PostgreSQL later if needed.
</details>

<details>
<summary><strong>Why 5 versions per angle?</strong></summary>

LinkedIn's algorithm rewards variety. Having 5 options per angle lets you A/B test hooks without regenerating. 6 angles × 5 versions × 3 insights = 90 posts per transcript.
</details>

<details>
<summary><strong>Why Promise.all over LangGraph?</strong></summary>

Subwriters are embarrassingly parallel—no shared state, no dependencies. `Promise.all` is simpler to debug, easier to reason about, and sufficient for this use case.
</details>

<details>
<summary><strong>Why ComfyUI prompts?</strong></summary>

DALL-E and Midjourney work, but ComfyUI/SDXL gives deterministic, reproducible results with workflow files. The prompt format (weighted keywords, structured order) is optimized for SDXL checkpoints.
</details>

---

## Roadmap

- [ ] Podscribe API integration (auto-fetch transcripts)
- [ ] Bulk export to CSV
- [ ] ComfyUI workflow files for image generation
- [ ] Scheduling integration (Buffer, Typefully)
- [ ] Custom angle definitions
- [ ] Analytics dashboard

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

<div align="center">

**Built for creators who'd rather think about ideas than formatting.**

[Back to top](#linwheel)

</div>
