# ---- Frontend Dockerfile ----
# Multi-stage build: Vite build → Nginx serve

# Stage 1: Build the React app
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vite build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runtime
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy our custom config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
