FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci
RUN npm --prefix server ci

COPY . .

RUN npm run build

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
