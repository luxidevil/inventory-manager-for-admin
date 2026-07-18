# Bulk Inventory Manager — served under the /inventory path on luxidevilott.com
FROM node:22-slim

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Copy the whole monorepo
COPY . .

# Install dependencies.
# pnpm 11 exits non-zero when a package build script (esbuild) isn't
# pre-approved, even though all deps install successfully. Tolerate that
# specific case, then explicitly build esbuild.
RUN pnpm install --frozen-lockfile > /tmp/pnpm-install.log 2>&1; ec=$?; \
    cat /tmp/pnpm-install.log; \
    if [ $ec -ne 0 ] && ! grep -q ERR_PNPM_IGNORED_BUILDS /tmp/pnpm-install.log; then exit $ec; fi; \
    pnpm rebuild esbuild

# Build the frontend under the /inventory base path, then the API server.
# vite.config.ts requires PORT and BASE_PATH to be set even for a build.
RUN PORT=8090 BASE_PATH=/inventory/ pnpm --filter @workspace/bulk-inventory run build \
 && pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production
ENV PORT=8090
ENV FRONTEND_DIR=/app/artifacts/bulk-inventory/dist/public

EXPOSE 8090

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
