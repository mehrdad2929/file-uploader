-- CreateTable
CREATE TABLE "sharedLinks" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "folderId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sharedLinks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sharedLinks_token_key" ON "sharedLinks"("token");

-- AddForeignKey
ALTER TABLE "sharedLinks" ADD CONSTRAINT "sharedLinks_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharedLinks" ADD CONSTRAINT "sharedLinks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
