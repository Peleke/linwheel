# LinWheel Part II: Image Generation + PDF Carousels

## Product Brief

**Version**: 0.1.0
**Status**: Draft
**Priority**: P1 (Build in Parallel)
**Depends On**: Part I (ImageIntent objects)

---

## Executive Summary

Part II transforms ImageIntent objects from Part I into actual visual assets:
1. **Cover images** for individual posts
2. **PDF carousels** for multi-slide LinkedIn documents

Output is downloadable, brandable, and ready to upload to LinkedIn.

---

## Problem Statement

Users have posts + image intents from Part I, but:
- Can't design consistently branded visuals
- Manual carousel creation is tedious
- Need PDF format for LinkedIn document posts

LinWheel Part II: intent in → assets out.

---

## Core Features (MVP)

### 1. Cover Image Generation
- Consume `ImageIntent` from Part I
- Generate single-image cover with:
  - Headline text (from intent)
  - Background (solid color or gradient)
  - Minimal typographic style
  - Consistent brand treatment

### 2. Carousel Generation
- Transform `LinkedInPost` into multi-slide carousel
- Slide structure:
  - **Slide 1**: Hook (standalone attention grab)
  - **Slides 2-4**: Body beats (one per slide)
  - **Slide 5-6**: The turn/reframe
  - **Final Slide**: Open question + subtle CTA
