import React, { lazy } from 'react';
import { CalculatorLoading } from '@/components/ui/loading/lazy-loading';

// Lazy load calculator forms to reduce initial bundle size
export const LazyGlassRestorationForm = lazy(() => 
  import('./forms/glass-restoration-form').then(module => ({ 
    default: module.GlassRestorationForm 
  }))
);

export const LazyWindowCleaningForm = lazy(() => 
  import('./forms/window-cleaning-form').then(module => ({ 
    default: module.WindowCleaningForm 
  }))
);

export const LazyPressureWashingForm = lazy(() => 
  import('./forms/pressure-washing-form').then(module => ({ 
    default: module.PressureWashingForm 
  }))
);

export const LazyPressureWashSealForm = lazy(() => 
  import('./forms/pressure-wash-seal-form').then(module => ({ 
    default: module.PressureWashSealForm 
  }))
);

export const LazyFinalCleanForm = lazy(() => 
  import('./forms/final-clean-form').then(module => ({ 
    default: module.FinalCleanForm 
  }))
);

export const LazyFrameRestorationForm = lazy(() => 
  import('./forms/frame-restoration-form').then(module => ({ 
    default: module.FrameRestorationForm 
  }))
);

export const LazyHighDustingForm = lazy(() => 
  import('./forms/high-dusting-form').then(module => ({ 
    default: module.HighDustingForm 
  }))
);

export const LazySoftWashingForm = lazy(() => 
  import('./forms/soft-washing-form').then(module => ({ 
    default: module.SoftWashingForm 
  }))
);

export const LazyParkingDeckForm = lazy(() => 
  import('./forms/parking-deck-form').then(module => ({ 
    default: module.ParkingDeckForm 
  }))
);

export const LazyGraniteReconditioningForm = lazy(() => 
  import('./forms/granite-reconditioning-form').then(module => ({ 
    default: module.GraniteReconditioningForm 
  }))
);

export const LazyBiofilmRemovalForm = lazy(() => 
  import('./forms/biofilm-removal-form').then(module => ({ 
    default: module.BiofilmRemovalForm 
  }))
);

// Form component wrapper with suspense
export const FormWrapper = ({ 
  children, 
  fallback = <CalculatorLoading /> 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  return (
    <div className="min-h-[400px]">
      <React.Suspense fallback={fallback}>
        {children}
      </React.Suspense>
    </div>
  );
};