import { DEFAULT_ONBOARDING_DAYS } from "@/lib/onboarding-config";

export const HOT_LEAD_STUDY_MINUTES = 120;

export function isHotLead(input: {
  onboardingDay: number;
  totalStudyMinutes: number;
}): boolean {
  return (
    input.onboardingDay >= DEFAULT_ONBOARDING_DAYS &&
    input.totalStudyMinutes >= HOT_LEAD_STUDY_MINUTES
  );
}