- Output: **PDF document** (LinkedIn's carousel format)

### 3. Template System
- Fixed visual templates (constraint = brand)
- Variables per template:
  - Primary color
  - Accent color
  - Font selection (from approved list)
  - Logo placement (optional)

### 4. Download Flow
- Preview images in browser
- Download individual covers (PNG)
- Download carousel (PDF)
- Batch download (ZIP)

---

## Visual Design Constraints

**Philosophy**: Constraint breeds recognition. Every LinWheel output should feel like it came from the same brain.

### What We DO
- Flat backgrounds (solid or subtle gradient)
- Large, readable typography
- Generous whitespace
- Minimal decorative elements
- Consistent slide dimensions (1080x1350 for LinkedIn)

### What We DON'T
- Stock photos
- AI-generated imagery of people
- Robots, brains, circuits, lightbulbs
- Busy backgrounds
- Multiple fonts per slide
- Emojis as design elements

---

## Data Models

### RenderRequest
```typescript
{
  id: string
  imageIntentId: string
  templateId: string
  overrides?: {
    primaryColor?: string
    accentColor?: string
    fontFamily?: string
  }
  status: "pending" | "rendering" | "complete" | "failed"
  outputUrl?: string
}
```

### CarouselRequest
```typescript
{
  id: string
  postId: string
  templateId: string
  slideCount: number
  status: "pending" | "rendering" | "complete" | "failed"
  outputUrl?: string  // PDF URL
}
```

### Template
```typescript
{
  id: string
  name: string
  type: "cover" | "carousel"
  previewUrl: string
  config: {
    dimensions: { width: number, height: number }
    defaultColors: { primary: string, accent: string }
    fontOptions: string[]
    layoutType: string
  }
}
```

---

## API Endpoints

### `POST /api/render/cover`
**Input**:
```json
{
  "imageIntentId": "string",
  "templateId": "string",
  "overrides": {}
}
```

**Output**:
```json
{
  "requestId": "string",
  "status": "pending"
}
```

### `POST /api/render/carousel`
**Input**:
```json
{
  "postId": "string",
  "templateId": "string",
  "overrides": {}
}
```

**Output**:
```json
{
  "requestId": "string",
  "status": "pending"
}
```

### `GET /api/render/status/[requestId]`
Poll for completion.

### `GET /api/render/download/[requestId]`
Returns signed URL for download.

---

## Rendering Architecture

### Option A: Server-Side Canvas (Recommended for MVP)

**Stack**:
- Node.js canvas (`@napi-rs/canvas` or `sharp`)
- PDF generation via `pdf-lib` or `pdfkit`
- Vercel serverless functions

**Pros**:
- No external dependencies
- Fast iteration
- Easy deployment

**Cons**:
- Limited visual effects
- Font handling can be tricky

---

### Option B: Headless Browser (More Flexible)

**Stack**:
- Playwright or Puppeteer
- HTML/CSS templates
- Screenshot to PNG
- Combine to PDF

**Pros**:
- Full CSS support
- Easier complex layouts
- Font rendering handled by browser

**Cons**:
- Slower
- Higher resource usage
- Deployment complexity

---

### Option C: ComfyUI (Future, Not MVP)

**Stack**:
- ComfyUI API
- Fixed workflows
- Variable injection

**Pros**:
- AI-enhanced generation
- More creative flexibility

**Cons**:
- Overkill for typography-focused output
- Infrastructure overhead
- Not needed for MVP

---

### Recommendation

**MVP**: Option A (Server-Side Canvas)
- Use `sharp` for image composition
- Use `pdf-lib` for carousel PDF assembly
- Simple, fast, deployable to Vercel

**Future**: Option B for complex layouts, Option C for AI-enhanced visuals

---

## PDF Carousel Specification

LinkedIn accepts PDF uploads as "document posts" (carousels).

### Requirements
- **Format**: PDF
- **Dimensions**: 1080x1350px per page (4:5 aspect ratio)
- **Max pages**: 10 (LinkedIn limit)
- **Max size**: 100MB (practical: keep under 5MB)

### Slide Layout Template

```
┌─────────────────────────┐
│                         │
│    [HEADLINE TEXT]      │  ← Large, centered
│                         │
│    ───────────────      │  ← Subtle divider
│                         │
│    [Body text if any]   │  ← Smaller, still readable
│                         │
│                         │
│              [3/6]      │  ← Page indicator (bottom right)
└─────────────────────────┘
```

---

## Template Library (MVP)

### Template 1: "Clean Slate"
- Pure white background
- Black text
- Minimal, Notion-like

### Template 2: "Dark Mode"
- Dark gray background (#1a1a1a)
- White text
- Tech/professional feel

### Template 3: "Brand Accent"
- White background
- Accent color bar at top
- Customizable accent

Each template works for both covers and carousels.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Image Gen | sharp | Fast, reliable, Vercel-compatible |
| PDF Gen | pdf-lib | Lightweight, pure JS |
| Storage | Vercel Blob or local | Simple file storage |
| Queue | In-memory (MVP) | No external deps |

---

## Integration with Part I

Part II consumes Part I data via:
1. `ImageIntent` objects (for covers)
2. `LinkedInPost` objects (for carousels)

**No API changes needed in Part I**. Part II adds new endpoints that read from shared DB.

### Shared Database Schema

Part I creates:
- `generation_runs`
- `linkedin_posts`
- `image_intents`

Part II adds:
- `render_requests`
- `templates`

Same SQLite file, Drizzle ORM.

---

## UI Integration

### Results Page Enhancement
After Part I generates posts:

```
┌─────────────────────────────────────────┐
│ Post 1: "Most AI strategy decks..."     │
│                                         │
│ [Copy Text] [Generate Cover] [Carousel] │
└─────────────────────────────────────────┘
```

Clicking "Generate Cover" or "Carousel":
1. Opens modal with template picker
2. Shows preview
3. Renders on confirm
4. Downloads when ready

---

## Processing Flow

```
User clicks "Generate Cover"
        ↓
Select template (modal)
        ↓
POST /api/render/cover
        ↓
Server renders image (sharp)
        ↓
Store to blob storage
        ↓
Return download URL
        ↓
User downloads PNG
```

```
User clicks "Generate Carousel"
        ↓
Select template (modal)
        ↓
POST /api/render/carousel
        ↓
Server generates 6-8 PNG slides
        ↓
Assembles into PDF (pdf-lib)
        ↓
Store to blob storage
        ↓
Return download URL
        ↓
User downloads PDF
```

---

## Success Metrics (MVP)

- User can generate cover image from any post
- User can generate PDF carousel from any post
- Downloads work (PNG for covers, PDF for carousels)
- Visual output is consistent and brandable
- Renders complete in <10 seconds

---

## Non-Goals (MVP)

- Real-time preview editing
- Custom font uploads
- AI-generated imagery
- ComfyUI integration
- Batch rendering queue
- Analytics on downloads

---

## Timeline

**Target**: 1 day build (parallel with Part I)

| Phase | Hours | Deliverable |
|-------|-------|-------------|
| Setup | 1 | Image/PDF libs, templates |
| Cover Gen | 2 | Single image render pipeline |
| Carousel Gen | 3 | Multi-slide PDF pipeline |
| UI | 2 | Template picker, download flow |

---

## Future Enhancements (Post-MVP)

1. **Real-time preview**: Edit text/colors before render
2. **Batch rendering**: Generate all covers/carousels at once
3. **ComfyUI integration**: AI-enhanced visuals
4. **Custom branding**: Upload logo, define palette
5. **Template marketplace**: User-submitted templates
6. **Auto-upload**: Direct to LinkedIn (API permitting)

---

## Worktree Strategy

```bash
# Main branch continues Part I
git worktree add ../linwheel-part2 -b feature/part2-image-gen

# Part II development happens in separate worktree
# Shares same SQLite schema
# Merges when both complete
```

Both parts can be developed and tested independently, then merged for unified release.
