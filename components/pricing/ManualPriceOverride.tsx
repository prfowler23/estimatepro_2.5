import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Edit3, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Shield,
  Calculator,
  Info,
  X,
  Save,
  RotateCcw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PriceValidation {
  isValid: boolean;
  warnings: string[];
  requiresApproval: boolean;
  approvalLevel?: 'manager' | 'director' | 'vp';
}

interface ManualPriceOverrideProps {
  currentPrice: number;
  baseCost?: number;
  marketMedian?: number;
  competitorPrices?: number[];
  minPrice?: number;
  maxPrice?: number;
  customerBudget?: number;
  onOverride: (overrideData: {
    price: number;
    reason: string;
    category: string;
    impact: {
      amount: number;
      percentage: number;
      marginImpact: number;
    };
    validation: PriceValidation;
  }) => void;
  onCancel?: () => void;
}

interface ReasonCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  reasons: string[];
  color: string;
}

export function ManualPriceOverride({ 
  currentPrice, 
  baseCost = 0,
  marketMedian,
  competitorPrices = [],
  minPrice,
  maxPrice,
  customerBudget,
  onOverride,
  onCancel
}: ManualPriceOverrideProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [newPrice, setNewPrice] = useState(currentPrice.toString());
  const [reason, setReason] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [activeTab, setActiveTab] = useState('override');
  const [validation, setValidation] = useState<PriceValidation>({
    isValid: true,
    warnings: [],
    requiresApproval: false
  });

  const reasonCategories: ReasonCategory[] = [
    {
      id: 'competitive',
      name: 'Competitive',
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'bg-red-50 text-red-700 border-red-200',
      reasons: [
        'Match competitor pricing',
        'Aggressive market positioning',
        'Prevent customer loss to competitor',
        'Competitive bidding requirement',
        'Market penetration strategy'
      ]
    },
    {
      id: 'relationship',
      name: 'Customer Relationship',
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      reasons: [
        'Long-term client relationship',
        'Strategic account acquisition',
        'Customer loyalty program',
        'Preferred vendor status',
        'Multi-year contract commitment'
      ]
    },
    {
      id: 'business',
      name: 'Business Strategy',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'bg-green-50 text-green-700 border-green-200',
      reasons: [
        'Volume discount for multiple buildings',
        'Package deal with future work',
        'Portfolio expansion opportunity',
        'Market entry pricing',
        'Capacity utilization during slow period'
      ]
    },
    {
      id: 'operational',
      name: 'Operational',
      icon: <Calculator className="w-4 h-4" />,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      reasons: [
        'Customer budget constraints',
        'Scope reduction to meet budget',
        'Payment terms improvement',
        'Material cost savings identified',
        'Efficiency gains from equipment/process'
      ]
    }
  ];

  const calculatedPrice = parseFloat(newPrice) || 0;
  const priceChange = calculatedPrice - currentPrice;
  const percentageChange = currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;
  const marginImpact = baseCost > 0 ? ((calculatedPrice - baseCost) / calculatedPrice) * 100 : 0;

  // Price validation
  useEffect(() => {
    validatePrice(calculatedPrice);
  }, [calculatedPrice, currentPrice, baseCost, marketMedian]);

  const validatePrice = (price: number) => {
    const warnings: string[] = [];
    let requiresApproval = false;
    let approvalLevel: 'manager' | 'director' | 'vp' | undefined;

    // Discount-based warnings
    const discountPercent = Math.abs(percentageChange);
    if (price < currentPrice) {
      if (discountPercent > 30) {
        warnings.push('Extreme discount may not be profitable');
        requiresApproval = true;
        approvalLevel = 'vp';
      } else if (discountPercent > 20) {
        warnings.push('Large discount requires executive approval');
        requiresApproval = true;
        approvalLevel = 'director';
      } else if (discountPercent > 10) {
        warnings.push('Significant discount requires management approval');
        requiresApproval = true;
        approvalLevel = 'manager';
      }
    }

    // Margin-based warnings
    if (baseCost > 0) {
      if (price <= baseCost) {
        warnings.push('Price is at or below cost - no profit margin');
      } else if (marginImpact < 10) {
        warnings.push('Very low profit margin - high risk');
      } else if (marginImpact < 20) {
        warnings.push('Below recommended minimum margin');
      }
    }

    // Market position warnings
    if (marketMedian && price < marketMedian * 0.8) {
      warnings.push('Significantly below market median');
    }

    // Competitor comparison
    if (competitorPrices.length > 0) {
      const minCompetitor = Math.min(...competitorPrices);
      if (price < minCompetitor * 0.9) {
        warnings.push('Below lowest known competitor price');
      }
    }

    // Price range validation
    if (minPrice && price < minPrice) {
      warnings.push(`Below minimum allowed price of $${minPrice.toLocaleString()}`);
    }
    if (maxPrice && price > maxPrice) {
      warnings.push(`Above maximum allowed price of $${maxPrice.toLocaleString()}`);
    }

    // Customer budget comparison
    if (customerBudget && price > customerBudget * 1.1) {
      warnings.push('Significantly above customer budget');
    }

    setValidation({
      isValid: warnings.length === 0 || (warnings.length > 0 && price > baseCost),
      warnings,
      requiresApproval,
      approvalLevel
    });
  };

  const getChangeColor = () => {
    if (priceChange > 0) return 'text-green-600 bg-green-50';
    if (priceChange < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getRiskLevel = (): { level: string; color: string } => {
    if (Math.abs(percentageChange) < 5) return { level: 'Low', color: 'text-green-600 bg-green-50' };
    if (Math.abs(percentageChange) < 15) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-50' };
    if (Math.abs(percentageChange) < 25) return { level: 'High', color: 'text-orange-600 bg-orange-50' };
    return { level: 'Critical', color: 'text-red-600 bg-red-50' };
  };

  const handleSubmit = () => {
    if (!validation.isValid || !selectedReason || calculatedPrice <= 0) {
      return;
    }

    const category = reasonCategories.find(cat => cat.id === selectedCategory)?.name || '';
    const finalReason = reason.trim() ? `${selectedReason}: ${reason}` : selectedReason;

    onOverride({
      price: calculatedPrice,
      reason: finalReason,
      category,
      impact: {
        amount: priceChange,
        percentage: percentageChange,
        marginImpact
      },
      validation
    });
  };

  const handleCancel = () => {
    setShowOverride(false);
    setNewPrice(currentPrice.toString());
    setReason('');
    setSelectedCategory('');
    setSelectedReason('');
    onCancel?.();
  };

  const handleReset = () => {
    setNewPrice(currentPrice.toString());
    setReason('');
    setSelectedCategory('');
    setSelectedReason('');
  };

  const riskLevel = getRiskLevel();

  if (!showOverride) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Edit3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold text-lg mb-2">Manual Price Override</h3>
          <p className="text-sm text-gray-600 mb-4">
            Adjust the final price based on specific customer circumstances or competitive requirements.
          </p>
          <Button onClick={() => setShowOverride(true)} className="w-full">
            <Edit3 className="w-4 h-4 mr-2" />
            Override Price
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Manual Price Override
          </CardTitle>
          <div className="flex gap-2">
            <Badge className={riskLevel.color}>
              {riskLevel.level} Risk
            </Badge>
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="override">Price Override</TabsTrigger>
            <TabsTrigger value="analysis">Impact Analysis</TabsTrigger>
            <TabsTrigger value="comparison">Market Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="override" className="space-y-6">
            {/* Price Input Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-50">
                <CardContent className="p-4 text-center">
                  <Label className="text-sm text-gray-600">Current Price</Label>
                  <p className="text-2xl font-bold mt-1">${currentPrice.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <Label htmlFor="newPrice" className="text-sm font-medium">New Price</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="newPrice"
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="pl-8 text-xl font-bold"
                      step="100"
                      min="0"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price Change Indicator */}
            {calculatedPrice !== currentPrice && calculatedPrice > 0 && (
              <Card className={getChangeColor()}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {priceChange > 0 ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                      <span className="font-medium">Price Change</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {priceChange > 0 ? '+' : ''}${priceChange.toLocaleString()}
                      </p>
                      <p className="text-sm">
                        ({priceChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reason Category Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Override Category</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reasonCategories.map((category) => (
                  <Card
                    key={category.id}
                    className={`cursor-pointer transition-all ${
                      selectedCategory === category.id
                        ? `${category.color} border-2`
                        : 'border hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSelectedReason(''); // Reset reason when category changes
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        {category.icon}
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Specific Reason Selection */}
            {selectedCategory && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Specific Reason</Label>
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a specific reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonCategories
                      .find(cat => cat.id === selectedCategory)
                      ?.reasons.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    <SelectItem value="Other">Other (specify below)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Additional Details {selectedReason === 'Other' ? '(Required)' : '(Optional)'}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  selectedReason === 'Other'
                    ? 'Please provide detailed explanation...'
                    : 'Add any specific details or conditions...'
                }
                rows={3}
              />
            </div>

            {/* Validation Warnings */}
            {validation.warnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <div key={index}>• {warning}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Approval Required Notice */}
            {validation.requiresApproval && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This price override requires {validation.approvalLevel} approval before the estimate can be finalized.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={!validation.isValid || !selectedReason || calculatedPrice <= 0 || (selectedReason === 'Other' && !reason.trim())}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Apply Override
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* Financial Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financial Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      ${Math.abs(priceChange).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {priceChange >= 0 ? 'Revenue Increase' : 'Revenue Decrease'}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {marginImpact.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Profit Margin</p>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {Math.abs(percentageChange).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Price Change</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Breakeven Analysis */}
            {baseCost > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cost Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Base Cost:</span>
                      <span className="font-bold">${baseCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>New Price:</span>
                      <span className="font-bold">${calculatedPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span>Gross Profit:</span>
                      <span className={`font-bold ${
                        calculatedPrice > baseCost ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${(calculatedPrice - baseCost).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            {/* Market Position */}
            {marketMedian && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Market Position</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Market Median:</span>
                      <span className="font-bold">${marketMedian.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Your New Price:</span>
                      <span className="font-bold">${calculatedPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span>Position vs Market:</span>
                      <span className={`font-bold ${
                        calculatedPrice < marketMedian ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {((calculatedPrice / marketMedian - 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Competitor Comparison */}
            {competitorPrices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Competitor Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {competitorPrices.map((price, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>Competitor {index + 1}:</span>
                        <div className="text-right">
                          <span className="font-bold">${price.toLocaleString()}</span>
                          <span className={`ml-2 text-sm ${
                            calculatedPrice < price ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ({calculatedPrice < price ? 'Lower' : 'Higher'})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Budget */}
            {customerBudget && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Budget Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Customer Budget:</span>
                      <span className="font-bold">${customerBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Your New Price:</span>
                      <span className="font-bold">${calculatedPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span>Budget Fit:</span>
                      <span className={`font-bold ${
                        calculatedPrice <= customerBudget ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {calculatedPrice <= customerBudget ? 'Within Budget' : 'Over Budget'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}