// MongoDB connection helper with graceful in-memory fallback.

import { MongoClient, type Document } from "mongodb"

let client: MongoClient | null = null
let connecting: Promise<MongoClient> | null = null

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017"
  if (!process.env.MONGODB_URI) {
    console.log("[v0] No MONGODB_URI set. Falling back to mongodb://localhost:27017")
  }
  if (client) return client
  if (!connecting) {
    connecting = (async () => {
      const c = new MongoClient(uri)
      await c.connect()
      console.log("[v0] Connected to MongoDB")
      client = c
      return c
    })()
  }
  return connecting
}

export async function getCollection<T extends Document = Document>(name: string) {
  const c = await getMongoClient()
  if (!c) return null
  const dbName = process.env.MONGODB_DB || "mining"
  const db = c.db(dbName)
  return db.collection<T>(name)
}

export async function connectToDatabase() {
  const client = await getMongoClient()
  if (!client) {
    throw new Error("Failed to connect to MongoDB")
  }
  const dbName = process.env.MONGODB_DB || "mining"
  return client.db(dbName)
}
