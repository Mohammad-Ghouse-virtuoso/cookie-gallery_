# Dockerfile (place at repo root)
FROM node:18-alpine AS builder

# Install build deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy source & build
COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Install a small static server (you can use vite preview instead)
# We'll use `serve` for static `dist` serving; alternatively use vite preview.
RUN npm i -g serve

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
# If you also need a backend inside the same repo, copy backend build here
# COPY --from=builder /app/backend ./backend

# Use the PORT provided by Railway
ENV PORT 3000
EXPOSE 3000

# Start: use environment PORT (Railway will set PORT at runtime)
CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
