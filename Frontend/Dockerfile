FROM node:20-alpine

WORKDIR /app

# Install dependencias usando lockfile exacto
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose Vite port
EXPOSE 5173

# Start development server binding to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
