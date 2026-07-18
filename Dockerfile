# Bulk Inventory Manager — served under the /inventory path on luxidevilott.com
FROM node:22-slim

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Copy the whole monorepo
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the frontend under the /inventory base path, then the API server.
# vite.config.ts requires PORT and BASE_PATH to be set even for a build.
RUN PORT=8090 BASE_PATH=/inventory/ pnpm --filter @workspace/bulk-inventory run build \
 && pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production
ENV PORT=8090
ENV FRONTEND_DIR=/app/artifacts/bulk-inventory/dist/public

EXPOSE 8090

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
