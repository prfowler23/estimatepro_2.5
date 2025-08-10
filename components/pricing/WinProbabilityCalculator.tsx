import React, { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  generateProbabilityCurve,
  calculateProbabilityAtPrice,
  calculatePriceSensitivity,
  getPriceSensitivityLevel,
  getPricingRecommendation,
} from "@/lib/pricing/pricing-utils";
import type {
  WinProbabilityProps,
  PriceSensitivityLevel,
  PricePoint,
} from "@/lib/types/pricing-types";

// Component wrapped in React.memo for performance optimization
const WinProbabilityCalculatorComponent = ({
  currentPrice,
  winProbability,
  pricePoints,
  optimalPrice,
  competitorPrices = [],
  marketMedian,
  onPriceChange,
}: WinProbabilityProps) => {
  const [selectedPrice, setSelectedPrice] = useState(currentPrice);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Memoized calculations for performance
  const curveData = useMemo(
    () => generateProbabilityCurve(pricePoints),
    [pricePoints],
  );

  // Memoized metrics calculations
  const currentProbability = useMemo(
    () => calculateProbabilityAtPrice(selectedPrice, pricePoints),
    [selectedPrice, pricePoints],
  );

  const expectedValue = useMemo(
    () => selectedPrice * currentProbability,
    [selectedPrice, currentProbability],
  );

  const optimalExpectedValue = useMemo(
    () => optimalPrice * calculateProbabilityAtPrice(optimalPrice, pricePoints),
    [optimalPrice, pricePoints],
  );

  // Memoized price sensitivity analysis
  const sensitivity = useMemo(
    () => calculatePriceSensitivity(pricePoints),
    [pricePoints],
  );

  const sensitivityLevel = useMemo(
    () => getPriceSensitivityLevel(sensitivity),
    [sensitivity],
  );

  // Memoized price range calculations
  const { minPrice, maxPrice } = useMemo(() => {
    if (pricePoints.length === 0) return { minPrice: 0, maxPrice: 100000 };
    const prices = pricePoints.map((p) => p.price);
    return {
      minPrice: Math.min(...prices) * 0.7,
      maxPrice: Math.max(...prices) * 1.3,
    };
  }, [pricePoints]);

  // Memoized callback for price adjustment
  const handlePriceAdjustment = useCallback(
    (newPrice: number) => {
      setSelectedPrice(newPrice);
      const probability = calculateProbabilityAtPrice(newPrice, pricePoints);
      const expValue = newPrice * probability;
      onPriceChange(newPrice, probability, expValue);
    },
    [pricePoints, onPriceChange],
  );

  // Memoized recommendation calculation
  const recommendation = useMemo(() => {
    const rec = getPricingRecommendation(selectedPrice, optimalPrice);
    const colorMap = {
      increase: "text-orange-600",
      decrease: "text-red-600",
      optimal: "text-green-600",
    };
    return {
      ...rec,
      color: colorMap[rec.type],
    };
  }, [selectedPrice, optimalPrice]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Win Probability Analysis
          </CardTitle>
          <Badge
            variant="outline"
            className={`${sensitivityLevel.color} border-current`}
          >
            {sensitivityLevel.level.toUpperCase()} sensitivity
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Metrics Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600">Current Price</p>
              <p className="text-2xl font-bold text-blue-600">
                ${selectedPrice.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-gray-600">Win Probability</p>
              <p className="text-2xl font-bold text-green-600">
                {(currentProbability * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-sm text-gray-600">Expected Value</p>
              <p className="text-2xl font-bold text-purple-600">
                ${expectedValue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Probability Curve Chart */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Win Probability Curve
          </h4>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="price"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${(value * 100).toFixed(1)}%`,
                    "Win Probability",
                  ]}
                  labelFormatter={(value) =>
                    `Price: $${value.toLocaleString()}`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="probability"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                {/* Optimal price line */}
                <ReferenceLine
                  x={optimalPrice}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
                {/* Current price line */}
                <ReferenceLine
                  x={selectedPrice}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
                {/* Market median line */}
                {marketMedian && (
                  <ReferenceLine
                    x={marketMedian}
                    stroke="#6b7280"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                )}
                {/* Competitor prices */}
                {competitorPrices.map((price, index) => (
                  <ReferenceLine
                    key={index}
                    x={price}
                    stroke="#ef4444"
                    strokeDasharray="1 1"
                    strokeWidth={1}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span>Win Probability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500 border-dashed border-t"></div>
              <span>Optimal Price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-yellow-500 border-dashed border-t"></div>
              <span>Current Price</span>
            </div>
            {marketMedian && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-gray-500 border-dashed border-t"></div>
                <span>Market Median</span>
              </div>
            )}
            {competitorPrices.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500 border-dotted border-t"></div>
                <span>Competitors</span>
              </div>
            )}
          </div>
        </div>

        {/* Price Adjustment Slider */}
        <div className="space-y-4">
          <h4 className="font-medium">Adjust Price to See Impact</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>${minPrice.toLocaleString()}</span>
              <span>Price Range</span>
              <span>${maxPrice.toLocaleString()}</span>
            </div>
            <Slider
              value={[selectedPrice]}
              onValueChange={(value) => handlePriceAdjustment(value[0])}
              min={minPrice}
              max={maxPrice}
              step={100}
              className="w-full"
            />
            <div className="text-center">
              <span className="text-lg font-medium">
                ${selectedPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Insights and Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Price Sensitivity */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Price Sensitivity
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                {sensitivityLevel.description}
              </p>
              <div className="text-xs text-gray-500">
                Sensitivity Score: {(sensitivity * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card
            className={`${
              recommendation.type === "optimal"
                ? "bg-green-50 border-green-200"
                : recommendation.type === "increase"
                  ? "bg-orange-50 border-orange-200"
                  : "bg-red-50 border-red-200"
            }`}
          >
            <CardContent className="p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Recommendation
              </h4>
              <p className={`text-sm ${recommendation.color}`}>
                {recommendation.message}
              </p>
              {recommendation.type !== "optimal" && (
                <div className="text-xs text-gray-500 mt-2">
                  Optimal: ${optimalPrice.toLocaleString()}(
                  {(
                    calculateProbabilityAtPrice(optimalPrice, pricePoints) * 100
                  ).toFixed(1)}
                  % win rate)
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Advanced Metrics */}
        <div className="space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? "Hide" : "Show"} Advanced Metrics
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <h5 className="font-medium text-sm mb-2">
                  Expected Value Comparison
                </h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Current:</span>
                    <span className="font-medium">
                      ${expectedValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Optimal:</span>
                    <span className="font-medium">
                      ${optimalExpectedValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Difference:</span>
                    <span
                      className={`font-medium ${
                        expectedValue >= optimalExpectedValue
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      $
                      {Math.abs(
                        expectedValue - optimalExpectedValue,
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-sm mb-2">Market Position</h5>
                <div className="space-y-1 text-sm">
                  {marketMedian && (
                    <div className="flex justify-between">
                      <span>vs Market:</span>
                      <span className="font-medium">
                        {((selectedPrice / marketMedian - 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Risk Level:</span>
                    <Badge variant="outline" className="text-xs">
                      {currentProbability > 0.7
                        ? "Low"
                        : currentProbability > 0.5
                          ? "Medium"
                          : "High"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warnings */}
        {currentProbability < 0.3 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Win probability is very low at this price point. Consider reducing
              price or enhancing value proposition.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

// Export memoized component for performance
export const WinProbabilityCalculator = React.memo(
  WinProbabilityCalculatorComponent,
  (prevProps, nextProps) => {
    // Custom comparison function for memo
    return (
      prevProps.currentPrice === nextProps.currentPrice &&
      prevProps.winProbability === nextProps.winProbability &&
      prevProps.optimalPrice === nextProps.optimalPrice &&
      prevProps.marketMedian === nextProps.marketMedian &&
      JSON.stringify(prevProps.pricePoints) ===
        JSON.stringify(nextProps.pricePoints) &&
      JSON.stringify(prevProps.competitorPrices) ===
        JSON.stringify(nextProps.competitorPrices)
    );
  },
);

WinProbabilityCalculator.displayName = "WinProbabilityCalculator";
