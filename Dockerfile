FROM node:22-bookworm-slim

WORKDIR /app

ARG DATABASE_URL=file:/app/prisma/dev.db
ENV DATABASE_URL=${DATABASE_URL}

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start"]
