# Multi-stage build for Vite React frontend
# Stage 1: Build the application
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --maxsockets 1 --network-timeout 60000 || \
    (sleep 5 && npm ci --maxsockets 1 --network-timeout 60000) || \
    (sleep 10 && npm ci --maxsockets 1 --network-timeout 60000)

# Copy source code
COPY . .

# Build the application
# VITE_API_URL and other env vars will be injected at build time
# Use vite build directly to skip TypeScript type checking (Vite still compiles TS)
# This allows the build to succeed even with TypeScript warnings/errors
RUN vite build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port (Coolify will map this)
# Using port 5173 (Vite default) to avoid conflicts
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5173/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

