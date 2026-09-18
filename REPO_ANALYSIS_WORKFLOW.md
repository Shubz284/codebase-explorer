# Repository Analysis Workflow

## What We Have Done

- Configured Better Auth with Google and GitHub social providers in `lib/auth.ts`.
- Connected Better Auth to Prisma using the PostgreSQL adapter.
- Added Prisma models for users, sessions, OAuth accounts, repositories, and files.
- Added a server-side API endpoint at `app/api/repos/analyze/route.ts`.
- Added GitHub API helpers in `lib/github.ts` using Octokit.
- Added repository file filtering and basic language detection.
- Added repository status handling so a repository can be marked as `FETCHING`, `DONE`, or `FAILED`.
- Added a uniqueness rule so the same user does not analyze the same GitHub URL more than once.

## Why We Use Octokit

Octokit is GitHub's JavaScript/TypeScript client library. It gives the application a typed and structured way to call GitHub's REST API without manually constructing HTTP requests.

We use it to:

1. Fetch repository metadata, including the default branch and whether the repository is private.
2. Fetch the branch reference to find the current commit SHA.
3. Fetch the complete Git tree recursively.
4. Authenticate requests with the user's GitHub OAuth access token.
5. Receive GitHub API errors and rate-limit behavior through a standard client.

The current helper creates an authenticated client:

```ts
export function getOctokit(token: string) {
  return new Octokit({ auth: token });
}
```

## Current Workflow

1. The user signs in through Google or GitHub.
2. Better Auth creates a session for the user.
3. Better Auth stores OAuth connections in the `Account` table. Each provider has its own account row, identified by `providerId` such as `google` or `github`.
4. The user submits a GitHub repository URL to the analyze endpoint.
5. The endpoint verifies the session. Without a session it returns `401 Unauthorized`.
6. The endpoint validates the URL and extracts the repository owner and name.
7. The endpoint searches for the user's GitHub account and access token:

```ts
const account = await prisma.account.findFirst({
  where: { userId: session.user.id, providerId: "github" },
});
```

8. If no GitHub access token exists, the endpoint currently returns `400 GitHub account not connected properly`.
9. If the repository was already analyzed by this user, the existing repository ID is returned.
10. Otherwise, a repository row is created with `FETCHING` status.
11. Octokit fetches the repository metadata, default branch, and recursive Git tree.
12. The application keeps blob files that are not ignored and are no larger than 50 KB.
13. File records are inserted into the `File` table with their path, size, and guessed language.
14. The repository is updated to `DONE`, including its branch, privacy flag, file count, and analysis timestamp.
15. If GitHub or database work fails after repository creation, the repository is marked `FAILED` with the error message.

## Google Login Versus GitHub Access

A Google login proves who the user is, but it does not provide a GitHub API token. Google and GitHub are separate OAuth providers.

Therefore:

- A user who signs in with GitHub has a GitHub `Account` row and can currently analyze repositories.
- A user who signs in only with Google does not have a GitHub token and is currently rejected by the analyze endpoint.
- The Google access token must never be used for GitHub API requests.

## Public Repository Note

A repository such as `https://github.com/Shubz284/taskbar` can be public and technically be read through GitHub's API without a user token. However, the current implementation still requires a GitHub token before making any request, so public access is not yet supported for Google-only users.

To support public repositories without requiring GitHub login, the next implementation should:

1. Make the Octokit token optional.
2. Create an unauthenticated Octokit client when no token exists.
3. Fetch the repository first.
4. If GitHub reports that the repository is private or inaccessible, return a clear response asking the user to connect GitHub.
5. Keep the GitHub token path for private repositories and better API rate limits.

Separately, a `Connect GitHub` action can be added for Google-authenticated users. That flow should link GitHub to the existing Better Auth user instead of creating a second user.

## Current Status

The authentication and initial repository-import workflow is in place. The current endpoint is token-required, so GitHub must be connected even for public repositories. Parsing, embeddings, summaries, and deeper code analysis are planned later; the successful endpoint currently ends at storing the filtered file list and marking the repository `DONE`.
