
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const EMBEDDING_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

export async function embedText(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const maxRetries = 6;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(EMBEDDING_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },

      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
        output_dimensionality: 768,
      }),
    });

    if (response.ok) {
      const data = await response.json();

      return data.embedding.values;
    }

    if (response.status === 429) {
      console.log(`Rate limited. Retry ${attempt + 1}/${maxRetries}`);
      const waitMs = 3000 * Math.pow(2, attempt); // 3s, 6s, 12s, 24s, 48s, 96s — ~189s total patience
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    throw new Error(
      `Gemini embedding failed: ${response.status} ${await response.text()}`
    );
  }

  throw new Error("Gemini embedding failed after retries");
}