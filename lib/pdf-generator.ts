import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Alert {
  type: string;
  severity: string;
  title: string;
  description: string;
  location: string;
  coordinates: [number, number];
  timestamp: Date;
  acknowledged: boolean;
}

export function generateAlertReport(alerts: Alert[]) {
  const doc = new jsPDF();

  // Add title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Mining Activity Alert Report', 20, 20);

  // Add report generation date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 20, 30);

  // Add summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Summary', 20, 45);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const highPriority = alerts.filter(a => a.severity === 'high').length;
  const mediumPriority = alerts.filter(a => a.severity === 'medium').length;
  const lowPriority = alerts.filter(a => a.severity === 'low').length;
  
  doc.text([
    `Total Alerts: ${alerts.length}`,
    `High Priority: ${highPriority}`,
    `Medium Priority: ${mediumPriority}`,
    `Low Priority: ${lowPriority}`,
  ], 20, 55);

  // Add alerts table
  autoTable(doc, {
    startY: 80,
    head: [['Time', 'Type', 'Severity', 'Location', 'Status']],
    body: alerts.map(alert => [
      format(new Date(alert.timestamp), 'Pp'),
      alert.type,
      alert.severity.toUpperCase(),
      alert.location,
      alert.acknowledged ? 'Acknowledged' : 'Pending'
    ]),
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [66, 66, 66],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  return doc;
}
