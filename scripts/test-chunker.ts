// scratch test, not part of the app
import { chunkFile } from "../lib/chunker";

const testCode = `
function login() { return db.findUser(); }


const logout = () => { session.clear(); }
`;


const readmeText = `# My Project

A short description of what this does.

## Setup
npm install
npm run dev
`;

const readmeChunks = await chunkFile(readmeText, "README.md", null);
console.log(readmeChunks);

const chunks = await chunkFile(testCode, "test.ts", "typescript");
console.log(chunks);