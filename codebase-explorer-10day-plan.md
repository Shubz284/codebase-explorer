# AI Codebase Explorer — 10-Day Build Plan

**Stack:** Next.js 14 (App Router) · NextAuth (Google + GitHub) · Neon Postgres + pgvector · Prisma · Gemini 2.5 Flash/Flash-Lite · gemini-embedding-001 · react-flow · web-tree-sitter · Vercel

**Assumption:** ~4-6 focused hours/day. If you have more, you'll finish early and can spend the slack on polish/stretch goals — don't add new features, add quality.

**Golden rule for the next 10 days:** No new decisions. Every choice is already made above. If you catch yourself Googling "should I use X instead of Y" — stop, it's not on this list, skip it.

---

## Day 1 — Foundation (Auth + DB wired end-to-end)

**Goal:** Login works. Nothing else needs to work yet.

- [ ] `npx create-next-app` (App Router, TypeScript, Tailwind)
- [ ] Create Neon project → run `CREATE EXTENSION vector;` → grab pooled + direct connection strings
- [ ] `npx prisma init` → set `DATABASE_URL` (pooled) and `directUrl` (direct) in schema.prisma
- [ ] Define Prisma schema: NextAuth models (`User`, `Account`, `Session`, `VerificationToken`) + empty stubs for `Repo`, `File`, `Chunk`, `Edge`, `ChatMessage`
- [ ] `npx prisma migrate dev` — confirm tables exist in Neon dashboard
- [ ] Set up NextAuth with `@auth/prisma-adapter`, Google provider, GitHub provider (request `repo` scope on GitHub so you can hit private repos later)
- [ ] Build a bare `/login` page and a protected `/dashboard` page (redirect if no session)
- [ ] Deploy to Vercel now, even broken/empty. Connect env vars. Confirm login works **in production**, not just localhost.

**Definition of done:** You can log in with Google or GitHub on the live Vercel URL and land on an empty dashboard.

**Why deploy on day 1:** surfaces env var / OAuth callback URL issues immediately instead of on day 9 when you're panicking.

---

## Day 2 — Repo ingestion

**Goal:** Paste a GitHub URL → its file tree is fetched and saved to Neon.

- [ ] Build `lib/github.ts` — use the authenticated user's GitHub access token (from `Account` table) with Octokit to fetch repo tree (`GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`)
- [ ] Filter tree: exclude `node_modules`, `.git`, lockfiles, images/binaries, files >~50KB (cap for MVP)
- [ ] `POST /api/repos/analyze` — creates a `Repo` row (`status: pending`), kicks off fetch, inserts `File` rows (path, language guessed from extension, size)
- [ ] Simple repo input form on dashboard: paste URL → calls the route → redirect to `/repos/[id]`
- [ ] `/repos/[id]` page shows raw file tree (just names/paths, no AI yet) + a status badge

**Definition of done:** Paste `https://github.com/vercel/swr` (small real repo) → see its actual file list rendered on the page, rows saved in Neon.

**Watch out for:** GitHub API pagination and rate limits on huge repos. Hard-cap analysis to repos under ~300 files for the MVP — mention this as a known constraint later, don't try to solve it now.

---

## Day 3 — Parsing (structure extraction)

**Goal:** For each JS/TS file, extract functions, classes, imports/exports — and build the dependency graph from that.

- [ ] Set up `web-tree-sitter` (WASM grammars for JS/TS to start — **skip Python and other languages for now**, add later only if time allows)
- [ ] `lib/parser.ts` — parse each file's AST, extract: import statements (what it imports, from where), exported functions/classes, top-level function names
- [ ] Resolve imports to actual `File` rows where possible (relative imports only for MVP — skip resolving `node_modules` package internals)
- [ ] Insert `Edge` rows (`source_file_id → target_file_id`, type `import`)
- [ ] Quick sanity check script: log the edge count for a known repo, spot-check a couple by hand

**Definition of done:** Running analysis on a repo populates the `Edge` table correctly — you can query "what does `index.ts` import" and get the right answer.

**Checkpoint:** If tree-sitter WASM setup is fighting you past ~3 hours, fall back to a regex-based import extractor (`import .* from ['"](.+)['"]`) for MVP. Ugly but unblocks you — you can note "AST-based parsing" as a stretch goal you partially built rather than losing a day to it.


