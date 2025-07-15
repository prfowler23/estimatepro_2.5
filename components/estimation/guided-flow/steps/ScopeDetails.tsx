import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import { AlertTriangle, Info, Package } from 'lucide-react';
import { SERVICE_RULES } from '@/lib/estimation/service-rules';

interface ScopeDetailsData {
  selectedServices: string[];
  serviceOrder: string[];
  autoAddedServices: string[];
  overrides: Record<string, { price?: number; reason?: string }>;
  scopeNotes: string;
  accessRestrictions: string[];
  specialRequirements: string[];
}

const SERVICES = [
  { id: 'PW', name: 'Pressure Washing', basePrice: '$0.15-0.50/sq ft' },
  { id: 'PWS', name: 'Pressure Wash & Seal', basePrice: '$1.25-1.35/sq ft' },
  { id: 'WC', name: 'Window Cleaning', basePrice: '$2-4/window' },
  { id: 'GR', name: 'Glass Restoration', basePrice: '$5-35/window' },
  { id: 'FR', name: 'Frame Restoration', basePrice: '$25/frame' },
  { id: 'HD', name: 'High Dusting', basePrice: '$0.37-0.75/sq ft' },
  { id: 'SW', name: 'Soft Washing', basePrice: '$0.45/sq ft' },
  { id: 'PD', name: 'Parking Deck', basePrice: '$16-23/space' },
  { id: 'GRC', name: 'Granite Reconditioning', basePrice: '$1.75/sq ft' },
  { id: 'FC', name: 'Final Clean', basePrice: '$70/hour' }
];

const COMMON_BUNDLES = [
  { 
    name: 'Full Restoration', 
    services: ['PWS', 'GR', 'FR', 'WC'],
    description: 'Complete building restoration package'
  },
  { 
    name: 'Basic Cleaning', 
    services: ['PW', 'WC'],
    description: 'Standard pressure wash with windows'
  },
  { 
    name: 'Glass & Frame', 
    services: ['GR', 'FR'],
    description: 'Restoration of glass and frames together'
  }
];

interface ScopeDetailsProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ScopeDetails({ data, onUpdate, onNext, onBack }: ScopeDetailsProps) {
  const [scopeData, setScopeData] = useState<ScopeDetailsData>({
    selectedServices: data?.initialContact?.extractedData?.requirements?.services || [],
    serviceOrder: [],
    autoAddedServices: [],
    overrides: {},
    scopeNotes: '',
    accessRestrictions: [],
    specialRequirements: []
  });
  
  const [validation, setValidation] = useState<{
    errors: string[];
    warnings: string[];
    info: string[];
  }>({
    errors: [],
    warnings: [],
    info: []
  });

  // Validate services whenever selection changes
  useEffect(() => {
    validateServices();
  }, [scopeData.selectedServices]);

  const validateServices = () => {
    const result = SERVICE_RULES.validateServiceSelection(scopeData.selectedServices);
    
    // Auto-add required services
    if (result.autoAddedServices.length > 0) {
      setScopeData(prev => ({
        ...prev,
        selectedServices: [...new Set([...prev.selectedServices, ...result.autoAddedServices])],
        autoAddedServices: result.autoAddedServices
      }));
    }
    
    // Calculate optimal service order
    const orderedServices = calculateServiceOrder(scopeData.selectedServices);
    setScopeData(prev => ({ ...prev, serviceOrder: orderedServices }));
    
    setValidation({
      errors: result.errors,
      warnings: result.warnings,
      info: result.autoAddedServices.length > 0 
        ? [`Window Cleaning (WC) automatically added with Pressure Washing (PW)`]
        : []
    });
  };

  const calculateServiceOrder = (services: string[]): string[] => {
    return services.sort((a, b) => {
      const aPriority = (SERVICE_RULES.serviceOrder as any)[a]?.priority || 99;
      const bPriority = (SERVICE_RULES.serviceOrder as any)[b]?.priority || 99;
      return aPriority - bPriority;
    });
  };

