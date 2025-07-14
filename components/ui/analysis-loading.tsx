import { Loader2 } from 'lucide-react';

interface AnalysisLoadingProps {
  currentStep: string;
  progress: number;
  onCancel?: () => void;
}

export function AnalysisLoading({ currentStep, progress, onCancel }: AnalysisLoadingProps) {
  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg p-6 max-w-md w-full'>
        <div className='flex items-center mb-4'>
          <Loader2 className='animate-spin mr-3' />
          <h3 className='font-semibold'>Analyzing Photos</h3>
        </div>
        <p className='text-sm text-gray-600 mb-4'>{currentStep}</p>
        <div className='w-full bg-gray-200 rounded-full h-2 mb-4'>
          <div 
            className='bg-blue-600 h-2 rounded-full transition-all duration-300'
            style={{ width: `${progress}%` }}
          />
        </div>
        {onCancel && (
          <button onClick={onCancel} className='text-sm text-gray-500 hover:text-gray-700'>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function EstimationFlowSkeleton() {
  return (
    <div className="animate-pulse p-6">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}