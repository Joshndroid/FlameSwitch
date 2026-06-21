# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

#Turn off Update Notifier as latest errors out
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Server deps
COPY package*.json ./
RUN npm ci --omit=dev

# Client deps + build
WORKDIR /app/client
COPY ./client/package*.json ./
RUN npm ci
COPY ./client/ ./
RUN npm run build

# Final files
WORKDIR /app
COPY . .
RUN mkdir -p ./public && mv ./client/dist/* ./public
RUN rm -rf ./client

# ---- Final Stage ----
FROM node:22-alpine

# Install node and runtime deps
RUN apk add --no-cache curl sqlite

ARG APP_VERSION=dev
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}

# Copy built app from builder
COPY --from=builder --chown=node:node /app /app
RUN mkdir -p /app/data /app/log && chown -R node:node /app/data /app/log /app/public

USER node

EXPOSE 5005
CMD ["node", "server.js"]
