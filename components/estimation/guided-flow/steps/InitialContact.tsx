import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Mail, FileText, AlertCircle, Phone, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface InitialContactData {
  contactMethod: 'email' | 'meeting' | 'phone' | 'walkin';
  originalContent: string;
  extractedData?: {
    customer: {
      name: string;
      company: string;
      email: string;
      phone: string;
      address: string;
    };
    requirements: {
      services: string[];
      buildingType: string;
      buildingSize: string;
      floors: number;
    };
    timeline: {
      requestedDate: string;
      flexibility: 'none' | 'some' | 'flexible';
      urgency: 'low' | 'medium' | 'high';
    };
    budget: {
      range: string;
      constraints: string[];
      approved: boolean;
    };
    decisionMakers: {
      primaryContact: string;
      approvers: string[];
      influencers: string[];
    };
    redFlags: string[];
    urgencyScore: number; // 1-10
  };
}

const CONTACT_METHODS = [
  { id: 'email', name: 'Email Thread', icon: Mail, description: 'Paste email conversation' },
  { id: 'meeting', name: 'Meeting Notes', icon: Users, description: 'Notes from meeting' },
  { id: 'phone', name: 'Phone Call', icon: Phone, description: 'Call summary notes' },
  { id: 'walkin', name: 'Walk-in', icon: MessageSquare, description: 'In-person discussion' }
];

interface InitialContactProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export function InitialContact({ data, onUpdate, onNext, onBack }: InitialContactProps) {
  const [contactData, setContactData] = useState<InitialContactData>({
    contactMethod: data?.initialContact?.contactMethod || 'email',
    originalContent: data?.initialContact?.originalContent || '',
    extractedData: data?.initialContact?.extractedData
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionComplete, setExtractionComplete] = useState(false);

  useEffect(() => {
    setExtractionComplete(!!contactData.extractedData);
  }, [contactData.extractedData]);

  const handleContactMethodChange = (method: InitialContactData['contactMethod']) => {
    setContactData(prev => ({
      ...prev,
      contactMethod: method,
      originalContent: '', // Clear content when changing methods
      extractedData: undefined // Clear extracted data
    }));
    setExtractionComplete(false);
  };

  const detectRedFlags = (extractedData: InitialContactData['extractedData']): string[] => {
    const redFlags: string[] = [];

    if (!extractedData) return redFlags;

    // Tight timeline check
    if (extractedData.timeline.urgency === 'high') {
      redFlags.push('High urgency timeline - may require rush pricing');
    }

    // Budget constraints
    if (extractedData.budget.constraints.length > 0) {
      redFlags.push('Budget constraints mentioned - price sensitivity likely');
    }

    if (!extractedData.budget.approved) {
      redFlags.push('Budget not yet approved - may delay project start');
    }

    // Complex service requirements
    if (extractedData.requirements.services.length > 4) {
      redFlags.push('Multiple services requested - complex coordination required');
    }

    // Decision maker concerns
    if (extractedData.decisionMakers.approvers.length > 2) {
      redFlags.push('Multiple approvers - extended decision process');
    }

    // Urgency score check
    if (extractedData.urgencyScore >= 8) {
      redFlags.push('Extremely urgent request - verify realistic expectations');
    }

    return redFlags;
  };

  const handleEmailExtraction = async () => {
    if (!contactData.originalContent.trim()) {
      alert('Please enter content to extract information from');
      return;
    }

    setIsExtracting(true);

    try {
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to use AI extraction');
      }

      const response = await fetch('/api/ai/extract-contact-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: contactData.originalContent,
          contactMethod: contactData.contactMethod
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract information');
      }

      const result = await response.json();
      
      // Detect red flags based on extracted data
      const redFlags = detectRedFlags(result.extractedData);
      
      const extractedDataWithRedFlags = {
        ...result.extractedData,
        redFlags
      };

      setContactData(prev => ({
        ...prev,
        extractedData: extractedDataWithRedFlags
      }));

      setExtractionComplete(true);

    } catch (error) {
      console.error('Error extracting information:', error);
      alert('Failed to extract information. Please try again or enter details manually.');
    } finally {
      setIsExtracting(false);
    }
  };

