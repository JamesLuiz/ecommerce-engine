import { Hono } from "hono"

export const healthRouter = new Hono()

healthRouter.get("/healthz", (c) => {
  return c.json({ status: "ok" })
})
