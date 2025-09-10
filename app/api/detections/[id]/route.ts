import { type NextRequest, NextResponse } from "next/server"
import { getDetection } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const det = await getDetection(params.id)
    if (!det) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(det)
  } catch (e) {
    console.error("[v0] Get detection error:", (e as Error).message)
    return NextResponse.json({ error: "Unable to fetch detection" }, { status: 500 })
  }
}
