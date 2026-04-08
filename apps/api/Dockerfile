FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Dependencies ──
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# ── Build ──
FROM base AS build
WORKDIR /app
COPY --from=deps /app ./
COPY . .
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm run build

# ── Production ──
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/package.json ./package.json

# Copy the full node_modules tree (pnpm symlink structure)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

# Flatten: symlink hoisted deps so Node resolves them from /app/dist
RUN cp -rL apps/api/node_modules/* node_modules/ 2>/dev/null || true

RUN mkdir -p /app/storage

EXPOSE 4000
CMD ["node", "dist/main.js"]
