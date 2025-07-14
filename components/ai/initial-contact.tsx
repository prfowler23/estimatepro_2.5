import { useState } from 'react';
import { Button, Textarea } from '@/components/ui';
import { extractFromEmail } from '@/lib/ai/extraction';
import { Mail, FileText, AlertCircle } from 'lucide-react';

interface Customer {
  name: string;
  company: string;
  email: string;
  phone: string;
  role: string;
}

interface Requirements {
  services: string[];
  buildingType: string;
  location: string;
  specialRequirements: string[];
}

interface Timeline {
  desiredStart: Date | null;
  deadline: Date | null;
  flexibility: 'urgent' | 'flexible' | 'normal';
}

interface Budget {
  stated: number | null;
  inferred: 'tight' | 'normal' | 'flexible' | null;
  constraints: string[];
}

interface DecisionMaker {
  name: string;
  role: string;
  influence: 'primary' | 'secondary';
}

interface ExtractedData {
  customer: Customer;
  requirements: Requirements;
  timeline: Timeline;
  budget: Budget;
  decisionMakers: DecisionMaker[];
  redFlags: string[];
  urgencyScore: number;
}

interface InitialContactData {
  contactMethod: 'email' | 'meeting' | 'phone' | 'walkin';
  originalContent: string;
  extractedData: ExtractedData | null;
}

interface InitialContactProps {
  data?: InitialContactData;
  onUpdate: (data: { initialContact: InitialContactData }) => void;
  onNext: () => void;
  onBack: () => void;
}

function detectRedFlags(data: ExtractedData): string[] {
  const flags: string[] = [];
  // Timeline red flags
  if (
    data.timeline?.flexibility === 'urgent' &&
    data.timeline?.desiredStart &&
    new Date(data.timeline.desiredStart) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ) {
    flags.push('⚠️ Extremely tight timeline - less than 7 days');
  }
  // Budget red flags
  if (data.budget?.inferred === 'tight') {
    flags.push('⚠️ Budget constraints detected');
  }
  // Service complexity
  if (
    data.requirements?.services?.includes('PWS') &&
    data.requirements?.services?.includes('GR') &&
    data.timeline?.flexibility === 'urgent'
  ) {
    flags.push('⚠️ Complex service bundle with tight timeline');
  }
  // Access issues
  if (
    data.requirements?.specialRequirements?.some(
      (req) =>
        req.toLowerCase().includes('restricted') ||
        req.toLowerCase().includes('limited access')
    )
  ) {
    flags.push('⚠️ Access restrictions mentioned');
  }
  return flags;
}

export function InitialContact({
  data,
  onUpdate,
  onNext,
  onBack,
}: InitialContactProps) {
  const [loading, setLoading] = useState(false);
  const [contactData, setContactData] = useState<InitialContactData>(
    data || {
      contactMethod: 'email',
      originalContent: '',
      extractedData: null,
    }
  );
  const [error, setError] = useState<string | null>(null);

  const handleEmailExtraction = async () => {
    if (!contactData.originalContent) return;
    setLoading(true);
    setError(null);
    try {
      const extracted = await extractFromEmail(contactData.originalContent);
      const redFlags = detectRedFlags(extracted);
      setContactData({
        ...contactData,
        extractedData: { ...extracted, redFlags },
      });
    } catch (error) {
      setError('Extraction failed. Please try again.');
      console.error('Extraction failed:', error);
    }
    setLoading(false);
  };

  const handleNext = () => {
    onUpdate({ initialContact: contactData });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Initial Contact</h2>
        <p className="text-gray-600">
          Start by entering the email thread, meeting notes, or details from your initial contact.
        </p>
      </div>

      {/* Contact Method Selection */}
      <div className="grid grid-cols-4 gap-4">
        {['email', 'meeting', 'phone', 'walkin'].map((method) => (
          <button
            key={method}
            onClick={() => setContactData({ ...contactData, contactMethod: method as InitialContactData['contactMethod'] })}
            className={`p-4 border rounded-lg capitalize ${
              contactData.contactMethod === method 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300'
            }`}
          >
            {method === 'email' && <Mail className="mx-auto mb-2" />}
            {method === 'meeting' && <FileText className="mx-auto mb-2" />}
            {method.replace('walkin', 'walk-in')}
          </button>
        ))}
      </div>

      {/* Content Input */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {contactData.contactMethod === 'email' 
            ? 'Paste Email Thread' 
            : 'Enter Details/Notes'}
        </label>
        <Textarea
          value={contactData.originalContent}
          onChange={(e) => setContactData({
            ...contactData,
            originalContent: e.target.value
          })}
          placeholder={
            contactData.contactMethod === 'email'
              ? 'Paste the entire email thread here...'
              : 'Enter meeting notes or conversation details...'
          }
          className="h-48"
        />
      </div>

      {/* AI Extraction Button */}
      <Button
        onClick={handleEmailExtraction}
        disabled={!contactData.originalContent || loading}
        className="w-full"
      >
        {loading ? 'Extracting Information...' : 'Extract Information with AI'}
      </Button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>
      )}

      {/* Extracted Data Display */}
      {contactData.extractedData && (
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <h3 className="font-semibold text-lg">Extracted Information</h3>
          {/* Customer Info */}
          <div>
            <h4 className="font-medium mb-2">Customer Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Name: {contactData.extractedData.customer.name}</div>
              <div>Company: {contactData.extractedData.customer.company}</div>
              <div>Email: {contactData.extractedData.customer.email}</div>
              <div>Phone: {contactData.extractedData.customer.phone}</div>
            </div>
          </div>
          {/* Requirements */}
          <div>
            <h4 className="font-medium mb-2">Requirements</h4>
            <div className="text-sm space-y-1">
              <div>Services: {contactData.extractedData.requirements.services.join(', ')}</div>
              <div>Building: {contactData.extractedData.requirements.buildingType}</div>
              <div>Location: {contactData.extractedData.requirements.location}</div>
            </div>
          </div>
          {/* Timeline */}
          <div>
            <h4 className="font-medium mb-2">Timeline</h4>
            <div className="text-sm">
              <div>Urgency: 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  contactData.extractedData.timeline.flexibility === 'urgent' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {contactData.extractedData.timeline.flexibility}
                </span>
              </div>
            </div>
          </div>
          {/* Red Flags */}
          {contactData.extractedData.redFlags.length > 0 && (
            <div className="bg-red-50 p-4 rounded">
              <h4 className="font-medium mb-2 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Attention Required
              </h4>
              <ul className="text-sm space-y-1">
                {contactData.extractedData.redFlags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} disabled>
          Back
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!contactData.extractedData}
        >
          Continue to Scope
        </Button>
      </div>
    </div>
  );
} 