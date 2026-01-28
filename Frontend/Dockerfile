FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN rm -rf node_modules package-lock.json && npm install && npm install @rollup/rollup-linux-x64-musl

# Copy source code
COPY . .

# Expose Vite port
EXPOSE 5173

# Start development server binding to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
