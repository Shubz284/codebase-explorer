import { prisma } from "@/lib/prisma";
import {
  getOctokit,
  fetchFileContent,
} from "@/lib/github";
import { parseFile } from "@/lib/parser";
import { resolveImportPath } from "@/lib/resolve-imports";
import { mapWithConcurrency } from "@/lib/concurrency";
import { findCircularEdges } from "@/lib/detect-cycles";

const PARSEABLE = ["typescript", "javascript"];

export async function parseRepo(
  repoId: string,
  accessToken: string
) {
  // 1. Mark repository as parsing
  await prisma.repo.update({
    where: {
      id: repoId,
    },
    data: {
      status: "PARSING",
    },
  });

  // 2. Get repository and all its files
  const repo = await prisma.repo.findUniqueOrThrow({
    where: {
      id: repoId,
    },
    include: {
      files: true,
    },
  });

  // 3. Create Octokit client
  const octokit = getOctokit(accessToken);

  // 4. Only parse JavaScript / TypeScript files
  const parseableFiles = repo.files.filter(
    (file) =>
      file.language &&
      PARSEABLE.includes(file.language)
  );

  console.log(
    `Found ${parseableFiles.length} JS/TS files to parse`
  );

  // 5. Create path → File ID lookup
  const pathToFileId = new Map(
    repo.files.map((file) => [
      file.path,
      file.id,
    ])
  );

  // 6. Fetch + parse files concurrently
  const results = await mapWithConcurrency(
    parseableFiles,
    8,
    async (file) => {
      console.log(`Parsing: ${file.path}`);

      // Fetch actual source code from GitHub
      const sourceCode = await fetchFileContent(
        octokit,
        repo.owner,
        repo.name,
        file.path
      );

      // GitHub couldn't return the file
      if (!sourceCode) {
        console.log(
          `Could not fetch: ${file.path}`
        );

        return null;
      }

      // Parse source code using Tree-sitter
      const parsed = await parseFile(
        sourceCode,
        file.path
      );

      // Store edges found in this file
      const edges = [];

      // 7. Resolve every import
      for (const importPath of parsed.imports) {
        const candidates = resolveImportPath(
          file.path,
          importPath
        );

        // Find the first candidate that actually
        // exists in our repository
        const matchedPath = candidates.find(
          (candidate) =>
            pathToFileId.has(candidate)
        );

        // Couldn't resolve this import
        if (!matchedPath) {
          continue;
        }

        const targetFileId =
          pathToFileId.get(matchedPath);

        if (!targetFileId) {
          continue;
        }

        // Don't create self-import edges
        if (targetFileId === file.id) {
          continue;
        }

        edges.push({
          sourceFileId: file.id,
          targetFileId,
        });
      }

      return {
        fileId: file.id,
        path: file.path,
        ...parsed,
        edges,
      };
    }
  );

  // 8. Update File information
  for (const result of results) {
    if (!result) continue;

    await prisma.file.update({
      where: {
        id: result.fileId,
      },
      data: {
        functionCount: result.functionCount,
        exportCount: result.exports.length,
      },
    });
  }

  // 9. Collect all edges
  const edgesToCreate = [];

  for (const result of results) {
    if (!result) continue;

    for (const edge of result.edges) {
      edgesToCreate.push({
        repoId: repo.id,
        sourceFileId: edge.sourceFileId,
        targetFileId: edge.targetFileId,
        type: "IMPORT" as const,
      });
    }
  }

  console.log(
    `Found ${edgesToCreate.length} dependency edges`
  );

 // 10. Insert all edges in one batch
if (edgesToCreate.length > 0) {
  await prisma.edge.createMany({
    data: edgesToCreate,
    skipDuplicates: true,
  });
}

// 11. Detect circular dependencies
const circularEdges = findCircularEdges(
  edgesToCreate
);

console.log(
  `Found ${circularEdges.size} circular edges`
);

// 12. Mark circular edges in database
for (const edgeKey of circularEdges) {
  const [sourceFileId, targetFileId] =
    edgeKey.split("->");

  await prisma.edge.updateMany({
    where: {
      repoId: repo.id,
      sourceFileId,
      targetFileId,
      type: "IMPORT",
    },
    data: {
      isCircular: true,
    },
  });
}

// // 13. Mark repository as done
// await prisma.repo.update({
//   where: {
//     id: repoId,
//   },
//   data: {
//     status: "DONE",
//     analyzedAt: new Date(),
//   },
// });

  return {
    filesParsed: results.filter(Boolean).length,
    edgesCreated: edgesToCreate.length,
  };
}