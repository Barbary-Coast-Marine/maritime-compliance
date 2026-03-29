FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# Install dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/regulations/package.json packages/regulations/
COPY apps/vessel-agent/package.json apps/vessel-agent/
RUN pnpm install --frozen-lockfile --prod=false

# Copy source and build
COPY packages/ packages/
COPY apps/vessel-agent/ apps/vessel-agent/
COPY tsconfig.json ./
RUN pnpm --filter @maritime/types build && \
    pnpm --filter @maritime/db build && \
    pnpm --filter @maritime/vessel-agent build

# Copy migrations
COPY packages/db/drizzle packages/db/drizzle/

EXPOSE 3000
CMD ["node", "apps/vessel-agent/dist/server.js"]
