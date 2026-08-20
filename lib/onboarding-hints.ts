export const ONBOARDING_HINTS = {
  TIMER_STARTED: "timer_started",
  REWARDS_EXPLAINED: "rewards_explained",
  PUSH_PROMPTED: "push_prompted",
  INSTALL_PROMPTED: "install_prompted",
  LEADERBOARD_EXPLAINED: "leaderboard_explained",
  MISSION_ROOMS_EXPLAINED: "mission_rooms_explained",
  WEEKLY_MISSION_EXPLAINED: "weekly_mission_explained",
} as const;

export type OnboardingHint = (typeof ONBOARDING_HINTS)[keyof typeof ONBOARDING_HINTS];

export const ALL_ONBOARDING_HINTS = Object.values(ONBOARDING_HINTS) as OnboardingHint[];

export function isOnboardingHint(value: unknown): value is OnboardingHint {
  return typeof value === "string" && ALL_ONBOARDING_HINTS.includes(value as OnboardingHint);
}

export function hasOnboardingHint(hints: readonly string[], hint: OnboardingHint): boolean {
  return hints.includes(hint);
}