parseRepo(repoId, accessToken)
        │
        ▼
Get Repo + all File rows from DB
        │
        ▼
Select only JS/TS files
        │
        ▼
For each file (8 at a time)
        │
        ├── Fetch actual source from GitHub
        │
        ├── Parse source with Tree-sitter
        │
        ├── Get imports
        │
        ├── Resolve imports to actual files
        │
        └── Prepare Edge
        │
        ▼
Update File statistics
        │
        ▼
Insert Edge rows
        │
        ▼
Mark circular edges
        │
        ▼
Repo = DONE

---

## Day 4 — Chunking + embeddings

**Goal:** Every file is split into meaningful chunks and embedded into pgvector.

- [ ] `lib/chunker.ts` — chunk by function/class boundary (using the AST from Day 3) rather than fixed line counts. Fallback: chunk by ~40-line windows if a file has no clear function boundaries
- [ ] `lib/embeddings.ts` — call `gemini-embedding-001`, set output dimensionality to 768 (keeps you inside Neon's 0.5GB free tier)
- [ ] Batch embedding calls with delay/retry on 429 (you WILL hit Flash-Lite/embedding rate limits on anything but tiny repos — build the retry now, not when it breaks on demo day)
- [ ] Insert into `Chunk` table (`content`, `embedding vector(768)`, `file_id`, `function_name`, `start_line`, `end_line`)
- [ ] Create the pgvector index: `CREATE INDEX ON "Chunk" USING hnsw (embedding vector_cosine_ops);`

**Definition of done:** A small repo fully embeds without crashing; you can run a raw SQL similarity query in Neon's console and get sane nearest-neighbor results for a test query.

---

## Day 5 — AI summarization pipeline

**Goal:** Every file gets a plain-English AI summary; module-level rollups exist.

- [ ] `lib/summarize.ts` — call `gemini-2.5-flash-lite` per file with a tight prompt: "role of this file, main exports, one-sentence purpose" — keep output short (this keeps cost/rate-limit pressure low)
- [ ] Store summary in `File.summary`
- [ ] Folder-level rollup: group files by top-level folder, feed their summaries to Gemini Flash once, get a module summary (store somewhere simple — a `moduleSummaries` JSON column on `Repo` is fine for MVP, don't over-model this)
- [ ] Wire this into the same analysis pipeline as Day 2-4 so one "Analyze" click does: fetch → parse → chunk → embed → summarize, updating `Repo.status` along the way (`pending → parsing → embedding → summarizing → done`)
- [ ] Build a simple polling `/api/repos/[id]/status` endpoint + a progress UI (even just a text label cycling through stages is fine)

**Definition of done:** Full pipeline runs on a real small-to-medium repo start to finish without you babysitting it, and every file has a summary in the DB.

**Checkpoint (halfway point):** By end of Day 5 the entire backend pipeline should work, even if ugly. Days 6-10 are UI + chat + polish. If the pipeline isn't done, that's your signal to cut scope (drop module rollups, drop rate-limit retries, whatever) — don't let backend slip into UI time.

---

## Day 6 — Dashboard UI (file tree + summaries)

**Goal:** The dashboard looks and feels like a real product.

- [ ] `FileTree.tsx` — collapsible folder tree, click a file → side panel shows its AI summary
- [ ] `FileSummaryCard.tsx` — clean display of summary, language, size
- [ ] Loading states for each pipeline stage (this is where "status: parsing/embedding/summarizing" earns its keep visually)
- [ ] Empty/error states: bad URL, repo too large, private repo without access

**Definition of done:** Someone unfamiliar with the project could open the dashboard, paste a repo, and understand what's happening without you explaining it.

---

## Day 7 — Dependency graph (react-flow)

**Goal:** The visual centerpiece — this is your screenshot for the resume/portfolio.

- [ ] `DependencyGraph.tsx` — fetch `Edge` + `File` data, map to react-flow nodes/edges
- [ ] Auto-layout (use `dagre` or `elkjs` alongside react-flow — don't hand-place nodes)
- [ ] Node click → opens the same file summary panel from Day 6
- [ ] Basic styling: color-code by folder or file type, size nodes by file size or import count
- [ ] Circular dependency detection (simple graph cycle check — no AI needed) → highlight those edges in red

**Definition of done:** You can look at the graph for a real repo and it actually communicates architecture at a glance. This is the single most important visual for your resume — spend real time on it looking good, not just functional.

---

## Day 8 — RAG chat

**Goal:** "Chat with this codebase" works, streaming, with real retrieval.

- [ ] `/api/repos/[id]/chat` route — embed the user's question, run pgvector cosine similarity search against `Chunk`, pull top-k chunks
- [ ] Build the prompt: inject retrieved chunks (with file path + line numbers) as context, ask Gemini Flash to answer citing which files it used
- [ ] Use Vercel AI SDK for streaming (`useChat` hook on the frontend, `streamText` on the backend — AI SDK supports Gemini via `@ai-sdk/google`)
- [ ] `ChatPanel.tsx` — chat UI, show streamed response, render cited file paths as clickable links back to the file tree
- [ ] Store messages in `ChatMessage` table

**Definition of done:** Ask "how does auth work in this repo?" on a real repo and get a coherent, cited answer streamed back.

---

## Day 9 — Polish + remaining risk flags

**Goal:** Make it feel finished, not like a hackathon demo.

- [ ] "God file" flag — files with unusually high import/export count relative to the repo average (simple stat, no AI)
- [ ] Missing test coverage flag — check if `foo.ts` has a sibling `foo.test.ts`/`foo.spec.ts`
- [ ] Landing page — what this tool does, paste-a-repo CTA, maybe 2-3 example repos pre-linked so reviewers don't have to think of one
- [ ] Error handling pass across every API route (rate limit hit, repo not found, parse failure on a weird file — fail gracefully, don't crash the whole pipeline)
- [ ] Mobile/responsive pass if time allows (low priority — this is a dev tool, desktop-first is fine, just don't let it be broken on mobile)

**Definition of done:** You could hand this to a stranger with zero explanation and they wouldn't hit a dead end or a crash.

---

## Day 10 — Deploy, document, package for resume

**Goal:** It's not "resume-worthy" until it's packaged as such.

- [ ] Final deploy check on Vercel — test the full flow on the live URL, not localhost
- [ ] README: what it does, architecture diagram (screenshot your own react-flow graph for this — nice touch), tech stack, setup instructions, known limitations (repo size cap, JS/TS only, free-tier rate limits)
- [ ] Record a 60-90 second demo GIF/video — paste a repo, show the graph, ask the chat a question. This matters more than people think; recruiters watch a 60-second GIF far more often than they read a README
- [ ] Write your resume bullet points now, while it's fresh:
  - "Built a full-stack AI codebase analysis tool (Next.js, Postgres/pgvector, Gemini) that parses repos via AST analysis, generates dependency graphs, and enables RAG-based chat over code"
  - "Implemented a map-reduce summarization pipeline and vector-search retrieval system handling rate-limited free-tier LLM APIs with retry/backoff"
  - "Designed an interactive architecture visualization using react-flow with auto-layout and cycle detection for circular dependencies"
- [ ] Push final code to a clean public GitHub repo (this repo itself is also a portfolio artifact — decent commit history matters, don't squash 10 days into one commit)

---

## Triage rules if you fall behind

| If you're behind at... | Cut this first | Never cut this |
|---|---|---|
| End of Day 5 (backend) | Module-level rollup summaries, multi-language support | The embed → summarize → store pipeline, even if ugly |
| End of Day 7 (graph) | Fancy node styling, cycle highlighting | The graph rendering at all — it's your headline feature |
| End of Day 9 (polish) | Risk flags (god files, missing tests) | Error handling — a crash during a demo is worse than a missing feature |

**Absolute minimum viable resume project** if day 10 arrives and you're not done: repo input → file tree with summaries → dependency graph. Cut chat entirely if you must. A polished 3-feature tool beats a buggy 5-feature tool every time someone actually clicks around it.

---

## Daily discipline

- Don't refactor Day 2's code on Day 6 because you "see a better way" now. Note it, keep moving.
- Commit at the end of every day, even mid-feature. Ten days, ten+ commits minimum.
- If a single bug eats more than ~90 minutes, step away, come back, or hardcode a workaround and move on. You can fix it properly in leftover time on Day 10.


The UI can display:

text
Parsing files: 84 / 231
Generating embeddings: 120 / 231