// lib/pipeline/summarize-repo.ts
import { prisma } from "@/lib/prisma";
import { getOctokit, fetchFileContent } from "@/lib/github";
import { shouldChunk } from "@/lib/chunker";
import { summarizeFile, summarizeModule } from "@/lib/summarize";
import { mapWithConcurrency } from "@/lib/concurrency";
import { withDbRetry } from "../db-retry";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function summarizeRepo(repoId: string, accessToken: string) {
  await prisma.repo.update({ where: { id: repoId }, data: { status: "SUMMARIZING" } });

  const repo = await prisma.repo.findUniqueOrThrow({
    where: { id: repoId },
    include: { files: true },
  });

  const octokit = getOctokit(accessToken);
  const filesToSummarize = repo.files.filter((f) => shouldChunk(f.path, f.language));

  // kept in memory as we go, so the folder rollup below doesn't need a
  // second database read — same summaries, just not re-fetched
  const summaries: { path: string; summary: string }[] = [];

  await mapWithConcurrency(filesToSummarize, 2, async (file) => {
  // summarized on an earlier run: reuse it, no API call
  if (file.summary) {
    summaries.push({ path: file.path, summary: file.summary });
    return;
  }

  try {
    const content = await fetchFileContent(octokit, repo.owner, repo.name, file.path);
    if (content === null) return;

    const summary = await summarizeFile(content, file.path);
    await withDbRetry(() =>
      prisma.file.update({ where: { id: file.id }, data: { summary } })
    );
    summaries.push({ path: file.path, summary });

    await sleep(4000); // this model's free tier is 15 requests/min; 1 call per ~4s stays under it
  } catch (err) {
    console.error(`Summary failed for ${file.path}: ${(err as Error).message.slice(0, 120)}`);
  }
  });

// if literally nothing worked (bad key, quota gone), that IS a failure
if (filesToSummarize.length > 0 && summaries.length === 0) {
  throw new Error("No file summaries could be generated");
}

  // --- folder-level rollup ---
  const byFolder = new Map<string, { path: string; summary: string }[]>();
  for (const s of summaries) {
    const folder = s.path.includes("/") ? s.path.split("/")[0] : "root";
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(s);
  }

  const moduleSummaries: Record<string, string> = {};

  await mapWithConcurrency(Array.from(byFolder.entries()), 1, async ([folder, fileSummaries]) => {
  try {
    moduleSummaries[folder] = await summarizeModule(folder, fileSummaries);
  } catch (err) {
    console.error(`Module summary failed for ${folder}: ${(err as Error).message.slice(0, 120)}`);
  }
  });

  await withDbRetry(() =>
  prisma.repo.update({
    where: { id: repoId },
    data: { moduleSummaries, status: "DONE" },
  })
);
}