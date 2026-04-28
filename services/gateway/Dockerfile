FROM node:20-alpine
WORKDIR /app

COPY shared ./shared
COPY gateway/package.json ./gateway/package.json
WORKDIR /app/gateway
RUN npm install --omit=dev

COPY gateway/src ./src

EXPOSE 4000
CMD ["node", "src/index.js"]
