// lib/summarize.ts
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!; // adjust name if embeddings.ts used a different one
const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function callWithRetry(prompt: string, maxRetries = 6): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000); // no silent hangs
    const waitMs = Math.min(3000 * 2 ** attempt, 30000); // 3s, 6s, 12s, 24s, then 30s

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100 },
        }),
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timer);
      console.log(`Summarize: network error or timeout. Retry ${attempt + 1}/${maxRetries}`);
      await sleep(waitMs);
      continue;
    }
    clearTimeout(timer);

    if (RETRYABLE_STATUS.has(res.status)) {
      console.log(`Summarize: got ${res.status}. Retry ${attempt + 1}/${maxRetries}`);
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      throw new Error(`Gemini summarize call failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no text in response");
    return text.trim();
  }

  throw new Error("Gemini summarize call failed after max retries");
}

export async function summarizeFile(content: string, filePath: string): Promise<string> {
  // truncate large files before sending — a file's opening section is
  // usually enough to describe its role, and this keeps token cost and
  // latency predictable across a 200+ file repo instead of blowing up
  // on the occasional huge file
  const truncated = content.length > 4000 ? content.slice(0, 4000) : content;

  const prompt = `You are documenting a codebase. Given the file below, respond with ONLY 1-2 plain-English sentences covering: what this file's role is, and what it exports. No preamble, no markdown, no code blocks — just the sentences.

File path: ${filePath}

    \`\`\`
    ${truncated}
    \`\`\`
    `;

  return callWithRetry(prompt);
}

// helper already defined above it in that file, nothing duplicated
export async function summarizeModule(
  folderPath: string,
  fileSummaries: { path: string; summary: string }[]
): Promise<string> {
  const listing = fileSummaries.map((f) => `- ${f.path}: ${f.summary}`).join("\n");

  const prompt = `You are documenting a codebase's folder structure. Given the folder "${folderPath}" and summaries of the files inside it, respond with ONLY 1-2 plain-English sentences describing this folder's overall role in the project. No preamble, no markdown.

Files in this folder:
${listing}
`;

  return callWithRetry(prompt);
}