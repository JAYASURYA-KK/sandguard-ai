import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Maximize2, AlertTriangle } from 'lucide-react';
import satelliteBefore from '@/assets/satellite-before.jpg';
import satelliteAfter from '@/assets/satellite-after.jpg';

interface DetectionRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'change' | 'vehicle';
  confidence: number;
}

const mockDetections: DetectionRegion[] = [
  { id: '1', x: 320, y: 180, width: 80, height: 60, type: 'change', confidence: 0.92 },
  { id: '2', x: 450, y: 220, width: 40, height: 30, type: 'vehicle', confidence: 0.87 },
  { id: '3', x: 280, y: 320, width: 120, height: 80, type: 'change', confidence: 0.95 },
];

export default function SatelliteImageComparison() {
  const [activeView, setActiveView] = useState<'before' | 'after' | 'overlay'>('overlay');
  const [showDetections, setShowDetections] = useState(true);

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b bg-gradient-earth text-primary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Satellite Image Analysis</h3>
            <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>28°32'N, 77°21'E</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                <span>Jan 2024 vs Sep 2024</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant={activeView === 'before' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('before')}
            >
              Before
            </Button>
            <Button
              variant={activeView === 'after' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('after')}
            >
              After
            </Button>
            <Button
              variant={activeView === 'overlay' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('overlay')}
            >
              Detection Overlay
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="alert-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              3 Changes Detected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetections(!showDetections)}
            >
              {showDetections ? 'Hide' : 'Show'} Detections
            </Button>
          </div>
        </div>

        <div className="relative satellite-container aspect-[4/3] bg-muted">
          <img
            src={activeView === 'before' ? satelliteBefore : satelliteAfter}
            alt={`Satellite imagery ${activeView}`}
            className="w-full h-full object-cover"
          />
          
          {/* Detection Overlays */}
          {showDetections && activeView === 'overlay' && (
            <div className="detection-overlay">
              {mockDetections.map((detection) => (
                <div
                  key={detection.id}
                  className={`absolute border-2 rounded ${
                    detection.type === 'change'
                      ? 'border-detection-change bg-detection-change/20 detection-glow'
                      : 'border-detection-vehicle bg-detection-vehicle/20'
                  }`}
                  style={{
                    left: `${(detection.x / 800) * 100}%`,
                    top: `${(detection.y / 600) * 100}%`,
                    width: `${(detection.width / 800) * 100}%`,
                    height: `${(detection.height / 600) * 100}%`,
                  }}
                >
                  <div className={`absolute -top-6 left-0 text-xs px-2 py-1 rounded ${
                    detection.type === 'change' ? 'bg-detection-change text-white' : 'bg-detection-vehicle text-white'
                  }`}>
                    {detection.type === 'change' ? 'Sand Mining' : 'Vehicle'} ({Math.round(detection.confidence * 100)}%)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground">Land Change Detection</div>
            <div className="text-2xl font-bold text-detection-change">95%</div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground">Vehicle Detection</div>
            <div className="text-2xl font-bold text-detection-vehicle">87%</div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
        </div>
      </div>
    </Card>
  );
}