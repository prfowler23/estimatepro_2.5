interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    basePrice: string;
  };
  isSelected: boolean;
  isAutoAdded: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}

export function ServiceCard({ service, isSelected, isAutoAdded, isDisabled, onToggle }: ServiceCardProps) {
  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      } ${isDisabled ? 'opacity-75 cursor-not-allowed' : 'hover:border-gray-400'}`}
      onClick={() => !isDisabled && onToggle()}
    >
      <div className='flex items-start'>
        <input
          type='checkbox'
          checked={isSelected}
          disabled={isDisabled}
          className='mt-1 mr-3'
          onChange={() => {}}
        />
        <div className='flex-1'>
          <div className='flex items-center'>
            <h4 className='font-medium'>{service.name}</h4>
            {isAutoAdded && (
              <span className='ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded'>
                Auto-added
              </span>
            )}
          </div>
          <p className='text-sm text-gray-600'>{service.basePrice}</p>
        </div>
      </div>
    </div>
  );
}