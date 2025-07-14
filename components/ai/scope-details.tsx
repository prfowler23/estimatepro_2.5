import { useState } from 'react';
import { Button, Card, Checkbox, Alert } from '@/components/ui';
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
  // Example: { name: 'Full Restoration', services: ['GR', 'FR', 'WC'] }
];

// Skeleton for ScopeDetails component
export function ScopeDetails({ data, onUpdate, onNext, onBack }: {
  data?: ScopeDetailsData;
  onUpdate: (data: { scopeDetails: ScopeDetailsData }) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [scopeData, setScopeData] = useState<ScopeDetailsData>(
    data || {
      selectedServices: [],
      serviceOrder: [],
      autoAddedServices: [],
      overrides: {},
      scopeNotes: '',
      accessRestrictions: [],
      specialRequirements: [],
    }
  );

  // UI and logic to be implemented...
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Scope Details</h2>
      {/* Service selection, bundles, notes, etc. will go here */}
      <div className="mt-8 flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={() => { onUpdate({ scopeDetails: scopeData }); onNext(); }}>Continue</Button>
      </div>
    </div>
  );
} 