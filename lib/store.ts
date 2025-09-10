// Data store abstraction: uses MongoDB if available, otherwise an in-memory store.

import { getCollection } from "./mongo"
import type { DetectionRecord } from "./types"

const MEM_KEY = "detections"
const memoryStore: Record<string, DetectionRecord> = {}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

export async function saveDetection(rec: DetectionRecord): Promise<DetectionRecord> {
  const col = await getCollection<DetectionRecord>(MEM_KEY)
  const id = rec.id || rec._id || genId()
  const doc = { ...rec, id, _id: id }
  if (!col) {
    memoryStore[id] = doc
    return doc
  }
  await col.insertOne(doc as any)
  return doc
}

export async function listDetections(): Promise<DetectionRecord[]> {
  const col = await getCollection<DetectionRecord>(MEM_KEY)
  if (!col) {
    return Object.values(memoryStore).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }
  const items = await col.find({}).sort({ createdAt: -1 }).toArray()
  return items.map((x: any) => ({ ...x, id: x.id || x._id }))
}

export async function getDetection(id: string): Promise<DetectionRecord | null> {
  const col = await getCollection<DetectionRecord>(MEM_KEY)
  if (!col) {
    return memoryStore[id] || null
  }
  const item = await col.findOne({ _id: id } as any)
  if (!item) return null
  return { ...item, id: item.id || item._id }
}
