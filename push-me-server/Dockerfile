# push-me-server/Dockerfile
FROM node:18-alpine
WORKDIR /app

# install production deps
COPY package*.json ./
RUN npm ci --production

# copy the rest of your server code
COPY . .

# index.js reads MODE and PORT from process.env
CMD ["node", "index.js"]
