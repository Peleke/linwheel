# LinWheel Epics

> Generated 2026-01-08 | Implementation-ready specs for Claude Code agents

## Workflow Standards (ALL EPICS)

Every epic follows these guardrails:

### Git Workflow
- **Feature branch**: `feature/<epic-slug>` from `feature/multi-agent-writers`
- **Granular commits**: One logical change per commit, conventional commit format
- **PR**: Create PR with summary, test plan, UAT instructions

### Testing Strategy
- **E2E tests FIRST**: Define each user flow as a Playwright E2E test before implementation
- **Unit tests**: For utility functions, hooks, and isolated logic
- **Integration tests**: For API routes and data layer interactions
- **All tests must pass** before PR merge

### UAT Instructions
- Mirror E2E tests as manual verification steps
- Format: "Run E2E headed, PO watches = review"
- Provide specific URLs and expected behaviors

---

## Epic 1: Mobile UI Improvements for /generate

**Branch**: `feature/generate-mobile-ui`
**Priority**: High
**Estimate**: Small

### Problem Statement
The /generate page has several mobile UX issues:
- Angle selection buttons are cramped and stacked poorly
- "7 angles" text adds no value on mobile
- Descriptions are too long for mobile viewport
- Icons feel "corny"
- Overall button layout needs mobile-first redesign

### User Stories

#### 1.1 Responsive Angle Grid
**As a** mobile user
**I want** angle buttons displayed in an accessible grid
**So that** I can easily select content angles without UI cramping

**Acceptance Criteria**:
- [ ] On mobile (<640px): 2-column grid for angle buttons
- [ ] On tablet (640-1024px): 3-column grid
- [ ] On desktop (>1024px): Current layout or 4-column
- [ ] Minimum touch target: 44x44px per button
- [ ] No horizontal overflow on any viewport

#### 1.2 Mobile-Optimized Labels
**As a** mobile user
**I want** concise angle labels
**So that** I can understand options without excessive scrolling

**Acceptance Criteria**:
- [ ] Hide descriptions on mobile, show on hover/tap on tablet+
- [ ] Replace "7 post angles" with just icons on mobile
- [ ] Show count badge overlay on section header instead
- [ ] Truncate any label > 15 chars with ellipsis on mobile

#### 1.3 Icon Refresh
**As a** user
**I want** professional, minimal icons
**So that** the UI feels polished

**Acceptance Criteria**:
- [ ] Replace emoji icons with Lucide React icons
- [ ] Consistent 20px icon size on mobile, 24px on desktop
- [ ] Icons should be semantic (e.g., Lightbulb for insights, Zap for provocateur)

### E2E Tests to Write

```typescript
// e2e/generate-mobile.spec.ts
test.describe("Generate Page Mobile UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  });

  test("angle buttons display in 2-column grid on mobile", async ({ page }) => {
    await page.goto("/generate");
    const angleGrid = page.locator('[data-testid="angle-grid"]');
    await expect(angleGrid).toHaveCSS("grid-template-columns", /repeat\(2/);
  });

  test("descriptions hidden on mobile", async ({ page }) => {
    await page.goto("/generate");
    const descriptions = page.locator('[data-testid="angle-description"]');
    await expect(descriptions.first()).not.toBeVisible();
  });

  test("no horizontal scroll on mobile", async ({ page }) => {
    await page.goto("/generate");
    const body = page.locator("body");
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    const clientWidth = await body.evaluate(el => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("angle count shown as badge not text", async ({ page }) => {
    await page.goto("/generate");
    await expect(page.getByText("7 post angles")).not.toBeVisible();
    await expect(page.locator('[data-testid="angle-count-badge"]')).toBeVisible();
  });

  test("touch targets meet 44px minimum", async ({ page }) => {
    await page.goto("/generate");
    const buttons = page.locator('[data-testid="angle-button"]');
    const firstButton = buttons.first();
    const box = await firstButton.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});
```

### Files to Modify
- `src/app/generate/page.tsx` - Main layout and angle grid
- `src/app/globals.css` - Mobile breakpoint utilities if needed

