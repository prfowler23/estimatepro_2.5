import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Shield, 
  Cloud, 
  Building, 
  Clock, 
  Users, 
  FileText,
  CheckCircle,
  Info,
  TrendingUp,
  Lightbulb,
  Eye,
  EyeOff
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RiskFactor {
  id: string;
  category: 'weather' | 'access' | 'complexity' | 'client' | 'timeline' | 'safety' | 'regulatory';
  title: string;
  description: string;
  impact: number; // Percentage impact on price
  probability: number; // 0-100 probability of occurrence
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  factors?: string[];
  costImpact?: number; // Dollar amount
  timeImpact?: number; // Days
  insuranceRequired?: boolean;
  contractClauses?: string[];
}

interface RiskFactorProps {
  riskFactors: RiskFactor[];
  totalImpact: number;
  projectValue: number;
  onMitigationUpdate?: (riskId: string, mitigation: string) => void;
}

export function RiskFactorAnalysis({ 
  riskFactors, 
  totalImpact, 
  projectValue,
  onMitigationUpdate 
}: RiskFactorProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [showMitigated, setShowMitigated] = useState(false);

  const getRiskColor = (severity: string): string => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'weather': return <Cloud className="w-4 h-4" />;
      case 'access': return <Building className="w-4 h-4" />;
      case 'complexity': return <TrendingUp className="w-4 h-4" />;
      case 'client': return <Users className="w-4 h-4" />;
      case 'timeline': return <Clock className="w-4 h-4" />;
      case 'safety': return <Shield className="w-4 h-4" />;
      case 'regulatory': return <FileText className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const calculateRiskScore = (impact: number, probability: number): number => {
    return (impact * probability) / 100;
  };

  const getTotalRiskScore = (): number => {
    return riskFactors.reduce((total, factor) => 
      total + calculateRiskScore(factor.impact, factor.probability), 0
    );
  };

  const getHighestRisks = (): RiskFactor[] => {
    return [...riskFactors]
      .sort((a, b) => calculateRiskScore(b.impact, b.probability) - calculateRiskScore(a.impact, a.probability))
      .slice(0, 3);
  };

  const groupRisksByCategory = () => {
    return riskFactors.reduce((groups, factor) => {
      const category = factor.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(factor);
      return groups;
    }, {} as Record<string, RiskFactor[]>);
  };

  const getRiskLevel = (totalScore: number): { level: string; color: string; description: string } => {
    if (totalScore < 10) return { 
      level: 'Low', 
      color: 'text-green-600 bg-green-50', 
      description: 'Minimal impact on project execution and pricing' 
    };
    if (totalScore < 25) return { 
      level: 'Medium', 
      color: 'text-yellow-600 bg-yellow-50', 
      description: 'Moderate risks that require active management' 
    };
    if (totalScore < 50) return { 
      level: 'High', 
      color: 'text-orange-600 bg-orange-50', 
      description: 'Significant risks requiring careful planning and contingencies' 
    };
    return { 
      level: 'Critical', 
      color: 'text-red-600 bg-red-50', 
      description: 'Major risks that may require project restructuring or decline' 
    };
  };

  const totalRiskScore = getTotalRiskScore();
  const riskAssessment = getRiskLevel(totalRiskScore);
  const highestRisks = getHighestRisks();
  const groupedRisks = groupRisksByCategory();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          Risk Factor Analysis
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="factors">Risk Factors</TabsTrigger>
            <TabsTrigger value="mitigation">Mitigation</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overall Risk Assessment */}
            <Card className={`${riskAssessment.color} border`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Overall Risk Level</h3>
                    <p className="text-sm opacity-80 mt-1">{riskAssessment.description}</p>
                  </div>
                  <Badge className={`${riskAssessment.color} border-current text-lg px-3 py-1`}>
                    {riskAssessment.level}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totalRiskScore.toFixed(1)}</p>
                    <p className="text-sm opacity-75">Risk Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">+{totalImpact.toFixed(1)}%</p>
                    <p className="text-sm opacity-75">Price Impact</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">${(projectValue * totalImpact / 100).toLocaleString()}</p>
                    <p className="text-sm opacity-75">Cost Impact</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{riskFactors.length}</p>
                    <p className="text-sm opacity-75">Risk Factors</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Highest Impact Risks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {highestRisks.map((factor, index) => (
                    <div key={factor.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        {getCategoryIcon(factor.category)}
                        <div>
                          <p className="font-medium">{factor.title}</p>
                          <p className="text-sm text-gray-600 capitalize">{factor.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">+{factor.impact.toFixed(1)}%</p>
                        <p className="text-sm text-gray-600">{factor.probability}% chance</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Distribution by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(groupedRisks).map(([category, factors]) => {
                    const categoryImpact = factors.reduce((sum, f) => sum + f.impact, 0);
                    const categoryScore = factors.reduce((sum, f) => sum + calculateRiskScore(f.impact, f.probability), 0);
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(category)}
                            <span className="font-medium capitalize">{category}</span>
                            <Badge variant="outline" className="text-xs">
                              {factors.length} factor{factors.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <span className="font-medium">+{categoryImpact.toFixed(1)}%</span>
                        </div>
                        <Progress value={(categoryScore / totalRiskScore) * 100} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="factors" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">All Risk Factors</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMitigated(!showMitigated)}
              >
                {showMitigated ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showMitigated ? 'Hide' : 'Show'} Mitigation
              </Button>
            </div>

            {riskFactors.map((factor) => (
              <Card key={factor.id} className={`border ${getRiskColor(factor.severity)}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getCategoryIcon(factor.category)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{factor.title}</h4>
                          <Badge className={getRiskColor(factor.severity)}>
                            {factor.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{factor.description}</p>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <p className="text-xl font-bold">+{factor.impact.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">{factor.probability}% chance</p>
                      <p className="text-xs text-gray-500">
                        Risk Score: {calculateRiskScore(factor.impact, factor.probability).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Contributing Factors */}
                  {factor.factors && factor.factors.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setExpandedRisk(expandedRisk === factor.id ? null : factor.id)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {expandedRisk === factor.id ? 'Hide' : 'Show'} Contributing Factors
                      </button>
                      
                      {expandedRisk === factor.id && (
                        <div className="mt-2 p-3 bg-white bg-opacity-50 rounded">
                          <ul className="space-y-1 text-sm">
                            {factor.factors.map((f, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-gray-400 mt-1">•</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Impact Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3 text-sm">
                    {factor.costImpact && (
                      <div>
                        <p className="text-gray-600">Cost Impact</p>
                        <p className="font-medium">${factor.costImpact.toLocaleString()}</p>
                      </div>
                    )}
                    {factor.timeImpact && (
                      <div>
                        <p className="text-gray-600">Time Impact</p>
                        <p className="font-medium">+{factor.timeImpact} days</p>
                      </div>
                    )}
                    {factor.insuranceRequired && (
                      <div>
                        <p className="text-gray-600">Insurance</p>
                        <p className="font-medium text-orange-600">Additional Required</p>
                      </div>
                    )}
                  </div>

                  {/* Mitigation Strategy */}
                  {showMitigated && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-700 mb-1">Mitigation Strategy</p>
                          <p className="text-sm text-blue-600">{factor.mitigation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="mitigation" className="space-y-6">
            {/* Mitigation Summary */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 text-blue-800">Risk Mitigation Strategy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3 text-blue-700">Immediate Actions</h4>
                    <ul className="space-y-2 text-sm text-blue-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5" />
                        <span>Verify insurance coverage for all identified risks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5" />
                        <span>Include detailed risk clauses in contract</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5" />
                        <span>Conduct site inspection for access verification</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3 text-blue-700">Ongoing Management</h4>
                    <ul className="space-y-2 text-sm text-blue-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5" />
                        <span>Regular weather monitoring and contingency planning</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5" />
                        <span>Weekly risk assessment updates during project</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5" />
                        <span>Maintain contingency budget for unexpected issues</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract Clauses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recommended Contract Clauses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskFactors
                    .filter(factor => factor.contractClauses && factor.contractClauses.length > 0)
                    .map((factor) => (
                      <div key={factor.id} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{factor.title}</h4>
                        <ul className="space-y-1 text-sm text-gray-600">
                          {factor.contractClauses?.map((clause, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-gray-400 mt-1">•</span>
                              <span>{clause}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            {/* Risk Level Alert */}
            {riskAssessment.level === 'Critical' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Critical Risk Level Detected:</strong> This project carries significant risks that may 
                  impact profitability and completion. Consider declining or restructuring the project scope.
                </AlertDescription>
              </Alert>
            )}

            {/* General Recommendations */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-yellow-800">
                  <Lightbulb className="w-5 h-5" />
                  Risk Management Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-yellow-700">
                  <div>
                    <h4 className="font-medium mb-2">Pricing Adjustments</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Apply {totalImpact.toFixed(1)}% risk premium to base pricing</li>
                      <li>• Consider requiring 25-50% deposit for high-risk projects</li>
                      <li>• Include escalation clauses for material cost increases</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Project Planning</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Build 15-20% time buffer into project schedule</li>
                      <li>• Develop detailed contingency plans for top 3 risks</li>
                      <li>• Schedule regular client communication checkpoints</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Quality Assurance</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Implement additional safety protocols for high-risk work</li>
                      <li>• Document all risk-related decisions and communications</li>
                      <li>• Consider third-party inspections for critical work phases</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decision Matrix */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Risk vs Reward Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      ${(projectValue * (1 + totalImpact / 100)).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Risk-Adjusted Revenue</p>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {totalRiskScore.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600">Total Risk Score</p>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {((projectValue * (1 + totalImpact / 100)) / totalRiskScore).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Risk-Adjusted Value</p>
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