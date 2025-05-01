# 1) Build your Vite app
FROM node:18-alpine AS builder
WORKDIR /app

# copy only what we need, install deps
COPY package*.json ./
RUN npm ci
COPY . .

# inject your production URLs at build time
ARG VITE_LOBBY_URL
ARG VITE_ARENA_URL
ENV VITE_LOBBY_URL=$VITE_LOBBY_URL
ENV VITE_ARENA_URL=$VITE_ARENA_URL

# build out to /app/dist
RUN npm run build

# 2) Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
