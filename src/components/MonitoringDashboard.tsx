import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Satellite, 
  Map, 
  BarChart3, 
  Settings, 
  Play, 
  Pause,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';
import SatelliteImageComparison from './SatelliteImageComparison';
import AlertNotificationSystem from './AlertNotificationSystem';
import MonitoringStatistics from './MonitoringStatistics';
import ImageUploadAnalysis from './ImageUploadAnalysis';

export default function MonitoringDashboard() {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    setLastUpdate(new Date());
  };

  const refreshData = () => {
    setLastUpdate(new Date());
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg gradient-earth">
                <Satellite className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Mining Detection System</h1>
                <p className="text-muted-foreground">Environmental Protection & Monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant={isMonitoring ? "default" : "secondary"} className="flex items-center gap-1">
                {isMonitoring ? (
                  <>
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    Live Monitoring
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                    Paused
                  </>
                )}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              
              <Button
                variant={isMonitoring ? "secondary" : "default"}
                size="sm"
                onClick={toggleMonitoring}
              >
                {isMonitoring ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Analysis
            </TabsTrigger>
            <TabsTrigger value="satellite" className="flex items-center gap-2">
              <Satellite className="w-4 h-4" />
              Satellite Analysis
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MonitoringStatistics />
              </div>
              <div>
                <AlertNotificationSystem />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <ImageUploadAnalysis />
              </div>
              <div>
                <AlertNotificationSystem />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="satellite" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <SatelliteImageComparison />
              </div>
              <div>
                <AlertNotificationSystem />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Map className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-semibold">Interactive Map View</h3>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Interactive Map Integration</p>
                  <p className="text-sm">Google Earth Engine & Real-time Monitoring</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Detection Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Change Detection Sensitivity</span>
                    <Badge variant="outline">High</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Vehicle Detection Threshold</span>
                    <Badge variant="outline">85%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Alert Frequency</span>
                    <Badge variant="outline">Real-time</Badge>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">System Status</h3>
                <div className="space-y-4">
                  {[
                    { name: 'AI Model Status', status: 'Active', color: 'success' },
                    { name: 'Satellite Feed', status: 'Connected', color: 'success' },
                    { name: 'Database', status: 'Healthy', color: 'success' },
                    { name: 'Alert System', status: 'Operational', color: 'success' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.name}</span>
                      <Badge variant={item.color as any}>{item.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}