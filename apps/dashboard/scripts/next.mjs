import { createRequire } from "node:module"

// package.json passes the workspace .env files with Node's --env-file flags.
// Next.js copies process.execArgv into NODE_OPTIONS when it spawns workers, but
// Node disallows --env-file there, so remove only those flags before loading it.
process.execArgv = process.execArgv.filter((arg) => !arg.startsWith("--env-file"))

const require = createRequire(import.meta.url)
require("next/dist/bin/next")
