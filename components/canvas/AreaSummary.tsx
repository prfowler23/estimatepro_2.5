interface Shape {
  id: string;
  type: string;
  area: number;
  label?: string;
}

interface Measurement {
  id: string;
  area: number;
  perimeter: number;
  label?: string;
  distance: number;
}

interface AreaSummaryProps {
  shapes: Shape[];
  measurements: Measurement[];
}

export function AreaSummary({ shapes, measurements }: AreaSummaryProps) {
  const totalArea = shapes.reduce((sum, shape) => sum + shape.area, 0);

  const areasByLabel = shapes.reduce(
    (acc, shape) => {
      const label = shape.label || "Unlabeled";
      acc[label] = (acc[label] || 0) + shape.area;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold mb-3">Area Summary</h3>

      <div className="mb-4">
        <p className="text-2xl font-bold">{totalArea.toFixed(0)} sq ft</p>
        <p className="text-sm text-gray-600">Total Area</p>
      </div>

      <div className="space-y-2">
        {Object.entries(areasByLabel).map(([label, area]) => (
          <div key={label} className="flex justify-between text-sm">
            <span>{label}:</span>
            <span className="font-medium">{area.toFixed(0)} sq ft</span>
          </div>
        ))}
      </div>

      {measurements.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium mb-2">Measurements</h4>
          {measurements.map((m) => (
            <div key={m.id} className="flex justify-between text-sm">
              <span>{m.label}:</span>
              <span>{m.distance.toFixed(1)} ft</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
