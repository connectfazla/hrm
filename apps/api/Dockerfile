FROM node:20-alpine AS base

# ── Build (pnpm needed for monorepo workspace resolution) ──
FROM base AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /app/apps/api
RUN npx prisma generate
RUN pnpm run build
RUN test -f dist/main.js || (echo "FATAL: dist/main.js not found" && exit 1)

# ── Production (npm for flat node_modules, no symlink issues) ──
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/package.json ./package.json

RUN npm install --omit=dev --ignore-scripts && npx prisma generate

RUN mkdir -p /app/storage
EXPOSE 4000
CMD ["node", "dist/main.js"]
