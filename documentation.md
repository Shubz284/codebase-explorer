****minor known gap****

1. The const keyword is missing.

    Why: node.text on a variable_declarator only captures the declarator itself (name = value), not the const/let/var keyword sitting on its parent node. Cosmetically incomplete, but functionally almost harmless — the embedding for "logout = () => {...}" versus "const logout = () => {...}" will be nearly identical semantically, so I'd leave this as a known, minor gap rather than spend time fixing it. Worth knowing it exists though, so it doesn't look like a mystery if you notice it again later in real chunk content.

2. right now there's no way to re-run analysis on a repo you've already  added, even if your pipeline code has genuinely changed since. Not urgent, doesn't block Day 4 — just flagging it so it's a deliberate "known limitation" in your README later, not a mystery you rediscover in week two.

3. We can eventually improve retrieval by:

    filtering/ranking chunks
    retrieving more than 5 candidates
    using metadata such as file path/function name
    possibly reranking

4. One honest thing worth naming, not fixing today

    Count it up: fetchFileContent for the same file now runs three separate times across one analysis — once in parseRepo, once in embedRepo, once here. That's triple the GitHub API calls per file, purely because each pipeline stage was built independently rather than sharing fetched content. This is exactly the "refetch vs. restructure" decision from the Day 4 roadmap, compounding — worth writing down as a real, known optimization for later (fetch once, pass the content through all three stages), but not something to refactor under deadline pressure right now. Flagging it clearly so it's a deliberate trade-off in your README, not a surprise if someone reads the code closely.

5 One thing I deliberately did NOT do
I didn't add percentage progress like:
67%

because our backend currently doesn't know meaningful percentage progress.
For example, during embedding:
EMBEDDING

we don't currently track:
137 / 300 files

So showing 67% would be fake precision.
For V1, stage-based progress is honest and sufficient.


6. What I'd do:

Finish JS/TS completely first. A polished, working tool beats a half-working "supports 8 languages" tool.
Then add Python and maybe Go with a language-adapter design, where each language implements the same interface (parse file, extract imports, resolve import to file). That adapter design is also a great interview talking point.
For other languages, show a degraded mode: file tree, AI summaries, and chat work, but the dependency graph is marked "limited support". It's honest and it's real engineering.


7. Keep demo repos modest — 50 to 150 files. This is the real fix, and it costs zero engineering time. A 146-file repo taking ~10 minutes is already close to what you should show live. Don't paste a 300+ file monorepo in front of someone watching.

One cheap experiment worth trying: bump concurrency in embed-repo.ts from 1 to 2. Your dashboard showed the embedding model still had real headroom (70/100 RPM), unlike summarization which is pinned at its exact ceiling — so embedding has room to go faster safely. Test it on one repo; if you don't see new Rate limited lines, keep it.

Don't build a job queue right now. The actual correct long-term fix is background job infrastructure (Inngest, a queue) that isn't bound to one HTTP request at all — genuinely worth naming as "known next step" in your README or in an interview, but not something to build this week.

8. this bar improvement (open ? "▼" : "▶") 
