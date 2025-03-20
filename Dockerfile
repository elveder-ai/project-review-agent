# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code and build configuration
COPY tsconfig.json ./
COPY src/ ./src/

# Build the TypeScript code
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install dependencies and tools
RUN apk add --no-cache curl cloc rust cargo build-base
RUN cargo install code2prompt
# Add cargo bin to PATH
ENV PATH="/root/.cargo/bin:${PATH}"

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy any other necessary files
COPY .env ./.env

# Set environment variables
ENV NODE_ENV=production

# Run the application with /project as the target directory
CMD ["node", "dist/index.js", "/project"] 