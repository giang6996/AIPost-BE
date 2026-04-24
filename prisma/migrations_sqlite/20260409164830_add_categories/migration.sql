-- CreateTable
CREATE TABLE "DraftCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "draftId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    "wpCategoryId" INTEGER NOT NULL,
    "categoryName" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DraftCategory_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DraftCategory_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WpSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DraftCategory_draftId_idx" ON "DraftCategory"("draftId");

-- CreateIndex
CREATE INDEX "DraftCategory_siteId_idx" ON "DraftCategory"("siteId");

-- CreateIndex
CREATE INDEX "DraftCategory_wpCategoryId_idx" ON "DraftCategory"("wpCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftCategory_draftId_siteId_wpCategoryId_key" ON "DraftCategory"("draftId", "siteId", "wpCategoryId");
