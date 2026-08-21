<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# G-camp codebase guide

## Purpose and audience

G-camp is a production Persian, right-to-left PWA for high-school and
university-entrance-exam students. Its core promise, copied from the app
metadata, is:

> درس بخون، امتیاز بگیر و خودتو با رقبات مقایسه کن

The product turns verified study time into XP, coins, levels, medals, streaks,
daily and weekly missions, and competition. The primary product loop is:

1. Sign in by mobile OTP or a Bale/Telegram magic link.
2. Choose a 30/60/90/120-minute study session.
3. Earn 1 XP and 1 coin for every server-verified 15 minutes.
4. Advance the onboarding goal or an active mission.
5. Compare weekly XP with same-level users, friends, or tournament entrants.

The student experience is the primary surface. Admin analytics, lead export,
videos, tournaments, and notification rules support that loop rather than
replacing it.

## Product and design priorities

- Start every product or UI task by reading `README.md`, then inspect the route,
  component, domain logic, and Prisma models involved. Do not design from a
  generic dashboard template.
- The study timer is the dominant action and the visual center of the dashboard.
  Missions, streaks, rewards, competitors, and reports should clarify what a
  study session affects; they should not compete with the timer for attention.
- Use real repository language and data. The product name is `G-camp`; the
  primary navigation labels are `تمرکز`, `بورد زنده`, `جدول‌برتر`, and
  `پروفایل`. Reuse labels, mission values, level names, seeded video titles,
  API errors, and descriptions from the code. Do not add invented marketing
  claims, fake metrics, placeholder users, or lorem ipsum.
- Preserve Persian copy, `lang="fa"`, `dir="rtl"`, Persian number formatting,
  and Tehran calendar-day boundaries. User-facing English should only appear
  where it is already an intentional product term such as XP.
- This is a compact, mobile-first PWA. The authenticated content column is
  capped at 600px, the floating bottom navigation at 480px, and iOS safe-area
  spacing is intentional.

## Visual identity

`app/globals.css` is the design-token source of truth. Extend its semantic
tokens instead of scattering new literals.

- Brand palette: navy primary `#1f3056`, burgundy secondary `#962d3e`, gold
  tertiary `#9a6a05`, and warm cream surface `#fef9ef`.
- Typeface: Vazirmatn, loaded in `app/layout.tsx`, with weights 400/600/700/800.
- Existing type roles range from 14px labels and 16px body copy to 20/24/32px
  headlines. The root `13px` scale intentionally keeps the mobile UI compact.
- Existing shapes use 1rem, 2rem, 3rem, and pill radii. Reuse `glass-card`,
  `liquid-glass`, `gamified-btn`, progress glow, reward, streak, timer-frame,
  pop-in, and confetti patterns before creating new visual primitives.
- Use Material Symbols through the setup in `app/layout.tsx`. Do not introduce a
  second icon family without a concrete requirement.
- The `legacy` palette is a deliberate rollback theme. New components must use
  semantic classes such as `bg-primary` and `text-on-surface`, so both themes
  continue to work.
- `public/manifest.json` still contains legacy theme colors; treat
  `app/globals.css` and `app/layout.tsx` as the current brand authority when
  resolving visual conflicts.

## Critical files

### Product truth and planning

- `README.md`: concise product summary, local setup, and supported commands.
- `PROJECT.md`: architecture, user flow, product rules, API reference, production
  state, and known technical debt.
- `FILES.md`: feature-to-file map and active/legacy status.
- `ROADMAP.md`: completed phases, explicit deferrals, and current goals.
- `DEPLOYMENT.md`: production topology and deployment procedure.

### Product shell and primary experience

- `app/layout.tsx`: Persian RTL root, Vazirmatn, metadata, theme, and viewport.
- `app/globals.css`: Tailwind v4 semantic tokens and shared visual behaviors.
- `app/(app)/layout.tsx`: authenticated user shell, A/B assignment, lead gate,
  unread count, and onboarding welcome state.
- `app/(app)/dashboard/page.tsx`: composition and priority of the main study
  experience.
- `components/dashboard/StudyTimer.tsx`: resumable client timer and its states.
- `components/layout/{AppShell,Header,BottomNav}.tsx`: mobile frame, balances,
  inbox, level, and primary navigation.

### Domain and data integrity

- `prisma/schema.prisma`: canonical persisted entities and relations. The Prisma
  client is generated into `app/generated/prisma/`.
- `lib/gamification.ts`: reward constants, level thresholds, medal requirements,
  mission tables, onboarding goals, and display formatting.
