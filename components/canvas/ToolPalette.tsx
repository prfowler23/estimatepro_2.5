import { Square, Hexagon, Ruler, MousePointer, Trash2 } from 'lucide-react';

interface ToolPaletteProps {
  currentTool: string;
  onToolChange: (tool: string) => void;
  onClearAll: () => void;
}

export function ToolPalette({ currentTool, onToolChange, onClearAll }: ToolPaletteProps) {
  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'polygon', icon: Hexagon, label: 'Polygon' },
    { id: 'measure', icon: Ruler, label: 'Measure' },
  ];
  
  return (
    <div className='bg-white p-2 rounded-lg shadow-md flex space-x-2'>
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`p-2 rounded transition-colors ${
            currentTool === tool.id 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          title={tool.label}
        >
          <tool.icon className='w-5 h-5' />
        </button>
      ))}
      <div className='border-l mx-2' />
      <button
        onClick={onClearAll}
        className='p-2 rounded bg-red-100 hover:bg-red-200 text-red-600'
        title='Clear All'
      >
        <Trash2 className='w-5 h-5' />
      </button>
    </div>
  );
}