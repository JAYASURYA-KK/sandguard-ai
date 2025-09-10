import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Bell, 
  Clock, 
  MapPin, 
  Truck, 
  Mail,
  CheckCircle,
  X 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Alert {
  _id: string;
  type: 'mining' | 'vehicle' | 'system';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: string;
  coordinates: [number, number];
  timestamp: Date;
  acknowledged: boolean;
}

interface Props {
  initialAlerts?: Alert[];
}

export default function AlertNotificationSystem({ initialAlerts = [] }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch alerts",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Poll for new alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);

    return () => clearInterval(interval);
  }, [toast]);

  const acknowledgeAlert = async (id: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, acknowledged: true }),
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge alert",
        variant: "destructive",
      });
    }
  };

  const dismissAlert = async (id: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      toast({
        title: "Error",
        description: "Failed to dismiss alert",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mining': return AlertTriangle;
      case 'vehicle': return Truck;
      default: return Bell;
    }
  };

  const formatTime = (date: Date) => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;

  return (
    <Card className="h-full flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Alert System</h3>
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="alert-pulse">
                {unacknowledgedCount}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const doc = generateAlertReport(alerts);
              doc.save(`alert-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Export PDF Report
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No alerts at this time</p>
            </div>
          ) : (
            alerts.map((alert, index) => {
              const Icon = getTypeIcon(alert.type);
              
              return (
                <div key={alert.id}>
                  <div className={`p-4 rounded-lg border-l-4 ${
                    alert.acknowledged ? 'bg-muted/50' : 'bg-card'
                  } ${
                    alert.severity === 'high' ? 'border-l-destructive' :
                    alert.severity === 'medium' ? 'border-l-warning' :
                    'border-l-muted-foreground'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 ${
                          alert.severity === 'high' ? 'text-destructive' :
                          alert.severity === 'medium' ? 'text-warning' :
                          'text-muted-foreground'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-medium ${alert.acknowledged ? 'text-muted-foreground' : ''}`}>
                              {alert.title}
                            </h4>
                            <Badge variant={getSeverityColor(alert.severity) as any}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            {alert.acknowledged && (
                              <Badge variant="outline">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Acknowledged
                              </Badge>
                            )}
                          </div>
                          <p className={`text-sm mb-2 ${alert.acknowledged ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {alert.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{alert.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(alert.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {index < alerts.length - 1 && <Separator className="my-2" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}