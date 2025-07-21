export interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  discount: number;
  tax: number;
  total: number;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  createdAt: Date;
  updatedAt: Date;
  validUntil: Date;

  // Client information
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany?: string;
  clientAddress: string;

  // Project details
  projectName: string;
  projectAddress: string;
  projectDescription: string;

  // Estimate items
  items: EstimateItem[];

  // Pricing
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  taxPercent: number;
  total: number;

  // Additional info
  notes?: string;
  terms?: string;
  paymentTerms?: string;
}
