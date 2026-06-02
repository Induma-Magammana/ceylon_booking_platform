# ---- Backend Dockerfile ----
# Uses tsx to run TypeScript directly (supports path aliases via tsconfig)

FROM node:22-alpine
WORKDIR /app

# Copy package files and install all deps (need tsx for runtime)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and config
COPY tsconfig.json ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "src/api/index.ts"]
