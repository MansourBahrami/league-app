import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LandingPage from "@/components/landing/LandingPage";

const landingDescription =
  "جی‌کمپ، کمپ مطالعهٔ دانش‌آموزها و کنکوری‌هاست؛ تایمر رو روشن کن، کنار هم‌هدف‌هات درس بخون و تنهایی ادامه نده.";

export const metadata: Metadata = {
  title: "جی‌کمپ | تنهایی درس نخون",
  description: landingDescription,
  alternates: {
    canonical: "https://gcamp.ir",
  },
  openGraph: {
    title: "جی‌کمپ | تنهایی درس نخون!",
    description: landingDescription,
    url: "https://gcamp.ir",
  },
  twitter: {
    title: "جی‌کمپ | تنهایی درس نخون!",
    description: landingDescription,
  },
};

async function DynamicRootPage() {
  const [session, headerStore] = await Promise.all([
    getSession(),
    headers(),
  ]);

  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "";

  // اگر درخواست مستقیماً به ساب‌دامین اپلیکیشن آمده باشد:
  if (host.startsWith("app.")) {
    if (session) redirect("/dashboard");
    redirect("/login");
  }

  // در دامنه اصلی (gcamp.ir) لندینگ پیج اختصاصی نمایش داده می‌شود
  return <LandingPage isLoggedIn={!!session} />;
}

export default function RootPage() {
  return (
    <Suspense fallback={<LandingPage isLoggedIn={false} />}>
      <DynamicRootPage />
    </Suspense>
  );
}
