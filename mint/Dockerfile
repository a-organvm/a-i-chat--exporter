# Sovereign licence mint — self-hosted Bitcoin cash intake.
FROM node:20-alpine

WORKDIR /app

# Install deps (tsx runs the TS entrypoint directly; no build step).
COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

ENV PORT=8787
EXPOSE 8787

# The signing key auto-generates into /app/.data on first boot; mount a volume
# there to persist it. Provide MINT_BTC_ADDRESS via --env-file or -e to sell.
CMD ["npm", "start"]
