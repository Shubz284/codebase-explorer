import { getTree } from "./parser";
import path from "path";

export type Chunk = {
  content: string;
  functionName: string | null;
  startLine: number;
  endLine: number;
};

const AST_LANGUAGES = ["typescript", "javascript"];

const ALWAYS_CHUNK_FILENAMES = new Set([
  "readme.md",
  "package.json",
  "tsconfig.json",
  "docker-compose.yml",
  "docker-compose.yaml",
  "dockerfile",
  ".env.example",
]);

const ALWAYS_CHUNK_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".md",
  ".json",
  ".yml",
  ".yaml",
]);

// Decides whether a file should be embedded at all.
export function shouldChunk(
  filePath: string,
  language: string | null
): boolean {
  // JS / TS files → AST chunking
  if (language && AST_LANGUAGES.includes(language)) {
    return true;
  }

  // Important known files
  const basename = filePath.split("/").pop()?.toLowerCase() ?? "";

  if (ALWAYS_CHUNK_FILENAMES.has(basename)) {
    return true;
  }

  // Common frontend/text/config files → window chunking
  const ext = path.extname(filePath).toLowerCase();

  return ALWAYS_CHUNK_EXTENSIONS.has(ext);
}

export async function chunkFile(
  content: string,
  filePath: string,
  language: string | null
): Promise<Chunk[]> {
  // JS / TS → AST-aware chunking
  if (language && AST_LANGUAGES.includes(language)) {
    const astChunks = await chunkByAst(content, filePath);

    if (astChunks.length > 0) {
      return astChunks;
    }
  }

  // README, package.json, config files,
  // or JS/TS files with no useful AST boundaries
  return chunkByWindow(content);
}

async function chunkByAst(
  content: string,
  filePath: string
): Promise<Chunk[]> {
  const tree = await getTree(content, filePath);

  const chunks: Chunk[] = [];

  function walk(node: any) {
    // Normal functions and classes
    if (
      node.type === "function_declaration" ||
      node.type === "class_declaration"
    ) {
      const nameNode = node.childForFieldName("name");

      chunks.push({
        content: node.text,
        functionName: nameNode ? nameNode.text : null,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
      });

      // Don't walk inside it.
      // The entire function/class is already one chunk.
      return;
    }

    // Arrow functions / function expressions
    if (node.type === "variable_declarator") {
      const valueNode = node.childForFieldName("value");

      if (
        valueNode &&
        (valueNode.type === "arrow_function" ||
          valueNode.type === "function_expression")
      ) {
        const nameNode = node.childForFieldName("name");

        chunks.push({
          content: node.text,
          functionName: nameNode ? nameNode.text : null,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
        });

        return;
      }
    }

    // Continue looking through the AST
    for (const child of node.namedChildren) {
      walk(child);
    }
  }

  walk(tree!.rootNode);

  return chunks;
}

const WINDOW_SIZE = 40;
const SMALL_FILE_THRESHOLD = 50;

function chunkByWindow(content: string): Chunk[] {
  const lines = content.split("\n");

  // Small files stay as one chunk
  if (lines.length <= SMALL_FILE_THRESHOLD) {
    return [
      {
        content,
        functionName: null,
        startLine: 1,
        endLine: lines.length,
      },
    ];
  }

  const chunks: Chunk[] = [];

  for (let i = 0; i < lines.length; i += WINDOW_SIZE) {
    const windowLines = lines.slice(i, i + WINDOW_SIZE);

    chunks.push({
      content: windowLines.join("\n"),
      functionName: null,
      startLine: i + 1,
      endLine: Math.min(i + WINDOW_SIZE, lines.length),
    });
  }

  return chunks;
}