  const toggleService = (serviceId: string) => {
    let newServices = [...scopeData.selectedServices];
    
    if (newServices.includes(serviceId)) {
      // Check if we can remove this service
      if (serviceId === 'WC' && newServices.includes('PW')) {
        // Cannot remove WC if PW is selected
        setValidation(prev => ({
          ...prev,
          warnings: [...prev.warnings, 'Window Cleaning cannot be removed when Pressure Washing is selected']
        }));
        return;
      }
      
      // Remove service
      newServices = newServices.filter(s => s !== serviceId);
      
      // If removing PW, also remove WC
      if (serviceId === 'PW') {
        newServices = newServices.filter(s => s !== 'WC');
      }
    } else {
      // Add service
      newServices.push(serviceId);
    }
    
    setScopeData(prev => ({
      ...prev,
      selectedServices: newServices,
      autoAddedServices: [] // Reset auto-added tracking
    }));
  };

  const selectBundle = (bundle: typeof COMMON_BUNDLES[0]) => {
    setScopeData(prev => ({
      ...prev,
      selectedServices: [...bundle.services],
      autoAddedServices: []
    }));
  };

  const handleNext = () => {
    if (validation.errors.length > 0) {
      alert('Please fix service dependency errors before continuing');
      return;
    }
    
    onUpdate({ scopeDetails: scopeData });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Scope & Service Details</h2>
        <p className="text-gray-600">
          Select the services needed. Dependencies will be automatically managed.
        </p>
      </div>

      {/* Common Bundles */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center">
          <Package className="w-4 h-4 mr-2" />
          Quick Select Bundles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMMON_BUNDLES.map((bundle) => (
            <Card
              key={bundle.name}
              className="p-4 cursor-pointer hover:border-blue-500 transition touch-manipulation min-h-[120px] flex flex-col justify-center"
              onClick={() => selectBundle(bundle)}
            >
              <h4 className="font-medium">{bundle.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{bundle.description}</p>
              <p className="text-xs text-gray-500 mt-2">
                {bundle.services.join(' → ')}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Validation Messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0 || validation.info.length > 0) && (
        <div className="space-y-2">
          {validation.errors.map((error, i) => (
            <Alert key={`error-${i}`} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          ))}
          {validation.warnings.map((warning, i) => (
            <Alert key={`warning-${i}`} variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <span>{warning}</span>
            </Alert>
          ))}
          {validation.info.map((info, i) => (
            <Alert key={`info-${i}`} variant="info">
              <Info className="h-4 w-4" />
              <span>{info}</span>
            </Alert>
          ))}
        </div>
      )}

      {/* Service Selection */}
      <div>
        <h3 className="font-semibold mb-3">Select Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SERVICES.map((service) => {
            const isSelected = scopeData.selectedServices.includes(service.id);
            const isAutoAdded = scopeData.autoAddedServices.includes(service.id);
            const isDisabled = service.id === 'WC' && scopeData.selectedServices.includes('PW');
            
            return (
              <Card
                key={service.id}
                className={`p-4 cursor-pointer transition touch-manipulation min-h-[100px] ${
                  isSelected ? 'border-blue-500 bg-blue-50' : ''
                } ${isDisabled ? 'opacity-75 cursor-not-allowed' : ''}`}
                onClick={() => !isDisabled && toggleService(service.id)}
              >
                <div className="flex items-start">
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="font-medium">{service.name}</h4>
                      {isAutoAdded && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Auto-added
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{service.basePrice}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Service Order Display */}
      {scopeData.serviceOrder.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Recommended Service Order</h3>
          <div className="flex items-center space-x-2">
            {scopeData.serviceOrder.map((serviceId, index) => (
              <React.Fragment key={serviceId}>
                <div className="px-3 py-1 bg-white rounded border">
                  {SERVICES.find(s => s.id === serviceId)?.name}
                </div>
                {index < scopeData.serviceOrder.length - 1 && (
                  <span className="text-gray-400">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Additional Requirements */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Access Restrictions
          </label>
          <textarea
            className="w-full p-2 border rounded"
            placeholder="Note any access restrictions (e.g., security clearance, limited hours, etc.)"
            value={scopeData.accessRestrictions.join('\n')}
            onChange={(e) => setScopeData({
              ...scopeData,
              accessRestrictions: e.target.value.split('\n').filter(Boolean)
            })}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Special Requirements or Notes
          </label>
          <textarea
            className="w-full p-2 border rounded"
            placeholder="Any special requirements or important notes about the scope"
            value={scopeData.scopeNotes}
            onChange={(e) => setScopeData({
              ...scopeData,
              scopeNotes: e.target.value
            })}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext}
          disabled={scopeData.selectedServices.length === 0 || validation.errors.length > 0}
        >
          Continue to Files/Photos
        </Button>
      </div>
    </div>
  );
}