import { Redis } from "ioredis"

// maxRetriesPerRequest: null is a BullMQ requirement (retries are managed by
// BullMQ itself, not ioredis).
export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})