### UAT Instructions
1. Open `/generate` on iPhone SE viewport (375x667)
2. Verify angle buttons in 2-column grid, no cramping
3. Verify no descriptions visible, just icons + short labels
4. Verify count badge shows "7" instead of "7 post angles" text
5. Tap each angle - confirm 44px+ touch targets
6. Scroll page - confirm no horizontal overflow
7. Repeat on iPad (768x1024) - verify 3-column grid, descriptions visible

---

## Epic 2: New User Flow with Dashboard Landing

**Branch**: `feature/dashboard-landing-flow`
**Priority**: High
**Estimate**: Medium

### Problem Statement
Currently users land on a generic page after login. We want:
1. Dashboard as the post-login landing page with prominent generate CTA
2. Detail view for approved posts in /results/[id] carousel

### User Stories

#### 2.1 Dashboard as Landing Page
**As a** logged-in user
**I want** to land on the dashboard after login
**So that** I see my content calendar and can quickly generate new content

**Acceptance Criteria**:
- [ ] After login redirect to `/dashboard` not `/`
- [ ] Dashboard shows prominent "Generate Content" CTA above the fold
- [ ] Calendar view visible immediately
- [ ] Quick stats: pending posts, scheduled today, approved count

#### 2.2 Prominent Generate UX on Dashboard
**As a** user on the dashboard
**I want** a visually prominent generate action
**So that** the primary workflow is obvious

**Acceptance Criteria**:
- [ ] Large "Generate New Content" button/card at top of dashboard
- [ ] Button uses primary brand color, stands out from calendar
- [ ] Optional: inline mini-form for quick generation (just transcript)
- [ ] Links to full /generate page for advanced options

#### 2.3 Approved Post Detail View in Carousel
**As a** user viewing approved posts in /results/[id]
**I want** to click a post in the carousel to see full details
**So that** I can review and edit before publishing

**Acceptance Criteria**:
- [ ] Clicking post in ApprovedContentPanel opens detail modal/drawer
- [ ] Detail view shows: full text, image preview, scheduled time, edit options
- [ ] Can edit scheduled time from detail view
- [ ] Can copy text from detail view
- [ ] Can remove from approved from detail view
- [ ] Close button returns to carousel view

### E2E Tests to Write

```typescript
// e2e/dashboard-landing.spec.ts
test.describe("Dashboard Landing Flow", () => {
  test("redirects to dashboard after login", async ({ page }) => {
    // Assuming test auth setup
    await page.goto("/login");
    // ... login flow
    await expect(page).toHaveURL("/dashboard");
  });

  test("dashboard shows prominent generate CTA", async ({ page }) => {
    await page.goto("/dashboard");
    const generateCTA = page.locator('[data-testid="generate-cta"]');
    await expect(generateCTA).toBeVisible();
    await expect(generateCTA).toHaveCSS("background-color", /.*/); // Primary color
  });

  test("generate CTA navigates to generate page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator('[data-testid="generate-cta"]').click();
    await expect(page).toHaveURL("/generate");
  });
});

// e2e/approved-post-detail.spec.ts
test.describe("Approved Post Detail View", () => {
  test("clicking carousel item opens detail modal", async ({ page }) => {
    // Requires seeded approved post
    await page.goto("/results/[seeded-run-id]");
    await page.locator('[data-testid="approved-carousel-item"]').first().click();
    await expect(page.locator('[data-testid="post-detail-modal"]')).toBeVisible();
  });

  test("detail modal shows full post content", async ({ page }) => {
    await page.goto("/results/[seeded-run-id]");
    await page.locator('[data-testid="approved-carousel-item"]').first().click();
    await expect(page.locator('[data-testid="post-full-text"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-image-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-schedule-time"]')).toBeVisible();
  });

  test("can edit schedule from detail modal", async ({ page }) => {
    await page.goto("/results/[seeded-run-id]");
    await page.locator('[data-testid="approved-carousel-item"]').first().click();
    await page.locator('[data-testid="edit-schedule-button"]').click();
    await expect(page.locator('[data-testid="schedule-picker"]')).toBeVisible();
  });

  test("close button dismisses modal", async ({ page }) => {
    await page.goto("/results/[seeded-run-id]");
    await page.locator('[data-testid="approved-carousel-item"]').first().click();
    await page.locator('[data-testid="close-detail-modal"]').click();
    await expect(page.locator('[data-testid="post-detail-modal"]')).not.toBeVisible();
  });
});
```

