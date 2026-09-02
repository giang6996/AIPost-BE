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

   These values are for local development only. In prod, `DATABASE_URL` and `ENCRYPTION_KEY` should come from AWS Systems Manager Parameter Store.

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

- `PORT` - server port, defaults to `3001` for local development
- `NODE_ENV` - runtime mode, defaults to `development`
- `DATABASE_URL` - required PostgreSQL connection string
- `ENCRYPTION_KEY` - required secret used for encrypted credentials and API config storage
- `CORS_ORIGINS` - comma-separated frontend origin allowlist, such as `http://localhost:5173` for local dev or `https://app.yourdomain.com` for production
- `MEDIA_STORAGE_PROVIDER` - `local` for filesystem storage or `s3` for object storage; defaults to `local`
- `MEDIA_PUBLIC_BASE_URL` - optional public media base URL for S3 or CDN-backed deployments
- `S3_BUCKET_NAME` - required when `MEDIA_STORAGE_PROVIDER=s3`
- `AWS_REGION` - required in production when loading secrets from SSM

Production secret loading process:

- Create `SecureString` parameters in SSM for `DATABASE_URL` and `ENCRYPTION_KEY`
- Use a path such as `/aipost/prod/DATABASE_URL` and `/aipost/prod/ENCRYPTION_KEY`
- Set `AWS_REGION` and `SSM_PARAMETER_PREFIX` in the production runtime environment
- Set `CORS_ORIGINS` to the production frontend domain(s) so browser requests are allowed
- Set `MEDIA_STORAGE_PROVIDER=s3` and `S3_BUCKET_NAME` for cloud media storage
- Set `MEDIA_PUBLIC_BASE_URL` if you want previews to point at a CDN or custom public bucket URL
- Keep local `.env` and test `.env.test` values separate from production values

The backend reads local env files during development, but production should inject secrets from AWS instead of relying on checked-in files or hardcoded defaults.

## Scripts

- `npm run dev` - start the API in development mode with live reload
- `npm run build` - generate Prisma Client and compile TypeScript into `dist/`
- `npm start` - run the compiled production server from `dist/src/server.js`
- `npm run migrate:deploy` - apply Prisma migrations in production or during deployment
- `npm test` - run the test suite once
- `npm run test:watch` - run tests in watch mode
- `npm run test:coverage` - run tests with coverage output

Production release flow:

1. Run `npm ci` on the deployment target or in the build image.
2. Run `npm run build` to generate the production artifact.
3. Run `npm run migrate:deploy` before sending traffic to the new version.
4. Run `npm start` to launch the compiled server.

This keeps schema changes separate from the application process and makes the runtime behavior predictable for EC2, containers, and Kubernetes later.

## Container Scaffold

- `Dockerfile` builds the app in three stages: install dependencies, compile the source, then run only the compiled production artifact.
- The runtime container starts with `node dist/src/server.js`, which matches the production start script.
- The image is intentionally stateless. Media should use S3 in production rather than relying on container-local files.
- The app bootstrap still loads SSM secrets at startup, so the container should receive AWS runtime access and the required environment variables from the deployment platform.
- Database migrations should still run as a separate deployment step before traffic is shifted to the new container version.

Because of that split, the container image is meant to be portable across EC2, ECS, and Kubernetes without baking secrets or migration logic into the image itself.

Build and run locally with Docker:

```bash
docker build -t aipost-backend .
docker run --rm -p 3001:3001 --env-file .env aipost-backend
```

To use different port on the host, change the left side of `-p` and keep the container side mapped to `3001`.

*Notice: During the Docker build, Prisma may validates `DATABASE_URL` while generating the client.  A safe
placeholder for that step has been implemented so the image can compile without exposing the real production database secret. **The actual runtime `DATABASE_URL` still come from SSM or the deployment environment**.*


## API Overview

