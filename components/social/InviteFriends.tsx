"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  referralCode: string;
  appUrl: string;
}

export default function InviteFriends({ referralCode, appUrl }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const inviteLink = `${appUrl}/login?ref=${referralCode}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setMsg({ text: "لینک دعوت کپی شد!", ok: true });
    } catch {
      setMsg({ text: inviteLink, ok: true });
    }
  }

  async function share() {
    const text = `بیا با هم توی اپ مطالعه رقابت کنیم! با این لینک عضو شو تا رتبه همدیگه رو ببینیم:\n${inviteLink}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      copyLink();
    }
  }

  async function addFriend() {
    if (!code.trim()) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setMsg({ text: `${data.friendName ?? "دوستت"} اضافه شد!`, ok: true });
      setCode("");
      router.refresh();
    } else {
      setMsg({ text: data.error ?? "خطا", ok: false });
    }
  }

  return (
    <section className="glass-card rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>group_add</span>
        <h3 className="text-[16px] font-bold text-on-surface">دوستاتو دعوت کن</h3>
      </div>
      <p className="text-[13px] text-on-surface-variant text-right">
        با کد دعوتت دوستاتو بیار تا رتبه همدیگه رو توی لیدربورد ببینید و رقابت کنید.
      </p>

      <div className="flex items-center gap-2 bg-surface-container rounded-xl p-3 flex-row-reverse">
        <span className="text-[18px] font-extrabold text-primary tracking-widest" dir="ltr">{referralCode}</span>
        <span className="text-[12px] text-on-surface-variant flex-1 text-right">کد دعوت تو</span>
      </div>

      <div className="flex gap-2">
        <button onClick={share} className="gamified-btn flex-1 bg-primary text-on-primary font-bold text-[14px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/20">
          <span className="material-symbols-outlined text-[18px]">share</span>
          اشتراک‌گذاری
        </button>
        <button onClick={copyLink} className="flex-1 border border-outline-variant text-on-surface-variant font-semibold text-[14px] py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-surface-container">
          <span className="material-symbols-outlined text-[18px]">content_copy</span>
          کپی لینک
        </button>
      </div>

      <div className="border-t border-outline-variant/30 pt-3 flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-on-surface text-right">کد دعوت یه دوست داری؟</p>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="مثلاً K7M2QX"
            dir="ltr"
            className="flex-1 border border-outline-variant rounded-xl px-3 py-2 text-[15px] text-on-surface bg-surface-container-lowest focus:outline-none focus:border-primary text-center tracking-widest"
          />
          <button onClick={addFriend} disabled={busy} className="bg-secondary text-on-secondary font-bold text-[14px] px-4 rounded-xl disabled:opacity-60">
            افزودن
          </button>
        </div>
      </div>

      {msg && (
        <p className={`text-[13px] text-center ${msg.ok ? "text-tertiary" : "text-error"}`}>{msg.text}</p>
      )}
    </section>
  );
}
