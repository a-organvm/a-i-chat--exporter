# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────────────
# ChatGPT Exporter — self-contained deploy image.
# Builds the userscript + install landing page, then serves them with nginx.
# ──────────────────────────────────────────────────────────────────────────

# ---- Stage 1: build the static site (userscript + landing page) ----
FROM node:20-alpine AS builder
WORKDIR /app

# Enable the pinned pnpm via corepack (version comes from package.json#packageManager).
RUN corepack enable

# Install deps first for better layer caching.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the userscript and assemble dist-site/.
COPY . .
RUN pnpm run site:build

# ---- Stage 2: runtime ----
FROM nginx:1.27-alpine AS runtime
LABEL org.opencontainers.image.title="chatgpt-exporter" \
      org.opencontainers.image.description="Install site + userscript for ChatGPT Exporter" \
      org.opencontainers.image.source="https://github.com/a-organvm/a-i-chat--exporter"

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist-site /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/chatgpt.user.js || exit 1
