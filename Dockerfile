FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4748
ENV HOSTNAME=0.0.0.0
ENV TIMEOFF_COMPONENT_UPDATES=0
ENV TIMEOFF_DB_PATH=/app/data/timeoff.db
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/data \
  && chown nextjs:nodejs /app/data
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/scripts/docker-entrypoint.mjs ./docker-entrypoint.mjs
USER root
EXPOSE 4748
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4748/sign-in').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node", "docker-entrypoint.mjs"]
