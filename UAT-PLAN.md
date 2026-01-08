# User Acceptance Testing (UAT) Plan

## Overview

This UAT plan covers the Wave 1-2 UI fixes implemented in PRs #57-61. Execute each test case in order, marking pass/fail as you go.

---

## Pre-requisites

- [ ] Development server running (`npm run dev`)
- [ ] Chrome DevTools accessible for viewport testing
- [ ] At least one completed run with posts/articles in the database

---

## PR #57: Scheduled Post Detail Modal (#48)

**Branch**: `feature/dashboard-post-detail`

### Test Cases

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1 | Open scheduled post modal | 1. Go to `/dashboard` 2. Click on a scheduled item in calendar | Modal opens with post/article details | |
| 2 | View full content | 1. Open modal 2. Check content display | Full text visible, properly formatted | |
| 3 | Reschedule post | 1. Open modal 2. Click "Reschedule" 3. Select new date/time 4. Confirm | Date updates, calendar reflects change | |
| 4 | Unschedule post | 1. Open modal 2. Click "Unschedule" 3. Confirm dialog | Item removed from calendar | |
| 5 | View source run | 1. Open modal 2. Click "View source" link | Navigates to correct `/results/[runId]` | |
| 6 | Close modal - X button | 1. Open modal 2. Click X button | Modal closes | |
| 7 | Close modal - backdrop | 1. Open modal 2. Click outside modal | Modal closes | |
| 8 | Close modal - Escape key | 1. Open modal 2. Press Escape | Modal closes | |

---

## PR #58: Horizontal Scroll Prevention (#51)

**Branch**: `fix/horizontal-scroll-51`

### Test Cases

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1 | Results page - no scroll | 1. Open DevTools 2. Set viewport to 375x812 3. Go to `/results` | No horizontal scrollbar, content fits | |
| 2 | Generate page - no scroll | 1. Set viewport to 375x812 2. Go to `/generate` | No horizontal scrollbar | |
| 3 | Dashboard page - no scroll | 1. Set viewport to 375x812 2. Go to `/dashboard` | No horizontal scrollbar | |
| 4 | Landing page - no scroll | 1. Set viewport to 375x812 2. Go to `/` | No horizontal scrollbar | |
| 5 | Code blocks - internal scroll | 1. If any code blocks exist 2. View on mobile | Code scrolls within container, not page | |

### E2E Test

```bash
npm run test:e2e -- e2e/horizontal-scroll.spec.ts
```

---

## PR #59: Prompt Dropdown Fixes (#49)

**Branch**: `fix/prompt-dropdown-49`

### Test Cases

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1 | Prompt text wraps | 1. Go to `/results/[runId]` 2. Expand a post 3. Click "Prompt" | Long prompt text wraps, doesn't overflow | |
| 2 | Mobile - no overflow | 1. Set viewport to 375x812 2. Expand post 3. View prompt section | No horizontal overflow from prompt | |
| 3 | Image preview height | 1. Expand post with generated image 2. Click "Prompt" | Image preview max-height ~300px | |
| 4 | No placeholder for non-approved | 1. Find non-approved post 2. Expand 3. Click "Prompt" | No "Image will be generated..." placeholder | |
| 5 | Article prompt text | 1. Switch to Articles tab 2. Expand article 3. Click "Prompt" | Text wraps properly, same as posts | |

### E2E Test

```bash
npm run test:e2e -- e2e/prompt-dropdown.spec.ts
```

---

## PR #60: Mobile /generate UI (#46)

**Branch**: `fix/generate-mobile-46`

### Test Cases

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1 | 2-column grid on mobile | 1. Set viewport to 375x812 2. Go to `/generate` | Angle buttons in 2-column grid | |
| 2 | 3-column grid on tablet | 1. Set viewport to 768x1024 2. Go to `/generate` | Post angles in 3-column grid | |
| 3 | Descriptions hidden on mobile | 1. Set viewport to 375px 2. View angle buttons | Only labels visible, descriptions hidden | |
| 4 | Descriptions visible on tablet | 1. Set viewport to 768px 2. View angle buttons | Descriptions visible below labels | |
| 5 | Touch target size | 1. On mobile 2. Try to tap angle buttons | Buttons easy to tap (48px+ height) | |
| 6 | Reduced padding on mobile | 1. Set viewport to 375px 2. Check page margins | Less horizontal padding than desktop | |
| 7 | No horizontal scroll | 1. Set viewport to 375px 2. Scroll page | No horizontal scrollbar | |

### E2E Test

```bash
npm run test:e2e -- e2e/generate-mobile.spec.ts
```

---

## PR #61: Post Card Formatting (#50)

**Branch**: `fix/post-formatting-50`

### Test Cases

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1 | No duplicate title | 1. Go to `/results/[runId]` 2. Expand a post | Expanded content doesn't repeat card title | |
| 2 | Paragraph spacing | 1. Expand a post with multiple paragraphs | Clear visual separation between paragraphs | |
| 3 | Copy preserves formatting | 1. Click copy button 2. Paste into text editor | Line breaks and formatting preserved | |
| 4 | Article formatting | 1. Switch to Articles tab 2. Expand article | Sections clearly separated | |

### E2E Test

```bash
npm run test:e2e -- e2e/post-formatting.spec.ts
```

---

## Run All E2E Tests

```bash
npm run test:e2e -- e2e/horizontal-scroll.spec.ts e2e/prompt-dropdown.spec.ts e2e/generate-mobile.spec.ts e2e/post-formatting.spec.ts
```

---

## Sign-off

| PR | Title | Tester | Date | Status |
|----|-------|--------|------|--------|
| #57 | Scheduled Post Detail Modal | | | |
| #58 | Horizontal Scroll Prevention | | | |
| #59 | Prompt Dropdown Fixes | | | |
| #60 | Mobile /generate UI | | | |
| #61 | Post Card Formatting | | | |

---

## Notes

- Test on actual mobile device if possible, not just DevTools
- Verify dark mode appearance for all changes
- Report any regressions or unexpected behavior
