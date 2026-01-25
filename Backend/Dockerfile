FROM node:20-slim

# Install system dependencies for Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose API port
EXPOSE 3000

# Start NestJS in dev mode
CMD ["npm", "run", "start:dev"]