### Files to Modify
- `src/app/auth/callback/route.ts` - Change redirect destination
- `src/app/dashboard/page.tsx` - Add generate CTA section
- `src/components/dashboard-client.tsx` - UI updates for CTA
- `src/components/approved-content-panel.tsx` - Add click handler and detail modal
- NEW: `src/components/post-detail-modal.tsx` - Detail view component

### UAT Instructions
1. Log out, then log in - verify redirect to `/dashboard`
2. On dashboard, verify large "Generate Content" button visible above fold
3. Click generate CTA - verify navigation to `/generate`
4. Navigate to `/results/[id]` with approved posts
5. Click a post in the approved carousel
6. Verify modal opens with: full text, image, schedule time
7. Click edit schedule - verify picker opens
8. Close modal - verify returns to carousel view

---

## Epic 3: Dashboard Scheduled Post Detail View

**Branch**: `feature/dashboard-post-detail`
**Priority**: High
**Estimate**: Small

### Problem Statement
Clicking a scheduled post on the dashboard currently does nothing. Users need to view and edit scheduled post details.

### User Stories

#### 3.1 Scheduled Post Click Handler
**As a** user viewing the dashboard calendar
**I want** to click a scheduled post to see details
**So that** I can review or modify the scheduled content

**Acceptance Criteria**:
- [ ] Clicking scheduled post in calendar opens detail view
- [ ] Detail view shows: full text, image, scheduled time, source run
- [ ] Can reschedule from detail view
- [ ] Can unschedule (remove from calendar) from detail view
- [ ] Can navigate to source run from detail view

### E2E Tests to Write

```typescript
// e2e/dashboard-scheduled-detail.spec.ts
test.describe("Dashboard Scheduled Post Detail", () => {
  test("clicking scheduled post opens detail view", async ({ page }) => {
    // Requires seeded scheduled post
    await page.goto("/dashboard");
    await page.locator('[data-testid="scheduled-post-item"]').first().click();
    await expect(page.locator('[data-testid="scheduled-detail-modal"]')).toBeVisible();
  });

  test("detail view shows post content and schedule", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator('[data-testid="scheduled-post-item"]').first().click();
    await expect(page.locator('[data-testid="scheduled-post-text"]')).toBeVisible();
    await expect(page.locator('[data-testid="scheduled-time-display"]')).toBeVisible();
  });

  test("can reschedule from detail view", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator('[data-testid="scheduled-post-item"]').first().click();
    await page.locator('[data-testid="reschedule-button"]').click();
    await expect(page.locator('[data-testid="schedule-picker"]')).toBeVisible();
  });

  test("can unschedule post", async ({ page }) => {
    await page.goto("/dashboard");
    const postCount = await page.locator('[data-testid="scheduled-post-item"]').count();
    await page.locator('[data-testid="scheduled-post-item"]').first().click();
    await page.locator('[data-testid="unschedule-button"]').click();
    await page.locator('[data-testid="confirm-unschedule"]').click();
    // Post should be removed from calendar
    await expect(page.locator('[data-testid="scheduled-post-item"]')).toHaveCount(postCount - 1);
  });

  test("can navigate to source run", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator('[data-testid="scheduled-post-item"]').first().click();
    await page.locator('[data-testid="view-source-run"]').click();
    await expect(page).toHaveURL(/\/results\/.+/);
  });
});
```

### Files to Modify
- `src/components/dashboard-client.tsx` - Add click handlers to calendar items
- NEW: `src/components/scheduled-post-modal.tsx` - Detail modal component
- `src/app/api/posts/[postId]/schedule/route.ts` - Add DELETE for unschedule

### UAT Instructions
1. Navigate to `/dashboard` with scheduled posts
2. Click a scheduled post in the calendar
3. Verify modal opens with full post text
4. Verify scheduled time displayed
5. Click reschedule - verify date/time picker opens
6. Click unschedule - verify confirmation, then post removed from calendar
7. Click "View source" - verify navigation to /results/[runId]

---

## Epic 4: Prompt Dropdown and Image Panel Fixes

**Branch**: `feature/prompt-dropdown-fixes`
**Priority**: Medium
**Estimate**: Small

### Problem Statement
Multiple UI issues in post/article cards:
1. Prompt dropdown text doesn't wrap, runs off screen
2. Unnecessary large image placeholder in prompt section
3. Generated images too large in bottom panel
4. Article shows "image generating" message before user triggers generation

