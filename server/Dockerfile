# server/Dockerfile

ARG NODE_IMAGE_TAG=22-alpine

FROM node:22-alpine AS deps
WORKDIR /srv

# Install production dependencies only (cacheable layer)
COPY server/package.json server/package-lock.json ./
ENV NODE_ENV=production
RUN npm ci --omit=dev

FROM node:${NODE_IMAGE_TAG} AS build
WORKDIR /srv

# Full deps needed to build TS
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

FROM node:${NODE_IMAGE_TAG} AS final
WORKDIR /srv
ENV NODE_ENV=production

# Copy prod node_modules from deps stage and built JS from build stage
COPY --from=deps /srv/node_modules ./node_modules
COPY --from=build /srv/dist ./dist
COPY --from=build /srv/package.json ./package.json

# Run as non-root (built-in user)
USER node

EXPOSE 3000
CMD ["node", "dist/index.js"]
