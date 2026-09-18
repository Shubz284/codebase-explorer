import path from "path";

const CANDIDATE_SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];

export function resolveImportPath(
  importerPath: string,
  specifier: string
): string[] {
  if (!specifier.startsWith(".")) {
    return [];
  }

  const importerDir = path.posix.dirname(importerPath);

  const resolvedBase = path.posix.normalize(
    path.posix.join(importerDir, specifier)
  );

  const withoutExtension = resolvedBase.replace(
    /\.(js|jsx|ts|tsx)$/,
    ""
  );

  return CANDIDATE_SUFFIXES.map(
    (suffix) => `${withoutExtension}${suffix}`
  );
}