- `GET /health` - health check
- `POST /auth/register`, `POST /auth/login` - account access
- `GET /auth/me`, `POST /auth/logout`, `PUT /auth/profile`, `PUT /auth/password` - authenticated account actions
- `GET /ai/config`, `POST /ai/config`, `PUT /ai/config`, `DELETE /ai/config` - AI provider settings
- `POST /ai/generate-image`, `POST /ai/generate-post`, `POST /ai/generate-title`, `POST /ai/generate-seo`, `POST /ai/rewrite-section` - AI generation helpers
- `GET /sites`, `POST /sites`, `PUT /sites/:id`, `DELETE /sites/:id` - WordPress site management
- `GET /drafts`, `POST /drafts`, `PUT /drafts/:id`, `DELETE /drafts/:id` - draft management
- `POST /drafts/:id/publish` - publish a draft
- `GET /drafts/:id/seo`, `PUT /drafts/:id/seo` - SEO metadata
- `GET /drafts/:id/categories`, `PUT /drafts/:id/categories` - draft categories
- `GET /drafts/:id/tags`, `PUT /drafts/:id/tags` - draft tags
- `GET /drafts/:id/images` and related `/drafts/:id/images/*` routes - image upload and placement
- `GET /admin/users`, `/admin/drafts`, `/admin/sites` and related routes - admin-only operations

## Storage

- The backend uses one neutral field, `storageKey`, for draft images.
- In local mode, `storageKey` points to a file under `uploads/`.
- In S3 mode, `storageKey` becomes an S3 object key instead of a disk path.
- The storage adapter hides the difference so the rest of the app can use the same flow in local and cloud deployments.
- Local development stores files under `uploads/`, with generated images under `uploads/generated/` and uploaded images under `uploads/uploaded/`.
- These directories are created automatically on server start and during tests.

## Media Flow

The media system is now designed so the same workflow works in local filesystem mode and in S3 mode.

### 1. Upload or generate an image

- A user uploads an image through the draft image endpoints, or the AI image generator creates one.
- The request first passes through the upload middleware.
- In local mode, Multer writes the file to disk.
- In S3 mode, Multer keeps the file in memory so the storage adapter can send the bytes to S3.
- The storage adapter returns one `storageKey`, and the backend saves that value in `DraftImage.storageKey`.

### 2. List and preview images

- When the API returns draft images, it also returns a `previewUrl`.
- If the image is local, the preview URL points to `/uploads/...` on the backend.
- If the image is stored in S3, the preview URL points to the public media base URL or S3 bucket URL.
- This is why the frontend can render previews without caring where the file is physically stored.

### 3. Update or delete image metadata

- Title, caption, alt text, and position changes are saved in the database only.
- If an image is deleted, the backend deletes the file or S3 object through the storage adapter first, then removes the DB row.
- This keeps cleanup behavior consistent across local and cloud storage.

### 4. Upload the image into WordPress

- Before an image can be inserted into a WordPress post, the backend uploads that image to WordPress media.
- The backend reads the image bytes through the storage adapter.
- In local mode, that means reading from disk.
- In S3 mode, that means downloading the object from S3.
- After WordPress accepts the file, the backend stores the returned `remoteUrl` and `wpMediaId` on the draft image record.

### 5. Insert the image into draft content

- Once a draft image has a WordPress `remoteUrl`, the backend can build the HTML image block.
- Insert operations place that HTML into the draft content at the selected position.
- The draft now contains WordPress-ready image markup, while the original file still remains managed by the storage layer.

### 6. Publish the draft

- Publishing sends the draft HTML, categories, tags, SEO data, and featured image reference to WordPress.
- The publish step does not depend on permanent files inside the container or EC2 instance.
- If the draft has a featured image, the backend passes the stored WordPress media ID to WordPress during publish.
- This is why the media flow works for both local dev and cloud production without changing the publish endpoint.

### Local vs S3 summary

- Local mode keeps the old filesystem workflow for development and testing.
- S3 mode moves the same workflow to object storage without changing the draft image API shape.
- The main difference is where the bytes live, not how the rest of the app talks about them.

## Testing

The test suite uses Vitest and a separate `.env.test` configuration. Tests reset the database state between runs and clean upload storage.

```bash
npm test
```

## Project Structure

- `src/app.ts` - Express app setup and route registration
- `src/server.ts` - server entrypoint
- `src/controllers/` - request handlers
- `src/routes/` - route definitions
- `src/services/` - business logic
- `src/middleware/` - auth, roles, and upload middleware
- `src/utils/` - shared helpers
- `prisma/` - Prisma schema, migrations, and seed scripts

## Notes

- The backend is configured for a frontend running at `http://localhost:5173` during local development.
- Authenticated routes require the session/auth middleware.
- Admin routes require the authenticated user to have the `admin` role.
