# Design QA — موشن کارت بورد زنده

## Evidence

- Source visual truth: `/var/folders/ht/mfns2zkd3xd565l57wmn2jtr0000gn/T/codex-clipboard-0906be82-f632-4e2a-a483-065834138770.png`
- Browser-rendered motion frame: `/Users/mansourbahrami/.codex/visualizations/2026/08/16/01a00b9b-f4c1-78a3-aba1-9a3d87d8d7c9/live-card-motion-mid-final.png`
- Browser-rendered resting frame: `/Users/mansourbahrami/.codex/visualizations/2026/08/16/01a00b9b-f4c1-78a3-aba1-9a3d87d8d7c9/live-card-motion-rest-final.png`
- Focused three-state comparison (source, entering, resting): `/Users/mansourbahrami/.codex/visualizations/2026/08/16/01a00b9b-f4c1-78a3-aba1-9a3d87d8d7c9/live-card-motion-comparison.png`
- Viewport: 390 × 844 CSS px, DPR 2, mobile RTL, authenticated dashboard with an active timer.
- Pixel dimensions: source 940 × 162; implementation frames 390 × 844; focused comparison 1170 × 115. The source and implementation card regions were normalized into equal-width 390 px panels for focused comparison.

## Findings

No actionable P0/P1/P2 differences remain.

- Motion and attention: the new activity enters from 32 px below at the inspected intermediate frame, with 0.58 opacity, a temporary elevated shadow, a small overshoot, and a soft settle to identity over 860 ms.
- Interaction stability: only the non-interactive content layer is keyed. The `/feed` link remains mounted and unique while messages rotate, so keyboard focus and click behavior remain stable.
- Fonts and typography: Vazirmatn, weights, truncation, Persian shaping, line heights, and relative-time text are unchanged from the approved card.
- Spacing and layout rhythm: the resting state preserves the original 68 px card, icon/text/action alignment, radius, and surrounding vertical rhythm. During entry the temporary overlap below the card is intentional and is cleared at rest.
- Colors and tokens: the temporary surface and shadow use existing semantic G-camp tokens; the navy, burgundy, cream, and icon treatments remain unchanged.
- Image quality and asset fidelity: no raster asset is required for this UI card. Existing Material Symbols remain intact; no placeholder image, custom SVG, or replacement icon was introduced.
- Copy and content: real activity text, user name, relative time, and «بورد زنده» remain unchanged and readable.
- Accessibility: `prefers-reduced-motion: reduce` disables the entry animation. The stable link keeps its accessible name and route.

## Full-view comparison evidence

The 390 × 844 browser captures confirm that the stronger motion does not shift the timer, mission card, active-focus line, or bottom navigation after settling. No horizontal or vertical layout regression was observed.

## Focused region evidence

The combined 1170 × 115 evidence places the provided source card, the entering implementation frame, and the resting implementation frame in one image. The resting geometry and content match the source structure; the middle panel shows the requested new-card rise from below with temporary elevation.

## Comparison history

### Pass 1

- The first implementation used a 720 ms aggressively eased animation.
- [P2] At roughly 220 ms it was already visually near its resting position, so the requested attention-grabbing rise was too easy to miss.

### Fix

- Increased duration to 860 ms.
- Added an explicit 18% keyframe that holds the card 32 px below its final position with visible opacity and elevation.
- Preserved the overshoot and settle stages while keeping the interactive link mounted.

### Pass 2

- The intermediate browser frame measured `translateY(32px)`, `scale(0.97)`, opacity `0.58`, and the intended semantic shadow.
- The final frame returned to identity transform, full opacity, and no temporary shadow.
- No actionable P0/P1/P2 findings remain.

## Primary interactions tested

- Confirmed the activity text changes after the 5-second rotation interval.
- Confirmed exactly one `/feed` link exists before and after rotation.
- Confirmed the motion settles to identity without residual shadow.
- Confirmed browser console warnings/errors: none.

## Follow-up polish

No P3 item is required for handoff.

final result: passed
