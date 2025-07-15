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
import { GuidedFlowValidator, ValidationResult } from '@/lib/validation/guided-flow-validation';
import { Alert } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

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
  const [validationResults, setValidationResults] = useState<Record<number, ValidationResult>>({});
  const [attemptedNavigation, setAttemptedNavigation] = useState(false);
  
  const CurrentStepComponent = STEPS[currentStep - 1].component;
  
  const handleUpdate = (stepData: Partial<GuidedFlowData>) => {
    const updatedFlowData = { ...flowData, ...stepData };
    setFlowData(updatedFlowData);
    
    // Validate current step when data is updated
    const currentStepData = GuidedFlowValidator.getStepData(currentStep, updatedFlowData);
    if (currentStepData) {
      const validation = GuidedFlowValidator.validateStep(currentStep, currentStepData);
      setValidationResults(prev => ({
        ...prev,
        [currentStep]: validation
      }));
    }
  };
  
  const handleNext = () => {
    setAttemptedNavigation(true);
    
    // Validate current step before allowing progression
    const currentStepData = GuidedFlowValidator.getStepData(currentStep, flowData);
    if (currentStepData) {
      const validation = GuidedFlowValidator.validateStep(currentStep, currentStepData);
      setValidationResults(prev => ({
        ...prev,
        [currentStep]: validation
      }));
      
      if (!validation.isValid) {
        // Don't allow progression if validation fails
        return;
      }
    } else if (currentStep > 1) {
      // Don't allow progression if required data is missing
      setValidationResults(prev => ({
        ...prev,
        [currentStep]: {
          isValid: false,
          errors: ['Required data is missing for this step'],
          warnings: []
        }
      }));
      return;
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      setAttemptedNavigation(false);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setAttemptedNavigation(false);
    }
  };

  // Get current step validation
  const currentValidation = validationResults[currentStep];
  const hasValidationErrors = attemptedNavigation && currentValidation && !currentValidation.isValid;
  
  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      {/* Step indicator */}
      <div className="mb-6 sm:mb-8">
        {/* Mobile step indicator */}
        <div className="block sm:hidden bg-gray-50 rounded-lg p-3 mb-4">
          <div className="text-sm text-gray-600 mb-1">Step {currentStep} of {STEPS.length}</div>
          <div className="font-medium">{STEPS[currentStep - 1].name}</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop step indicator */}
        <div className="hidden sm:flex items-center justify-between overflow-x-auto">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col items-center min-w-0 flex-1 ${
                currentStep === step.id ? 'text-primary' : 
                currentStep > step.id ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                currentStep === step.id ? 'bg-primary text-primary-foreground' :
                currentStep > step.id ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <span>{step.id}</span>
              </div>
              <div className="text-xs text-center px-1">{step.name}</div>
              {step.id < STEPS.length && (
                <div className={`hidden md:block w-full h-0.5 mt-4 ${
                  currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Validation Messages */}
      {hasValidationErrors && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <div>
            <h4 className="font-medium mb-2">Please fix the following issues:</h4>
            <ul className="list-disc list-inside space-y-1">
              {currentValidation.errors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Warning Messages */}
      {currentValidation && currentValidation.warnings.length > 0 && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <div>
            <h4 className="font-medium mb-2">Warnings:</h4>
            <ul className="list-disc list-inside space-y-1">
              {currentValidation.warnings.map((warning, index) => (
                <li key={index} className="text-sm">{warning}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Success Messages */}
      {currentValidation && currentValidation.isValid && currentValidation.warnings.length === 0 && attemptedNavigation && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <div className="text-green-800">
            <h4 className="font-medium">Step completed successfully!</h4>
            <p className="text-sm">All required information has been provided.</p>
          </div>
        </Alert>
      )}

      {/* Current step content */}
      <div className="bg-card rounded-lg border p-3 sm:p-6">
        <CurrentStepComponent
          data={flowData}
          onUpdate={handleUpdate}
          onNext={handleNext}
          onBack={handleBack}
        />
      </div>
    </div>
  );
} 