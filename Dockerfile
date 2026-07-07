FROM node:22-alpine AS base
# pnpm を非対話モードで動かす（TTY 前提のプロンプトで落ちないように）
ENV CI=true
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/serve.mjs ./
RUN pnpm install --frozen-lockfile --prod
EXPOSE 8080
CMD ["node", "serve.mjs"]
