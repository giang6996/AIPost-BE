-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Draft" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "defaultSiteId" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "excerpt" TEXT,
    "contentHtml" TEXT NOT NULL,
    "featuredImageUrl" TEXT,
    "featuredImageAlt" TEXT,
    "featuredImageId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Draft_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "DraftImage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Draft_defaultSiteId_fkey" FOREIGN KEY ("defaultSiteId") REFERENCES "WpSite" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Draft" ("contentHtml", "createdAt", "defaultSiteId", "excerpt", "featuredImageAlt", "featuredImageUrl", "id", "slug", "status", "title", "updatedAt", "userId") SELECT "contentHtml", "createdAt", "defaultSiteId", "excerpt", "featuredImageAlt", "featuredImageUrl", "id", "slug", "status", "title", "updatedAt", "userId" FROM "Draft";
DROP TABLE "Draft";
ALTER TABLE "new_Draft" RENAME TO "Draft";
CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");
CREATE INDEX "Draft_defaultSiteId_idx" ON "Draft"("defaultSiteId");
CREATE INDEX "Draft_status_idx" ON "Draft"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
