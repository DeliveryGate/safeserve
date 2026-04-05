FROM node:18-alpine

WORKDIR /app

# Copy and install root (safeserve) dependencies
COPY safeserve/package*.json ./
RUN npm install --production

# Copy and install web dependencies (includes @prisma/client)
COPY safeserve/web/package*.json ./web/
RUN cd web && npm install --production

# Copy Prisma schema and generate client INTO web/node_modules
# (web/index.js imports from web/node_modules/@prisma/client)
COPY safeserve/prisma ./prisma
RUN cd web && npx prisma generate --schema=../prisma/schema.prisma

# Copy all application code
COPY safeserve/ .

EXPOSE 3000

CMD cd web && npx prisma db push --schema=../prisma/schema.prisma --skip-generate && node index.js
