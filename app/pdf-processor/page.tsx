// PDF Processor page
// Standalone page for PDF processing and analysis

import { Suspense } from "react";
import { PDFProcessor } from "@/components/pdf/pdf-processor";
import { PageLoader } from "@/components/ui/loading/page-loader";

export default function PDFProcessorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<PageLoader />}>
        <PDFProcessor />
      </Suspense>
    </div>
  );
}

export const metadata = {
  title: "PDF Processor | EstimatePro",
  description:
    "Extract text, images, and measurements from PDF documents with AI-powered analysis",
};
