import { DetectionInterface } from "@/src/components/detection-interface"
import DetectionList from "@/src/components/detection-list"
import AlertsClient from "@/src/components/alerts-client"
import DashboardView from "@/components/dashboard-view"
import { PredictionSection } from "@/components/prediction-section"

export default function Page() {
  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-balance">Riverbank Change Detection System</h1>
        <p className="text-muted-foreground max-w-3xl">
          Advanced AI-powered system for detecting riverbank erosion, land use changes, and vehicle activity. 
          Upload images or use Google Earth Engine satellite data for comprehensive analysis with vehicle detection, 
          soil analysis, and erosion risk assessment.
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-6">Change Detection Analysis</h2>
        <PredictionSection />
      </div>

      <DashboardView />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recent Detections</h2>
        <DetectionList />
      </section>

      <AlertsClient />
    </main>
  )
}
