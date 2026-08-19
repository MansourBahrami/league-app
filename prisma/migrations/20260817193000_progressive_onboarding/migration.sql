-- Store contextual onboarding milestones on the account so coachmarks do not
-- restart after a refresh or on another device.
ALTER TABLE "User"
ADD COLUMN "onboardingHints" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- People who completed the previous all-at-once tour should not be forced
-- through the replacement flow. New accounts keep the empty default.
UPDATE "User"
SET "onboardingHints" = ARRAY[
  'timer_started',
  'rewards_explained',
  'push_prompted',
  'install_prompted',
  'leaderboard_explained',
  'mission_rooms_explained'
]
WHERE "hasSeenIntro" = true;
