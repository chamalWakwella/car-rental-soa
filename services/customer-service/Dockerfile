FROM node:20-alpine
WORKDIR /app

COPY shared ./shared
COPY customer-service/package.json ./customer-service/package.json
WORKDIR /app/customer-service
RUN npm install --omit=dev

COPY customer-service/src ./src

EXPOSE 4003
CMD ["node", "src/index.js"]