### User Stories

#### 4.1 Fix Prompt Dropdown Text Wrapping
**As a** user viewing post prompts
**I want** text to wrap properly
**So that** I can read the full prompt

**Acceptance Criteria**:
- [ ] Prompt text wraps within container
- [ ] No horizontal overflow
- [ ] Readable font size (14px min)
- [ ] Max-width constraint on dropdown

#### 4.2 Remove Unnecessary Image Placeholder
**As a** user
**I want** a clean prompt section
**So that** UI isn't cluttered with unused elements

**Acceptance Criteria**:
- [ ] Remove large placeholder image from prompt dropdown
- [ ] Only show image preview when image exists
- [ ] Compact layout for prompt section

#### 4.3 Fix Generated Image Sizing
**As a** user viewing generated images
**I want** images sized appropriately
**So that** I can see the full image without excessive scrolling

**Acceptance Criteria**:
- [ ] Images constrained to max-height 300px in card view
- [ ] Maintain aspect ratio
- [ ] Click to expand to full size in modal

#### 4.4 Fix Premature "Generating" Message
**As a** user viewing articles
**I want** accurate status messages
**So that** I'm not confused about image generation state

**Acceptance Criteria**:
- [ ] "Generating image" only shows AFTER user triggers generation
- [ ] Before generation: show "Generate Image" button or neutral state
- [ ] Remove artifact from old UX flow

### E2E Tests to Write

```typescript
// e2e/prompt-dropdown.spec.ts
test.describe("Prompt Dropdown Fixes", () => {
  test("prompt text wraps within container", async ({ page }) => {
    // Requires completed run
    await page.goto("/results/[run-id]");
    await page.locator('[data-testid="expand-post"]').first().click();
    const promptSection = page.locator('[data-testid="prompt-section"]');
    const scrollWidth = await promptSection.evaluate(el => el.scrollWidth);
    const clientWidth = await promptSection.evaluate(el => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
  });

  test("no image placeholder when no image generated", async ({ page }) => {
    await page.goto("/results/[run-id-no-images]");
    await page.locator('[data-testid="expand-post"]').first().click();
    await expect(page.locator('[data-testid="image-placeholder"]')).not.toBeVisible();
  });

  test("generated image constrained to max-height", async ({ page }) => {
    await page.goto("/results/[run-id-with-images]");
    const imagePreview = page.locator('[data-testid="generated-image-preview"]').first();
    const box = await imagePreview.boundingBox();
    expect(box?.height).toBeLessThanOrEqual(300);
  });

  test("article shows neutral state before image generation", async ({ page }) => {
    // Requires approved article without generated image
    await page.goto("/results/[run-id]");
    await page.locator('[data-testid="articles-tab"]').click();
    await page.locator('[data-testid="expand-article"]').first().click();
    await expect(page.getByText("Generating image")).not.toBeVisible();
    await expect(page.locator('[data-testid="generate-image-button"]')).toBeVisible();
  });
});
```

### Files to Modify
- `src/components/post-card.tsx` - Fix prompt section layout
- `src/components/article-card.tsx` - Fix image status logic
- `src/components/image-preview.tsx` - Constrain image sizes

### UAT Instructions
1. Navigate to `/results/[id]` with completed posts
2. Expand a post card - verify prompt text wraps (no horizontal scroll)
3. Verify no large placeholder image in prompt section
4. If images generated, verify max-height ~300px
5. Click image - verify opens larger in modal
6. Switch to Articles tab
7. Expand article - verify NO "Generating image" text
8. Verify "Generate Image" button shown instead

---

## Epic 5: Post Card Formatting and Unicode Support

**Branch**: `feature/post-card-formatting`
**Priority**: Medium
**Estimate**: Medium

### Problem Statement
Post cards have formatting issues:
1. Title repeated (card title = first line of post)
2. Line breaks not rendering properly (tight/ugly spacing)
3. Posts should use Unicode formatting for bold/emphasis

### User Stories

#### 5.1 Remove Duplicate Title
**As a** user reading posts
**I want** no redundant information
**So that** the content is clean and scannable

**Acceptance Criteria**:
- [ ] Card title shows hook/first line
- [ ] Expanded view starts AFTER the hook, not repeating it
- [ ] Or: card shows post type, expanded shows full text including hook

