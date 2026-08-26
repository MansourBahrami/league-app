import * as Sentry from "@sentry/nextjs";

type LogContext = Record<string, string | number | boolean | null | undefined>;

function safeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: "UnknownError", message: String(error) };
}

/**
 * گزارش خطاهای مدیریت‌شده. اطلاعات حساس کاربر نباید در context قرار بگیرد.
 * خروجی JSON برای جمع‌آوری مستقیم توسط Docker/سرویس لاگ مناسب است.
 */
export function captureCaughtError(
  operation: string,
  error: unknown,
  context: LogContext = {},
) {
  const normalized = safeError(error);
  console.error(JSON.stringify({
    level: "error",
    operation,
    ...normalized,
    ...context,
    timestamp: new Date().toISOString(),
  }));

  Sentry.withScope((scope) => {
    scope.setTag("operation", operation);
    scope.setContext("operation_context", context);
    Sentry.captureException(error instanceof Error ? error : new Error(normalized.message));
  });
}

export function logOperationalEvent(
  operation: string,
  context: LogContext = {},
) {
  console.info(JSON.stringify({
    level: "info",
    operation,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}
