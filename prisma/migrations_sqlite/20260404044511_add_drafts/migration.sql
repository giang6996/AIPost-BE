-- CreateTable
CREATE TABLE "Draft" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "defaultSiteId" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "excerpt" TEXT,
    "contentHtml" TEXT NOT NULL,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Draft_defaultSiteId_fkey" FOREIGN KEY ("defaultSiteId") REFERENCES "WpSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");

-- CreateIndex
CREATE INDEX "Draft_defaultSiteId_idx" ON "Draft"("defaultSiteId");

-- CreateIndex
CREATE INDEX "Draft_status_idx" ON "Draft"("status");
