import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Map, Download, Upload, FileImage, AlertCircle } from 'lucide-react';
import { DrawingCanvas } from '@/components/canvas/DrawingCanvas';
import { ToolPalette } from '@/components/canvas/ToolPalette';
import { ScaleSetter } from '@/components/canvas/ScaleSetter';
import { AreaSummary } from '@/components/canvas/AreaSummary';
import { MapImportService } from '@/lib/canvas/map-import';
import { Shape, Measurement } from '@/lib/canvas/drawing-service';
import { WorkArea, Surface } from '@/lib/types/estimate-types';

interface AreaOfWorkData {
  workAreas: WorkArea[];
  scale: {
    pixelsPerFoot: number;
    referenceLength: number;
  };
  notes: string;
  backgroundImage?: string;
  imageName?: string;
}

type DrawingTool = 'select' | 'rectangle' | 'polygon' | 'measure';

interface AreaOfWorkProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AreaOfWork({ data, onUpdate, onNext, onBack }: AreaOfWorkProps) {
  const [areaData, setAreaData] = useState<AreaOfWorkData>({
    workAreas: data?.areaOfWork?.workAreas || [],
    scale: data?.areaOfWork?.scale || { pixelsPerFoot: 10, referenceLength: 100 },
    notes: data?.areaOfWork?.notes || '',
    backgroundImage: data?.areaOfWork?.backgroundImage,
    imageName: data?.areaOfWork?.imageName
  });

  const [currentTool, setCurrentTool] = useState<DrawingTool>('select');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isScaleMode, setIsScaleMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapImportService = new MapImportService();

