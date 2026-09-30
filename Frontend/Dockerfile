# Etapa 1: Construcción
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Compila el proyecto generando la carpeta dist
RUN npm run build

# Etapa 2: Producción con servidor estático
FROM node:20-alpine

WORKDIR /app

# Instalar 'serve' localmente o globalmente de forma segura en esta etapa
RUN npm install serve

# Copiar la carpeta compilada y los node_modules donde está el binario de serve
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Railway inyecta el puerto dinámicamente en la variable PORT
EXPOSE 3000

# Start development server binding to all interfaces
#CMD ["npm", "run", "dev", "--", "--host"]
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
