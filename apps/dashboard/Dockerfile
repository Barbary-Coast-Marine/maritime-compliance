FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# Install dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json packages/types/
COPY apps/dashboard/package.json apps/dashboard/
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY packages/types/ packages/types/
COPY apps/dashboard/ apps/dashboard/
COPY tsconfig.json ./

# Build types package first
RUN pnpm --filter @maritime/types build

# Build Next.js — empty API URL means browser uses relative /api/ paths
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm --filter @maritime/dashboard build

# Production image
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=base /app/apps/dashboard/.next/standalone ./
COPY --from=base /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=base /app/apps/dashboard/public ./apps/dashboard/public

EXPOSE 3000
CMD ["node", "apps/dashboard/server.js"]
