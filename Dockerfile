# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Install the full toolchain first because the build step needs Prisma CLI and TypeScript.
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app

# Copy the source tree and Prisma config after dependencies so Docker can cache installs.
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove devDependencies before we hand the image to the runtime stage.
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy only the compiled app and production runtime dependencies.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3001

# The app bootstrap already loads SSM secrets, initializes storage, and starts Express.
CMD ["node", "dist/src/server.js"]
