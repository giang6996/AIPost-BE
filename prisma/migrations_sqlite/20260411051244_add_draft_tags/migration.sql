-- CreateTable
CREATE TABLE "DraftTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "draftId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    "wpTagId" INTEGER NOT NULL,
    "tagName" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DraftTag_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DraftTag_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WpSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DraftTag_draftId_idx" ON "DraftTag"("draftId");

-- CreateIndex
CREATE INDEX "DraftTag_siteId_idx" ON "DraftTag"("siteId");

-- CreateIndex
CREATE INDEX "DraftTag_wpTagId_idx" ON "DraftTag"("wpTagId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftTag_draftId_siteId_wpTagId_key" ON "DraftTag"("draftId", "siteId", "wpTagId");
