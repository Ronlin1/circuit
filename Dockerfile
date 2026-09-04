FROM node:22.16.0-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts
ENV CIRCUIT_MODE=simulation CIRCUIT_PORT=3000
EXPOSE 3000
CMD ["node","src/index.js"]
