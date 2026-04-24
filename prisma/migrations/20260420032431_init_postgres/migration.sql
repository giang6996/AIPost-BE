-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UPDATED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImageSourceType" AS ENUM ('GENERATED', 'UPLOADED');

-- CreateEnum
CREATE TYPE "ImageInsertType" AS ENUM ('AFTER_HEADING', 'INSIDE_SECTION_START', 'INSIDE_SECTION_END', 'AFTER_PARAGRAPH_IN_SECTION', 'END_OF_ARTICLE');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredential" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProviderConfig" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "defaultTextModel" TEXT,
    "defaultImageModel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WpSite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "siteName" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "wpUsername" TEXT NOT NULL,
    "wpApplicationPasswordEncrypted" TEXT NOT NULL,
    "snippetEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "SiteStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WpSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WpPostSync" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    "wpPostId" INTEGER,
    "wpPostUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'DRAFT',
    "syncMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WpPostSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Draft" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "defaultSiteId" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "excerpt" TEXT,
    "contentHtml" TEXT NOT NULL,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "featuredImageId" INTEGER,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftCategory" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    "wpCategoryId" INTEGER NOT NULL,
    "categoryName" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftTag" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    "wpTagId" INTEGER NOT NULL,
    "tagName" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftSeoMeta" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "focusKeyword" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftSeoMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftImage" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER NOT NULL,
    "sourceType" "ImageSourceType" NOT NULL,
    "localPath" TEXT,
    "remoteUrl" TEXT,
    "wpMediaId" INTEGER,
    "altText" TEXT,
    "caption" TEXT,
    "positionMarker" TEXT,
    "insertType" "ImageInsertType",
    "targetHeadingText" TEXT,
    "targetHeadingLevel" INTEGER,
    "paragraphIndexInSection" INTEGER,
    "isInserted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" SERIAL NOT NULL,
    "draftId" INTEGER,
    "userId" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserCredential_userId_key" ON "UserCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionTokenHash_key" ON "UserSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "UserSession_revokedAt_idx" ON "UserSession"("revokedAt");

-- CreateIndex
CREATE INDEX "AiProviderConfig_userId_idx" ON "AiProviderConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiProviderConfig_userId_provider_key" ON "AiProviderConfig"("userId", "provider");

-- CreateIndex
CREATE INDEX "WpSite_userId_idx" ON "WpSite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WpSite_userId_siteUrl_key" ON "WpSite"("userId", "siteUrl");

-- CreateIndex
CREATE INDEX "WpPostSync_draftId_idx" ON "WpPostSync"("draftId");

-- CreateIndex
CREATE INDEX "WpPostSync_siteId_idx" ON "WpPostSync"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "WpPostSync_draftId_siteId_key" ON "WpPostSync"("draftId", "siteId");

-- CreateIndex
CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");

-- CreateIndex
CREATE INDEX "Draft_defaultSiteId_idx" ON "Draft"("defaultSiteId");

-- CreateIndex
CREATE INDEX "Draft_status_idx" ON "Draft"("status");

-- CreateIndex
CREATE INDEX "Draft_featuredImageId_idx" ON "Draft"("featuredImageId");

-- CreateIndex
CREATE INDEX "DraftCategory_draftId_idx" ON "DraftCategory"("draftId");

-- CreateIndex
CREATE INDEX "DraftCategory_siteId_idx" ON "DraftCategory"("siteId");

-- CreateIndex
CREATE INDEX "DraftCategory_wpCategoryId_idx" ON "DraftCategory"("wpCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftCategory_draftId_siteId_wpCategoryId_key" ON "DraftCategory"("draftId", "siteId", "wpCategoryId");

-- CreateIndex
CREATE INDEX "DraftTag_draftId_idx" ON "DraftTag"("draftId");

-- CreateIndex
CREATE INDEX "DraftTag_siteId_idx" ON "DraftTag"("siteId");

-- CreateIndex
CREATE INDEX "DraftTag_wpTagId_idx" ON "DraftTag"("wpTagId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftTag_draftId_siteId_wpTagId_key" ON "DraftTag"("draftId", "siteId", "wpTagId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftSeoMeta_draftId_key" ON "DraftSeoMeta"("draftId");

-- CreateIndex
CREATE INDEX "DraftImage_draftId_idx" ON "DraftImage"("draftId");

-- CreateIndex
CREATE INDEX "UsageLog_draftId_idx" ON "UsageLog"("draftId");

-- CreateIndex
CREATE INDEX "UsageLog_userId_idx" ON "UsageLog"("userId");

-- CreateIndex
CREATE INDEX "UsageLog_actionType_idx" ON "UsageLog"("actionType");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProviderConfig" ADD CONSTRAINT "AiProviderConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WpSite" ADD CONSTRAINT "WpSite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WpPostSync" ADD CONSTRAINT "WpPostSync_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WpPostSync" ADD CONSTRAINT "WpPostSync_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WpSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_defaultSiteId_fkey" FOREIGN KEY ("defaultSiteId") REFERENCES "WpSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "DraftImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftCategory" ADD CONSTRAINT "DraftCategory_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftCategory" ADD CONSTRAINT "DraftCategory_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WpSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftTag" ADD CONSTRAINT "DraftTag_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftTag" ADD CONSTRAINT "DraftTag_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WpSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftSeoMeta" ADD CONSTRAINT "DraftSeoMeta_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftImage" ADD CONSTRAINT "DraftImage_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
