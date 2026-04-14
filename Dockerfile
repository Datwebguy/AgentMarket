FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm install

# Generate Prisma client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY backend/ .
RUN npm run build

EXPOSE 4000

ENV PRISMA_QUERY_ENGINE_TYPE=binary
ENV NODE_ENV=production

CMD ["node", "start.js"]
