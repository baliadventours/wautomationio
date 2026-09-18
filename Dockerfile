# Stage 1: Build frontend & bundle server
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: Minimal Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy pre-compiled dist output (index.html, assets, and server.cjs)
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]

