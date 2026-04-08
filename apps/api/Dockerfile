FROM node:20-alpine AS base

# ── Build (pnpm needed for monorepo workspace resolution) ──
FROM base AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /app/apps/api
RUN npx prisma generate

# Diagnostic: show tsconfig to confirm the fix landed
RUN echo "=== tsconfig.json ===" && cat tsconfig.json
RUN echo "=== tsconfig.build.json ===" && cat tsconfig.build.json

# Diagnostic: try tsc directly to see actual errors
RUN echo "=== Running tsc directly ===" && npx tsc -p tsconfig.build.json 2>&1; echo "TSC EXIT: $?"

# Check what tsc produced
RUN echo "=== Listing dist/ ===" && ls -la dist/ 2>/dev/null || echo "NO dist/ DIRECTORY"

# If tsc didn't work, try nest build and capture output
RUN if [ ! -f dist/main.js ]; then \
      echo "=== tsc produced nothing, trying nest build ===" && \
      npx nest build 2>&1; \
      echo "NEST EXIT: $?"; \
      ls -la dist/ 2>/dev/null || echo "Still no dist/"; \
    fi

# Final check
RUN test -f dist/main.js || (echo "FATAL: dist/main.js not found" && ls -la src/ | head -20 && exit 1)

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
