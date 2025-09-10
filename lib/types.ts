// Types shared across server and client

export type Coordinates = {
  // Center coordinates (preferred)
  lat?: number
  lng?: number
  // Optional bounding box [minLng, minLat, maxLng, maxLat]
  bbox?: [number, number, number, number]
}

export type DetectionRecord = {
  _id?: string
  id?: string // mirrored client-side convenience
  createdAt: string
  beforeImageBase64: string // data:image/*;base64,... not persisted long-term in production
  afterImageBase64: string
  overlayImageBase64: string
  width: number
  height: number
  changePixels: number
  totalPixels: number
  severity: number // 0..100 (% changed)
  threshold: number
  coordinates?: Coordinates
  notes?: string
  // Optional: model info for future CNN/Siamese integrations
  model?: {
    type: "diff" | "cnn" | "siamese"
    version?: string
  }
  // ML prediction results
  mlPrediction?: {
    changedAreas: Array<{
      bbox: [number, number, number, number]
      confidence: number
      type: string
    }>
    changePercentage: number
  }
}
