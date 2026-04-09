# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app

#Turn off Update Notifier as latest errors out
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Server deps
COPY package*.json ./
RUN npm install --production

# Client deps + build
WORKDIR /app/client
COPY ./client/package*.json ./
RUN npm install
COPY ./client/ ./
RUN npm run build

# Final files
WORKDIR /app
COPY . .
RUN mkdir -p ./public && mv ./client/dist/* ./public
RUN rm -rf ./client

# ---- Final Stage ----
FROM lscr.io/linuxserver/baseimage-alpine:3.22

# Install node and runtime deps
RUN apk add --no-cache nodejs curl jq sqlite

ENV NODE_ENV=production

# Copy built app from builder
COPY --from=builder /app /app

# Copy s6 service definitions
COPY root/ /

EXPOSE 5005
