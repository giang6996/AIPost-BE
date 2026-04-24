-- CreateTable
CREATE TABLE "DraftImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "draftId" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "localPath" TEXT,
    "remoteUrl" TEXT,
    "altText" TEXT,
    "caption" TEXT,
    "positionMarker" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DraftImage_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DraftImage_draftId_idx" ON "DraftImage"("draftId");
