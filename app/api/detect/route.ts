import { type NextRequest, NextResponse } from "next/server"
import { computeDiffOverlay } from "@/lib/image-processing"
import { saveDetection } from "@/lib/store"
import { publish } from "@/lib/events"
import type { DetectionRecord } from "@/lib/types"
import { getBeforeAfterImages, processImages } from "@/lib/satellite-imagery"
import { detectChanges as detectChangesServer } from "@/lib/ml/change-detection"
import type { ImageInputs, DetectionResult } from "@/lib/types/detection"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const before = form.get("before") as File | null
    const after = form.get("after") as File | null
    const threshold = Number(form.get("threshold") || 30)
    const notes = (form.get("notes") as string) || ""
    const lat = form.get("lat")
    const lng = form.get("lng")
    const bbox = form.get("bbox") // comma-separated: minLng,minLat,maxLng,maxLat
    const useEarthEngine = form.get("useEarthEngine") === "true"
    
    let imageInputs: ImageInputs
    
    if (useEarthEngine && lat && lng) {
      // Get satellite images using Sentinel Hub
      const location = { lat: Number(lat), lng: Number(lng) }
      const { beforeUrl, afterUrl } = await getBeforeAfterImages(location, "2024-01-01", "2025-01-01")
      
      // Process the satellite images
      const diffBuffer = await processImages(beforeUrl, afterUrl)
      
      imageInputs = {
        before: beforeUrl,
        after: afterUrl,
        diffOverlay: diffBuffer
      }
    } else {
      // Use uploaded images
      if (!before || !after) {
        return NextResponse.json({ error: "Both 'before' and 'after' images are required." }, { status: 400 })
      }
      
      // Convert uploaded images to buffers
      const beforeBuffer = Buffer.from(await before.arrayBuffer())
      const afterBuffer = Buffer.from(await after.arrayBuffer())
      
      // Validate both images
      const { isLandscapeImage } = await import('@/lib/image-validation')
      const [beforeValidation, afterValidation] = await Promise.all([
        isLandscapeImage(beforeBuffer),
        isLandscapeImage(afterBuffer)
      ])

      if (!beforeValidation.isValid || !afterValidation.isValid) {
        return NextResponse.json({
          error: "Invalid images detected",
          details: {
            before: beforeValidation.message,
            after: afterValidation.message
          }
        }, { status: 400 })
      }

      imageInputs = {
        before: beforeBuffer,
        after: afterBuffer
      }
    }

    if (!imageInputs.before || !imageInputs.after) {
      return NextResponse.json({ error: "Both 'before' and 'after' images are required." }, { status: 400 })
    }

    // Perform initial diff analysis
    const { overlayBase64, width, height, changePixels, totalPixels } = await computeDiffOverlay(
      imageInputs.before, 
      imageInputs.after,
      { threshold }
    )

    // Get ML model predictions
    let mlPrediction: any = null
    try {
      if (!useEarthEngine && before && after) {
        const beforeBuffer = imageInputs.before as Buffer
        const afterBuffer = imageInputs.after as Buffer
        mlPrediction = await detectChangesServer(beforeBuffer, afterBuffer)
      }
    } catch (error) {
      console.error("ML prediction failed:", error)
      // Continue without ML prediction
    }

    let beforeBase64: string, afterBase64: string
    
    if (useEarthEngine) {
      beforeBase64 = imageInputs.before as string
      afterBase64 = imageInputs.after as string
    } else {
      beforeBase64 = `data:${before!.type};base64,${Buffer.from(imageInputs.before as Buffer).toString("base64")}`
      afterBase64 = `data:${after!.type};base64,${Buffer.from(imageInputs.after as Buffer).toString("base64")}`
    }
    
    const severity = Math.round((changePixels / totalPixels) * 100)

    const coords: DetectionRecord["coordinates"] | undefined = (() => {
      const hasCenter = lat && lng
      const hasBbox = bbox && typeof bbox === "string" && bbox.split(",").length === 4
      if (hasCenter) {
        return { lat: Number(lat), lng: Number(lng) }
      }
      if (hasBbox) {
        const parts = bbox!.split(",").map((x) => Number(x.trim()))
        return { bbox: [parts[0], parts[1], parts[2], parts[3]] as [number, number, number, number] }
      }
      return undefined
    })()

    const record: DetectionRecord = {
      createdAt: new Date().toISOString(),
      beforeImageBase64: beforeBase64,
      afterImageBase64: afterBase64,
      overlayImageBase64: overlayBase64,
      width,
      height,
      changePixels,
      totalPixels,
      severity,
      threshold,
      coordinates: coords,
      notes,
      model: { type: "diff", version: "mvp-1" },
      mlPrediction: mlPrediction, // Add ML prediction results
    }

    const saved = await saveDetection(record)

    // Push alert if severity exceeds a sensible threshold (e.g., >= 5%)
    if (severity >= 5) {
      publish({
        type: "detection",
        id: saved.id,
        severity: saved.severity,
        createdAt: saved.createdAt,
        coordinates: saved.coordinates,
      })
    }

    return NextResponse.json(saved, { status: 201 })
  } catch (e) {
    console.error("[v0] Detect error:", (e as Error).message)
    return NextResponse.json({ error: "Detection failed" }, { status: 500 })
  }
}
