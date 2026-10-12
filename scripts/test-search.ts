import { embedText } from "../lib/embeddings";
import { prisma } from "../lib/prisma";

const query = "How is weather data fetched?";

const queryEmbedding = await embedText(query);

console.log("Query embedding length:", queryEmbedding.length);

const vector = `[${queryEmbedding.join(",")}]`;

const results = await prisma.$queryRaw<
  {
    content: string;
    functionName: string | null;
    startLine: number;
    endLine: number;
    distance: number;
  }[]
>`
  SELECT
    c.content,
    c."functionName",
    c."startLine",
    c."endLine",
    (c.embedding <=> ${vector}::vector) AS distance
  FROM "Chunk" c
  JOIN "File" f ON f.id = c."fileId"
  WHERE f."repoId" = ${"cmufi1v5j0000rodkp18tqikr"}
  ORDER BY c.embedding <=> ${vector}::vector
  LIMIT 5;
`;

console.log("\nTop 5 results:\n");

for (const result of results) {
  console.log("Function:", result.functionName);
  console.log("Lines:", result.startLine, "-", result.endLine);
  console.log("Distance:", result.distance);
  console.log("Content:", result.content);
  console.log("-----------------------------------");
}

await prisma.$disconnect();