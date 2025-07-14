export async function exportMapWithMeasurements(
  canvas: HTMLCanvasElement,
  shapes: Shape[],
  measurements: Measurement[]
): Promise<Blob> {
  // Create a new canvas for export
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const ctx = exportCanvas.getContext('2d');
  
  // Copy original canvas
  ctx.drawImage(canvas, 0, 0);
  
  // Add measurement summary overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(10, 10, 200, 100);
  ctx.fillStyle = 'black';
  ctx.font = '14px Arial';
  ctx.fillText('Area Summary:', 20, 30);
  ctx.fillText(`Total: ${calculateTotalArea(shapes).toFixed(0)} sq ft`, 20, 50);
  
  // Convert to blob
  return new Promise((resolve) => {
    exportCanvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}

export function importMeasurementsFromCSV(csvContent: string): {
  shapes: Partial<Shape>[];
  measurements: Partial<Measurement>[];
} {
  // Parse CSV format from measurement tools
  const lines = csvContent.split('\n');
  const shapes = [];
  const measurements = [];
  
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