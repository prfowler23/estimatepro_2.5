import { DrawingCanvas } from '@/components/canvas/DrawingCanvas';
import { ToolPalette } from '@/components/canvas/ToolPalette';
import { ScaleSetter } from '@/components/canvas/ScaleSetter';
import { AreaSummary } from '@/components/canvas/AreaSummary';
import { MapImportService } from '@/lib/canvas/map-import';

// Main component that combines all the canvas features
export function AreaOfWorkComplete({ data, onUpdate, onNext, onBack }) {
  const [currentTool, setCurrentTool] = useState('select');
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [scale, setScale] = useState(null);
  
  const handleFileUpload = async (file: File) => {
    const importService = new MapImportService();
    
    if (file.name.includes('nearmap')) {
      const result = await importService.importFromNearmap(file);
      setBackgroundImage(result.imageUrl);
      if (result.metadata?.scale) {
        setScale({ pixelsPerFoot: result.metadata.scale });
      }
    } else {
      // Handle other file types
      const url = URL.createObjectURL(file);
      setBackgroundImage(url);
    }
  };
  
  const handleExport = async () => {
    const blob = await exportMapWithMeasurements(
      document.querySelector('canvas'),
      shapes,
      measurements
    );
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'area-measurements.png';
    a.click();
  };
  
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-3 gap-6'>
        <div className='col-span-2'>
          <ToolPalette
            currentTool={currentTool}
            onToolChange={setCurrentTool}
            onClearAll={() => {
              setShapes([]);
              setMeasurements([]);
            }}
          />
          <DrawingCanvas
            backgroundImage={backgroundImage}
            currentTool={currentTool}
            onShapesChange={(s, m) => {
              setShapes(s);
              setMeasurements(m);
            }}
          />
        </div>
        <div className='space-y-4'>
          <ScaleSetter onScaleSet={setScale} />
          <AreaSummary shapes={shapes} measurements={measurements} />
          <button onClick={handleExport}>Export Map</button>
        </div>
      </div>
    </div>
  );
}