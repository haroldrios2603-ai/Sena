FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose Vite port
EXPOSE 5173

# Start development server binding to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