- `app/api/study/{start,tick,pause,resume,end}/route.ts`: authoritative study
  session lifecycle and anti-cheat checks.
- `lib/onboarding.ts` and `lib/ab.ts`: flexible onboarding duration and free/paid
  video access.
- `lib/mission.ts`, `lib/weekly-mission.ts`, and `lib/streak.ts`: mission,
  level, medal, and streak transitions.
- `app/(app)/leaderboard/page.tsx`, `lib/tournament.ts`, and `lib/referral.ts`:
  same-level, tournament, and friend competition.
- `app/api/feed/stream/route.ts`, `lib/reaction.ts`, and `lib/inbox.ts`: live SSE
  activity, reactions, rewards, and inbox state.
- `proxy.ts`, `lib/auth.ts`, `lib/db.ts`, and `lib/redis.ts`: request protection,
  session, PostgreSQL, and Redis foundations.
- `lib/notification-rules.ts`, `lib/notification-engine.ts`, and `lib/jobs.ts`:
  notification vocabulary, delivery safety, and scheduled work.

## Non-negotiable domain rules

- Reward time is computed on the server from elapsed time minus server-recorded
  pauses, capped by `plannedMin`. Repeated or concurrent tick/end requests must
  never double-pay.
- Every 15 verified minutes grants exactly 1 XP and 1 coin. Keep constants and
  calculations centralized in `lib/gamification.ts`.
- A mission is purchased as `pending`, activates the next day, then becomes
  `completed` with its rewards or `failed` after expiry. Preserve transaction
  safety around coins, XP, medals, and state transitions.
- The main leaderboard uses XP earned during the last seven days among users at
  the same level. The open league is only a cold-start fallback; tournaments
  remain separate ranged competitions.
- Onboarding progress uses study minutes from the current Tehran calendar day.
  Unfinished minutes do not roll into the next day. Day-one targets are
  snapshotted using the 17:00/21:00 rule.
- The daily video is an optional reward, not a gate for study, competition, or
  onboarding advancement. The opening block comment in `lib/onboarding.ts` is
  stale on this point; `tryCompleteOnboardingDay`, `PROJECT.md`, and
  `ROADMAP.md` describe the active behavior.
- Lead capture locks the authenticated app only after onboarding day one until
  the required student details and verified phone are complete.
- Admin routes require both a valid session and the database-backed `admin`
  role. Public bot, cron, and webhook routes retain their own secret checks.
- The live feed uses in-memory SSE through `LiveFeed`; do not reintroduce
  Socket.io without a concrete multi-replica requirement.

## Framework and implementation conventions

- This is Next.js 16.2.9 with React 19 and App Router. Use `proxy.ts`, not
  `middleware.ts`.
- This is Tailwind CSS 4. There is no `tailwind.config`; tokens belong in
  `app/globals.css`.
- This is Prisma 7 with `@prisma/adapter-pg`. The datasource URL is configured
  through the driver adapter, not in `schema.prisma`. Import the generated
  client from `@/app/generated/prisma/client`.
- Server components perform the initial data reads; client components own
  interaction and refresh with `router.refresh()` where existing patterns do.
- Use the helpers in `lib/date.ts` for day-based behavior. Do not substitute the
  server's local timezone for `Asia/Tehran`.
- Preserve the established relative `/api/...` fetch pattern so the app works
  behind its production CDN and origin setup.

## Current goals

Maintain the verified study loop and production stability first. The explicit
remaining goals in `PROJECT.md` and `ROADMAP.md` are:

- finish replacing scattered hard-coded colors with semantic theme tokens;
- enable and validate Web Push with production VAPID keys;
- monitor the cron endpoint and notification delivery logs;
- test the real Kavenegar OTP path;
- provide an out-of-Iran relay before enabling Telegram delivery;
- add direct HLS upload/transcoding only when a real media provider is chosen;
- add external CRM handoff only when the destination and operator workflow are
  defined.

Do not silently implement direct messages, Framer Motion, a
CRM integration, or media upload infrastructure as part of an unrelated task.

## Validation

- Run `npm run lint` for code changes and `npm run build` for changes affecting
  routes, server/client boundaries, configuration, or production behavior.
- Run `npm run test:levels` when changing XP, levels, stars, or medal
  requirements.
- Run `npm run test:onboarding` when changing day goals, lead gating, or video
  access.
- `npm run test:gamification` writes temporary records to the configured
  database and cleans them up. Run it only against a development database.
- After changing `prisma/schema.prisma`, generate the client and include an
  appropriate migration. Never edit `app/generated/prisma/` by hand.
