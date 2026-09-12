# syntax=docker/dockerfile:1.7
# Build روی GitHub Actions (نت باز، نیتیو amd64) انجام می‌شود؛ از رجیستری/مخزن‌های استاندارد استفاده می‌کنیم.
# base = Debian slim (glibc نیتیو، سازگار با Prisma schema-engine)

# Stage 1: Build
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update -q \
    && apt-get install -y -q --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# نصب کامل (شامل devDeps) — postinstall پریزما موتور schema لینوکس را اینجا دانلود و داخل ایمیج می‌پزد
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate
# متغیرهای NEXT_PUBLIC_ موقع build داخل باندل کلاینت پخته می‌شوند
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_APP_ENV
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG APP_VERSION=unknown
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=$NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_RELEASE=$APP_VERSION
ENV APP_VERSION=$APP_VERSION
# Webpack/SWC peaks just above 768 MB on the production builder. This limit is
# build-only; the runtime containers remain capped separately in Compose.
ENV NODE_OPTIONS="--max-old-space-size=1280"
# توکن Sentry فقط هنگام build از BuildKit secret خوانده می‌شود و داخل layer نمی‌ماند.
# Production images must not ship without debuggable stack traces. Requiring
# the BuildKit secret prevents a green build from silently skipping uploads.
RUN --mount=type=secret,id=sentry_auth_token,required=true \
    export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)" \
    && test -n "$SENTRY_AUTH_TOKEN" \
    && npm run build

# Stage 2: Runner
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update -q \
    && apt-get install -y -q --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ARG APP_VERSION=unknown
ENV APP_VERSION=$APP_VERSION

# کل node_modules بیلدشده (شامل prisma CLI + موتور schema لینوکس) تا migration آفلاین روی سرور کار کند
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/app/generated ./app/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=4s --start-period=30s --retries=3 \
  CMD node -e 'fetch("http://127.0.0.1:3000/api/health").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))'

# اجرای migration (موتور schema داخل ایمیج پخته شده، بدون نیاز به نت) و سپس start
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
