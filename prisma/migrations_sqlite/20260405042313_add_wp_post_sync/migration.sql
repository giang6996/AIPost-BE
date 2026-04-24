-- CreateTable
CREATE TABLE "WpPostSync" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "draftId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    "wpPostId" INTEGER,
    "wpPostUrl" TEXT,
    "lastSyncedAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "syncMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WpPostSync_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WpPostSync_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WpSite" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WpPostSync_draftId_idx" ON "WpPostSync"("draftId");

-- CreateIndex
CREATE INDEX "WpPostSync_siteId_idx" ON "WpPostSync"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "WpPostSync_draftId_siteId_key" ON "WpPostSync"("draftId", "siteId");
