/*
  Warnings:

  - You are about to drop the `sharedLinks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sharedLinks" DROP CONSTRAINT "sharedLinks_folderId_fkey";

-- DropForeignKey
ALTER TABLE "sharedLinks" DROP CONSTRAINT "sharedLinks_userId_fkey";

-- DropTable
DROP TABLE "sharedLinks";

-- CreateTable
CREATE TABLE "sharedLink" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "folderId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sharedLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sharedLink_token_key" ON "sharedLink"("token");

-- AddForeignKey
ALTER TABLE "sharedLink" ADD CONSTRAINT "sharedLink_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharedLink" ADD CONSTRAINT "sharedLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
