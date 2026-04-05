FROM node:18-alpine

WORKDIR /app

# Install root dependencies
COPY package*.json ./
RUN npm ci --production 2>/dev/null || npm install --production

# Install web dependencies
COPY web/package*.json ./web/
RUN cd web && npm ci --production 2>/dev/null || cd web && npm install --production

# Install Prisma and generate client
COPY prisma ./prisma
RUN cd web && npx prisma generate --schema=../prisma/schema.prisma

# Copy application code
COPY . .

# Build frontend
RUN cd web && npm run build 2>/dev/null || true

EXPOSE 3000

# Run database migration and start server
CMD npx prisma db push --schema=prisma/schema.prisma --skip-generate && cd web && node index.js
