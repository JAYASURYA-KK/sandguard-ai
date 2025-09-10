"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { DetectionCharts } from '@/components/detection-charts'

type ApiDetection = {
  id: string
  createdAt: string
  width: number
  height: number
  changePixels: number
  totalPixels: number
  severity: number
  mlPrediction?: {
    changePercentage: number
    changedAreas: Array<{ confidence: number; type: string; bbox: [number, number, number, number] }>
  }
}

export default function DashboardView() {
  const [items, setItems] = useState<ApiDetection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/detections')
        const data = await res.json()
        setItems(data || [])
      } catch (e) {
        console.warn('Failed to fetch detections', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const chartData = items.map((d) => ({
    affectedArea: (d.mlPrediction?.changePercentage ?? (d.changePixels / Math.max(1, d.totalPixels)) * 100) / 100,
    confidence: d.mlPrediction?.changedAreas?.[0]?.confidence ?? (d.severity / 100),
    severityScore: d.severity,
  }))

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Analytics</h2>
      <Card className="p-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading charts…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No detections yet. Run an analysis to see charts.</div>
        ) : (
          <DetectionCharts data={chartData as any} />
        )}
      </Card>
    </section>
  )
}


