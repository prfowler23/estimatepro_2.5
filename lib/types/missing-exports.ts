// Missing type exports to fix TypeScript errors

export type StatusValue =
  | "draft"
  | "review"
  | "approved"
  | "sent"
  | "accepted"
  | "completed"
  | "cancelled";

export interface PhotoData {
  id: string;
  image_url: string | null;
  analysis_type: string;
  analysis_data: Record<string, any>;
  confidence_score: number | null;
  created_at: string | null;
  quote_id: string | null;
}

export interface PhotoAnalysisData {
  id: string;
  photo_id: string;
  analysis_type: string;
  analysis_data: Record<string, any>;
  confidence_score: number | null;
  processed_at: string;
  created_at: string | null;
}
