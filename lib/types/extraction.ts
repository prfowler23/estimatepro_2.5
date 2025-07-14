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
    requestedDate: string;
    deadline: string;
    urgency: 'urgent' | 'flexible' | 'normal';
    flexibility: 'some' | 'flexible' | 'none';
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