  // Update canvas size based on viewport
  useEffect(() => {
    const updateCanvasSize = () => {
      const viewportWidth = window.innerWidth;
      const containerPadding = 64; // Account for padding
      
      if (viewportWidth < 640) { // mobile
        setCanvasSize({ 
          width: Math.min(400, viewportWidth - containerPadding), 
          height: 300 
        });
      } else if (viewportWidth < 1024) { // tablet
        setCanvasSize({ 
          width: Math.min(600, viewportWidth - containerPadding), 
          height: 450 
        });
      } else { // desktop
        setCanvasSize({ width: 800, height: 600 });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    // Convert existing work areas to shapes when component mounts
    if (areaData.workAreas.length > 0) {
      const convertedShapes = convertWorkAreasToShapes(areaData.workAreas);
      setShapes(convertedShapes);
    }
  }, [areaData.workAreas]);

  const convertWorkAreasToShapes = (workAreas: WorkArea[]): Shape[] => {
    return workAreas.map(area => ({
      id: area.id,
      type: area.geometry.type === 'rectangle' ? 'rectangle' : 'polygon',
      points: area.geometry.coordinates.map(coord => ({ x: coord[0], y: coord[1] })),
      area: area.geometry.area,
      label: area.name,
      color: '#3B82F6' // Default color
    }));
  };

  const convertShapesToWorkAreas = (shapes: Shape[]): WorkArea[] => {
    return shapes.map(shape => ({
      id: shape.id,
      name: shape.label || `Area ${shape.id}`,
      type: 'exterior' as const,
      geometry: {
        type: shape.type,
        coordinates: shape.points.map(point => [point.x, point.y]),
        area: shape.area,
        perimeter: calculatePerimeter(shape.points)
      },
      surfaces: [],
      accessRequirements: [],
      riskFactors: []
    }));
  };

  const calculatePerimeter = (points: { x: number; y: number }[]): number => {
    if (points.length < 2) return 0;
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter / areaData.scale.pixelsPerFoot;
  };

  const handleShapesChange = (newShapes: Shape[], newMeasurements: Measurement[]) => {
    setShapes(newShapes);
    setMeasurements(newMeasurements);
    
    // Convert shapes to work areas and update data
    const workAreas = convertShapesToWorkAreas(newShapes);
    setAreaData(prev => ({ ...prev, workAreas }));
  };

  const handleScaleChange = (newScale: { pixelsPerFoot: number }) => {
    setAreaData(prev => ({ ...prev, scale: { ...prev.scale, pixelsPerFoot: newScale.pixelsPerFoot } }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      let imageUrl: string;
      let detectedScale: { pixelsPerFoot: number } | null = null;

      if (file.name.toLowerCase().includes('nearmap') || file.name.toLowerCase().includes('google')) {
        // Use advanced map import service
        const importResult = await mapImportService.importFromNearmap(file);
        imageUrl = importResult.imageUrl;
        detectedScale = importResult.metadata?.scale ? { pixelsPerFoot: importResult.metadata.scale } : null;
      } else {
        // Standard image upload
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      setAreaData(prev => ({
        ...prev,
        backgroundImage: imageUrl,
        imageName: file.name,
        scale: detectedScale ? { ...prev.scale, pixelsPerFoot: detectedScale.pixelsPerFoot } : prev.scale
      }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearAll = () => {
    setShapes([]);
    setMeasurements([]);
    setAreaData(prev => ({ ...prev, workAreas: [] }));
  };

  const handleExport = async () => {
    try {
      // Export using the drawing service
      const canvas = document.querySelector('canvas');
      if (!canvas) return;

      const link = document.createElement('a');
      link.download = `area-map-${areaData.imageName || 'map'}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleNext = () => {
    const hasAreas = areaData.workAreas.length > 0 && areaData.workAreas.some(area => area.geometry.area > 0);
    if (!hasAreas) {
      alert('Please define at least one work area before continuing');
      return;
    }
    
    onUpdate({ areaOfWork: areaData });
    onNext();
  };

  const totalArea = areaData.workAreas.reduce((sum, area) => sum + area.geometry.area, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Area of Work Mapping</h2>
        <p className="text-gray-600">
          Upload building photos or maps and define work areas with measurements.
        </p>
      </div>

      {/* Upload Section */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Map Upload</h3>
          {areaData.backgroundImage && (
            <div className="text-sm text-gray-600">
              Current: {areaData.imageName}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-1" />
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!areaData.backgroundImage || shapes.length === 0}
          >
            <Download className="w-4 h-4 mr-1" />
            Export Map
          </Button>
        </div>
        
        {uploadError && (
          <Alert className="mb-4">
            <AlertCircle className="w-4 h-4" />
            {uploadError}
          </Alert>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </Card>

      {/* Main Drawing Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Area */}
        <div className="lg:col-span-3">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Drawing Area</h3>
              <div className="text-sm text-gray-600">
                Total Area: {totalArea.toFixed(0)} sq ft
              </div>
            </div>
            
            {areaData.backgroundImage ? (
              <div className="space-y-4">
                <ToolPalette
                  currentTool={currentTool}
                  onToolChange={(tool: string) => setCurrentTool(tool as DrawingTool)}
                  onClearAll={handleClearAll}
                />
                <DrawingCanvas
                  backgroundImage={areaData.backgroundImage}
                  currentTool={currentTool}
                  scale={areaData.scale}
                  onShapesChange={handleShapesChange}
                  onScaleChange={handleScaleChange}
                  width={canvasSize.width}
                  height={canvasSize.height}
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 p-8 text-center">
                <FileImage className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Map Loaded</h3>
                <p className="text-gray-600 mb-4">
                  Upload a building image or site map to start defining work areas.
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <ScaleSetter
            currentScale={areaData.scale.pixelsPerFoot}
            onScaleSet={(pixelsPerFoot) => setAreaData(prev => ({
              ...prev,
              scale: { ...prev.scale, pixelsPerFoot }
            }))}
            isActive={isScaleMode}
            onActivate={() => setIsScaleMode(true)}
            onDeactivate={() => setIsScaleMode(false)}
          />
          <AreaSummary
            shapes={shapes}
            measurements={measurements as any}
          />
        </div>
      </div>

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