// scripts/test-fetch.ts
import { Octokit } from "octokit";
import { fetchRepoTree, fetchFileContent } from "../lib/github";
import { parseFile } from "../lib/parser";

async function main() {
  const octokit = new Octokit();

  const { tree } = await fetchRepoTree(octokit, "octokit", "octokit.js");
  const testFiles = tree
    .filter(f => f.type === "blob" && f.path?.endsWith(".ts"))
    .slice(0, 3);

  for (const file of testFiles) {
    const content = await fetchFileContent(octokit, "octokit", "octokit.js", file.path!);
    if (!content) continue;

    const parsed = await parseFile(content, file.path!);
    console.log(`--- ${file.path} ---`);
    console.log(parsed);
    console.log();
  }
}

main();