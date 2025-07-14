interface Bundle {
  name: string;
  services: string[];
  description: string;
}

interface BundleSelectorProps {
  bundles: Bundle[];
  onSelect: (bundle: Bundle) => void;
}

export function BundleSelector({ bundles, onSelect }: BundleSelectorProps) {
  return (
    <div className='grid grid-cols-3 gap-4'>
      {bundles.map((bundle) => (
        <div
          key={bundle.name}
          className='p-4 border rounded-lg cursor-pointer hover:border-blue-500 transition-all'
          onClick={() => onSelect(bundle)}
        >
          <h4 className='font-medium'>{bundle.name}</h4>
          <p className='text-sm text-gray-600 mt-1'>{bundle.description}</p>
          <p className='text-xs text-gray-500 mt-2'>
            Services: {bundle.services.join(' → ')}
          </p>
        </div>
      ))}
    </div>
  );
}