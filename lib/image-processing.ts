// Baseline image change detection using Sharp for image subtraction + thresholding.
// Produces a red overlay over changed pixels and computes a severity score.

import sharp from "sharp"

type DiffResult = {
  overlayBase64: string
  width: number
  height: number
  changePixels: number
  totalPixels: number
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  return Buffer.from(await response.arrayBuffer());
}

export async function computeDiffOverlay(
  before: Buffer | string,
  after: Buffer | string,
  opts?: { maxSize?: number; threshold?: number }
): Promise<DiffResult> {
  // Handle URL inputs from Earth Engine
  const beforeBuf = typeof before === 'string' ? await fetchImageBuffer(before) : before;
  const afterBuf = typeof after === 'string' ? await fetchImageBuffer(after) : after;
  const maxSize = opts?.maxSize ?? 1024
  const threshold = opts?.threshold ?? 30 // intensity threshold (0..255)

  // Load metadata to normalize dimensions
  const beforeMeta = await sharp(beforeBuf).metadata()
  const afterMeta = await sharp(afterBuf).metadata()

  const targetWidth = Math.min(beforeMeta.width || maxSize, maxSize)
  const beforeSharp = sharp(beforeBuf).resize({ width: targetWidth })
  const afterSharp = sharp(afterBuf).resize({ width: targetWidth })

  const before = await beforeSharp.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const after = await afterSharp.ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  const { data: bData, info: bInfo } = before
  const { data: aData, info: aInfo } = after
  const width = bInfo.width
  const height = bInfo.height
  const channels = bInfo.channels // 4 (RGBA)

  if (aInfo.width !== width || aInfo.height !== height || aInfo.channels !== channels) {
    throw new Error("Images must resolve to the same dimensions and channels")
  }

  const totalPixels = width * height
  const mask = new Uint8ClampedArray(totalPixels) // 0..255 per pixel
  let changePixels = 0

  // Compute simple per-pixel RGB difference magnitude and threshold
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4
    const dr = Math.abs(aData[idx + 0] - bData[idx + 0])
    const dg = Math.abs(aData[idx + 1] - bData[idx + 1])
    const db = Math.abs(aData[idx + 2] - bData[idx + 2])
    const diff = (dr + dg + db) / 3 // average channel difference
    if (diff >= threshold) {
      mask[i] = 255
      changePixels++
    } else {
      mask[i] = 0
    }
  }

  // Build red overlay with alpha from mask (scaled)
  const overlayRGBA = Buffer.alloc(totalPixels * 4)
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4
    overlayRGBA[idx + 0] = 255 // R
    overlayRGBA[idx + 1] = 0 // G
    overlayRGBA[idx + 2] = 0 // B
    // alpha scaled to 180 for visibility
    overlayRGBA[idx + 3] = mask[i] ? 180 : 0
  }

  const overlayPng = await sharp(overlayRGBA, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer()

  // Composite overlay onto the "after" image for visualization
  const afterPng = await sharp(afterBuf).resize({ width }).png().toBuffer()
  const composited = await sharp(afterPng)
    .composite([{ input: overlayPng }])
    .png()
    .toBuffer()

  const overlayBase64 = `data:image/png;base64,${composited.toString("base64")}`

  const result: DiffResult = {
    overlayBase64,
    width,
    height,
    changePixels,
    totalPixels,
  }

  return result
}
