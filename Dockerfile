FROM node:20-alpine AS build
WORKDIR /app
COPY client/package*.json client/
RUN npm install --prefix client
COPY client client
RUN npm run build --prefix client

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json server/
RUN npm install --omit=dev --prefix server
COPY server server
COPY --from=build /app/client/dist client/dist
USER node
WORKDIR /app/server
EXPOSE 4000
CMD ["node", "src/index.js"]
