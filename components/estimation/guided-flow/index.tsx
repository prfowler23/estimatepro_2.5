import { useState } from 'react';
import { InitialContact } from './steps/InitialContact';
import { ScopeDetails } from './steps/ScopeDetails';
import { FilesPhotos } from './steps/FilesPhotos';
import { AreaOfWork } from './steps/AreaOfWork';
import { Takeoff } from './steps/Takeoff';
import { Duration } from './steps/Duration';
import { Expenses } from './steps/Expenses';
import { Pricing } from './steps/Pricing';
import { Summary } from './steps/Summary';

// Type definitions for flow data
interface InitialContactData {
  contactMethod: 'email' | 'meeting' | 'phone' | 'walkin';
  originalContent: string;
  extractedData?: any;
}

interface ScopeDetailsData {
  selectedServices: string[];
  serviceOrder: string[];
  autoAddedServices: string[];
  overrides: Record<string, { price?: number; reason?: string }>;
  scopeNotes: string;
  accessRestrictions: string[];
  specialRequirements: string[];
}

interface FilesPhotosData {
  files: any[];
  analysisComplete: boolean;
  summary: any;
}

interface ExpensesData {
  equipment: any[];
  materials: any[];
  labor: any[];
  otherCosts: any[];
  totalCosts: {
    equipment: number;
    materials: number;
    labor: number;
    other: number;
    grand: number;
  };
  margins: {
    equipment: number;
    materials: number;
    labor: number;
    other: number;
  };
  markedUpTotals: {
    equipment: number;
    materials: number;
    labor: number;
    other: number;
    grand: number;
  };
}

interface GuidedFlowData {
  initialContact?: InitialContactData;
  scopeDetails?: ScopeDetailsData;
  filesPhotos?: FilesPhotosData;
  areaOfWork?: any;
  takeoff?: any;
  duration?: any;
  expenses?: ExpensesData;
  pricing?: any;
  summary?: any;
}

interface StepComponentProps {
  data: GuidedFlowData;
  onUpdate: (stepData: Partial<GuidedFlowData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Step {
  id: number;
  name: string;
  component: React.ComponentType<StepComponentProps>;
}

const STEPS: Step[] = [
  { id: 1, name: 'Initial Contact', component: InitialContact },
  { id: 2, name: 'Scope/Details', component: ScopeDetails },
  { id: 3, name: 'Files/Photos', component: FilesPhotos },
  { id: 4, name: 'Area of Work', component: AreaOfWork },
  { id: 5, name: 'Takeoff', component: Takeoff },
  { id: 6, name: 'Duration', component: Duration },
  { id: 7, name: 'Expenses', component: Expenses },
  { id: 8, name: 'Pricing', component: Pricing },
  { id: 9, name: 'Summary', component: Summary },
];

export function GuidedEstimationFlow({ customerId }: { customerId?: string }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [flowData, setFlowData] = useState<GuidedFlowData>({});
  
  const CurrentStepComponent = STEPS[currentStep - 1].component;
  
  const handleUpdate = (stepData: Partial<GuidedFlowData>) => {
    setFlowData(prev => ({ ...prev, ...stepData }));
  };
  
  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <div className="guided-flow-container">
      {/* Step indicator */}
      <div className="step-indicator">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`step ${currentStep === step.id ? 'active' : ''} ${
              currentStep > step.id ? 'completed' : ''
            }`}
          >
            <span>{step.id}</span>
            <label>{step.name}</label>
          </div>
        ))}
      </div>
      
      {/* Current step content */}
      <CurrentStepComponent
        data={flowData}
        onUpdate={handleUpdate}
        onNext={handleNext}
        onBack={handleBack}
      />
    </div>
  );
} 