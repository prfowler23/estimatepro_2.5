import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, Building, DollarSign, AlertTriangle, Info, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CostSummary {
  equipment: number;
  materials: number;
  labor: number;
  other: number;
  total: number;
  sqft?: number;
  perSqft?: number;
}

interface HistoricalProject {
  id: string;
  date: string;
  buildingType: string;
  services: string[];
  costs: {
    equipment: number;
    materials: number;
    labor: number;
    other: number;
    total: number;
  };
  sqft: number;
  perSqft: number;
  location: string;
  duration: number;
  weather: string;
  complexity: 'low' | 'medium' | 'high';
}

interface HistoricalData {
  averageCosts: {
    equipment: number;
    materials: number;
    labor: number;
    other: number;
    total: number;
    perSqft: number;
  };
  recentProjects: HistoricalProject[];
  priceInflation: {
    equipment: number;
    materials: number;
    labor: number;
    yearOverYear: number;
  };
  marketTrends: {
    category: string;
    trend: 'up' | 'down' | 'stable';
    percentage: number;
    reason: string;
  }[];
  benchmarks: {
    low: number;
    average: number;
    high: number;
    premium: number;
  };
}

interface HistoricalComparisonProps {
  currentCosts: CostSummary;
  buildingType: string;
  services: string[];
  location: string;
  sqft?: number;
}

const SERVICE_NAMES: Record<string, string> = {
  'WC': 'Window Cleaning',
  'GR': 'Glass Restoration',
  'BWP': 'Building Wash (Pressure)',
  'BWS': 'Building Wash (Soft)',
  'HBW': 'High-Rise Building Wash',
  'PWF': 'Pressure Wash (Flat)',
  'HFS': 'Hard Floor Scrubbing',
  'PC': 'Parking Cleaning',
  'PWP': 'Parking Pressure Wash',
  'IW': 'Interior Wall Cleaning',
  'DC': 'Deck Cleaning'
};

