-- CreateEnum
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TYPE "RepoStatus" AS ENUM ('PENDING', 'FETCHING', 'PARSING', 'EMBEDDING', 'SUMMARIZING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "EdgeType" AS ENUM ('IMPORT', 'CALL');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "Repo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "status" "RepoStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "moduleSummaries" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "analyzedAt" TIMESTAMP(3),

    CONSTRAINT "Repo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "language" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "summary" TEXT,
    "functionCount" INTEGER NOT NULL DEFAULT 0,
    "exportCount" INTEGER NOT NULL DEFAULT 0,
    "hasTestFile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "functionName" TEXT,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edge" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "targetFileId" TEXT NOT NULL,
    "type" "EdgeType" NOT NULL DEFAULT 'IMPORT',
    "isCircular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "citedFileIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Repo_userId_idx" ON "Repo"("userId");

-- CreateIndex
CREATE INDEX "Repo_status_idx" ON "Repo"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Repo_userId_githubUrl_key" ON "Repo"("userId", "githubUrl");

-- CreateIndex
CREATE INDEX "File_repoId_idx" ON "File"("repoId");

-- CreateIndex
CREATE UNIQUE INDEX "File_repoId_path_key" ON "File"("repoId", "path");

-- CreateIndex
CREATE INDEX "Chunk_fileId_idx" ON "Chunk"("fileId");

-- CreateIndex
CREATE INDEX "Edge_repoId_idx" ON "Edge"("repoId");

-- CreateIndex
CREATE INDEX "Edge_sourceFileId_idx" ON "Edge"("sourceFileId");

-- CreateIndex
CREATE INDEX "Edge_targetFileId_idx" ON "Edge"("targetFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Edge_sourceFileId_targetFileId_type_key" ON "Edge"("sourceFileId", "targetFileId", "type");

-- CreateIndex
CREATE INDEX "ChatMessage_repoId_createdAt_idx" ON "ChatMessage"("repoId", "createdAt");

-- AddForeignKey
ALTER TABLE "Repo" ADD CONSTRAINT "Repo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edge" ADD CONSTRAINT "Edge_targetFileId_fkey" FOREIGN KEY ("targetFileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "Repo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
