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
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
RUN npm run build

# Stage 2: Runner
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update -q \
    && apt-get install -y -q --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# کل node_modules بیلدشده (شامل prisma CLI + موتور schema لینوکس) تا migration آفلاین روی سرور کار کند
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/app/generated ./app/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3000

# اجرای migration (موتور schema داخل ایمیج پخته شده، بدون نیاز به نت) و سپس start
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
