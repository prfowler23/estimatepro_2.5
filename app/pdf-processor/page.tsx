// PDF Processor page
// Standalone page for PDF processing and analysis

import { Suspense } from "react";
import { LazyPDFProcessor } from "@/components/lazy-loading/dashboard-lazy";
import { PageLoader } from "@/components/ui/loading/page-loader";

export default function PDFProcessorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<PageLoader />}>
        <LazyPDFProcessor />
      </Suspense>
    </div>
  );
}

export const metadata = {
  title: "PDF Processor | EstimatePro",
  description:
    "Extract text, images, and measurements from PDF documents with AI-powered analysis",
};