#### 5.2 Fix Line Break Rendering
**As a** user reading posts
**I want** proper paragraph spacing
**So that** posts are readable

**Acceptance Criteria**:
- [ ] Line breaks (`\n\n`) render as paragraph breaks
- [ ] Single line breaks (`\n`) render with appropriate spacing
- [ ] Consistent spacing: 1em between paragraphs minimum
- [ ] Whitespace preserved where intentional

#### 5.3 Unicode Bold/Emphasis in Posts
**As a** user generating LinkedIn posts
**I want** posts to use Unicode formatting
**So that** bold text works on LinkedIn (which doesn't support markdown)

**Acceptance Criteria**:
- [ ] LLM prompt updated to use Unicode bold characters (e.g., 𝗕𝗼𝗹𝗱)
- [ ] Key terms/phrases use Unicode bold
- [ ] Emphasis uses Unicode italic where appropriate
- [ ] Preview renders Unicode correctly
- [ ] Copy function preserves Unicode characters

### Implementation Notes

**Unicode Bold Characters**:
```
Normal: A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
Bold:   𝗔 𝗕 𝗖 𝗗 𝗘 𝗙 𝗚 𝗛 𝗜 𝗝 𝗞 𝗟 𝗠 𝗡 𝗢 𝗣 𝗤 𝗥 𝗦 𝗧 𝗨 𝗩 𝗪 𝗫 𝗬 𝗭
Normal: a b c d e f g h i j k l m n o p q r s t u v w x y z
Bold:   𝗮 𝗯 𝗰 𝗱 𝗲 𝗳 𝗴 𝗵 𝗶 𝗷 𝗸 𝗹 𝗺 𝗻 𝗼 𝗽 𝗾 𝗿 𝘀 𝘁 𝘂 𝘃 𝘄 𝘅 𝘆 𝘇
```

**Prompt Update**:
Update `src/lib/prompts.ts` to instruct LLM:
- Use Unicode bold (𝗕𝗼𝗹𝗱) for key terms, not asterisks
- Use line breaks strategically for LinkedIn readability
- Format hook as standalone attention-grabber

### E2E Tests to Write

```typescript
// e2e/post-formatting.spec.ts
test.describe("Post Card Formatting", () => {
  test("no duplicate title in expanded view", async ({ page }) => {
    await page.goto("/results/[run-id]");
    const card = page.locator('[data-testid="post-card"]').first();
    const cardTitle = await card.locator('[data-testid="post-hook"]').textContent();
    await card.locator('[data-testid="expand-post"]').click();
    const fullText = await card.locator('[data-testid="post-full-text"]').textContent();
    // Full text should not start with hook (it's already shown)
    // Or hook should only appear once total
    const hookOccurrences = (fullText?.match(new RegExp(cardTitle!, 'g')) || []).length;
    expect(hookOccurrences).toBeLessThanOrEqual(1);
  });

  test("paragraphs have proper spacing", async ({ page }) => {
    await page.goto("/results/[run-id]");
    await page.locator('[data-testid="expand-post"]').first().click();
    const paragraphs = page.locator('[data-testid="post-full-text"] p, [data-testid="post-full-text"] br + br');
    // Should have multiple visual breaks
    await expect(paragraphs).not.toHaveCount(0);
  });

  test("Unicode bold characters render correctly", async ({ page }) => {
    // Requires posts generated with Unicode formatting
    await page.goto("/results/[run-id-with-unicode]");
    await page.locator('[data-testid="expand-post"]').first().click();
    const text = await page.locator('[data-testid="post-full-text"]').textContent();
    // Check for Unicode bold characters (Mathematical Bold)
    expect(text).toMatch(/[\u{1D400}-\u{1D7FF}]/u);
  });

  test("copy preserves Unicode formatting", async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto("/results/[run-id-with-unicode]");
    await page.locator('[data-testid="expand-post"]').first().click();
    await page.locator('[data-testid="copy-post-button"]').click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/[\u{1D400}-\u{1D7FF}]/u);
  });
});
```

### Files to Modify
- `src/components/post-card.tsx` - Fix title display and whitespace handling
- `src/lib/prompts.ts` - Update LLM prompts for Unicode formatting
- `src/app/globals.css` - Add whitespace/paragraph styling if needed

### UAT Instructions
1. Generate new posts (to get Unicode formatted content)
2. Navigate to `/results/[new-run-id]`
3. Verify card shows hook, not full post as title
4. Expand card - verify hook not repeated
5. Verify clear paragraph breaks between sections
6. Verify bold text uses Unicode (should look bold even in plain text)
7. Copy post - paste into LinkedIn composer - verify bold preserved

---

## Epic 6: Results Page Horizontal Scroll Fix

**Branch**: `feature/results-horizontal-scroll`
**Priority**: Medium
**Estimate**: Small

### Problem Statement
`/results/[id]` page scrolls horizontally on mobile even when content appears contained.

### User Stories

#### 6.1 Fix Horizontal Overflow
**As a** mobile user
**I want** no horizontal scrolling
**So that** I can navigate the page naturally

**Acceptance Criteria**:
- [ ] No horizontal scroll on any mobile viewport (320px - 428px)
- [ ] All content constrained to viewport width
- [ ] Images, cards, and text wrap appropriately
- [ ] Overflow hidden on appropriate containers

### Root Cause Investigation
Common causes:
- Images without max-width: 100%
- Fixed-width elements
- Pre/code blocks without overflow handling
- Padding/margin causing content to exceed viewport
- Flexbox items not shrinking

### E2E Tests to Write

```typescript
// e2e/results-responsive.spec.ts
test.describe("Results Page Responsive", () => {
  const viewports = [
    { width: 320, height: 568, name: "iPhone SE" },
    { width: 375, height: 667, name: "iPhone 8" },
    { width: 390, height: 844, name: "iPhone 12" },
    { width: 428, height: 926, name: "iPhone 13 Pro Max" },
  ];

  for (const viewport of viewports) {
    test(`no horizontal scroll on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/results/[run-id]");

      const body = page.locator("body");
      const scrollWidth = await body.evaluate(el => el.scrollWidth);
      const clientWidth = await body.evaluate(el => el.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }

  test("images constrained to container width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/results/[run-id-with-images]");

    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const box = await images.nth(i).boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test("post cards fit within viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/results/[run-id]");

    const cards = page.locator('[data-testid="post-card"]');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375 - 32); // Accounting for page padding
      }
    }
  });
});
```

### Files to Modify
- `src/app/results/[runId]/page.tsx` - Add overflow constraints
- `src/components/post-card.tsx` - Ensure responsive widths
- `src/components/article-card.tsx` - Ensure responsive widths
- `src/app/globals.css` - Global overflow handling

### UAT Instructions
1. Open `/results/[id]` on iPhone SE viewport (320x568)
2. Scroll down entire page - verify NO horizontal scroll appears
3. Expand post cards - verify no overflow
4. If images present - verify constrained to screen width
5. Repeat on iPhone 12 (390x844)
6. Repeat on iPhone 13 Pro Max (428x926)
7. All viewports should have no horizontal scroll

---

## Epic 7: LinkedIn Integration

**Branch**: `feature/linkedin-integration`
**Priority**: High
**Estimate**: Large
**Note**: Requires detailed planning - see separate design document

### Problem Statement
Users currently copy posts manually to LinkedIn. Full integration would enable:
- OAuth connection to LinkedIn
- One-click publishing
- Post analytics

### High-Level Requirements
1. **Security-First**: OAuth 2.0, encrypted token storage, minimal permissions
2. **Test-Driven**: Mock LinkedIn API for tests, integration tests with sandbox
3. **Graceful Degradation**: Works without integration, integration is enhancement
4. **Audit Trail**: Log all publish actions for debugging

### Scope (MVP)
- LinkedIn OAuth connection flow
- Publish single post to LinkedIn
- View publish status
- Disconnect LinkedIn account

### Out of Scope (v1)
- Bulk publishing
- Scheduled publishing to LinkedIn
- Analytics import
- Image publishing (text-only v1)

### Security Considerations
- Tokens encrypted at rest (use libsodium or similar)
- Refresh token rotation
- Minimal OAuth scopes: `w_member_social` only
- Rate limiting on publish endpoints
- CSRF protection on OAuth callback

### E2E Tests to Write (High Level)

```typescript
// e2e/linkedin-integration.spec.ts
test.describe("LinkedIn Integration", () => {
  test("connect LinkedIn button visible in settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator('[data-testid="connect-linkedin-button"]')).toBeVisible();
  });

  test("OAuth flow redirects to LinkedIn", async ({ page }) => {
    await page.goto("/settings");
    await page.locator('[data-testid="connect-linkedin-button"]').click();
    // Should redirect to LinkedIn OAuth
    await expect(page).toHaveURL(/linkedin\.com\/oauth/);
  });

  test("callback handles success", async ({ page }) => {
    // Mock callback with valid code
    await page.goto("/api/auth/linkedin/callback?code=mock-valid-code");
    await expect(page).toHaveURL("/settings?linkedin=connected");
  });

  test("publish button appears for approved posts", async ({ page }) => {
    // With LinkedIn connected
    await page.goto("/results/[run-id]");
    await expect(page.locator('[data-testid="publish-to-linkedin"]').first()).toBeVisible();
  });

  test("publish shows confirmation before posting", async ({ page }) => {
    await page.goto("/results/[run-id]");
    await page.locator('[data-testid="publish-to-linkedin"]').first().click();
    await expect(page.locator('[data-testid="publish-confirmation-modal"]')).toBeVisible();
  });

  test("disconnect removes LinkedIn connection", async ({ page }) => {
    await page.goto("/settings");
    await page.locator('[data-testid="disconnect-linkedin"]').click();
    await page.locator('[data-testid="confirm-disconnect"]').click();
    await expect(page.locator('[data-testid="connect-linkedin-button"]')).toBeVisible();
  });
});
```

### Implementation Phases
1. **Phase 1**: OAuth flow + token storage
2. **Phase 2**: Publish text posts
3. **Phase 3**: Publish status tracking
4. **Phase 4**: Image support (future)

### Files to Create/Modify
- NEW: `src/app/api/auth/linkedin/route.ts` - OAuth initiation
- NEW: `src/app/api/auth/linkedin/callback/route.ts` - OAuth callback
- NEW: `src/lib/linkedin.ts` - LinkedIn API client
- NEW: `src/lib/crypto.ts` - Token encryption utilities
- `src/components/settings/` - LinkedIn connection UI
- `src/db/schema.ts` - Already has linkedinConnections table
- NEW: `src/app/api/posts/[postId]/publish/route.ts` - Publish endpoint

---

## Epic 8: Source Monitoring Feature

**Branch**: `feature/source-monitoring`
**Priority**: Medium
**Estimate**: Large
**Note**: Requires detailed planning - see separate design document

### Problem Statement
Users manually find and paste transcripts. Auto-monitoring sources would enable:
- RSS feed monitoring
- URL pattern scanning
- Subreddit monitoring
- Daily digest of new content to process

### High-Level Requirements
1. **Configurable Sources**: RSS, URLs, Reddit, custom
2. **Scheduling**: Configurable scan frequency
3. **Notification**: Push notifications for new content
4. **Common Targets**: Pre-configured popular sources

### Source Types

#### RSS Feeds
- Parse standard RSS/Atom feeds
- Extract: title, content, link, published date
- Store feed URL and last fetched timestamp

#### URL Patterns
- Monitor specific URLs for content changes
- Extract text content from page
- Diff detection for updates

#### Reddit
- Monitor subreddits for posts
- Filter by keywords, flair, score
- Use Reddit API with rate limiting

#### Pre-configured Sources (Common Targets)
- TechCrunch RSS
- Hacker News (top stories)
- Product Hunt
- Selected subreddits: r/startups, r/technology, r/productivity

### Data Model (New Tables)

```typescript
// Content sources table
export const contentSources = sqliteTable("content_sources", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  sourceType: text("source_type", {
    enum: ["rss", "url", "reddit", "preset"]
  }).notNull(),
  config: text("config", { mode: "json" }).$type<SourceConfig>(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  scanFrequency: text("scan_frequency", {
    enum: ["hourly", "daily", "weekly"]
  }).default("daily"),
  lastScannedAt: integer("last_scanned_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

// Discovered content table
export const discoveredContent = sqliteTable("discovered_content", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").references(() => contentSources.id),
  externalId: text("external_id"), // Original URL or post ID
  title: text("title").notNull(),
  content: text("content").notNull(),
  sourceUrl: text("source_url"),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  discoveredAt: integer("discovered_at", { mode: "timestamp" }),
  status: text("status", {
    enum: ["new", "reviewed", "processed", "ignored"]
  }).default("new"),
  // Link to generation if processed
  generationRunId: text("generation_run_id").references(() => generationRuns.id),
});
```

### E2E Tests to Write (High Level)

```typescript
// e2e/source-monitoring.spec.ts
test.describe("Source Monitoring", () => {
  test("add source form accessible from settings", async ({ page }) => {
    await page.goto("/settings");
    await page.locator('[data-testid="sources-section"]').click();
    await expect(page.locator('[data-testid="add-source-button"]')).toBeVisible();
  });

  test("can add RSS feed source", async ({ page }) => {
    await page.goto("/settings/sources/new");
    await page.locator('[data-testid="source-type-rss"]').click();
    await page.fill('[data-testid="rss-url-input"]', "https://example.com/feed.xml");
    await page.fill('[data-testid="source-name-input"]', "Example Blog");
    await page.locator('[data-testid="save-source"]').click();
    await expect(page.locator('[data-testid="source-list"]')).toContainText("Example Blog");
  });

  test("can select preset source", async ({ page }) => {
    await page.goto("/settings/sources/new");
    await page.locator('[data-testid="source-type-preset"]').click();
    await page.locator('[data-testid="preset-techcrunch"]').click();
    await page.locator('[data-testid="save-source"]').click();
    await expect(page.locator('[data-testid="source-list"]')).toContainText("TechCrunch");
  });

  test("discovered content shows in feed", async ({ page }) => {
    // After source scan has run
    await page.goto("/feed");
    await expect(page.locator('[data-testid="discovered-item"]').first()).toBeVisible();
  });

  test("can process discovered content", async ({ page }) => {
    await page.goto("/feed");
    await page.locator('[data-testid="discovered-item"]').first().click();
    await page.locator('[data-testid="generate-from-content"]').click();
    await expect(page).toHaveURL(/\/results\/.+/);
  });

  test("can configure scan frequency", async ({ page }) => {
    await page.goto("/settings/sources");
    await page.locator('[data-testid="source-settings"]').first().click();
    await page.locator('[data-testid="frequency-daily"]').click();
    await page.locator('[data-testid="save-settings"]').click();
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });
});
```

### Implementation Phases
1. **Phase 1**: Data model + RSS feed parsing
2. **Phase 2**: Source management UI
3. **Phase 3**: Cron job for scanning
4. **Phase 4**: Push notifications for new content
5. **Phase 5**: Reddit integration
6. **Phase 6**: Preset sources library

### Files to Create
- `src/db/schema.ts` - Add new tables
- NEW: `src/lib/sources/` - Source parsing utilities
- NEW: `src/lib/sources/rss.ts` - RSS parser
- NEW: `src/lib/sources/reddit.ts` - Reddit API client
- NEW: `src/app/api/sources/` - Source CRUD endpoints
- NEW: `src/app/api/cron/scan-sources/route.ts` - Cron endpoint
- NEW: `src/app/settings/sources/` - Source management pages
- NEW: `src/app/feed/page.tsx` - Discovered content feed
- NEW: `src/components/source-card.tsx` - Source display component

---

## Summary

| Epic | Branch | Size | Priority |
|------|--------|------|----------|
| 1. Mobile UI /generate | `feature/generate-mobile-ui` | Small | High |
| 2. Dashboard Landing | `feature/dashboard-landing-flow` | Medium | High |
| 3. Scheduled Post Detail | `feature/dashboard-post-detail` | Small | High |
| 4. Prompt Dropdown Fixes | `feature/prompt-dropdown-fixes` | Small | Medium |
| 5. Post Card Formatting | `feature/post-card-formatting` | Medium | Medium |
| 6. Horizontal Scroll Fix | `feature/results-horizontal-scroll` | Small | Medium |
| 7. LinkedIn Integration | `feature/linkedin-integration` | Large | High |
| 8. Source Monitoring | `feature/source-monitoring` | Large | Medium |

## Next Steps
1. Create GitHub issues for each epic
2. For Epics 7 & 8: Enter plan mode for detailed design
3. Prioritize based on user impact and dependencies
4. Begin implementation in priority order