export function HistoricalComparison({ 
  currentCosts, 
  buildingType, 
  services,
  location,
  sqft = 0
}: HistoricalComparisonProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>('12months');
  const [filteredProjects, setFilteredProjects] = useState<HistoricalProject[]>([]);

  useEffect(() => {
    loadHistoricalData();
  }, [buildingType, services, location, timeframe]);

  const loadHistoricalData = async () => {
    setLoading(true);
    
    // Mock historical data - replace with actual API call
    const data: HistoricalData = {
      averageCosts: {
        equipment: 4800,
        materials: 3200,
        labor: 6800,
        other: 1200,
        total: 16000,
        perSqft: 0.64
      },
      recentProjects: [
        {
          id: 'proj-001',
          date: '2024-10-15',
          buildingType: 'office',
          services: ['BWP', 'WC'],
          costs: {
            equipment: 4200,
            materials: 2600,
            labor: 5800,
            other: 800,
            total: 13400
          },
          sqft: 25000,
          perSqft: 0.54,
          location: 'Dallas, TX',
          duration: 12,
          weather: 'favorable',
          complexity: 'medium'
        },
        {
          id: 'proj-002',
          date: '2024-09-20',
          buildingType: 'office',
          services: ['BWS', 'GR'],
          costs: {
            equipment: 5100,
            materials: 3800,
            labor: 7200,
            other: 1100,
            total: 17200
          },
          sqft: 30000,
          perSqft: 0.57,
          location: 'Austin, TX',
          duration: 18,
          weather: 'challenging',
          complexity: 'high'
        },
        {
          id: 'proj-003',
          date: '2024-08-10',
          buildingType: 'retail',
          services: ['PWF', 'HFS'],
          costs: {
            equipment: 3800,
            materials: 2400,
            labor: 4200,
            other: 600,
            total: 11000
          },
          sqft: 18000,
          perSqft: 0.61,
          location: 'Houston, TX',
          duration: 8,
          weather: 'favorable',
          complexity: 'low'
        },
        {
          id: 'proj-004',
          date: '2024-07-25',
          buildingType: 'industrial',
          services: ['BWP', 'PWF', 'PC'],
          costs: {
            equipment: 6200,
            materials: 4100,
            labor: 8400,
            other: 1800,
            total: 20500
          },
          sqft: 45000,
          perSqft: 0.46,
          location: 'San Antonio, TX',
          duration: 25,
          weather: 'challenging',
          complexity: 'high'
        },
        {
          id: 'proj-005',
          date: '2024-06-12',
          buildingType: 'office',
          services: ['WC', 'IW'],
          costs: {
            equipment: 2800,
            materials: 1800,
            labor: 4600,
            other: 400,
            total: 9600
          },
          sqft: 15000,
          perSqft: 0.64,
          location: 'Dallas, TX',
          duration: 6,
          weather: 'favorable',
          complexity: 'low'
        }
      ],
      priceInflation: {
        equipment: 3.5,
        materials: 5.2,
        labor: 4.1,
        yearOverYear: 4.3
      },
      marketTrends: [
        {
          category: 'Equipment Rental',
          trend: 'up',
          percentage: 3.5,
          reason: 'Increased demand and fuel costs'
        },
        {
          category: 'Chemical Supplies',
          trend: 'up',
          percentage: 5.2,
          reason: 'Supply chain disruptions and material costs'
        },
        {
          category: 'Labor Rates',
          trend: 'up',
          percentage: 4.1,
          reason: 'Skilled labor shortage and wage increases'
        },
        {
          category: 'Safety Equipment',
          trend: 'stable',
          percentage: 1.2,
          reason: 'Stable supply and moderate demand'
        }
      ],
      benchmarks: {
        low: 0.45,
        average: 0.64,
        high: 0.85,
        premium: 1.20
      }
    };

    // Filter projects based on similarity
    const similar = data.recentProjects.filter(project => {
      const hasMatchingService = services.some(service => project.services.includes(service));
      const sameLocation = project.location.includes(location.split(',')[0]);
      return hasMatchingService && (buildingType === 'any' || project.buildingType === buildingType);
    });

    setFilteredProjects(similar);
    setHistoricalData(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading historical data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!historicalData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Unable to load historical data</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate variance from historical averages
  const variance = {
    equipment: ((currentCosts.equipment - historicalData.averageCosts.equipment) / historicalData.averageCosts.equipment) * 100,
    materials: ((currentCosts.materials - historicalData.averageCosts.materials) / historicalData.averageCosts.materials) * 100,
    labor: ((currentCosts.labor - historicalData.averageCosts.labor) / historicalData.averageCosts.labor) * 100,
    other: ((currentCosts.other - historicalData.averageCosts.other) / historicalData.averageCosts.other) * 100,
    total: ((currentCosts.total - historicalData.averageCosts.total) / historicalData.averageCosts.total) * 100
  };

  const currentPerSqft = sqft > 0 ? currentCosts.total / sqft : 0;
  const perSqftVariance = currentPerSqft > 0 ? 
    ((currentPerSqft - historicalData.averageCosts.perSqft) / historicalData.averageCosts.perSqft) * 100 : 0;

  const getVarianceColor = (value: number): string => {
    if (value > 15) return 'text-red-600';
    if (value > 5) return 'text-orange-600';
    if (value < -15) return 'text-green-600';
    if (value < -5) return 'text-blue-600';
    return 'text-gray-900';
  };

  const getVarianceIcon = (value: number) => {
    if (Math.abs(value) < 5) return null;
    return value > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  const getBenchmarkLevel = (perSqft: number): string => {
    if (perSqft < historicalData.benchmarks.low) return 'Below Market';
    if (perSqft < historicalData.benchmarks.average) return 'Low';
    if (perSqft < historicalData.benchmarks.high) return 'Average';
    if (perSqft < historicalData.benchmarks.premium) return 'High';
    return 'Premium';
  };

  const benchmarkColor = (level: string): string => {
    switch (level) {
      case 'Below Market': return 'bg-green-100 text-green-700';
      case 'Low': return 'bg-blue-100 text-blue-700';
      case 'Average': return 'bg-gray-100 text-gray-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Premium': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Historical Cost Comparison
          </CardTitle>
          <div className="flex gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="12months">Last 12 Months</SelectItem>
                <SelectItem value="24months">Last 24 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadHistoricalData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Based on {filteredProjects.length} similar projects • {buildingType} buildings • {services.join(', ')}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Cost Variance Analysis */}
        <div>
          <h4 className="font-medium mb-3">Current vs Historical Average</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(variance).map(([category, value]) => (
              <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 capitalize mb-1">{category}</p>
                <div className={`flex items-center justify-center gap-1 ${getVarianceColor(value)}`}>
                  {getVarianceIcon(value)}
                  <p className="text-lg font-bold">
                    {value > 0 ? '+' : ''}{value.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ${category === 'total' ? currentCosts.total.toFixed(0) : currentCosts[category as keyof CostSummary]?.toFixed?.(0) || '0'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Per Square Foot Analysis */}
        {sqft > 0 && (
          <div>
            <h4 className="font-medium mb-3">Cost Per Square Foot Analysis</h4>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-2xl font-bold">${currentPerSqft.toFixed(2)}/sq ft</p>
                  <p className="text-sm text-gray-600">Current project rate</p>
                </div>
                <div className="text-right">
                  <Badge className={benchmarkColor(getBenchmarkLevel(currentPerSqft))}>
                    {getBenchmarkLevel(currentPerSqft)}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {perSqftVariance > 0 ? '+' : ''}{perSqftVariance.toFixed(1)}% vs avg
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Market Range</span>
                  <span>${historicalData.benchmarks.low.toFixed(2)} - ${historicalData.benchmarks.premium.toFixed(2)}</span>
                </div>
                <Progress 
                  value={Math.min(100, (currentPerSqft / historicalData.benchmarks.premium) * 100)} 
                  className="h-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Recent Similar Projects */}
        <div>
          <h4 className="font-medium mb-3">Recent Similar Projects ({filteredProjects.length})</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredProjects.map(project => (
              <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium">{project.buildingType}</h5>
                      <Badge variant="outline" className="text-xs">
                        {project.sqft.toLocaleString()} sq ft
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {project.complexity} complexity
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(project.date).toLocaleDateString()} • {project.location}
                    </p>
                    <p className="text-sm text-gray-600">
                      Services: {project.services.map(s => SERVICE_NAMES[s] || s).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${project.costs.total.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">${project.perSqft.toFixed(2)}/sq ft</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 mt-3 pt-3 border-t">
                  <div>Equipment: ${project.costs.equipment.toLocaleString()}</div>
                  <div>Materials: ${project.costs.materials.toLocaleString()}</div>
                  <div>Labor: ${project.costs.labor.toLocaleString()}</div>
                  <div>Duration: {project.duration} days</div>
                </div>
              </div>
            ))}
            
            {filteredProjects.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No similar projects found in the selected timeframe</p>
                <p className="text-sm">Try adjusting the filters or timeframe</p>
              </div>
            )}
          </div>
        </div>

        {/* Market Trends */}
        <div>
          <h4 className="font-medium mb-3">Current Market Trends</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {historicalData.marketTrends.map((trend, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">{trend.category}</span>
                  <div className="flex items-center gap-1">
                    {trend.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                    {trend.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                    <span className={`text-sm font-medium ${
                      trend.trend === 'up' ? 'text-red-600' : 
                      trend.trend === 'down' ? 'text-green-600' : 
                      'text-gray-600'
                    }`}>
                      {trend.trend === 'stable' ? '±' : trend.trend === 'up' ? '+' : '-'}{trend.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{trend.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Inflation Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Market Update:</strong> Overall construction costs have increased {historicalData.priceInflation.yearOverYear.toFixed(1)}% 
            year-over-year. Equipment rental (+{historicalData.priceInflation.equipment.toFixed(1)}%), 
            materials (+{historicalData.priceInflation.materials.toFixed(1)}%), 
            and labor (+{historicalData.priceInflation.labor.toFixed(1)}%) all show upward trends.
          </AlertDescription>
        </Alert>

        {/* Recommendations */}
        {Math.abs(variance.total) > 20 && (
          <Alert variant={variance.total > 20 ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {variance.total > 20 ? (
                <>
                  <strong>Cost Alert:</strong> Your estimate is {variance.total.toFixed(1)}% above historical averages. 
                  Consider reviewing equipment rates, material quantities, or labor allocations.
                </>
              ) : (
                <>
                  <strong>Competitive Pricing:</strong> Your estimate is {Math.abs(variance.total).toFixed(1)}% below market averages. 
                  Ensure adequate profit margins are maintained.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}