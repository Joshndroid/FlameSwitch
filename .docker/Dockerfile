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
# ARCHITECTURE CONTRACT: FlameSwitch is intentionally an Unraid-friendly
# LinuxServer/s6 container. Version bumps are welcome; replacing this image or
# bypassing s6 must be treated as an explicit architecture change. CI enforces it.
FROM lscr.io/linuxserver/baseimage-alpine:3.22

# Install node and runtime deps
RUN apk add --no-cache nodejs curl jq sqlite

ARG APP_VERSION=dev
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}

# Copy built app from builder
COPY --from=builder /app /app
WORKDIR /app

# Register the Flame service with s6-overlay. The service runs as LinuxServer's
# abc user after its PUID/PGID and mounted-volume permissions are initialized.
COPY root/ /

EXPOSE 5005
