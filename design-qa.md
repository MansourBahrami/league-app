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

---

# Design QA — کارت ورود با الگوی کارت پروفایل

## Evidence

- Source visual truth: user-provided profile-card screenshot in the current conversation (no filesystem path exposed by the client), 1100 × 528 px.
- Browser-rendered phone state: `/Users/mansourbahrami/league_proj_new/.audit/login-profile-card.png`, 481 × 1041 px.
- Browser-rendered OTP state: `/Users/mansourbahrami/league_proj_new/.audit/login-profile-card-otp.png`, 481 × 1041 px.
- Viewport: 390 × 844 CSS px, effective capture density ≈ 1.233, mobile RTL.
- State: unauthenticated login, first phone-entry state and the resulting OTP-entry state.

## Findings

No actionable P0/P1/P2 differences remain for the requested card-style transfer.

- Fonts and typography: the approved Pinar ExtraBold headline remains intact; Vazirmatn continues to handle supporting copy, fields, and controls. The mobile headline stays on one line without clipping.
- Spacing and layout rhythm: the logo now participates in the card's vertical stack. The card uses the profile header's `glass-card`, `rounded-xl`, `p-5`, centered column, and overflow treatment. Both phone and OTP states fit without overflow.
- Colors and visual tokens: the card uses the profile header's translucent white glass surface, semantic border/shadow, and the same `from-tertiary-fixed` top glow at 50% opacity. The grid remains visible around and subtly through the card.
- Image quality and asset fidelity: the supplied SVG G-camp logo is rendered directly and remains sharp. The parent institute SVG remains outside the product card as a separate endorsement mark.
- Copy and content: the requested slogan, supporting sentence, registration prompt, field placeholder, and CTA remain unchanged and readable.
- Accessibility and behavior: the card remains a semantic login form; labels and alert regions are preserved. The phone state successfully transitions to OTP.

## Full-view comparison evidence

The source is a cropped desktop profile-card region while the implementation is a full mobile login screen, so a literal full-frame overlay would be misleading. The full mobile captures were used to verify hierarchy, containment, vertical balance, grid visibility, and footer separation.

## Focused region comparison evidence

The source and implementation were compared at the component level in the same visual review. The shared surfaces match directly through the repository's exact profile-card primitives: `glass-card`, `rounded-xl`, centered content, overflow clipping, and the tertiary-to-transparent header glow. No separate focused crop was needed because the card fills most of the implementation viewport and all important details are legible in the full capture.

## Comparison history

### Pass 1

- The prior login treatment placed the G-camp logo outside a solid white rounded card.
- [P2] This broke the visual grouping and did not match the translucent, softly highlighted profile-card language in the source.

### Fix

- Moved the G-camp logo inside the login card.
- Replaced the solid card treatment with the exact profile header primitives and semantic top glow.
- Kept the institute logo outside as the separate parent-brand endorsement.

### Pass 2

- Phone and OTP browser captures show a unified glass card with no clipping, crowding, or control overflow.
- No actionable P0/P1/P2 findings remain.

## Primary interactions tested

- Entered the documented local development phone number and triggered the OTP step.
- Confirmed the OTP field receives focus and the edit/resend controls remain visible.
- Confirmed browser console warnings/errors: none.

## Follow-up polish

No P3 item is required for this handoff.

final result: passed
