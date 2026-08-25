# ---- Stage 1: Build Frontend ----
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY src/package.json src/package-lock.json* ./
RUN npm ci --ignore-scripts 2>/dev/null || npm install
COPY src/ .
RUN npm run build

# ---- Stage 2: Runtime ----
FROM node:22-alpine
WORKDIR /app

# Copy backend
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm ci --ignore-scripts --omit=dev 2>/dev/null || npm install --omit=dev
COPY server/ .

# Copy built frontend to backend's public dir
COPY --from=frontend-builder /app/frontend/dist /app/server/public

EXPOSE 3000
CMD ["node", "index.js"]
