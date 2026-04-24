-- CreateTable
CREATE TABLE "UsageLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "draftId" INTEGER,
    "userId" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageLog_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "Draft" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UsageLog_draftId_idx" ON "UsageLog"("draftId");

-- CreateIndex
CREATE INDEX "UsageLog_userId_idx" ON "UsageLog"("userId");

-- CreateIndex
CREATE INDEX "UsageLog_actionType_idx" ON "UsageLog"("actionType");
