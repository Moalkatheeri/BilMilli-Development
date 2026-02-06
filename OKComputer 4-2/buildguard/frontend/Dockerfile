# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files from the app directory
COPY app/package*.json ./
RUN npm install

# Copy source and build
COPY app/ .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY buildguard/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
