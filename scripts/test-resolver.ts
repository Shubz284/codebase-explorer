import { resolveImportPath } from "../lib/resolve-imports";

console.log(
  resolveImportPath(
    "src/octokit.ts",
    "./spec/version.js"
  )
);

console.log(
  resolveImportPath(
    "src/utils/helper.ts",
    "../spec/version.js"
  )
);

console.log(
  resolveImportPath(
    "src/octokit.ts",
    "@octokit/core"
  )
);