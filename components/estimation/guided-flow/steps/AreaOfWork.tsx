import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Alert } from '@/components/ui';
import { Map, Square, Circle, Ruler, Trash2, Download, Upload, MousePointer, Tag } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Measurement {
  id: string;
  type: 'rectangle' | 'polygon' | 'measure';
  points: Point[];
  area?: number;
  length?: number;
  label: string;
  color: string;
}

interface WorkMap {
  id: string;
  name: string;
  imageUrl: string;
  measurements: Measurement[];
  totalArea: number;
}

interface AreaOfWorkData {
  maps: WorkMap[];
  scale: {
    pixelsPerFoot: number;
    referenceLength: number;
  };
  notes: string;
}

type DrawingTool = 'select' | 'rectangle' | 'polygon' | 'measure';

const TOOL_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

export function AreaOfWork({ data, onUpdate, onNext, onBack }) {
  const [areaData, setAreaData] = useState<AreaOfWorkData>({
    maps: data?.areaOfWork?.maps || [],
    scale: data?.areaOfWork?.scale || { pixelsPerFoot: 10, referenceLength: 100 },
    notes: data?.areaOfWork?.notes || ''
  });

  const [currentTool, setCurrentTool] = useState<DrawingTool>('select');
  const [currentMap, setCurrentMap] = useState<WorkMap | null>(
    areaData.maps.length > 0 ? areaData.maps[0] : null
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<string | null>(null);
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelText, setLabelText] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentMap && canvasRef.current) {
      redrawCanvas();
    }
  }, [currentMap, currentTool]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !currentMap) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image if available
    if (imageRef.current && imageRef.current.complete) {
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    }

    // Draw measurements
    currentMap.measurements.forEach((measurement, index) => {
      ctx.strokeStyle = measurement.color;
      ctx.fillStyle = measurement.color + '20'; // Semi-transparent
      ctx.lineWidth = 2;

      if (measurement.type === 'rectangle' && measurement.points.length >= 2) {
        const [start, end] = measurement.points;
        const width = end.x - start.x;
        const height = end.y - start.y;
        
        ctx.fillRect(start.x, start.y, width, height);
        ctx.strokeRect(start.x, start.y, width, height);
        
        // Draw label
        ctx.fillStyle = measurement.color;
        ctx.font = '12px Arial';
        ctx.fillText(measurement.label, start.x + 5, start.y - 5);
      } else if (measurement.type === 'polygon' && measurement.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
        measurement.points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw label at centroid
        const centroid = calculateCentroid(measurement.points);
        ctx.fillStyle = measurement.color;
        ctx.font = '12px Arial';
        ctx.fillText(measurement.label, centroid.x, centroid.y);
      } else if (measurement.type === 'measure' && measurement.points.length >= 2) {
        const [start, end] = measurement.points;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        
        // Draw measurement text
        const midpoint = {
          x: (start.x + end.x) / 2,
          y: (start.y + end.y) / 2
        };
        ctx.fillStyle = measurement.color;
        ctx.font = '12px Arial';
        ctx.fillText(`${measurement.length?.toFixed(1)}ft`, midpoint.x, midpoint.y - 10);
      }
    });

    // Draw current drawing
    if (isDrawing && currentPoints.length > 0) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      
      if (currentTool === 'polygon' && currentPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
      }
    }
  };

  const calculateCentroid = (points: Point[]): Point => {
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 });
    
    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  };

  const calculateArea = (points: Point[]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    // Convert pixels to square feet
    const pixelsPerSqFoot = areaData.scale.pixelsPerFoot * areaData.scale.pixelsPerFoot;
    return area / pixelsPerSqFoot;
  };

  const calculateDistance = (point1: Point, point2: Point): number => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    return pixels / areaData.scale.pixelsPerFoot;
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentMap) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    if (currentTool === 'select') {
      // Handle selection logic
      return;
    }

    if (currentTool === 'rectangle') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([point]);
      } else {
        // Complete rectangle
        const startPoint = currentPoints[0];
        const area = Math.abs((point.x - startPoint.x) * (point.y - startPoint.y)) / 
                    (areaData.scale.pixelsPerFoot * areaData.scale.pixelsPerFoot);
        
        const newMeasurement: Measurement = {
          id: Date.now().toString(),
          type: 'rectangle',
          points: [startPoint, point],
          area,
          label: `Area ${currentMap.measurements.length + 1}`,
          color: TOOL_COLORS[currentMap.measurements.length % TOOL_COLORS.length]
        };
        
        updateMapMeasurements([...currentMap.measurements, newMeasurement]);
        setIsDrawing(false);
        setCurrentPoints([]);
      }
    } else if (currentTool === 'polygon') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([point]);
      } else {
        const newPoints = [...currentPoints, point];
        setCurrentPoints(newPoints);
        
        // Double-click to complete polygon
        if (newPoints.length >= 3) {
          // Check if close to first point (auto-complete)
          const firstPoint = newPoints[0];
          const distance = Math.sqrt(
            Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
          );
          
          if (distance < 10) {
            const area = calculateArea(newPoints);
            const newMeasurement: Measurement = {
              id: Date.now().toString(),
              type: 'polygon',
              points: newPoints,
              area,
              label: `Area ${currentMap.measurements.length + 1}`,
              color: TOOL_COLORS[currentMap.measurements.length % TOOL_COLORS.length]
            };
            
            updateMapMeasurements([...currentMap.measurements, newMeasurement]);
            setIsDrawing(false);
            setCurrentPoints([]);
          }
        }
      }
    } else if (currentTool === 'measure') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([point]);
      } else {
        const startPoint = currentPoints[0];
        const length = calculateDistance(startPoint, point);
        
        const newMeasurement: Measurement = {
          id: Date.now().toString(),
          type: 'measure',
          points: [startPoint, point],
          length,
          label: `Measurement ${currentMap.measurements.length + 1}`,
          color: TOOL_COLORS[currentMap.measurements.length % TOOL_COLORS.length]
        };
        
        updateMapMeasurements([...currentMap.measurements, newMeasurement]);
        setIsDrawing(false);
        setCurrentPoints([]);
      }
    }
  };

  const updateMapMeasurements = (measurements: Measurement[]) => {
    if (!currentMap) return;
    
    const totalArea = measurements
      .filter(m => m.area)
      .reduce((sum, m) => sum + (m.area || 0), 0);
    
    const updatedMap = { ...currentMap, measurements, totalArea };
    const updatedMaps = areaData.maps.map(map => 
      map.id === currentMap.id ? updatedMap : map
    );
    
    setAreaData(prev => ({ ...prev, maps: updatedMaps }));
    setCurrentMap(updatedMap);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const newMap: WorkMap = {
        id: Date.now().toString(),
        name: file.name,
        imageUrl,
        measurements: [],
        totalArea: 0
      };
      
      setAreaData(prev => ({
        ...prev,
        maps: [...prev.maps, newMap]
      }));
      setCurrentMap(newMap);
      
      // Load image for canvas
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        redrawCanvas();
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  };

  const deleteMeasurement = (measurementId: string) => {
    if (!currentMap) return;
    const updatedMeasurements = currentMap.measurements.filter(m => m.id !== measurementId);
    updateMapMeasurements(updatedMeasurements);
  };

  const exportMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `area-map-${currentMap?.name || 'map'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleNext = () => {
    const hasAreas = areaData.maps.some(map => map.measurements.some(m => m.area && m.area > 0));
    if (!hasAreas) {
      alert('Please define at least one work area before continuing');
      return;
    }
    
    onUpdate({ areaOfWork: areaData });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Area of Work Mapping</h2>
        <p className="text-gray-600">
          Upload building photos or maps and define work areas with measurements.
        </p>
      </div>

      {/* Tool Palette */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Drawing Tools</h3>
        <div className="flex gap-2 mb-4">
          <Button
            variant={currentTool === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('select')}
          >
            <MousePointer className="w-4 h-4 mr-1" />
            Select
          </Button>
          <Button
            variant={currentTool === 'rectangle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('rectangle')}
          >
            <Square className="w-4 h-4 mr-1" />
            Rectangle
          </Button>
          <Button
            variant={currentTool === 'polygon' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('polygon')}
          >
            <Circle className="w-4 h-4 mr-1" />
            Polygon
          </Button>
          <Button
            variant={currentTool === 'measure' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentTool('measure')}
          >
            <Ruler className="w-4 h-4 mr-1" />
            Measure
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-1" />
            Upload Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportMap}
            disabled={!currentMap}
          >
            <Download className="w-4 h-4 mr-1" />
            Export Map
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </Card>

      {/* Scale Settings */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Scale Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Pixels per Foot
            </label>
            <input
              type="number"
              value={areaData.scale.pixelsPerFoot}
              onChange={(e) => setAreaData(prev => ({
                ...prev,
                scale: { ...prev.scale, pixelsPerFoot: parseFloat(e.target.value) || 10 }
              }))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Reference Length (ft)
            </label>
            <input
              type="number"
              value={areaData.scale.referenceLength}
              onChange={(e) => setAreaData(prev => ({
                ...prev,
                scale: { ...prev.scale, referenceLength: parseFloat(e.target.value) || 100 }
              }))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </Card>

      {/* Canvas Area */}
      {currentMap ? (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">{currentMap.name}</h3>
            <div className="text-sm text-gray-600">
              Tool: {currentTool} | Total Area: {currentMap.totalArea.toFixed(0)} sq ft
            </div>
          </div>
          
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border border-gray-300 cursor-crosshair"
            onClick={handleCanvasClick}
          />
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Map className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">No Map Loaded</h3>
          <p className="text-gray-600 mb-4">
            Upload a building image or site map to start defining work areas.
          </p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
        </Card>
      )}

      {/* Measurements List */}
      {currentMap && currentMap.measurements.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Defined Areas</h3>
          <div className="space-y-2">
            {currentMap.measurements.map((measurement) => (
              <div
                key={measurement.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded mr-3"
                    style={{ backgroundColor: measurement.color }}
                  />
                  <div>
                    <span className="font-medium">{measurement.label}</span>
                    {measurement.area && (
                      <span className="text-sm text-gray-600 ml-2">
                        ({measurement.area.toFixed(0)} sq ft)
                      </span>
                    )}
                    {measurement.length && (
                      <span className="text-sm text-gray-600 ml-2">
                        ({measurement.length.toFixed(1)} ft)
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMeasurement(measurement.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Additional Notes
        </label>
        <textarea
          className="w-full p-3 border rounded-lg"
          rows={3}
          placeholder="Any additional notes about the work areas..."
          value={areaData.notes}
          onChange={(e) => setAreaData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Continue to Takeoff
        </Button>
      </div>
    </div>
  );
}