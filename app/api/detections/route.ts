import { type NextRequest, NextResponse } from "next/server"
import { listDetections, saveDetection } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  try {
    const items = await listDetections()
    return NextResponse.json(items)
  } catch (e) {
    console.error("[v0] List detections error:", (e as Error).message)
    return NextResponse.json({ error: "Unable to list detections" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body) {
      return NextResponse.json({ error: "Missing body" }, { status: 400 })
    }
    const nowIso = new Date().toISOString()
    const rec = await saveDetection({
      createdAt: body.createdAt || nowIso,
      beforeImageBase64: body.beforeImageBase64,
      afterImageBase64: body.afterImageBase64,
      overlayImageBase64: body.overlayImageBase64 || "",
      width: body.width,
      height: body.height,
      changePixels: body.changePixels ?? 0,
      totalPixels: body.totalPixels ?? (body.width && body.height ? body.width * body.height : 0),
      severity: body.severity ?? 0,
      threshold: body.threshold ?? 0,
      coordinates: body.coordinates,
      notes: body.notes,
      model: body.model || { type: "browser-change-detection", version: "1.0" },
    } as any)
    return NextResponse.json(rec, { status: 201 })
  } catch (e) {
    console.error("[v0] Save detection error:", (e as Error).message)
    return NextResponse.json({ error: "Unable to save detection" }, { status: 500 })
  }
}