  const getPlaceholderText = () => {
    switch (contactData.contactMethod) {
      case 'email':
        return 'Paste the email thread here, including any back-and-forth conversation about the cleaning project...';
      case 'meeting':
        return 'Enter notes from your meeting, including project requirements, timeline, budget discussions...';
      case 'phone':
        return 'Summarize the phone conversation, including customer needs, building details, timeline...';
      case 'walkin':
        return 'Enter details from the in-person discussion, including project scope and customer requirements...';
      default:
        return 'Enter the contact information and project details...';
    }
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
          Start by selecting how you received this project inquiry and enter the details.
        </p>
      </div>

      {/* Contact Method Selector */}
      <div>
        <h3 className="font-semibold mb-3">How did you receive this inquiry?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CONTACT_METHODS.map((method) => {
            const IconComponent = method.icon;
            const isSelected = contactData.contactMethod === method.id;
            
            return (
              <Card
                key={method.id}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
                }`}
                onClick={() => handleContactMethodChange(method.id as InitialContactData['contactMethod'])}
              >
                <div className="text-center">
                  <IconComponent className={`w-8 h-8 mx-auto mb-2 ${
                    isSelected ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <h4 className="font-medium text-sm">{method.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{method.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Content Input */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">
            {contactData.contactMethod === 'email' ? 'Email Content' : 'Contact Details'}
          </h3>
          <Button
            onClick={handleEmailExtraction}
            disabled={!contactData.originalContent.trim() || isExtracting}
            className="flex items-center"
          >
            {isExtracting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Extracting...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Extract Information with AI
              </>
            )}
          </Button>
        </div>
        
        <textarea
          className="w-full h-40 p-4 border rounded-lg resize-none"
          placeholder={getPlaceholderText()}
          value={contactData.originalContent}
          onChange={(e) => setContactData(prev => ({
            ...prev,
            originalContent: e.target.value
          }))}
        />
      </div>

      {/* Extracted Data Display */}
      {contactData.extractedData && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Extracted Information</h3>

          {/* Red Flags Alert */}
          {contactData.extractedData.redFlags.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div>
                <h4 className="font-medium mb-2">⚠️ Red Flags Detected</h4>
                <ul className="list-disc list-inside space-y-1">
                  {contactData.extractedData.redFlags.map((flag, index) => (
                    <li key={index} className="text-sm">{flag}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Customer Details</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Name:</strong> {contactData.extractedData.customer.name}</div>
                <div><strong>Company:</strong> {contactData.extractedData.customer.company}</div>
                <div><strong>Email:</strong> {contactData.extractedData.customer.email}</div>
                <div><strong>Phone:</strong> {contactData.extractedData.customer.phone}</div>
                <div><strong>Address:</strong> {contactData.extractedData.customer.address}</div>
              </div>
            </Card>

            {/* Requirements */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Requirements</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Services:</strong> {contactData.extractedData.requirements.services.join(', ')}</div>
                <div><strong>Building Type:</strong> {contactData.extractedData.requirements.buildingType}</div>
                <div><strong>Building Size:</strong> {contactData.extractedData.requirements.buildingSize}</div>
                <div><strong>Floors:</strong> {contactData.extractedData.requirements.floors}</div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Timeline</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Requested Date:</strong> {contactData.extractedData.timeline.requestedDate}</div>
                <div><strong>Flexibility:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    contactData.extractedData.timeline.flexibility === 'none' ? 'bg-red-100 text-red-700' :
                    contactData.extractedData.timeline.flexibility === 'some' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {contactData.extractedData.timeline.flexibility}
                  </span>
                </div>
                <div><strong>Urgency:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    contactData.extractedData.timeline.urgency === 'high' ? 'bg-red-100 text-red-700' :
                    contactData.extractedData.timeline.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {contactData.extractedData.timeline.urgency}
                  </span>
                </div>
                <div><strong>Urgency Score:</strong> {contactData.extractedData.urgencyScore}/10</div>
              </div>
            </Card>

            {/* Budget & Decision Makers */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Budget & Decision Makers</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Budget Range:</strong> {contactData.extractedData.budget.range}</div>
                <div><strong>Budget Approved:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    contactData.extractedData.budget.approved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {contactData.extractedData.budget.approved ? 'Yes' : 'No'}
                  </span>
                </div>
                <div><strong>Primary Contact:</strong> {contactData.extractedData.decisionMakers.primaryContact}</div>
                <div><strong>Approvers:</strong> {contactData.extractedData.decisionMakers.approvers.join(', ')}</div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" disabled>
          Back
        </Button>
        <Button 
          onClick={handleNext}
          disabled={!extractionComplete}
        >
          Continue to Scope Details
        </Button>
      </div>
    </div>
  );
}