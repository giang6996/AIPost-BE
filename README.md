# AIPost Backend

Backend API for managing AI-assisted content drafting, WordPress site sync, media handling, and admin/user workflows.

## What It Does

- User registration, login, profile updates, and password changes
- AI provider configuration and content generation endpoints
- Draft creation, editing, SEO metadata, categories, tags, and publishing
- WordPress site management, categories, tags, and connection testing
- Media upload, generated image handling, and featured image assignment
- Admin-only user, draft, and site management
- Persistent storage through Prisma and PostgreSQL

## Tech Stack

- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Vitest + Supertest
- Multer for uploads
- OpenAI SDK for AI features

## Prerequisites

- Node.js 20+ recommended
- PostgreSQL database
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   PORT=3001
   NODE_ENV=development
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME?schema=public"
   ENCRYPTION_KEY="12345678901234567890123456789012"
   ```

3. Apply Prisma migrations:

   ```bash
   npx prisma migrate dev
   ```

4. Seed the database if needed:

   ```bash
   npx prisma db seed
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

The server listens on `http://localhost:3001` by default.

## Environment Variables

- `PORT` — server port, defaults to `3001`
- `NODE_ENV` — runtime mode, defaults to `development`
- `DATABASE_URL` — required PostgreSQL connection string
- `ENCRYPTION_KEY` — used for encrypted credentials and API config storage; defaults to a 32-character fallback in code, but should be set explicitly

## Scripts

- `npm run dev` — start the API in development mode with live reload
- `npm test` — run the test suite once
- `npm run test:watch` — run tests in watch mode
- `npm run test:coverage` — run tests with coverage output

## API Overview

- `GET /health` — health check
- `POST /auth/register`, `POST /auth/login` — account access
- `GET /auth/me`, `POST /auth/logout`, `PUT /auth/profile`, `PUT /auth/password` — authenticated account actions
- `GET /ai/config`, `POST /ai/config`, `PUT /ai/config`, `DELETE /ai/config` — AI provider settings
- `POST /ai/generate-image`, `POST /ai/generate-post`, `POST /ai/generate-title`, `POST /ai/generate-seo`, `POST /ai/rewrite-section` — AI generation helpers
- `GET /sites`, `POST /sites`, `PUT /sites/:id`, `DELETE /sites/:id` — WordPress site management
- `GET /drafts`, `POST /drafts`, `PUT /drafts/:id`, `DELETE /drafts/:id` — draft management
- `POST /drafts/:id/publish` — publish a draft
- `GET /drafts/:id/seo`, `PUT /drafts/:id/seo` — SEO metadata
- `GET /drafts/:id/categories`, `PUT /drafts/:id/categories` — draft categories
- `GET /drafts/:id/tags`, `PUT /drafts/:id/tags` — draft tags
- `GET /drafts/:id/images` and related `/drafts/:id/images/*` routes — image upload and placement
- `GET /admin/users`, `/admin/drafts`, `/admin/sites` and related routes — admin-only operations

## Storage

- Uploaded files are stored under `uploads/`
- Generated images are stored under `uploads/generated/`
- Uploaded images are stored under `uploads/uploaded/`
- These directories are created automatically on server start and during tests

## Testing

The test suite uses Vitest and a separate `.env.test` configuration. Tests reset the database state between runs and clean upload storage.

```bash
npm test
```

## Project Structure

- `src/app.ts` — Express app setup and route registration
- `src/server.ts` — server entrypoint
- `src/controllers/` — request handlers
- `src/routes/` — route definitions
- `src/services/` — business logic
- `src/middleware/` — auth, roles, and upload middleware
- `src/utils/` — shared helpers
- `prisma/` — Prisma schema, migrations, and seed scripts

## Notes

- The backend is configured for a frontend running at `http://localhost:5173` during local development.
- Authenticated routes require the session/auth middleware.
- Admin routes require the authenticated user to have the `admin` role.
