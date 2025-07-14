import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  DollarSign,
  FileText,
  Send,
  History,
  TrendingDown,
  Info
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApprovalHistory {
  id: string;
  approver: string;
  action: 'approved' | 'rejected' | 'pending';
  timestamp: Date;
  notes?: string;
  level: 'manager' | 'director' | 'vp' | 'ceo';
}

interface CustomerHistory {
  totalProjects: number;
  avgDiscount: number;
  lifetimeValue: number;
  paymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
  lastProject: Date;
}

interface DiscountApprovalProps {
  basePrice: number;
  requestedPrice: number;
  discountPercentage: number;
  reason: string;
  customerName?: string;
  customerHistory?: CustomerHistory;
  projectMargin?: number;
  competitorPrice?: number;
  urgency?: 'low' | 'medium' | 'high';
  onApprove: (approvalData: { notes: string; conditions: string[]; approver: string }) => void;
  onReject: (rejectionReason: string) => void;
  onRequestHigherApproval?: (level: string) => void;
}

interface ApprovalLevel {
  name: string;
  title: string;
  limit: number;
  color: string;
  icon: React.ReactNode;
}

export function DiscountApproval({
  basePrice,
  requestedPrice,
  discountPercentage,
  reason,
  customerName = 'Unknown Customer',
  customerHistory,
  projectMargin = 0,
  competitorPrice,
  urgency = 'medium',
  onApprove,
  onReject,
  onRequestHigherApproval
}: DiscountApprovalProps) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalLevel, setApprovalLevel] = useState<'manager' | 'director' | 'vp' | 'ceo'>('manager');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [activeTab, setActiveTab] = useState('request');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const approvers: Record<string, ApprovalLevel> = {
    manager: { 
      name: 'Sales Manager', 
      title: 'Regional Sales Manager',
      limit: 10, 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <User className="w-4 h-4" />
    },
    director: { 
      name: 'Sales Director', 
      title: 'Director of Sales',
      limit: 20, 
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: <Shield className="w-4 h-4" />
    },
    vp: { 
      name: 'VP of Sales', 
      title: 'Vice President of Sales',
      limit: 30, 
      color: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: <TrendingDown className="w-4 h-4" />
    },
    ceo: { 
      name: 'CEO', 
      title: 'Chief Executive Officer',
      limit: 100, 
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: <AlertTriangle className="w-4 h-4" />
    }
  };

  const standardConditions = [
    'Payment in full within 15 days',
    'Minimum 2-year service contract',
    'Customer provides positive reference',
    'No additional change orders without approval',
    'Expedited payment terms (Net 10)',
    'Customer covers all permit fees',
    'Work must be completed within 30 days',
    'Customer provides site access coordination'
  ];

  // Determine required approval level based on discount
  useEffect(() => {
    if (discountPercentage < 10) {
      setApprovalLevel('manager');
    } else if (discountPercentage < 20) {
      setApprovalLevel('director');
    } else if (discountPercentage < 30) {
      setApprovalLevel('vp');
    } else {
      setApprovalLevel('ceo');
    }
  }, [discountPercentage]);

  const getRiskLevel = (): { level: string; color: string; description: string } => {
    if (discountPercentage < 5) return { 
      level: 'Low', 
      color: 'text-green-600 bg-green-50', 
      description: 'Minimal impact on profitability' 
    };
    if (discountPercentage < 15) return { 
      level: 'Medium', 
      color: 'text-yellow-600 bg-yellow-50', 
      description: 'Moderate impact, review carefully' 
    };
    if (discountPercentage < 25) return { 
      level: 'High', 
      color: 'text-orange-600 bg-orange-50', 
      description: 'Significant impact, strong justification needed' 
    };
    return { 
      level: 'Critical', 
      color: 'text-red-600 bg-red-50', 
      description: 'Major impact, exceptional circumstances only' 
    };
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const calculateImpact = () => {
    const discountAmount = basePrice - requestedPrice;
    const marginImpact = projectMargin ? (discountAmount / projectMargin) * 100 : 0;
    const revenueImpact = (discountAmount / basePrice) * 100;
    
    return {
      discountAmount,
      marginImpact,
      revenueImpact
    };
  };

  const handleConditionToggle = (condition: string) => {
    setSelectedConditions(prev => 
      prev.includes(condition) 
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const handleApprove = () => {
    const conditions = [...selectedConditions];
    if (customCondition.trim()) {
      conditions.push(customCondition.trim());
    }

    onApprove({
      notes: approvalNotes,
      conditions,
      approver: approvers[approvalLevel].name
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(rejectionReason);
  };

  const riskAssessment = getRiskLevel();
  const impact = calculateImpact();
  const currentApprover = approvers[approvalLevel];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Discount Approval Request
          </CardTitle>
          <div className="flex gap-2">
            <Badge className={getUrgencyColor(urgency)}>
              {urgency.toUpperCase()} Priority
            </Badge>
            <Badge className={riskAssessment.color}>
              {riskAssessment.level} Risk
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="request">Request Details</TabsTrigger>
            <TabsTrigger value="analysis">Impact Analysis</TabsTrigger>
            <TabsTrigger value="approval">Approval Process</TabsTrigger>
            <TabsTrigger value="history">Customer History</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-6">
            {/* Discount Summary */}
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-red-800">Discount Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm text-gray-600">Original Price</p>
                    <p className="text-xl font-bold">${basePrice.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-600" />
                    <p className="text-sm text-gray-600">Requested Price</p>
                    <p className="text-xl font-bold text-red-600">${requestedPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
                    <p className="text-sm text-gray-600">Discount Amount</p>
                    <p className="text-xl font-bold text-red-600">-${impact.discountAmount.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-600" />
                    <p className="text-sm text-gray-600">Discount %</p>
                    <p className="text-xl font-bold text-red-600">-{discountPercentage.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium mb-4">Customer & Project Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Customer Name</Label>
                    <p className="font-medium">{customerName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Project Margin</Label>
                    <p className="font-medium">{projectMargin.toFixed(1)}%</p>
                  </div>
                  {competitorPrice && (
                    <div>
                      <Label className="text-sm text-gray-600">Competitor Price</Label>
                      <p className="font-medium">${competitorPrice.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-gray-600">Request Urgency</Label>
                    <Badge className={getUrgencyColor(urgency)}>
                      {urgency.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reason for Discount */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium mb-3">Justification for Discount</h4>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{reason}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* Risk Assessment */}
            <Alert className={riskAssessment.color}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{riskAssessment.level} Risk Discount:</strong> {riskAssessment.description}
              </AlertDescription>
            </Alert>

            {/* Financial Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financial Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      ${impact.discountAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Revenue Loss</p>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {impact.marginImpact.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Margin Impact</p>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {impact.revenueImpact.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Revenue Impact</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Competitive Analysis */}
            {competitorPrice && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Competitive Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Our Original Price:</span>
                      <span className="font-bold">${basePrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Competitor Price:</span>
                      <span className="font-bold">${competitorPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Our Discounted Price:</span>
                      <span className="font-bold text-blue-600">${requestedPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Advantage vs Competitor:</span>
                      <span className={`font-bold ${
                        requestedPrice < competitorPrice ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${(competitorPrice - requestedPrice).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="approval" className="space-y-6">
            {/* Required Approval Level */}
            <Card className={currentApprover.color}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentApprover.icon}
                    <div>
                      <h4 className="font-semibold">{currentApprover.title}</h4>
                      <p className="text-sm opacity-75">
                        Authorized up to {currentApprover.limit}% discount
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-2">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending Review
                    </Badge>
                    <p className="text-xs opacity-75">
                      Required for {discountPercentage.toFixed(1)}% discount
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approval Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approval Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select Conditions (Optional)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {standardConditions.map((condition) => (
                      <label key={condition} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedConditions.includes(condition)}
                          onChange={() => handleConditionToggle(condition)}
                          className="rounded"
                        />
                        <span>{condition}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="customCondition" className="text-sm font-medium">
                    Custom Condition
                  </Label>
                  <Input
                    id="customCondition"
                    value={customCondition}
                    onChange={(e) => setCustomCondition(e.target.value)}
                    placeholder="Enter any custom conditions..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Approval Notes */}
            <Card>
              <CardContent className="p-6">
                <Label htmlFor="approvalNotes" className="text-sm font-medium mb-3 block">
                  Approval Notes
                </Label>
                <Textarea
                  id="approvalNotes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any additional notes or conditions for this approval..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-4">
              {!showRejectionForm ? (
                <div className="flex gap-4">
                  <Button onClick={handleApprove} className="flex-1" size="lg">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Discount
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowRejectionForm(true)} 
                    className="flex-1"
                    size="lg"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Request
                  </Button>
                </div>
              ) : (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-6">
                    <h4 className="font-medium mb-3 text-red-800">Rejection Reason</h4>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a detailed reason for rejecting this discount request..."
                      rows={3}
                      className="mb-4"
                    />
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={handleReject}>
                        Confirm Rejection
                      </Button>
                      <Button variant="outline" onClick={() => setShowRejectionForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {onRequestHigherApproval && discountPercentage > currentApprover.limit && (
                <Button 
                  variant="outline" 
                  onClick={() => onRequestHigherApproval?.(approvalLevel)}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Request Higher Level Approval
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {customerHistory ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Customer History - {customerName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-gray-600">Total Projects</Label>
                        <p className="text-xl font-bold">{customerHistory.totalProjects}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Average Discount</Label>
                        <p className="text-xl font-bold">{customerHistory.avgDiscount.toFixed(1)}%</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm text-gray-600">Lifetime Value</Label>
                        <p className="text-xl font-bold text-green-600">
                          ${customerHistory.lifetimeValue.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Payment History</Label>
                        <Badge className={
                          customerHistory.paymentHistory === 'excellent' ? 'bg-green-600' :
                          customerHistory.paymentHistory === 'good' ? 'bg-blue-600' :
                          customerHistory.paymentHistory === 'fair' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }>
                          {customerHistory.paymentHistory.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No customer history available. This may be a new customer or data is not accessible.
                </AlertDescription>
              </Alert>
            )}

            {/* Approval Guidelines */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Approval Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Discount Authority Levels</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" />
                        <span><strong>0-10%:</strong> Sales Manager approval</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-500" />
                        <span><strong>10-20%:</strong> Sales Director approval</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-orange-500" />
                        <span><strong>20-30%:</strong> VP of Sales approval</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span><strong>30%+:</strong> CEO approval required</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Evaluation Criteria</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Customer lifetime value and payment history</li>
                      <li>• Competitive pricing pressure</li>
                      <li>• Project margin impact</li>
                      <li>• Strategic relationship value</li>
                      <li>• Market conditions and urgency</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}