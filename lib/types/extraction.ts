export interface ExtractedData {
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
    role: string;
  };
  requirements: {
    services: string[];
    buildingType: string;
    location: string;
    specialRequirements: string[];
  };
  timeline: {
    desiredStart: Date | null;
    deadline: Date | null;
    flexibility: 'urgent' | 'flexible' | 'normal';
  };
  budget: {
    stated: number | null;
    inferred: 'tight' | 'normal' | 'flexible' | null;
    constraints: string[];
  };
  decisionMakers: Array<{
    name: string;
    role: string;
    influence: 'primary' | 'secondary';
  }>;
  redFlags: string[];
  urgencyScore: number;
}