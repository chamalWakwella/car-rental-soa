FROM node:20-alpine
WORKDIR /app

COPY shared ./shared
COPY auth-service/package.json ./auth-service/package.json
WORKDIR /app/auth-service
RUN npm install --omit=dev

COPY auth-service/src ./src

EXPOSE 4001
CMD ["node", "src/index.js"]
