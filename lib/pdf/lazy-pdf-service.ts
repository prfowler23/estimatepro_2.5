// Lazy-loaded PDF generation service
export class LazyPDFService {
  private static pdfGenerator: any = null;

  static async generateEstimatePDF(estimateData: any): Promise<Blob> {
    // Lazy load the PDF generator only when needed
    if (!this.pdfGenerator) {
      const { EstimatePDFGenerator } = await import("./generator");
      this.pdfGenerator = EstimatePDFGenerator;
    }

    const generator = new this.pdfGenerator();
    return generator.generate(estimateData);
  }

  static async generateQuotePDF(quoteData: any): Promise<Blob> {
    // Lazy load jsPDF directly for simple quotes
    const jsPDF = (await import("jspdf")).default;
    await import("jspdf-autotable");

    const doc = new jsPDF();

    // Simple quote generation logic
    doc.setFontSize(20);
    doc.text("Quote", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);

    // Add quote details
    if (quoteData.customer_name) {
      doc.text(`Customer: ${quoteData.customer_name}`, 20, 40);
    }

    if (quoteData.total_amount) {
      doc.text(`Total: $${quoteData.total_amount.toFixed(2)}`, 20, 50);
    }

    return doc.output("blob");
  }

  static async preloadPDFLibraries(): Promise<void> {
    // Preload PDF libraries in the background
    await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
      import("./generator"),
    ]);
  }
}
