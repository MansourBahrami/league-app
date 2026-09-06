# G-camp fluency audit — 2026-08-24

Scope: mobile flow from sign-in through dashboard, mission rooms, route loading,
videos, leaderboard, and profile at a 390×844 viewport.

## Verdict

The app has a clear visual hierarchy, but it does not consistently feel instant.
The largest perceived-performance issues are blocking onboarding prompts, a very
faint route skeleton, conflicting pending/active bottom-navigation states, and
server-dependent dynamic routes. Repeated glass effects, broad `transition-all`
rules, and recurring dashboard animation add polish cost without improving
interaction feedback.

## Priority order

1. Make taps acknowledge within 100ms and show only one pending/active nav item.
2. Replace blocking first-visit prompts with one non-blocking coachmark per visit.
3. Render the study timer shell immediately and stream mission/live data later.
4. Cache stable mission/video/leaderboard data and validate instant navigation.
5. Replace layout-changing button motion and repeated blur with transform-only,
   low-cost motion that respects reduced-motion/transparency preferences.
6. Add production RUM for INP, route-transition duration, long tasks, LCP, and CLS.

## Evidence limits

Screenshots support the UX and visual findings but cannot prove production Core
Web Vitals or accessibility compliance. The production build passed during this
run; real-device RUM is still required for iOS Safari and mid-range Android.
