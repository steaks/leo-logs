FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm ci && npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV LEO_LOGS_DB=/data/logs.db
COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm ci --omit=dev
COPY --from=build /app/packages/trace/dist ./packages/trace/dist
COPY --from=build /app/packages/ui/dist ./packages/ui/dist
EXPOSE 8787
CMD ["node", "packages/ui/dist/bin.js", "ui"]
