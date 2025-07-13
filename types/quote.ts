export interface QuoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  unit: string
  discount: number
  tax: number
  total: number
}

export interface Quote {
  id: string
  quoteNumber: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  createdAt: Date
  updatedAt: Date
  validUntil: Date
  
  // Client information
  clientName: string
  clientEmail: string
  clientPhone: string
  clientCompany?: string
  clientAddress: string
  
  // Project details
  projectName: string
  projectAddress: string
  projectDescription: string
  
  // Quote items
  items: QuoteItem[]
  
  // Pricing
  subtotal: number
  discountAmount: number
  discountPercent: number
  taxAmount: number
  taxPercent: number
  total: number
  
  // Additional info
  notes?: string
  terms?: string
  paymentTerms?: string
}