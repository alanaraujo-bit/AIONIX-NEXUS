# AIONIX NEXUS — imagem de produção
# O banco é um Postgres externo: basta DATABASE_URL no ambiente. Não há volume
# nem arquivo local para persistir.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O build não precisa de segredo real, só de um valor presente.
RUN NEXUS_SECRET=placeholder-apenas-para-o-build-nao-usado-em-runtime npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup -g 1001 -S nexus && adduser -S nexus -u 1001

COPY --from=builder --chown=nexus:nexus /app/public ./public
COPY --from=builder --chown=nexus:nexus /app/.next ./.next
COPY --from=builder --chown=nexus:nexus /app/node_modules ./node_modules
COPY --from=builder --chown=nexus:nexus /app/package.json ./package.json

USER nexus
EXPOSE 3000

CMD ["npm", "run", "start"]
