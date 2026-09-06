import Link from "next/link";
import { cacheLife } from "next/cache";
import FaqAccordion from "./FaqAccordion";

interface LandingPageProps {
  isLoggedIn?: boolean;
}

export default async function LandingPage({ isLoggedIn = false }: LandingPageProps) {
  "use cache";
  cacheLife("days");

  const ctaUrl = isLoggedIn ? "/dashboard" : "/login";
  const headerCtaLabel = isLoggedIn ? "داشبورد من" : "ورود به جی‌کمپ";
  const primaryCtaLabel = isLoggedIn ? "برگرد به کمپ" : "بیا باهم شروع کنیم";

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col selection:bg-secondary/20 selection:text-secondary">
      {/* =========================================================================
       * ۱. نوار ناوبری بالا (Header / Navbar)
       * ========================================================================= */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-surface/85 border-b border-outline-variant/50 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* لوگو و نام برند */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                timer
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[19px] sm:text-[21px] tracking-tight text-primary font-display">
                  G-camp
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                  جی‌کمپ
                </span>
              </div>
              <span className="text-[11px] font-medium text-on-surface-variant">
                تنهایی درس نخون!
              </span>
            </div>
          </Link>

          {/* لینک‌های منو در دسکتاپ */}
          <div className="hidden md:flex items-center gap-8 text-[15px] font-semibold text-on-surface-variant">
            <a href="#features" className="hover:text-primary transition-colors">چرا جی‌کمپ؟</a>
            <a href="#leagues" className="hover:text-primary transition-colors">مسیر رشد</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">شروع کار</a>
            <a href="#faq" className="hover:text-primary transition-colors">پرسش‌های متداول</a>
          </div>

          {/* دکمه اکشن هدر */}
          <div className="flex items-center gap-3">
            <Link
              href={ctaUrl}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-primary hover:bg-primary-container text-on-primary font-bold text-[14px] sm:text-[15px] shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isLoggedIn ? "space_dashboard" : "bolt"}
              </span>
              <span>{headerCtaLabel}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* =========================================================================
       * ۲. هیرو سکشن (Hero Section)
       * ========================================================================= */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24">
        {/* گرادیانت پس‌زمینه ملایم برند */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-primary/10 via-secondary/10 to-tertiary/10 blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* متن اصلی و CTA */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-right">

              {/* نشان ویژه */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high border border-primary/15 text-[12px] sm:text-[13px] font-bold text-primary mb-6 shadow-xs animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span>کمپ مطالعه‌ای که همیشه روشنه</span>
              </div>

              {/* تیتر اصلی با فونت پینار/نمایشی */}
              <h1 className="text-[32px] sm:text-[44px] md:text-[50px] font-extrabold text-primary leading-[1.25] tracking-tight mb-6">
                تنهایی درس نخون
                <br />
                <span className="text-secondary">باهم درس بخونیم، باهم ادامه بدیم</span>
              </h1>

              {/* زیرتیتر توضیحی */}
              <p className="text-[16px] sm:text-[18px] text-on-surface-variant leading-relaxed max-w-xl mb-8">
                تایمر رو روشن کن و وارد کمپ شو. در جی‌کمپ می‌بینی که بقیه هم مثل تو مشغول درس‌خوندنن، کنار هم‌هدف‌هات مأموریت انجام می‌دی و هر جلسه‌ای که ثبت می‌کنی به ادامه‌دادن خودت و بقیه انرژی می‌ده.
              </p>

              {/* دکمه‌های اقدام (CTA) */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-8">
                <Link
                  href={ctaUrl}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-secondary hover:bg-secondary/90 text-on-secondary font-bold text-[16px] shadow-lg shadow-secondary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                  <span>{primaryCtaLabel}</span>
                </Link>

                <a
                  href="#how-it-works"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-surface-container-lowest hover:bg-surface-container border border-outline-variant text-on-surface font-bold text-[15px] transition-all hover:-translate-y-0.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    play_circle
                  </span>
                  <span>جی‌کمپ چطور کار می‌کنه؟</span>
                </a>
              </div>

              {/* اعتماد و ویژگی‌های کلیدی فوری */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 border-t border-outline-variant/60 w-full max-w-md">
                <div className="flex flex-col items-center lg:items-start">
                  <span className="text-[18px] sm:text-[22px] font-extrabold text-primary font-display">۱۵ دقیقه</span>
                  <span className="text-[11px] sm:text-[12px] text-on-surface-variant font-medium">۱ XP + ۱ سکه</span>
                </div>
                <div className="flex flex-col items-center lg:items-start">
                  <span className="text-[18px] sm:text-[22px] font-extrabold text-secondary font-display">بورد زنده</span>
                  <span className="text-[11px] sm:text-[12px] text-on-surface-variant font-medium">ببین کی داره می‌خونه</span>
                </div>
                <div className="flex flex-col items-center lg:items-start">
                  <span className="text-[18px] sm:text-[22px] font-extrabold text-tertiary font-display">۳۰ تا ۱۲۰</span>
                  <span className="text-[11px] sm:text-[12px] text-on-surface-variant font-medium">دقیقه برای هر جلسه</span>
                </div>
              </div>

            </div>

            {/* ماک‌آپ بصری و تعاملی اپلیکیشن (Phone Frame Mockup) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[340px] sm:max-w-[370px]">
                {/* هاله نور پس‌زمینه فریم */}
                <div className="absolute inset-0 bg-primary/15 rounded-[48px] filter blur-2xl -z-10" />

                {/* بدنه گوشی */}
                <div className="rounded-[40px] bg-surface-container-lowest border-4 border-primary/20 shadow-2xl overflow-hidden p-4 flex flex-col gap-3.5">

                  {/* استاتوس بار گوشی */}
                  <div className="flex justify-between items-center px-3 text-[11px] font-bold text-on-surface-variant">
                    <span>۱۵:۳۰</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">wifi</span>
                      <span className="material-symbols-outlined text-[13px]">battery_full</span>
                    </div>
                  </div>

                  {/* کارت تایمر فعال شبیه‌سازی‌شده */}
                  <div className="rounded-3xl bg-primary text-on-primary p-5 flex flex-col items-center justify-center relative overflow-hidden shadow-md">
                    <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-primary-container/40 blur-xl" />

                    <span className="text-[12px] font-medium text-primary-fixed-dim mb-1">
                      جلسهٔ مطالعهٔ ۹۰ دقیقه‌ای
                    </span>
                    <span className="text-[34px] font-black tracking-wider font-display text-on-primary">
                      ۰۱:۲۴:۴۵
                    </span>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-tertiary-fixed font-bold bg-on-primary/10 px-3 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[14px]">bolt</span>
                      <span>+۵ XP و +۵ سکه ذخیره‌شده</span>
                    </div>
                  </div>

                  {/* مأموریت روزانه فعال */}
                  <div className="rounded-2xl bg-surface-container p-3.5 flex items-center justify-between border border-outline-variant/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-tertiary/15 text-tertiary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          award_star
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-on-surface">مأموریت امروز: ۲ ساعت مطالعه</span>
                        <div className="w-28 bg-surface-container-high h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className="bg-tertiary h-full w-3/4 rounded-full" />
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded-full">
                      ۷۵٪
                    </span>
                  </div>

                  {/* بورد زنده شبیه‌سازی‌شده */}
                  <div className="rounded-2xl bg-surface-container p-3.5 flex flex-col gap-2 border border-outline-variant/40">
                    <div className="flex items-center justify-between text-[12px] font-bold">
                      <span className="text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">dynamic_feed</span>
                        بورد زندهٔ جی‌کمپ
                      </span>
                      <span className="text-[10px] text-secondary font-bold">زنده 🔴</span>
                    </div>
                    <div className="flex items-center justify-between bg-surface-container-lowest p-2 rounded-xl border border-primary/20">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[13px]">timer</span>
                        </span>
                        <span className="text-[12px] font-bold text-on-surface">یک هم‌سطح شروع به مطالعه کرد</span>
                      </div>
                      <span className="text-[10px] font-bold text-primary">همین حالا</span>
                    </div>
                  </div>

                  {/* نوار ناوبری ماک‌آپ */}
                  <div className="flex justify-around items-center pt-2 pb-1 border-t border-outline-variant/30 text-on-surface-variant">
                    <div className="flex flex-col items-center text-primary font-bold">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                      <span className="text-[9px]">تمرکز</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-[20px]">dynamic_feed</span>
                      <span className="text-[9px]">بورد زنده</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-[20px]">leaderboard</span>
                      <span className="text-[9px]">جدول‌برتر</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                      <span className="text-[9px]">پروفایل</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
       * ۳. ویژگی‌های متمایز جی‌کمپ (Features Grid)
       * ========================================================================= */}
      <section id="features" className="py-16 md:py-24 bg-surface-container-low border-y border-outline-variant/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[13px] font-bold text-secondary tracking-wider uppercase">چرا جی‌کمپ؟</span>
            <h2 className="text-[26px] sm:text-[34px] font-extrabold text-primary mt-2 mb-4 font-display">
              هر جلسهٔ مطالعه، یک قدم قابل‌دیدن
            </h2>
            <p className="text-[15px] sm:text-[16px] text-on-surface-variant">
              جی‌کمپ قرار نیست به‌جای تو درس بخونه؛ کاری می‌کنه موقع شروع و ادامه‌دادن، احساس نکنی تنها موندی.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* کارت ۱: تایمر متمرکز */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 hover:border-primary/30 transition-all hover:shadow-lg flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  timer
                </span>
              </div>
              <h3 className="text-[18px] font-bold text-primary mb-2">فقط زمانی که واقعاً درس می‌خونی</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                یک جلسهٔ ۳۰، ۶۰، ۹۰ یا ۱۲۰ دقیقه‌ای انتخاب کن. زمان و مکث‌ها روی سرور ثبت می‌شن و هر ۱۵ دقیقهٔ تأییدشده، ۱ XP و ۱ سکه برات می‌سازه.
              </p>
            </div>

            {/* کارت ۲: بورد زنده */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 hover:border-secondary/30 transition-all hover:shadow-lg flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  dynamic_feed
                </span>
              </div>
              <h3 className="text-[18px] font-bold text-primary mb-2">همیشه یکی هست که همراهت می‌خونه</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                در بورد زنده ببین چه کسانی مشغول مطالعه‌ان، به فعالیت همدیگه واکنش نشون بدین و حس یک کتابخونهٔ همیشه‌باز رو با خودت همراه داشته باش.
              </p>
            </div>

            {/* کارت ۳: استریک و مدال‌ها */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 hover:border-tertiary/30 transition-all hover:shadow-lg flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-tertiary/15 text-tertiary flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  local_fire_department
                </span>
              </div>
              <h3 className="text-[18px] font-bold text-primary mb-2">روزها رو به هم وصل کن</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                با مطالعهٔ روزانه زنجیره‌ات رو روشن نگه دار. XP، ستاره و مدال‌ها روی پروفایلت می‌مونن تا پیشرفتت فقط یک حس مبهم نباشه.
              </p>
            </div>

            {/* کارت ۴: مأموریت‌ها و چالش‌ها */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 hover:border-primary/30 transition-all hover:shadow-lg flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  flag
                </span>
              </div>
              <h3 className="text-[18px] font-bold text-primary mb-2">مأموریتت رو انتخاب کن</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                هدف روزانه یا هفتگی بردار و کنار هم‌هدف‌هات وارد کمپ شو. مأموریت روزانه سکه می‌ده؛ مأموریت هفتگی با XP و مدال به پایان می‌رسه.
              </p>
            </div>

            {/* کارت ۵: ویدیوهای مشاوره‌ای */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 hover:border-secondary/30 transition-all hover:shadow-lg flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  smart_display
                </span>
              </div>
              <h3 className="text-[18px] font-bold text-primary mb-2">آموزش‌های کوتاه، به‌عنوان جایزه</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                ویدیوهای کوتاه دربارهٔ مطالعهٔ فعال، برنامه‌ریزی و مدیریت زمان ببین و سکه بگیر. دیدن ویدیو اختیاریه و هیچ‌وقت جلوی درس‌خوندنت رو نمی‌گیره.
              </p>
            </div>

            {/* کارت ۶: ربات بله و یادآور هوشمند */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 hover:border-tertiary/30 transition-all hover:shadow-lg flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-tertiary/15 text-tertiary flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  chat
                </span>
              </div>
              <h3 className="text-[18px] font-bold text-primary mb-2">یادآوری، هرجا که راحت‌تری</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                اعلان مرورگر رو روشن کن یا حساب جی‌کمپت رو به بله و تلگرام وصل کن تا یادآوری‌های مطالعه و خبرهای حسابت رو از دست ندی. اتصال پیام‌رسان کاملاً اختیاریه.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
       * ۴. لیگ‌ها و سطوح (Leagues Section)
       * ========================================================================= */}
      <section id="leagues" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[13px] font-bold text-tertiary tracking-wider uppercase">مسیر رشد</span>
            <h2 className="text-[26px] sm:text-[34px] font-extrabold text-primary mt-2 mb-4 font-display">
              از تازه‌نفس تا الگو؛ هر سطح با تلاش خودت
            </h2>
            <p className="text-[15px] sm:text-[16px] text-on-surface-variant">
              با XP، ستاره و مدال‌هایی که از مطالعه و مأموریت‌ها می‌گیری بالا برو؛ در هر سطح هم کنار دانش‌آموزهایی هستی که مسیری شبیه تو دارن.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

            {/* سطح ۱ */}
            <div className="p-4 sm:p-5 rounded-3xl bg-surface-container border border-outline-variant/60 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary font-black mb-3">
                🌱
              </div>
              <h4 className="font-bold text-[16px] text-primary mb-1">تازه‌نفس</h4>
              <span className="text-[11px] font-semibold text-on-surface-variant">شروع اولین جلسه‌ها</span>
            </div>

            {/* سطح ۲ */}
            <div className="p-4 sm:p-5 rounded-3xl bg-surface-container border border-outline-variant/60 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary-fixed flex items-center justify-center text-secondary font-black mb-3">
                🔥
              </div>
              <h4 className="font-bold text-[16px] text-primary mb-1">ثابت‌قدم</h4>
              <span className="text-[11px] font-semibold text-on-surface-variant">ادامه‌دادن منظم</span>
            </div>

            {/* سطح ۳ */}
            <div className="p-4 sm:p-5 rounded-3xl bg-surface-container border border-outline-variant/60 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed flex items-center justify-center text-tertiary font-black mb-3">
                ⚡
              </div>
              <h4 className="font-bold text-[16px] text-primary mb-1">پیشرو</h4>
              <span className="text-[11px] font-semibold text-on-surface-variant">جمع‌کردن XP و مدال</span>
            </div>

            {/* سطح ۴ */}
            <div className="p-4 sm:p-5 rounded-3xl bg-surface-container border border-outline-variant/60 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center font-black mb-3">
                ⭐
              </div>
              <h4 className="font-bold text-[16px] text-primary mb-1">سرآمد</h4>
              <span className="text-[11px] font-semibold text-on-surface-variant">عبور از مأموریت‌های سخت</span>
            </div>

            {/* سطح ۵ */}
            <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-3xl bg-secondary text-on-secondary text-center flex flex-col items-center shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-on-secondary/20 flex items-center justify-center font-black mb-3 text-on-secondary">
                👑
              </div>
              <h4 className="font-bold text-[16px] text-on-secondary mb-1">الگو</h4>
              <span className="text-[11px] font-semibold text-secondary-fixed">بالاترین سطح جی‌کمپ</span>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
       * ۵. چطور کار می‌کنه؟ (How It Works)
       * ========================================================================= */}
      <section id="how-it-works" className="py-16 md:py-24 bg-surface-container-low border-y border-outline-variant/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[13px] font-bold text-primary tracking-wider uppercase">شروع از همین امروز</span>
            <h2 className="text-[26px] sm:text-[34px] font-extrabold text-primary mt-2 mb-4 font-display">
              از اولین تایمر تا پیدا کردن هم‌درس‌ها
            </h2>
            <p className="text-[15px] sm:text-[16px] text-on-surface-variant">
              فقط چند دقیقه تا اولین جلسهٔ ثبت‌شده فاصله داری.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* گام ۱ */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 flex flex-col relative">
              <span className="text-[36px] font-extrabold text-outline-variant/50 font-display mb-2">۰۱</span>
              <h3 className="text-[17px] font-bold text-primary mb-2">با شماره موبایل وارد شو</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                کد تأیید شش‌رقمی رو بگیر و بدون ساختن رمز عبور وارد جی‌کمپ شو.
              </p>
            </div>

            {/* گام ۲ */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 flex flex-col relative">
              <span className="text-[36px] font-extrabold text-secondary/30 font-display mb-2">۰۲</span>
              <h3 className="text-[17px] font-bold text-primary mb-2">زمان جلسه‌ات رو انتخاب کن</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                بین ۳۰، ۶۰، ۹۰ یا ۱۲۰ دقیقه انتخاب کن، تایمر رو بزن و فقط روی درس‌خوندن تمرکز کن.
              </p>
            </div>

            {/* گام ۳ */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 flex flex-col relative">
              <span className="text-[36px] font-extrabold text-tertiary/40 font-display mb-2">۰۳</span>
              <h3 className="text-[17px] font-bold text-primary mb-2">وقتت رو به امتیاز تبدیل کن</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                با هر ۱۵ دقیقهٔ تأییدشده، ۱ XP و ۱ سکه بگیر و هدف امروزت رو جلو ببر.
              </p>
            </div>

            {/* گام ۴ */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 flex flex-col relative">
              <span className="text-[36px] font-extrabold text-primary/30 font-display mb-2">۰۴</span>
              <h3 className="text-[17px] font-bold text-primary mb-2">کنار بقیه ادامه بده</h3>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                فعالیت‌های زنده رو ببین، وارد کمپ مأموریت شو و کنار آدم‌هایی که هدف مشترک دارن پیش برو.
              </p>
            </div>

          </div>

          {/* بنر CTA وسط صفحه */}
          <div className="mt-16 p-8 md:p-12 rounded-[36px] bg-primary text-on-primary flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
            <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-secondary/30 blur-2xl pointer-events-none" />

            <div className="flex flex-col text-center md:text-right max-w-xl">
              <h3 className="text-[22px] sm:text-[28px] font-extrabold text-on-primary mb-2 font-display">
                تنهایی شروع‌کردن سخته؛ باهم شروع کنیم
              </h3>
              <p className="text-primary-fixed-dim text-[14px] sm:text-[16px] leading-relaxed">
                تایمر رو روشن کن؛ بقیهٔ کمپ هم همین‌جا دارن برای هدفشون تلاش می‌کنن.
              </p>
            </div>

            <Link
              href={ctaUrl}
              className="px-8 py-4 rounded-2xl bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-bold text-[16px] shadow-lg shadow-tertiary/30 hover:scale-105 transition-all shrink-0 active:scale-95"
            >
              {primaryCtaLabel}
            </Link>
          </div>

        </div>
      </section>

      {/* =========================================================================
       * ۶. پرسش‌های متداول (FAQ Section)
       * ========================================================================= */}
      <section id="faq" className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          <div className="text-center mb-12">
            <span className="text-[13px] font-bold text-secondary tracking-wider uppercase">قبل از شروع</span>
            <h2 className="text-[26px] sm:text-[34px] font-extrabold text-primary mt-2 mb-4 font-display">
              شاید سؤال تو هم اینجاست
            </h2>
          </div>

          <FaqAccordion />

        </div>
      </section>

      {/* =========================================================================
       * ۷. فوتر (Footer)
       * ========================================================================= */}
      <footer className="bg-surface-container-high border-t border-outline-variant/60 pt-12 pb-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-outline-variant/40">

            {/* معرفی کوتاه برند */}
            <div className="md:col-span-6 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                </div>
                <span className="text-[20px] font-black text-primary font-display">G-camp | جی‌کمپ</span>
              </div>
              <p className="text-[14px] text-on-surface-variant leading-relaxed max-w-md">
                جی‌کمپ، کمپ مطالعهٔ دانش‌آموزها و کنکوری‌هاست؛ جایی برای اینکه باهم شروع کنیم، کنار هم ادامه بدیم و تنهایی درس نخونیم.
              </p>
            </div>

            {/* دسترسی‌های سریع */}
            <div className="md:col-span-3 flex flex-col gap-2.5">
              <span className="text-[15px] font-bold text-primary mb-1">دسترسی سریع</span>
              <Link href={ctaUrl} className="text-[14px] text-on-surface-variant hover:text-primary transition-colors">ورود به برنامه</Link>
              <a href="#features" className="text-[14px] text-on-surface-variant hover:text-primary transition-colors">چرا جی‌کمپ؟</a>
              <a href="#leagues" className="text-[14px] text-on-surface-variant hover:text-primary transition-colors">مسیر رشد</a>
              <a href="#faq" className="text-[14px] text-on-surface-variant hover:text-primary transition-colors">پرسش‌های متداول</a>
            </div>

            {/* کانال‌ها و ربات‌ها */}
            <div className="md:col-span-3 flex flex-col gap-2.5">
              <span className="text-[15px] font-bold text-primary mb-1">ارتباط و پیام‌رسان‌ها</span>
              <a
                href="https://ble.ir/gcamp_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[14px] text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">smart_toy</span>
                <span>ربات بله: @gcamp_bot</span>
              </a>
              <a
                href="https://t.me/gcamp_ir"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[14px] text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">send</span>
                <span>کانال تلگرام: @gcamp_ir</span>
              </a>
            </div>

          </div>

          {/* کپی‌رایت */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-on-surface-variant">
            <span>© {new Date().getFullYear()} جی‌کمپ (G-camp). تمامی حقوق محفوظ است.</span>
            <span>ساخته‌شده برای اینکه تنهایی درس نخونی</span>
          </div>

        </div>
      </footer>
    </div>
  );
}
