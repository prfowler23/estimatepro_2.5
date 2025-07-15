import React, { lazy } from 'react';
import { 
  ChartLoading, 
  PDFLoading, 
  AnalysisLoading, 
  ImageLoading 
} from '@/components/ui/loading/lazy-loading';

// Lazy load heavy chart components
export const LazyRechartsChart = lazy(() => 
  import('recharts').then(module => ({
    default: module.LineChart
  }))
);

export const LazyBarChart = lazy(() => 
  import('recharts').then(module => ({
    default: module.BarChart
  }))
);

export const LazyPieChart = lazy(() => 
  import('recharts').then(module => ({
    default: module.PieChart
  }))
);

// Lazy load PDF generation components
// export const LazyPDFGenerator = lazy(() => 
//   import('@/lib/pdf/generator').then(module => ({
//     default: module.generatePDF
//   }))
// );

export const LazyReactPDF = lazy(() => 
  import('@react-pdf/renderer').then(module => ({
    default: module.Document
  }))
);

// Lazy load image processing components
// export const LazyHtml2Canvas = lazy(() => 
//   import('html2canvas').then(module => ({
//     default: module.default
//   }))
// );

// Lazy load Excel export
// export const LazyXLSX = lazy(() => 
//   import('xlsx').then(module => ({
//     default: module
//   }))
// );

// Lazy load Quill editor
// export const LazyQuillEditor = lazy(() => 
//   import('quill').then(module => ({
//     default: module.default
//   }))
// );

// Lazy load guided flow components
export const LazyGuidedFlow = lazy(() => 
  import('@/components/estimation/guided-flow').then(module => ({
    default: module.GuidedEstimationFlow
  }))
);

// Lazy load canvas components
export const LazyDrawingCanvas = lazy(() => 
  import('@/components/canvas/DrawingCanvas').then(module => ({
    default: module.DrawingCanvas
  }))
);

// Lazy load analytics components
export const LazyAnalytics = lazy(() => 
  import('@/components/analytics/analytics-overview').then(module => ({
    default: module.AnalyticsOverview
  }))
);

// Wrapper components with proper suspense
export const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<ChartLoading />}>
    {children}
  </React.Suspense>
);

export const PDFWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<PDFLoading />}>
    {children}
  </React.Suspense>
);

export const AnalysisWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<AnalysisLoading />}>
    {children}
  </React.Suspense>
);

export const ImageWrapper = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<ImageLoading />}>
    {children}
  </React.Suspense>
);