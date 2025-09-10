import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface Alert {
  type: string;
  severity: string;
  timestamp: Date;
}

interface AlertChartProps {
  alerts: Alert[];
}

export default function AlertChart({ alerts }: AlertChartProps) {
  const chartData = useMemo(() => {
    // Get the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    console.log('Processing alerts for chart:', alerts?.length || 0);

    const data = last7Days.map(date => {
      const dayAlerts = alerts.filter(alert => 
        new Date(alert.timestamp).toISOString().split('T')[0] === date
      );

      return {
        date,
        high: dayAlerts.filter(a => a.severity === 'high').length,
        medium: dayAlerts.filter(a => a.severity === 'medium').length,
        low: dayAlerts.filter(a => a.severity === 'low').length,
      };
    });

    return data;
  }, [alerts]);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Alert Activity (Last 7 Days)</h3>
      <div className="w-full overflow-x-auto">
        <BarChart
          width={800}
          height={300}
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="high" fill="#ef4444" name="High Priority" />
          <Bar dataKey="medium" fill="#f59e0b" name="Medium Priority" />
          <Bar dataKey="low" fill="#6b7280" name="Low Priority" />
        </BarChart>
      </div>
    </Card>
  );
}
