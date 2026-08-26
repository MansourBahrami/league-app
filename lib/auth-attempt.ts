import { prisma } from "@/lib/db";
import { captureCaughtError } from "@/lib/observability";

export async function recordAuthAttempt(params: {
  identityHash: string;
  action: "otp_request" | "otp_verify";
  status: "succeeded" | "failed" | "rate_limited";
  errorCode?: string;
  durationMs: number;
  requestId?: string | null;
}) {
  try {
    await prisma.authAttempt.create({ data: params });
  } catch (error) {
    captureCaughtError("auth_attempt.persist", error, { action: params.action, status: params.status });
  }
}
