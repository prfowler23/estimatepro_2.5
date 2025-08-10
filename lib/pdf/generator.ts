import jsPDF from "jspdf";
import "jspdf-autotable";
import { SERVICE_TYPES } from "@/lib/calculations/constants";
import {
  EstimateData,
  EstimateService,
  PDFErrorCode,
  PDFProcessingError,
} from "./types";
import { PDF_GENERATION, PDF_ERRORS } from "./constants";

// Add proper types for jsPDF autotable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

/**
 * EstimatePDFGenerator - Generates professional PDF estimates for building services
 * @class
 */
export class EstimatePDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private margin: number;
  private currentY: number;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.margin = PDF_GENERATION.PAGE.MARGIN;
    this.currentY = this.margin;
  }

  /**
   * Adds company header with logo and contact information
   * @private
   */
  private addHeader(): void {
    const { COLORS, COMPANY, LOGO, FONTS } = PDF_GENERATION;

    // Company Logo Area (placeholder)
    this.doc.setFillColor(COLORS.PRIMARY.r, COLORS.PRIMARY.g, COLORS.PRIMARY.b);
    this.doc.rect(this.margin, this.currentY, LOGO.WIDTH, LOGO.HEIGHT, "F");

    // Company Name in Logo Area
    this.doc.setTextColor(COLORS.WHITE.r, COLORS.WHITE.g, COLORS.WHITE.b);
    this.doc.setFontSize(FONTS.LARGE);
    this.doc.setFont(undefined, "bold");
    this.doc.text(
      COMPANY.NAME,
      this.margin + LOGO.TEXT_OFFSET_X,
      this.currentY + LOGO.TEXT_OFFSET_Y_PRIMARY,
    );
    this.doc.setFontSize(FONTS.SMALL);
    this.doc.setFont(undefined, "normal");
    this.doc.text(
      COMPANY.TAGLINE,
      this.margin + LOGO.TEXT_OFFSET_X,
      this.currentY + LOGO.TEXT_OFFSET_Y_SECONDARY,
    );
    this.doc.text(
      COMPANY.SUBTITLE,
      this.margin + LOGO.TEXT_OFFSET_X,
      this.currentY + LOGO.TEXT_OFFSET_Y_TERTIARY,
    );

    // Company Contact Info
    this.doc.setTextColor(COLORS.BLACK.r, COLORS.BLACK.g, COLORS.BLACK.b);
    this.doc.setFontSize(FONTS.SMALL);
    this.doc.setFont(undefined, "normal");
    const contactInfo = [
      COMPANY.FULL_NAME,
      `Phone: ${COMPANY.PHONE}`,
      `Email: ${COMPANY.EMAIL}`,
      COMPANY.WEBSITE,
    ];

    contactInfo.forEach((line, index) => {
      this.doc.text(
        line,
        this.pageWidth - this.margin - 50,
        this.currentY +
          PDF_GENERATION.SPACING.SMALL_GAP +
          index * PDF_GENERATION.SPACING.LINE_HEIGHT,
      );
    });

    this.currentY += PDF_GENERATION.SPACING.HEADER_HEIGHT;
  }

  /**
   * Adds estimate header with title and metadata
   * @private
   */
  private addEstimateHeader(estimate: EstimateData): void {
    const { COLORS, FONTS, DOCUMENT, SPACING } = PDF_GENERATION;

    // Estimate Title
    this.doc.setFontSize(FONTS.TITLE);
    this.doc.setFont(undefined, "bold");
    this.doc.setTextColor(COLORS.PRIMARY.r, COLORS.PRIMARY.g, COLORS.PRIMARY.b);
    this.doc.text(DOCUMENT.ESTIMATE_TITLE, this.margin, this.currentY);

    // Estimate Number
    this.doc.setFontSize(FONTS.NORMAL);
    this.doc.setTextColor(COLORS.BLACK.r, COLORS.BLACK.g, COLORS.BLACK.b);
    this.doc.setFont(undefined, "normal");
    this.doc.text(
      `Estimate #: ${estimate.estimate_number}`,
      this.pageWidth - this.margin - 60,
      this.currentY - 5,
    );
    this.doc.text(
      `Date: ${new Date(estimate.created_at).toLocaleDateString()}`,
      this.pageWidth - this.margin - 60,
      this.currentY + 2,
    );
    this.doc.text(
      `Status: ${estimate.status.toUpperCase()}`,
      this.pageWidth - this.margin - 60,
      this.currentY + 9,
    );

    this.currentY += SPACING.SECTION_GAP;
  }

  /**
   * Adds customer and building information in two columns
   * @private
   */
  private addCustomerInfo(estimate: EstimateData): void {
    const { COLORS, FONTS, DOCUMENT, SPACING } = PDF_GENERATION;
    const leftColumn = this.margin;
    const rightColumn = this.pageWidth / 2 + 10;

    // Bill To Section
    this.doc.setFontSize(FONTS.SECTION_HEADER);
    this.doc.setFont(undefined, "bold");
    this.doc.setTextColor(COLORS.PRIMARY.r, COLORS.PRIMARY.g, COLORS.PRIMARY.b);
    this.doc.text(DOCUMENT.BILL_TO_LABEL, leftColumn, this.currentY);

    this.doc.setFontSize(FONTS.BODY);
    this.doc.setFont(undefined, "normal");
    this.doc.setTextColor(COLORS.BLACK.r, COLORS.BLACK.g, COLORS.BLACK.b);

    const customerLines = [
      estimate.customer_name,
      estimate.company_name || "",
      estimate.customer_email,
      estimate.customer_phone || "",
    ].filter(Boolean);

    customerLines.forEach((line, index) => {
      this.doc.text(
        line,
        leftColumn,
        this.currentY + SPACING.SMALL_GAP + index * SPACING.LINE_SPACING,
      );
    });

    // Building Info Section
    this.doc.setFontSize(FONTS.SECTION_HEADER);
    this.doc.setFont(undefined, "bold");
    this.doc.setTextColor(COLORS.PRIMARY.r, COLORS.PRIMARY.g, COLORS.PRIMARY.b);
    this.doc.text(DOCUMENT.PROJECT_LOCATION_LABEL, rightColumn, this.currentY);

    this.doc.setFontSize(FONTS.BODY);
    this.doc.setFont(undefined, "normal");
    this.doc.setTextColor(COLORS.BLACK.r, COLORS.BLACK.g, COLORS.BLACK.b);

    const buildingLines = [
      estimate.building_name,
      estimate.building_address,
      `${estimate.building_height_stories} stories`,
      estimate.building_height_feet
        ? `${estimate.building_height_feet} feet`
        : "",
      estimate.building_type ? `Type: ${estimate.building_type}` : "",
    ].filter(Boolean);

    buildingLines.forEach((line, index) => {
      this.doc.text(
        line,
        rightColumn,
        this.currentY + SPACING.SMALL_GAP + index * SPACING.LINE_SPACING,
      );
    });

    this.currentY +=
      Math.max(customerLines.length, buildingLines.length) *
        SPACING.LINE_SPACING +
      SPACING.SECTION_GAP;
  }

  /**
   * Adds services table with detailed breakdown
   * @private
   */
  private addServicesTable(estimate: EstimateData): void {
    const { COLORS, FONTS, DOCUMENT, SPACING, TABLE } = PDF_GENERATION;

    // Services Header
    this.doc.setFontSize(FONTS.SECTION_HEADER);
    this.doc.setFont(undefined, "bold");
    this.doc.setTextColor(COLORS.PRIMARY.r, COLORS.PRIMARY.g, COLORS.PRIMARY.b);
    this.doc.text(
      DOCUMENT.SERVICES_BREAKDOWN_LABEL,
      this.margin,
      this.currentY,
    );
    this.currentY += SPACING.MEDIUM_GAP;

    // Prepare table data
    const tableData = estimate.services.map((service) => {
      const serviceName =
        SERVICE_TYPES[service.service_type as keyof typeof SERVICE_TYPES] ||
        service.service_type;

      let areaDescription = "";
      if (service.area_sqft && service.area_sqft > 0) {
        areaDescription += `${service.area_sqft.toLocaleString()} sq ft`;
      }
      if (service.glass_sqft && service.glass_sqft > 0) {
        if (areaDescription) areaDescription += "\n";
        areaDescription += `${service.glass_sqft.toLocaleString()} sq ft glass`;
      }

      const laborDescription =
        `${service.total_hours.toFixed(1)} hrs total\n` +
        `(${service.labor_hours.toFixed(1)} labor + ${service.setup_hours.toFixed(1)} setup` +
        `${service.rig_hours && service.rig_hours > 0 ? ` + ${service.rig_hours.toFixed(1)} rig` : ""})`;

      const equipmentDescription = service.equipment_type || "None";

      return [
        serviceName,
        areaDescription,
        laborDescription,
        `${service.crew_size} people`,
        equipmentDescription,
        `$${service.price.toLocaleString()}`,
      ];
    });

    // Add table
    this.doc.autoTable({
      startY: this.currentY,
      head: [
        ["Service", "Area/Units", "Labor Hours", "Crew", "Equipment", "Price"],
      ],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [COLORS.PRIMARY.r, COLORS.PRIMARY.g, COLORS.PRIMARY.b],
        textColor: [COLORS.WHITE.r, COLORS.WHITE.g, COLORS.WHITE.b],
        fontStyle: "bold",
        fontSize: FONTS.SMALL,
      },
      bodyStyles: {
        fontSize: FONTS.FINE_PRINT,
        cellPadding: TABLE.CELL_PADDING,
      },
      columnStyles: {
        0: { cellWidth: TABLE.COLUMNS.SERVICE.width },
        1: { cellWidth: TABLE.COLUMNS.AREA.width },
        2: { cellWidth: TABLE.COLUMNS.HOURS.width },
        3: { cellWidth: TABLE.COLUMNS.CREW.width },
        4: { cellWidth: TABLE.COLUMNS.EQUIPMENT.width },
        5: {
          cellWidth: TABLE.COLUMNS.PRICE.width,
          halign: TABLE.COLUMNS.PRICE.align,
        },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = this.doc.lastAutoTable.finalY + SPACING.MEDIUM_GAP;
  }

  /**
   * Adds pricing totals section
   * @private
   */
  private addTotals(estimate: EstimateData): void {
    const { COLORS, FONTS, SPACING } = PDF_GENERATION;
    const totalEquipmentCost = estimate.services.reduce(
      (sum, service) => sum + (service.equipment_cost || 0),
      0,
    );

    const rightAlign = this.pageWidth - this.margin - 60;
    const valueAlign = this.pageWidth - this.margin - 10;

    // Subtotal
    this.doc.setFontSize(FONTS.BODY);
    this.doc.setFont(undefined, "normal");
    this.doc.text("Services Subtotal:", rightAlign, this.currentY);
    this.doc.text(
      `$${estimate.total_price.toLocaleString()}`,
      valueAlign,
      this.currentY,
      { align: "right" },
    );
    this.currentY += SPACING.SMALL_GAP;

    // Equipment if any
    if (totalEquipmentCost > 0) {
      this.doc.text("Equipment Rental:", rightAlign, this.currentY);
      this.doc.text(
        `$${totalEquipmentCost.toLocaleString()}`,
        valueAlign,
        this.currentY,
        { align: "right" },
      );
      this.currentY += SPACING.SMALL_GAP;
    }

    // Line
    this.doc.setLineWidth(0.5);
    this.doc.line(
      rightAlign,
      this.currentY,
      this.pageWidth - this.margin,
      this.currentY,
    );
    this.currentY += SPACING.SMALL_GAP;

    // Total
    this.doc.setFontSize(FONTS.SECTION_HEADER);
    this.doc.setFont(undefined, "bold");
    this.doc.setTextColor(COLORS.PRIMARY.r, COLORS.PRIMARY.g, COLORS.PRIMARY.b);
    this.doc.text("TOTAL:", rightAlign, this.currentY);
    this.doc.text(
      `$${(estimate.total_price + totalEquipmentCost).toLocaleString()}`,
      valueAlign,
      this.currentY,
      { align: "right" },
    );
    this.currentY += SPACING.LARGE_GAP;
  }

  /**
   * Adds notes section if notes exist
   * @private
   */
  private addNotes(estimate: EstimateData): void {
    if (!estimate.notes) return;

    const { COLORS, FONTS, DOCUMENT, SPACING } = PDF_GENERATION;

    this.doc.setFontSize(FONTS.SECTION_HEADER);
    this.doc.setFont(undefined, "bold");
    this.doc.setTextColor(COLORS.PRIMARY.r, COLORS.PRIMARY.g, COLORS.PRIMARY.b);
    this.doc.text(DOCUMENT.NOTES_LABEL, this.margin, this.currentY);
    this.currentY += SPACING.SMALL_GAP;

    this.doc.setFontSize(FONTS.SMALL);
    this.doc.setFont(undefined, "normal");
    this.doc.setTextColor(COLORS.BLACK.r, COLORS.BLACK.g, COLORS.BLACK.b);

    // Split notes into lines that fit the page width
    const maxWidth = this.pageWidth - this.margin * 2;
    const noteLines = this.doc.splitTextToSize(estimate.notes, maxWidth);

    noteLines.forEach((line: string) => {
      this.doc.text(line, this.margin, this.currentY);
      this.currentY += SPACING.LINE_HEIGHT;
    });

    this.currentY += SPACING.MEDIUM_GAP;
  }

  /**
   * Adds terms and conditions section
   * @private
   */
  private addTerms(): void {
    const { COLORS, FONTS, DOCUMENT, SPACING, TERMS } = PDF_GENERATION;

    this.doc.setFontSize(FONTS.SECTION_HEADER);
    this.doc.setFont(undefined, "bold");
    this.doc.setTextColor(COLORS.PRIMARY.r, COLORS.PRIMARY.g, COLORS.PRIMARY.b);
    this.doc.text(DOCUMENT.TERMS_LABEL, this.margin, this.currentY);
    this.currentY += SPACING.SMALL_GAP;

    this.doc.setFontSize(FONTS.FINE_PRINT);
    this.doc.setFont(undefined, "normal");
    this.doc.setTextColor(COLORS.BLACK.r, COLORS.BLACK.g, COLORS.BLACK.b);

    TERMS.forEach((term) => {
      this.doc.text(term, this.margin, this.currentY);
      this.currentY += SPACING.LINE_HEIGHT;
    });

    this.currentY += SPACING.MEDIUM_GAP;
  }

  /**
   * Adds footer with signature area and contact information
   * @private
   */
  private addFooter(): void {
    const { COLORS, FONTS, DOCUMENT, COMPANY } = PDF_GENERATION;
    const pageHeight = this.doc.internal.pageSize.getHeight();
    const footerY = pageHeight - PDF_GENERATION.PAGE.FOOTER_HEIGHT;

    // Signature area
    this.doc.setFontSize(FONTS.SMALL);
    this.doc.setFont(undefined, "normal");
    this.doc.text(DOCUMENT.CUSTOMER_APPROVAL_LABEL, this.margin, footerY);
    this.doc.line(this.margin + 35, footerY, this.margin + 100, footerY);
    this.doc.text(DOCUMENT.DATE_LABEL, this.margin + 110, footerY);
    this.doc.line(this.margin + 125, footerY, this.margin + 170, footerY);

    // Contact info
    this.doc.setFontSize(FONTS.FOOTER);
    this.doc.setTextColor(COLORS.GRAY.r, COLORS.GRAY.g, COLORS.GRAY.b);
    this.doc.text(
      `Questions? Contact us at ${COMPANY.EMAIL} or ${COMPANY.PHONE}`,
      this.pageWidth / 2,
      pageHeight - 15,
      { align: "center" },
    );
  }

  /**
   * Generates a complete estimate PDF
   * @param estimate - The estimate data to generate PDF from
   * @returns The generated jsPDF document
   * @throws {PDFProcessingError} If PDF generation fails
   */
  public generateEstimatePDF(estimate: EstimateData): jsPDF {
    try {
      // Validate estimate data
      if (!estimate) {
        throw new PDFProcessingError(
          PDF_ERRORS.INVALID_ESTIMATE_DATA,
          PDFErrorCode.GENERATION_FAILED,
        );
      }

      if (!estimate.services || estimate.services.length === 0) {
        throw new PDFProcessingError(
          PDF_ERRORS.NO_SERVICES,
          PDFErrorCode.GENERATION_FAILED,
        );
      }

      this.addHeader();
      this.addEstimateHeader(estimate);
      this.addCustomerInfo(estimate);
      this.addServicesTable(estimate);
      this.addTotals(estimate);
      this.addNotes(estimate);
      this.addTerms();
      this.addFooter();

      return this.doc;
    } catch (error) {
      if (error instanceof PDFProcessingError) {
        throw error;
      }
      throw new PDFProcessingError(
        PDF_ERRORS.GENERATION_FAILED,
        PDFErrorCode.GENERATION_FAILED,
        error,
      );
    }
  }

  /**
   * Downloads an estimate PDF to the user's device
   * @param estimate - The estimate data to generate PDF from
   * @throws {PDFProcessingError} If PDF generation or download fails
   */
  public static async downloadEstimatePDF(
    estimate: EstimateData,
  ): Promise<void> {
    try {
      const generator = new EstimatePDFGenerator();
      const pdf = generator.generateEstimatePDF(estimate);

      const safeEstimateNumber = estimate.estimate_number.replace(
        /[^a-zA-Z0-9]/g,
        "_",
      );
      const filename = `Estimate_${safeEstimateNumber}.pdf`;

      if (filename.length > PDF_GENERATION.VALIDATION.MAX_FILENAME_LENGTH) {
        throw new PDFProcessingError(
          "Filename too long",
          PDFErrorCode.GENERATION_FAILED,
        );
      }

      pdf.save(filename);
    } catch (error) {
      if (error instanceof PDFProcessingError) {
        throw error;
      }
      throw new PDFProcessingError(
        PDF_ERRORS.GENERATION_FAILED,
        PDFErrorCode.GENERATION_FAILED,
        error,
      );
    }
  }

  /**
   * Generates an estimate PDF and returns it as a Blob
   * @param estimate - The estimate data to generate PDF from
   * @returns A Blob containing the PDF data
   * @throws {PDFProcessingError} If PDF generation fails
   */
  public static async getEstimatePDFBlob(
    estimate: EstimateData,
  ): Promise<Blob> {
    try {
      const generator = new EstimatePDFGenerator();
      const pdf = generator.generateEstimatePDF(estimate);

      return pdf.output("blob");
    } catch (error) {
      if (error instanceof PDFProcessingError) {
        throw error;
      }
      throw new PDFProcessingError(
        PDF_ERRORS.GENERATION_FAILED,
        PDFErrorCode.GENERATION_FAILED,
        error,
      );
    }
  }
}

// Backward compatibility exports
export class QuotePDFGenerator extends EstimatePDFGenerator {
  public static async downloadQuotePDF(quote: EstimateData): Promise<void> {
    return EstimatePDFGenerator.downloadEstimatePDF(quote);
  }
}
export type QuoteData = EstimateData;
export type QuoteService = EstimateService;
