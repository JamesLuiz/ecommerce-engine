"use client"

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "2rem",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ margin: 0, color: "#555" }}>
            An unexpected error occurred.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}