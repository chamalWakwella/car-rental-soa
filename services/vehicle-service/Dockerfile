FROM node:20-alpine
WORKDIR /app

COPY shared ./shared
COPY vehicle-service/package.json ./vehicle-service/package.json
WORKDIR /app/vehicle-service
RUN npm install --omit=dev

COPY vehicle-service/src ./src

EXPOSE 4002
CMD ["node", "src/index.js"]
