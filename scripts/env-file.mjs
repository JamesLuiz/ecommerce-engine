/**
 * Minimal .env file reader shared by the local operational scripts.
 *
 * Only reads `KEY=VALUE` lines (comments, blanks and `export ` prefixes are
 * handled). Values already present in `process.env` win over the file, so
 * exported variables and CI secrets are never overridden by a local file.
 * Nothing is ever printed: callers must redact before logging.
 */
import { readFileSync } from "node:fs"

const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/

function unquote(raw) {
  const value = raw.trim()

  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]

    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      const inner = value.slice(1, -1)
      return first === '"' ? inner.replace(/\\n/g, "\n").replace(/\\"/g, '"') : inner
    }
  }

  const hash = value.search(/(?<!\\)#/)

  if (hash >= 0) {
    return value.slice(0, hash).trim()
  }

  return value
}

export function loadEnvFile(path, { override = false } = {}) {
  let text

  try {
    text = readFileSync(path, "utf8")
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { path, loaded: 0, missing: true }
    }

    throw error
  }

  let loaded = 0

  for (const line of text.split("\n")) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const match = LINE.exec(line)

    if (!match) {
      continue
    }

    const [, key, raw] = match

    if (!override && process.env[key] !== undefined) {
      continue
    }

    process.env[key] = unquote(raw ?? "")
    loaded += 1
  }

  return { path, loaded, missing: false }
}

/** `postgres://user:secret@host/db` -> `postgres://***@host/db`. */
export function redactUrl(url) {
  if (!url) {
    return "(unset)"
  }

  try {
    const parsed = new URL(url)

    if (parsed.username || parsed.password) {
      parsed.username = "***"
      parsed.password = ""
    }

    return parsed.toString()
  } catch {
    return "(unparseable url)"
  }
}

export function urlHost(url) {
  try {
    return new URL(url).hostname
  } catch {
    return ""
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""])

export function isLocalHost(host) {
  return LOCAL_HOSTS.has((host ?? "").toLowerCase())
}
