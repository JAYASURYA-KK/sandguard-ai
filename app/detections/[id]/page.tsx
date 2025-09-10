import { notFound } from "next/navigation"
import MapView from "@/src/components/map-view"

async function resolveBaseUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_V0_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.startsWith("http") ? explicit : `https://${explicit}`
  const vercel = process.env.VERCEL_URL
  if (vercel) return `https://${vercel}`
  return "http://localhost:3000"
}

async function getDetection(id: string) {
  const base = await resolveBaseUrl()
  const res = await fetch(`${base}/api/detections/${id}`, { cache: "no-store" })
  if (!res.ok) return null
  return res.json()
}

export default async function DetectionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const det = await getDetection(id)
  if (!det) return notFound()

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Detection Details</h1>
        <p className="text-sm text-muted-foreground">{new Date(det.createdAt).toLocaleString()}</p>
      </header>

      <section className="grid gap-4">
        <div className="grid md:grid-cols-3 gap-3">
          <figure className="grid gap-2">
            <figcaption className="text-sm font-medium">Before</figcaption>
            <img src={det.beforeImageBase64 || "/placeholder.svg"} alt="Before image" className="rounded border" />
          </figure>
          <figure className="grid gap-2">
            <figcaption className="text-sm font-medium">After</figcaption>
            <img src={det.afterImageBase64 || "/placeholder.svg"} alt="After image" className="rounded border" />
          </figure>
          <figure className="grid gap-2">
            <figcaption className="text-sm font-medium">Overlay (red = change)</figcaption>
            <img
              src={det.overlayImageBase64 || "/placeholder.svg"}
              alt="Overlay with highlighted changes"
              className="rounded border"
            />
          </figure>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 grid gap-2">
            <h2 className="text-lg font-semibold">Summary</h2>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                Severity: <span className="font-medium text-foreground">{det.severity}%</span>
              </li>
              <li>
                Changed pixels: {det.changePixels.toLocaleString()} / {det.totalPixels.toLocaleString()}
              </li>
              <li>Threshold: {det.threshold}</li>
              {det.notes && <li>Notes: {det.notes}</li>}
              <li>
                Model: {det.model?.type} {det.model?.version ? `(${det.model.version})` : ""}
              </li>
            </ul>
          </div>
          <div className="grid gap-2">
            <h2 className="text-lg font-semibold">Map</h2>
            <MapView coordinates={det.coordinates} label={`Severity ${det.severity}%`} />
          </div>
        </div>
      </section>
    </main>
  )
}
