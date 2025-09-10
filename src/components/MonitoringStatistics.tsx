import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Shield, 
  Satellite,
  Truck,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
}

const stats: StatCard[] = [
  {
    title: 'Protected Areas Monitored',
    value: '247',
    change: 5.2,
    trend: 'up',
    icon: Shield,
    color: 'text-success',
  },
  {
    title: 'Active Mining Detections',
    value: '12',
    change: -2.1,
    trend: 'down',
    icon: AlertTriangle,
    color: 'text-destructive',
  },
  {
    title: 'Vehicle Activities',
    value: '89',
    change: 8.3,
    trend: 'up',
    icon: Truck,
    color: 'text-warning',
  },
  {
    title: 'System Uptime',
    value: '99.9%',
    change: 0.1,
    trend: 'stable',
    icon: Activity,
    color: 'text-success',
  },
];

const detectionMetrics = [
  { name: 'Change Detection Accuracy', value: 94, color: 'bg-primary' },
  { name: 'Vehicle Recognition', value: 87, color: 'bg-secondary' },
  { name: 'False Positive Rate', value: 8, color: 'bg-destructive' },
  { name: 'Coverage Area', value: 76, color: 'bg-accent' },
];

export default function MonitoringStatistics() {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Activity;
          
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-success' : 
                  stat.trend === 'down' ? 'text-destructive' : 
                  'text-muted-foreground'
                }`}>
                  <TrendIcon className="w-4 h-4" />
                  <span>{Math.abs(stat.change)}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detection Performance */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Satellite className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">AI Detection Performance</h3>
          <Badge variant="outline" className="ml-auto">Real-time</Badge>
        </div>
        
        <div className="space-y-4">
          {detectionMetrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{metric.name}</span>
                <span className="text-muted-foreground">{metric.value}%</span>
              </div>
              <Progress value={metric.value} className="h-2" />
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        
        <div className="space-y-4">
          {[
            { time: '2 min ago', action: 'Mining detection model updated', status: 'success' },
            { time: '15 min ago', action: 'New satellite imagery processed', status: 'info' },
            { time: '32 min ago', action: 'Alert sent to authorities', status: 'warning' },
            { time: '1 hour ago', action: 'System health check completed', status: 'success' },
            { time: '2 hours ago', action: 'Vehicle detection accuracy improved', status: 'success' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`w-2 h-2 rounded-full ${
                activity.status === 'success' ? 'bg-success' :
                activity.status === 'warning' ? 'bg-warning' :
                activity.status === 'error' ? 'bg-destructive' :
                'bg-accent'
              }`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}