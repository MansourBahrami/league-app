"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ContextualSpotlight from "@/components/onboarding/ContextualSpotlight";
import { useProgressiveOnboarding } from "@/components/onboarding/ProgressiveOnboarding";
import { ONBOARDING_HINTS } from "@/lib/onboarding-hints";
import { captureClientError } from "@/lib/analytics-client";
import type { MissionChoicePresence } from "@/lib/mission-room";

export interface MissionChoice {
  id: string;
  kind: "daily" | "weekly";
  targetHours: number;
  entryCost: number;
  xpReward: number;
  coinReward: number;
  recommended: boolean;
  presence: MissionChoicePresence;
}

interface Props {
  daily: MissionChoice[];
  weekly: MissionChoice[];
  userCoins: number;
  onboardingLocked: boolean;
  weeklyEnrollmentOpen: boolean;
  weeklyStartsLabel: string;
}

export default function MissionRoomChooser({
  daily,
  weekly,
  userCoins,
  onboardingLocked,
  weeklyEnrollmentOpen,
  weeklyStartsLabel,
}: Props) {
  const router = useRouter();
  const { hasHint, markHints } = useProgressiveOnboarding();
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [introBusy, setIntroBusy] = useState(false);
  const [error, setError] = useState("");
  const choices = tab === "daily" ? daily : weekly;
  const spotlightMissionId = choices.find((mission) => mission.recommended)?.id ?? choices[0]?.id;
  const showMissionIntro = !onboardingLocked && !hasHint(ONBOARDING_HINTS.MISSION_ROOMS_EXPLAINED);

  async function dismissMissionIntro() {
    setIntroBusy(true);
    await markHints(ONBOARDING_HINTS.MISSION_ROOMS_EXPLAINED);
    setIntroBusy(false);
  }

  async function join(missionId: string) {
    setLoadingId(missionId);
    setError("");
    const response = await fetch("/api/missions/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId }),
    }).catch((caught) => {
      captureClientError("mission.join", caught, { mission_id: missionId });
      return null;
    });
    const data = await response?.json().catch(() => ({})) as { error?: string; roomId?: string } | undefined;
    setLoadingId(null);
    if (!response?.ok || !data?.roomId) {
      setError(data?.error ?? "ورود به کمپ انجام نشد؛ دوباره تلاش کن.");
      return;
    }
    router.push(`/mission-rooms/${data.roomId}`);
    router.refresh();
  }

  return (
    <section className="glass-card rounded-[2rem] p-4" aria-labelledby="mission-choice-title">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-[23px]" style={{ fontVariationSettings: "'FILL' 1" }}>groups_3</span>
        </span>
        <div className="min-w-0 flex-1 text-right">
          <h2 id="mission-choice-title" className="text-[16px] font-extrabold text-on-surface">مأموریت بعدی‌ات را انتخاب کن</h2>
          <p className="mt-0.5 text-[11.5px] text-on-surface-variant">با کسانی وارد کمپ شو که دقیقاً همین هدف را دارند.</p>
        </div>
      </div>

      <div role="tablist" className="mb-4 flex gap-1 rounded-2xl bg-surface-container p-1">
        {(["daily", "weekly"] as const).map((key) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setTab(key); setError(""); }}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-all ${active ? "bg-primary text-on-primary shadow-md" : "text-on-surface-variant"}`}
            >
              {key === "daily" ? "امروز" : "این هفته"}
            </button>
          );
        })}
      </div>

      {showMissionIntro && (
        <div role="note" className="mb-4 rounded-2xl border border-tertiary/35 bg-tertiary-fixed/45 p-3.5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tertiary text-on-tertiary">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
            </span>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[13.5px] font-extrabold text-on-surface">ماموریت امروزت را انتخاب کن</p>
              <p className="mt-1 text-[11.5px] leading-5 text-on-surface-variant">
                برای امروز یک ماموریت بردار و کنار کسانی درس بخون که همین هدف را دارند. افراد فعال هر کمپ را پایین همان ماموریت می‌بینی.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissMissionIntro}
            disabled={introBusy}
            className="mt-3 w-full rounded-xl border border-tertiary/45 py-2 text-[12px] font-bold text-tertiary disabled:opacity-50"
          >
            {introBusy ? "در حال ثبت…" : "متوجه شدم"}
          </button>
        </div>
      )}

      {tab === "weekly" && (
        <div className={`mb-3 rounded-xl px-3 py-2.5 text-[12px] ${weeklyEnrollmentOpen ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant"}`}>
          {weeklyEnrollmentOpen
            ? `ثبت‌نام باز است؛ کمپ از ${weeklyStartsLabel} شروع می‌شود.`
            : `ثبت‌نام جمعه باز می‌شود؛ شروع مأموریت ${weeklyStartsLabel} است.`}
        </div>
      )}

      {onboardingLocked ? (
        <div className="rounded-2xl bg-primary-fixed/70 p-4 text-center">
          <span className="material-symbols-outlined text-[28px] text-primary">lock_clock</span>
          <p className="mt-1 text-[13px] font-bold text-primary">کمپ مأموریت بعد از اولین ۱۵ دقیقه باز می‌شود</p>
          <p className="mt-1 text-[11.5px] text-on-surface-variant">فعلاً تایمر ۱۵ دقیقه‌ای شروع را در صفحه مطالعه کامل کن.</p>
        </div>
      ) : choices.length === 0 ? (
        <div className="rounded-2xl bg-surface-container/60 p-6 text-center">
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant">inbox</span>
          <p className="mt-2 text-[13px] font-bold text-on-surface">مأموریتی در این بخش یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {choices.map((mission) => {
            const isWeeklyClosed = mission.kind === "weekly" && !weeklyEnrollmentOpen;
            const insufficient = userCoins < mission.entryCost;
            const disabled = isWeeklyClosed || insufficient || loadingId !== null;
            return (
              <article
                key={mission.id}
                data-onboarding={mission.id === spotlightMissionId
                  ? (tab === "daily" ? "recommended-daily-mission" : "recommended-weekly-mission")
                  : undefined}
                className={`rounded-2xl border p-3.5 transition-colors ${mission.recommended ? "border-primary/45 bg-primary-fixed/35" : "border-outline-variant/40 bg-surface-container-lowest/70"}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${mission.kind === "daily" ? "bg-tertiary-fixed/60 text-tertiary" : "bg-primary-fixed text-primary"}`}>
                    <span className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: "'FILL' 1" }}>{mission.kind === "daily" ? "today" : "calendar_view_week"}</span>
                  </span>
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-extrabold text-on-surface">{mission.targetHours.toLocaleString("fa-IR")} ساعت مطالعه</h3>
                      {mission.recommended && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-on-primary">پیشنهاد G-camp</span>}
                    </div>
                    <p className="mt-1 text-[11px] text-on-surface-variant">
                      {mission.kind === "daily"
                        ? `جایزه ${mission.coinReward.toLocaleString("fa-IR")} سکه`
                        : `جایزه ${mission.xpReward.toLocaleString("fa-IR")} XP + مدال`}
                      {mission.entryCost > 0 ? ` · ورود ${mission.entryCost.toLocaleString("fa-IR")} سکه` : " · ورود رایگان"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => join(mission.id)}
                    disabled={disabled}
                    className="gamified-btn shrink-0 rounded-xl bg-secondary px-3 py-2.5 text-[12px] font-bold text-on-secondary disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {loadingId === mission.id ? "در حال ورود…" : insufficient ? "سکه کم است" : isWeeklyClosed ? "جمعه" : "ورود به کمپ"}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-surface-container/65 px-3 py-2.5">
                  {mission.presence.members.length > 0 ? (
                    <div
                      className="flex shrink-0 -space-x-2 space-x-reverse"
                      aria-label={mission.presence.members.map((member) => member.name).join("، ")}
                    >
                      {mission.presence.members.map((member) => (
                        <span key={member.userId} className="relative" title={member.name}>
                          {member.avatarUrl ? (
                            <Image
                              src={member.avatarUrl}
                              alt=""
                              width={30}
                              height={30}
                              unoptimized
                              className="h-8 w-8 rounded-full border-2 border-surface-container object-cover"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-container bg-primary-fixed text-[10px] font-extrabold text-primary">
                              {member.name[0]}
                            </span>
                          )}
                          {member.isStudying && (
                            <span className="absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full border-2 border-surface-container bg-secondary" />
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary">
                      <span className="material-symbols-outlined text-[18px]">person_add</span>
                    </span>
                  )}
                  <div className="min-w-0 flex-1 text-right">
                    {mission.presence.memberCount > 0 ? (
                      <>
                        <p className="text-[11.5px] font-bold text-on-surface">
                          هم‌کمپی‌های این هدف
                        </p>
                        <p className={`mt-0.5 text-[10.5px] ${mission.presence.studyingCount > 0 ? "text-secondary" : "text-on-surface-variant"}`}>
                          {mission.presence.studyingCount > 0
                            ? `${mission.presence.studyingCount.toLocaleString("fa-IR")} نفر همین الان در حال مطالعه‌اند`
                            : "با روشن‌شدن تایمر، وضعیت فعال همین‌جا دیده می‌شود"}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11.5px] font-semibold text-on-surface-variant">هم‌کمپی‌های این هدف بعد از ورود اینجا نمایش داده می‌شوند.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!onboardingLocked && tab === "weekly" && spotlightMissionId && (
        <ContextualSpotlight
          hint={ONBOARDING_HINTS.WEEKLY_MISSION_EXPLAINED}
          title="مأموریت هفتگی"
          description="ثبت‌نام جمعه باز می‌شه و مأموریت از شنبه شروع می‌شه. جایزه‌اش XP و مداله."
          targetElementSelector='[data-onboarding="recommended-weekly-mission"]'
        />
      )}

      {error && <p role="alert" className="mt-3 rounded-xl bg-error/10 px-3 py-2 text-center text-[12px] text-error">{error}</p>}
    </section>
  );
}
