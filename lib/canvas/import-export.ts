export async function exportMapWithMeasurements(
  canvas: HTMLCanvasElement,
  shapes: any[],
  measurements: any[]
): Promise<Blob> {
  // Create a new canvas for export
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return new Blob();
  
  // Copy original canvas
  ctx.drawImage(canvas, 0, 0);
  
  // Add measurement summary overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(10, 10, 200, 100);
  ctx.fillStyle = 'black';
  ctx.font = '14px Arial';
  ctx.fillText('Area Summary:', 20, 30);
  const totalArea = shapes.reduce((sum, shape) => sum + (shape.area || 0), 0);
  ctx.fillText(`Total: ${totalArea.toFixed(0)} sq ft`, 20, 50);
  
  // Convert to blob
  return new Promise<Blob>((resolve) => {
    exportCanvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/png');
  });
}

export function importMeasurementsFromCSV(csvContent: string): {
  shapes: any[];
  measurements: any[];
} {
  // Parse CSV format from measurement tools
  const lines = csvContent.split('\n');
  const shapes: any[] = [];
  const measurements: any[] = [];
  
  lines.forEach(line => {
    const parts = line.split(',');
    if (parts[0] === 'AREA') {
      shapes.push({
        label: parts[1],
        area: parseFloat(parts[2]),
        type: 'polygon'
      });
    } else if (parts[0] === 'LENGTH') {
      measurements.push({
        label: parts[1],
        distance: parseFloat(parts[2])
      });
    }
  });
  
  return { shapes, measurements };
}