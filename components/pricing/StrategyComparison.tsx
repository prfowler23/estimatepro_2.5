import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  AlertTriangle,
  Info,
  Star,
  BarChart3,
  Zap
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PricingAdjustment {
  reason: string;
  percentage: number;
  amount?: number;
}

interface PricingStrategy {
  name: string;
  price: number;
  baseCost?: number;
  adjustments: PricingAdjustment[];
  pros: string[];
  cons: string[];
  confidence: number;
  winProbability: number;
  expectedValue?: number;
  margin?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  recommended?: boolean;
  description?: string;
}

interface StrategyComparisonProps {
  strategies: PricingStrategy[];
  currentStrategy: PricingStrategy;
  onSelectStrategy: (strategy: PricingStrategy) => void;
  baseCost?: number;
  marketBenchmark?: number;
}

export function StrategyComparison({
  strategies,
  currentStrategy,
  onSelectStrategy,
  baseCost = 0,
  marketBenchmark
}: StrategyComparisonProps) {
  const [sortBy, setSortBy] = useState<'price' | 'winProbability' | 'expectedValue'>('expectedValue');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Calculate enhanced metrics for each strategy
  const enhancedStrategies = strategies.map(strategy => {
    const calculatedBaseCost = strategy.baseCost || baseCost;
    const margin = calculatedBaseCost > 0 ? ((strategy.price - calculatedBaseCost) / strategy.price) * 100 : 0;
    const expectedValue = strategy.expectedValue || (strategy.price * strategy.winProbability);
    const riskLevel = strategy.winProbability > 0.7 ? 'low' : 
                     strategy.winProbability > 0.4 ? 'medium' : 'high';

    return {
      ...strategy,
      margin,
      expectedValue,
      riskLevel,
      marketPosition: marketBenchmark ? (strategy.price / marketBenchmark - 1) * 100 : 0
    };
  });

  // Sort strategies
  const sortedStrategies = [...enhancedStrategies].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return b.price - a.price;
      case 'winProbability':
        return b.winProbability - a.winProbability;
      case 'expectedValue':
        return b.expectedValue - a.expectedValue;
      default:
        return b.expectedValue - a.expectedValue;
    }
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStrategyIcon = (strategyName: string) => {
    if (strategyName.toLowerCase().includes('competitive')) return <Target className="w-4 h-4" />;
    if (strategyName.toLowerCase().includes('premium')) return <Star className="w-4 h-4" />;
    if (strategyName.toLowerCase().includes('value')) return <TrendingUp className="w-4 h-4" />;
    if (strategyName.toLowerCase().includes('penetration')) return <Zap className="w-4 h-4" />;
    return <BarChart3 className="w-4 h-4" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Pricing Strategy Comparison
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'expectedValue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('expectedValue')}
            >
              Expected Value
            </Button>
            <Button
              variant={sortBy === 'winProbability' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('winProbability')}
            >
              Win Rate
            </Button>
            <Button
              variant={sortBy === 'price' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('price')}
            >
              Price
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-gray-600">Price Range</p>
            <p className="font-bold">
              ${Math.min(...strategies.map(s => s.price)).toLocaleString()} - 
              ${Math.max(...strategies.map(s => s.price)).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Win Rate Range</p>
            <p className="font-bold">
              {(Math.min(...strategies.map(s => s.winProbability)) * 100).toFixed(1)}% - 
              {(Math.max(...strategies.map(s => s.winProbability)) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Best Expected Value</p>
            <p className="font-bold text-green-600">
              ${Math.max(...enhancedStrategies.map(s => s.expectedValue)).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Strategies</p>
            <p className="font-bold">{strategies.length} options</p>
          </div>
        </div>

        {/* Strategy Cards */}
        <div className="space-y-4">
          {sortedStrategies.map((strategy, index) => {
            const isSelected = strategy.name === currentStrategy.name;
            const isRecommended = strategy.recommended || index === 0; // First in sorted list or explicitly recommended
            
            return (
              <Card
                key={strategy.name}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${isRecommended ? 'ring-2 ring-green-200' : ''}`}
                onClick={() => onSelectStrategy(strategy as any)}
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {getStrategyIcon(strategy.name)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{strategy.name}</h4>
                          {isSelected && (
                            <Badge className="bg-blue-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                          {isRecommended && !isSelected && (
                            <Badge className="bg-green-600">
                              <Star className="w-3 h-3 mr-1" />
                              Recommended
                            </Badge>
                          )}
                        </div>
                        {strategy.description && (
                          <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600">
                        ${strategy.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600">
                          {strategy.margin.toFixed(1)}% margin
                        </span>
                        <Badge variant="outline" className={getRiskColor(strategy.riskLevel)}>
                          {strategy.riskLevel} risk
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <Target className="w-5 h-5 mx-auto mb-1 text-green-600" />
                      <p className="text-sm text-gray-600">Win Probability</p>
                      <p className="text-xl font-bold text-green-600">
                        {(strategy.winProbability * 100).toFixed(1)}%
                      </p>
                    </div>
                    
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <DollarSign className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <p className="text-sm text-gray-600">Expected Value</p>
                      <p className="text-xl font-bold text-purple-600">
                        ${strategy.expectedValue.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <BarChart3 className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                      <p className="text-sm text-gray-600">Confidence</p>
                      <p className="text-xl font-bold text-blue-600">
                        {strategy.confidence}%
                      </p>
                    </div>
                  </div>

                  {/* Win Probability Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Win Probability</span>
                      <span>{(strategy.winProbability * 100).toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={strategy.winProbability * 100} 
                      className="h-3"
                    />
                  </div>

                  {/* Market Position */}
                  {marketBenchmark && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">vs Market Median</span>
                        <div className="flex items-center gap-2">
                          {strategy.marketPosition > 0 ? (
                            <TrendingUp className="w-4 h-4 text-red-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-green-500" />
                          )}
                          <span className={`font-medium ${
                            Math.abs(strategy.marketPosition) > 15 
                              ? strategy.marketPosition > 0 ? 'text-red-600' : 'text-green-600'
                              : 'text-gray-600'
                          }`}>
                            {strategy.marketPosition > 0 ? '+' : ''}{strategy.marketPosition.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price Adjustments */}
                  {strategy.adjustments.length > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDetails(showDetails === strategy.name ? null : strategy.name);
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 mb-2"
                      >
                        {showDetails === strategy.name ? 'Hide' : 'Show'} Price Adjustments
                      </button>
                      
                      {showDetails === strategy.name && (
                        <div className="space-y-2 text-sm bg-gray-50 p-3 rounded">
                          {strategy.adjustments.map((adj, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <span className="text-gray-700">{adj.reason}</span>
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${
                                  adj.percentage > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {adj.percentage > 0 ? '+' : ''}{adj.percentage.toFixed(1)}%
                                </span>
                                {adj.amount && (
                                  <span className="text-xs text-gray-500">
                                    (${Math.abs(adj.amount).toLocaleString()})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pros and Cons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-medium text-green-700 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Advantages
                      </p>
                      <ul className="space-y-1">
                        {strategy.pros.map((pro, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="font-medium text-red-700 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Considerations
                      </p>
                      <ul className="space-y-1">
                        {strategy.cons.map((con, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  {!isSelected && (
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStrategy(strategy as any);
                      }}
                      className="w-full"
                      variant={isRecommended ? "default" : "outline"}
                    >
                      {isRecommended ? "Select Recommended Strategy" : "Select This Strategy"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Best Strategy Alert */}
        {sortBy === 'expectedValue' && sortedStrategies.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{sortedStrategies[0].name}</strong> offers the highest expected value at{' '}
              <strong>${sortedStrategies[0].expectedValue.toLocaleString()}</strong> with a{' '}
              <strong>{(sortedStrategies[0].winProbability * 100).toFixed(1)}%</strong> win probability.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}