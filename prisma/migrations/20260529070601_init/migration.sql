-- CreateEnum
CREATE TYPE "CellType" AS ENUM ('THOUGHT', 'NOTE', 'QUESTION', 'TREE_HOLE');

-- CreateTable
CREATE TABLE "Cell" (
    "id" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "type" "CellType" NOT NULL DEFAULT 'THOUGHT',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cell_x_y_idx" ON "Cell"("x", "y");

-- CreateIndex
CREATE INDEX "Cell_createdAt_idx" ON "Cell"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cell_x_y_key" ON "Cell"("x", "y");
