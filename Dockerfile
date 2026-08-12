# syntax=docker/dockerfile:1

# Install OpenSSL for Prisma
FROM node:20-bookworm-slim AS base

RUN apt-get update -y \
  && apt-get install -y openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app

# Install the full toolchain first because the build step needs Prisma CLI and TypeScript.
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app

# Prisma validates DATABASE_URL while generating the client, even though the
# real production value is injected later at runtime by SSM or the deploy host.
# This placeholder only needs to be syntactically valid so the image can build.
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public
ENV DATABASE_URL=${DATABASE_URL}

# Copy the source tree and Prisma config after dependencies so Docker can cache installs.
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build

# Run database migration
FROM build AS migration
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only the compiled app and production runtime dependencies.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Remove devDependencies before we hand the image to the runtime stage.
RUN npm prune --omit=dev

EXPOSE 3000

# The app bootstrap already loads SSM secrets, initializes storage, and starts Express.
CMD ["node", "dist/src/server.js"]
