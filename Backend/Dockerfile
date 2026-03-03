FROM node:20-slim

# Install system dependencies for Prisma and native modules
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    python3 \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with retry and increased timeout
RUN npm install --legacy-peer-deps --prefer-offline --no-audit || npm install --legacy-peer-deps --prefer-offline --no-audit

# Copy source code
COPY . .

# Generate Prisma Client with correct binary targets for Linux
RUN npx prisma generate

# Sync database schema (creates tables if they don't exist)
RUN npx prisma db push --skip-generate --accept-data-loss || true

# Build NestJS application
RUN npm run build

# Expose API port
EXPOSE 3000

# Start NestJS application - supports both dev and prod modes
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then npm run start:prod; else npm run start:dev; fi"]
