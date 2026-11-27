FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js world-routes.cjs promo-routes.js international.cjs ./
RUN mkdir -p /data/chezzies-international && chown -R node:node /data /app
USER node
ENV NODE_ENV=production PORT=3003 DATA_DIR=/data/chezzies-international
EXPOSE 3003
CMD ["node", "server.js"]
