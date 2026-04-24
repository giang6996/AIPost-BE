-- CreateTable
CREATE TABLE "DraftSeoMeta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "draftId" INTEGER NOT NULL,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DraftSeoMeta_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DraftSeoMeta_draftId_key" ON "DraftSeoMeta"("draftId");
