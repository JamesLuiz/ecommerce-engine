import { describe, expect, it } from "vitest"
import { mergeOrigins, normalizeOrigin, originMatches } from "../src/origins.js"

describe("origin matching", () => {
  it("normalizes bare hostnames and URLs to origins", () => {
    expect(normalizeOrigin("shop.example.com/checkout")).toBe("https://shop.example.com")
    expect(normalizeOrigin("http://localhost:3000/checkout")).toBe("http://localhost:3000")
    expect(normalizeOrigin("")).toBeNull()
  })

  it("matches exact origins", () => {
    expect(originMatches("https://shop.example.com", "https://shop.example.com/")).toBe(true)
    expect(originMatches("https://shop.example.com", "https://other.example.com")).toBe(false)
  })

  it("matches wildcard subdomain patterns", () => {
    expect(originMatches("https://acme.example.com", "https://*.example.com")).toBe(true)
    expect(originMatches("https://admin-acme.example.com", "https://*.example.com")).toBe(true)
    expect(originMatches("https://acme.evil.com", "https://*.example.com")).toBe(false)
    expect(originMatches("http://acme.example.com", "https://*.example.com")).toBe(false)
  })

  it("merges and normalizes vendor origins without duplicates", () => {
    expect(
      mergeOrigins(
        ["https://shop.example.com/"],
        ["https://shop.example.com", "admin.example.com"],
      ),
    ).toEqual(["https://shop.example.com", "https://admin.example.com"])
  })
})
