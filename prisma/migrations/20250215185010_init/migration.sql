-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "headline" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isFake" BOOLEAN NOT NULL,
    "fakeReason" TEXT,
    "country" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Article_language_country_idx" ON "Article"("language", "country");

-- CreateIndex
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");
