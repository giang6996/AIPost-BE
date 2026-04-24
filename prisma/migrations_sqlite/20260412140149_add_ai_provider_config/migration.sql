-- CreateTable
CREATE TABLE "AiProviderConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "defaultTextModel" TEXT,
    "defaultImageModel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AiProviderConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiProviderConfig_userId_idx" ON "AiProviderConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiProviderConfig_userId_provider_key" ON "AiProviderConfig"("userId", "provider");
