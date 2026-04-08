FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Build (install + compile in one stage to preserve pnpm symlinks) ──
FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm run build
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found" && exit 1)

# ── Production (lean image with only what's needed to run) ──
FROM base AS runner
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod
RUN cp -rL apps/api/node_modules/* node_modules/ 2>/dev/null || true

COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/package.json ./package.json

RUN mkdir -p /app/storage

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/main.js"]
