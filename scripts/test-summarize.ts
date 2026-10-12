// scratch test, e.g. scripts/test-summarize.ts
import { summarizeFile } from "../lib/summarize";

const testCode = `
export function login(username, password) {
  return db.users.findOne({ username, password });
}

export function logout(sessionId) {
  return db.sessions.delete(sessionId);
}
`;

const summary = await summarizeFile(testCode, "auth/login.ts");
console.log(summary);