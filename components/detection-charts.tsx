import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { ChangeDetectionResult } from '@/lib/types/detection';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface DetectionChartsProps {
  data: ChangeDetectionResult[];
}

export function DetectionCharts({ data }: DetectionChartsProps) {
  const barData = {
    labels: data.map((d, i) => `Detection ${i + 1}`),
    datasets: [
      {
        label: 'Affected Area (%)',
        data: data.map(d => d.affectedArea * 100),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
      {
        label: 'Confidence (%)',
        data: data.map(d => d.confidence * 100),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const lineData = {
    labels: data.map((d, i) => `Detection ${i + 1}`),
    datasets: [
      {
        label: 'Severity Score',
        data: data.map(d => d.severityScore),
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Detection Metrics</h3>
        <Bar
          data={barData}
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
              },
            },
          }}
        />
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Severity Trend</h3>
        <Line
          data={lineData}
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          }}
        />
      </div>
    </div>
  );
}
