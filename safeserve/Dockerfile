FROM node:18-alpine

WORKDIR /app

# Copy and install root (safeserve) dependencies
COPY safeserve/package*.json ./
RUN npm install --production

# Copy and install web dependencies
COPY safeserve/web/package*.json ./web/
RUN cd web && npm install --production

# Copy Prisma schema and generate client
COPY safeserve/prisma ./prisma
RUN npx prisma generate --schema=prisma/schema.prisma

# Copy all application code
COPY safeserve/ .

EXPOSE 3000

CMD npx prisma db push --schema=prisma/schema.prisma --skip-generate && cd web && node index.js
