-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DraftImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "draftId" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "localPath" TEXT,
    "remoteUrl" TEXT,
    "wpMediaId" INTEGER,
    "altText" TEXT,
    "caption" TEXT,
    "positionMarker" TEXT,
    "insertType" TEXT,
    "targetHeadingText" TEXT,
    "targetHeadingLevel" INTEGER,
    "paragraphIndexInSection" INTEGER,
    "isInserted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DraftImage_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DraftImage" ("altText", "caption", "createdAt", "draftId", "id", "localPath", "positionMarker", "remoteUrl", "sourceType", "updatedAt", "wpMediaId") SELECT "altText", "caption", "createdAt", "draftId", "id", "localPath", "positionMarker", "remoteUrl", "sourceType", "updatedAt", "wpMediaId" FROM "DraftImage";
DROP TABLE "DraftImage";
ALTER TABLE "new_DraftImage" RENAME TO "DraftImage";
CREATE INDEX "DraftImage_draftId_idx" ON "DraftImage"("draftId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
