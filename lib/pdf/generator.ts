import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { SERVICE_TYPES } from '@/lib/calculations/constants'

interface QuoteData {
  id: string
  quote_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  company_name?: string
  building_name: string
  building_address: string
  building_height_stories: number
  building_height_feet?: number
  building_type?: string
  total_price: number
  status: string
  notes?: string
  created_at: string
  services: QuoteService[]
}

interface QuoteService {
  service_type: string
  area_sqft: number
  glass_sqft?: number
  price: number
  labor_hours: number
  setup_hours: number
  rig_hours: number
  total_hours: number
  crew_size: number
  equipment_type?: string
  equipment_days?: number
  equipment_cost?: number
  calculation_details?: any
}

export class QuotePDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private margin: number
  private currentY: number

  constructor() {
    this.doc = new jsPDF()
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.margin = 20
    this.currentY = this.margin
  }

  private addHeader() {
    // Company Logo Area (placeholder)
    this.doc.setFillColor(59, 130, 246) // Blue color
    this.doc.rect(this.margin, this.currentY, 60, 30, 'F')
    
    // Company Name in Logo Area
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(16)
    this.doc.setFont(undefined, 'bold')
    this.doc.text('EstimatePro', this.margin + 5, this.currentY + 12)
    this.doc.setFontSize(10)
    this.doc.setFont(undefined, 'normal')
    this.doc.text('Building Services', this.margin + 5, this.currentY + 20)
    this.doc.text('Estimation', this.margin + 5, this.currentY + 26)

    // Company Contact Info
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFontSize(10)
    this.doc.setFont(undefined, 'normal')
    const contactInfo = [
      'Professional Building Services',
      'Phone: (555) 123-4567',
      'Email: quotes@estimatepro.com',
      'www.estimatepro.com'
    ]
    
    contactInfo.forEach((line, index) => {
      this.doc.text(line, this.pageWidth - this.margin - 50, this.currentY + 8 + (index * 5))
    })

    this.currentY += 40
  }

  private addQuoteHeader(quote: QuoteData) {
    // Quote Title
    this.doc.setFontSize(24)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(59, 130, 246)
    this.doc.text('QUOTE', this.margin, this.currentY)
    
    // Quote Number
    this.doc.setFontSize(12)
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFont(undefined, 'normal')
    this.doc.text(`Quote #: ${quote.quote_number}`, this.pageWidth - this.margin - 60, this.currentY - 5)
    this.doc.text(`Date: ${new Date(quote.created_at).toLocaleDateString()}`, this.pageWidth - this.margin - 60, this.currentY + 2)
    this.doc.text(`Status: ${quote.status.toUpperCase()}`, this.pageWidth - this.margin - 60, this.currentY + 9)

    this.currentY += 20
  }

  private addCustomerInfo(quote: QuoteData) {
    const leftColumn = this.margin
    const rightColumn = this.pageWidth / 2 + 10

    // Bill To Section
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(59, 130, 246)
    this.doc.text('BILL TO:', leftColumn, this.currentY)
    
    this.doc.setFontSize(11)
    this.doc.setFont(undefined, 'normal')
    this.doc.setTextColor(0, 0, 0)
    
    const customerLines = [
      quote.customer_name,
      quote.company_name || '',
      quote.customer_email,
      quote.customer_phone
    ].filter(Boolean)

    customerLines.forEach((line, index) => {
      this.doc.text(line, leftColumn, this.currentY + 8 + (index * 6))
    })

    // Building Info Section
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(59, 130, 246)
    this.doc.text('PROJECT LOCATION:', rightColumn, this.currentY)
    
    this.doc.setFontSize(11)
    this.doc.setFont(undefined, 'normal')
    this.doc.setTextColor(0, 0, 0)
    
    const buildingLines = [
      quote.building_name,
      quote.building_address,
      `${quote.building_height_stories} stories`,
      quote.building_height_feet ? `${quote.building_height_feet} feet` : '',
      quote.building_type ? `Type: ${quote.building_type}` : ''
    ].filter(Boolean)

    buildingLines.forEach((line, index) => {
      this.doc.text(line, rightColumn, this.currentY + 8 + (index * 6))
    })

    this.currentY += Math.max(customerLines.length, buildingLines.length) * 6 + 20
  }

  private addServicesTable(quote: QuoteData) {
    // Services Header
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(59, 130, 246)
    this.doc.text('SERVICES BREAKDOWN', this.margin, this.currentY)
    this.currentY += 10

    // Prepare table data
    const tableData = quote.services.map(service => {
      const serviceName = SERVICE_TYPES[service.service_type as keyof typeof SERVICE_TYPES] || service.service_type
      
      let areaDescription = ''
      if (service.area_sqft > 0) {
        areaDescription += `${service.area_sqft.toLocaleString()} sq ft`
      }
      if (service.glass_sqft && service.glass_sqft > 0) {
        if (areaDescription) areaDescription += '\n'
        areaDescription += `${service.glass_sqft.toLocaleString()} sq ft glass`
      }

      const laborDescription = `${service.total_hours.toFixed(1)} hrs total\n` +
                             `(${service.labor_hours.toFixed(1)} labor + ${service.setup_hours.toFixed(1)} setup` +
                             `${service.rig_hours > 0 ? ` + ${service.rig_hours.toFixed(1)} rig` : ''})`

      const equipmentDescription = service.equipment_type || 'None'

      return [
        serviceName,
        areaDescription,
        laborDescription,
        `${service.crew_size} people`,
        equipmentDescription,
        `$${service.price.toLocaleString()}`
      ]
    })

    // Add table
    ;(this.doc as any).autoTable({
      startY: this.currentY,
      head: [['Service', 'Area/Units', 'Labor Hours', 'Crew', 'Equipment', 'Price']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 35 }, // Service
        1: { cellWidth: 30 }, // Area
        2: { cellWidth: 30 }, // Hours
        3: { cellWidth: 20 }, // Crew
        4: { cellWidth: 30 }, // Equipment
        5: { cellWidth: 25, halign: 'right' } // Price
      },
      margin: { left: this.margin, right: this.margin }
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addTotals(quote: QuoteData) {
    const totalEquipmentCost = quote.services.reduce((sum, service) => 
      sum + (service.equipment_cost || 0), 0
    )

    const rightAlign = this.pageWidth - this.margin - 60
    const valueAlign = this.pageWidth - this.margin - 10

    // Subtotal
    this.doc.setFontSize(11)
    this.doc.setFont(undefined, 'normal')
    this.doc.text('Services Subtotal:', rightAlign, this.currentY)
    this.doc.text(`$${quote.total_price.toLocaleString()}`, valueAlign, this.currentY, { align: 'right' })
    this.currentY += 8

    // Equipment if any
    if (totalEquipmentCost > 0) {
      this.doc.text('Equipment Rental:', rightAlign, this.currentY)
      this.doc.text(`$${totalEquipmentCost.toLocaleString()}`, valueAlign, this.currentY, { align: 'right' })
      this.currentY += 8
    }

    // Line
    this.doc.setLineWidth(0.5)
    this.doc.line(rightAlign, this.currentY, this.pageWidth - this.margin, this.currentY)
    this.currentY += 8

    // Total
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(59, 130, 246)
    this.doc.text('TOTAL:', rightAlign, this.currentY)
    this.doc.text(`$${(quote.total_price + totalEquipmentCost).toLocaleString()}`, valueAlign, this.currentY, { align: 'right' })
    this.currentY += 15
  }

  private addNotes(quote: QuoteData) {
    if (!quote.notes) return

    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(59, 130, 246)
    this.doc.text('NOTES:', this.margin, this.currentY)
    this.currentY += 8

    this.doc.setFontSize(10)
    this.doc.setFont(undefined, 'normal')
    this.doc.setTextColor(0, 0, 0)
    
    // Split notes into lines that fit the page width
    const maxWidth = this.pageWidth - (this.margin * 2)
    const noteLines = this.doc.splitTextToSize(quote.notes, maxWidth)
    
    noteLines.forEach((line: string) => {
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += 5
    })

    this.currentY += 10
  }

  private addTerms() {
    this.doc.setFontSize(14)
    this.doc.setFont(undefined, 'bold')
    this.doc.setTextColor(59, 130, 246)
    this.doc.text('TERMS & CONDITIONS:', this.margin, this.currentY)
    this.currentY += 8

    const terms = [
      '• Quote valid for 30 days from date issued',
      '• Payment terms: Net 30 days',
      '• All work performed during normal business hours unless otherwise specified',
      '• Additional charges may apply for work outside normal scope',
      '• Customer responsible for providing safe access to work areas',
      '• Weather delays may affect project timeline',
      '• Final pricing subject to site inspection and access verification'
    ]

    this.doc.setFontSize(9)
    this.doc.setFont(undefined, 'normal')
    this.doc.setTextColor(0, 0, 0)

    terms.forEach(term => {
      this.doc.text(term, this.margin, this.currentY)
      this.currentY += 5
    })

    this.currentY += 10
  }

  private addFooter() {
    const pageHeight = this.doc.internal.pageSize.getHeight()
    const footerY = pageHeight - 30

    // Signature area
    this.doc.setFontSize(10)
    this.doc.setFont(undefined, 'normal')
    this.doc.text('Customer Approval:', this.margin, footerY)
    this.doc.line(this.margin + 35, footerY, this.margin + 100, footerY)
    this.doc.text('Date:', this.margin + 110, footerY)
    this.doc.line(this.margin + 125, footerY, this.margin + 170, footerY)

    // Contact info
    this.doc.setFontSize(8)
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(
      'Questions? Contact us at quotes@estimatepro.com or (555) 123-4567',
      this.pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    )
  }

  public generateQuotePDF(quote: QuoteData): jsPDF {
    this.addHeader()
    this.addQuoteHeader(quote)
    this.addCustomerInfo(quote)
    this.addServicesTable(quote)
    this.addTotals(quote)
    this.addNotes(quote)
    this.addTerms()
    this.addFooter()

    return this.doc
  }

  public static async downloadQuotePDF(quote: QuoteData): Promise<void> {
    const generator = new QuotePDFGenerator()
    const pdf = generator.generateQuotePDF(quote)
    
    const filename = `Quote_${quote.quote_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    pdf.save(filename)
  }

  public static async getQuotePDFBlob(quote: QuoteData): Promise<Blob> {
    const generator = new QuotePDFGenerator()
    const pdf = generator.generateQuotePDF(quote)
    
    return pdf.output('blob')
  }
}