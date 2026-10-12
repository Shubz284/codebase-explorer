import { prisma } from "@/lib/prisma";
import { getOctokit, fetchFileContent } from "@/lib/github";
import { shouldChunk, chunkFile } from "@/lib/chunker";
import { embedText } from "@/lib/embeddings"; // adjust this import if your export name differs
import { mapWithConcurrency } from "@/lib/concurrency";
import { randomUUID } from "crypto";
import { withDbRetry } from "../db-retry";

export async function embedRepo(repoId: string, accessToken: string) {
  await prisma.repo.update({ where: { id: repoId }, data: { status: "EMBEDDING" } });

  const repo = await prisma.repo.findUniqueOrThrow({
    where: { id: repoId },
    include: { files: true },
  });

  const octokit = getOctokit(accessToken);
  const chunkableFiles = repo.files.filter((f) => shouldChunk(f.path, f.language));

  // concurrency 3, matching the roadmap's "go slower than Day 3" — Gemini's
  // free tier is stricter than GitHub's, so this stays conservative


  console.log("🚀 STARTING EMBED PIPELINE");
  console.log(`Found ${chunkableFiles.length} files to embed`);
  await mapWithConcurrency(chunkableFiles, 2, async (file) => {
    console.log(`Embedding: ${file.path}`);
    const content = await fetchFileContent(octokit, repo.owner, repo.name, file.path);
    if (content === null) return;

    const chunks = await chunkFile(content, file.path, file.language);

    // sequential within one file, not parallel — keeps total concurrent
    // embedding calls close to 3 overall, not 3 files × many chunks each at once
    for (const chunk of chunks) {
      if (!chunk.content.trim()) continue; // empty/whitespace-only chunk — nothing meaningful to embed, and Gemini rejects it with a 400 anyway

      let embedding: number[];
      try {
        embedding = await embedText(chunk.content);
      } catch (err) {
        // names the exact file + lines that failed — without this, concurrency
        // means you can't tell which of 42 files caused a crash just from the log
        throw new Error(
          `Embedding failed for ${file.path} (lines ${chunk.startLine}-${chunk.endLine}): ${(err as Error).message}`
        );
      }

      const vectorLiteral = `[${embedding.join(",")}]`;

     await withDbRetry(() => prisma.$executeRaw`
       INSERT INTO "Chunk" (id, "fileId", content, embedding, "functionName", "startLine", "endLine", "createdAt")
       VALUES (
       ${randomUUID()},
       ${file.id},
       ${chunk.content},
       ${vectorLiteral}::vector,
       ${chunk.functionName},
       ${chunk.startLine},
       ${chunk.endLine},
       now()
      )
      `);
    }
  });
}