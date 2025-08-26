# Kiwi TCMS MCP Server Dockerfile
FROM node:18-alpine

# Install system dependencies (curl for health checks)
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files and install ALL dependencies (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build the TypeScript Kiwi TCMS MCP server
RUN npm run build

# Clean up dev dependencies after build
RUN npm prune --production

# Copy wrapper for HTTP interface
COPY wrapper.js ./

# Expose the HTTP wrapper port
EXPOSE 8184

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8184/health || exit 1

# Start the HTTP wrapper
CMD ["node", "wrapper.js"]
