import { useState, useEffect } from "react";
import { AIPricingEngine } from "@/lib/pricing/ai-pricing-engine";
import { MarketAnalysisService } from "@/lib/pricing/market-analysis";
import { WinProbabilityCalculator } from "@/components/pricing/WinProbabilityCalculator";
import { StrategyComparison } from "@/components/pricing/StrategyComparison";
import { RiskFactorAnalysis } from "@/components/pricing/RiskFactorAnalysis";
import { DiscountApproval } from "@/components/pricing/DiscountApproval";
import { ManualPriceOverride } from "@/components/pricing/ManualPriceOverride";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingStepData } from "@/lib/types/estimate-types";

export function Pricing({
  data,
  onUpdate,
  onNext,
  onBack,
}: {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [pricingRecommendation, setPricingRecommendation] = useState<any>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);
  const [finalPrice, setFinalPrice] = useState(0);
  const [showDiscountApproval, setShowDiscountApproval] = useState(false);

  const baseCost = data.expenses?.totalCosts?.total || 0;
  const markedUpTotal = data.expenses?.markedUpTotals?.total || 0;
  const services = data.scopeDetails?.selectedServices || [];
  const location =
    data.initialContact?.extractedData?.requirements?.location || "";
  const customerProfile = data.initialContact?.extractedData || {};

  useEffect(() => {
    calculateOptimalPricing();
  }, []);

  const calculateOptimalPricing = async () => {
    setLoading(true);

    // Get market analysis
    const marketService = new MarketAnalysisService();
    const marketData = await marketService.analyzeMarket(
      location,
      services,
      data.takeoff?.measurements?.reduce(
        (sum: number, m: any) => sum + m.total,
        0,
      ) || 10000,
    );

    // Prepare pricing factors
    const factors = {
      baseCost: markedUpTotal,
      margins: data.expenses?.margins || {
        equipment: 15,
        materials: 20,
        labor: 35,
      },
      marketData,
      customerProfile: {
        companySize: customerProfile.customer?.company ? "medium" : "small",
        timeline: customerProfile.timeline || {},
        priority:
          customerProfile.timeline?.flexibility === "urgent"
            ? "speed"
            : "value",
        previousVendors: [],
        budgetIndicators: customerProfile.budget || {},
      },
      projectComplexity: calculateComplexity(),
      competitorPricing: marketData.competitors,
      historicalWinRates: await loadHistoricalWinRates(),
    };

    // Calculate optimal pricing
    const pricingEngine = new AIPricingEngine();
    const recommendation = await pricingEngine.calculateOptimalPrice(
      factors as any,
      services,
      location,
    );

    setPricingRecommendation(recommendation);
    setSelectedStrategy(recommendation.alternativeStrategies[0]);
    setFinalPrice(recommendation.recommendedPrice);
    setLoading(false);
  };

  const calculateComplexity = () => {
    const heightScore =
      data.filesPhotos?.summary?.measurements?.stories > 5 ? 0.8 : 0.5;
    const serviceScore = services.length > 3 ? 0.7 : 0.4;
    const accessScore =
      data.scopeDetails?.accessRestrictions?.length > 0 ? 0.6 : 0.3;

    return {
      overall: (heightScore + serviceScore + accessScore) / 3,
      factors: {
        height: heightScore,
        services: serviceScore,
        access: accessScore,
      },
    };
  };

  const loadHistoricalWinRates = async () => {
    // Mock historical data - replace with actual API
    return [
      { pricePoint: markedUpTotal * 0.8, winRate: 0.85, projects: 15 },
      { pricePoint: markedUpTotal * 0.9, winRate: 0.75, projects: 20 },
      { pricePoint: markedUpTotal * 1.0, winRate: 0.6, projects: 25 },
      { pricePoint: markedUpTotal * 1.1, winRate: 0.45, projects: 18 },
      { pricePoint: markedUpTotal * 1.2, winRate: 0.3, projects: 10 },
      { pricePoint: markedUpTotal * 1.3, winRate: 0.15, projects: 5 },
    ];
  };

  const handleStrategySelect = (strategy: PricingStepData) => {
    setSelectedStrategy(strategy);
    setFinalPrice(strategy.price || strategy.finalPrice || 0);
  };

  const handlePriceOverride = (newPrice: number, reason: string) => {
    setFinalPrice(newPrice);

    // Check if discount approval needed
    const discountPercentage =
      ((markedUpTotal - newPrice) / markedUpTotal) * 100;
    if (discountPercentage > 10) {
      setShowDiscountApproval(true);
    }
  };

  const calculateRiskFactors = () => {
    const risks = [];

    // Weather risk
    if (data.duration?.weatherAnalysis?.riskScore > 0.5) {
      risks.push({
        category: "Weather Risk",
        description: "High probability of weather delays",
        impact: 5 + data.duration.weatherAnalysis.riskScore * 10,
        mitigation: "Include weather contingency days and contract terms",
        factors: ["Seasonal patterns", "Service weather sensitivity"],
      });
    }

    // Height risk
    if (data.filesPhotos?.summary?.measurements?.stories > 5) {
      risks.push({
        category: "Height Complexity",
        description:
          "Building height requires specialized equipment and safety measures",
        impact: 8,
        mitigation: "Ensure proper equipment and certified operators",
        factors: [
          "Lift rental costs",
          "Safety requirements",
          "Slower production",
        ],
      });
    }

    // Access risk
    if (data.scopeDetails?.accessRestrictions?.length > 0) {
      risks.push({
        category: "Access Restrictions",
        description: "Limited access may impact productivity",
        impact: 6,
        mitigation: "Coordinate access windows and adjust timeline",
        factors: data.scopeDetails.accessRestrictions,
      });
    }

    return risks;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Sparkles className="w-8 h-8 animate-pulse mx-auto mb-4" />
          <p>AI is calculating optimal pricing strategies...</p>
        </div>
      </div>
    );
  }

  const riskFactors = calculateRiskFactors();
  const totalRiskImpact = riskFactors.reduce((sum, r) => sum + r.impact, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Pricing Strategy</h2>
        <p className="text-gray-600">
          AI-optimized pricing based on market conditions and win probability.
        </p>
      </div>

      {/* Pricing Summary */}
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Base Cost</p>
            <p className="text-xl font-bold">${baseCost.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">With Margins</p>
            <p className="text-xl font-bold">
              ${markedUpTotal.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">AI Recommended</p>
            <p className="text-xl font-bold text-blue-600">
              ${pricingRecommendation?.recommendedPrice.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Final Price</p>
            <p className="text-2xl font-bold text-green-600">
              ${finalPrice.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Strategy Comparison */}
      <StrategyComparison
        strategies={[
          selectedStrategy,
          ...pricingRecommendation.alternativeStrategies,
        ]}
        currentStrategy={selectedStrategy}
        onSelectStrategy={handleStrategySelect as any}
      />

      {/* Win Probability Calculator */}
      <WinProbabilityCalculator
        currentPrice={finalPrice}
        winProbability={selectedStrategy?.winProbability || 0.5}
        pricePoints={pricingRecommendation.alternativeStrategies.map(
          (s: any) => ({
            price: s.price,
            probability: s.winProbability,
          }),
        )}
        optimalPrice={pricingRecommendation.recommendedPrice}
        onPriceChange={(price) => setFinalPrice(price)}
      />

      <div className="grid grid-cols-2 gap-6">
        {/* Risk Factors */}
        <RiskFactorAnalysis
          riskFactors={riskFactors as any}
          totalImpact={totalRiskImpact}
          projectValue={finalPrice}
        />

        {/* Manual Override */}
        <ManualPriceOverride
          currentPrice={finalPrice}
          onOverride={handlePriceOverride as any}
        />
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
          AI Pricing Insights
        </h3>
        <div className="space-y-3">
          {pricingRecommendation?.insights?.map((insight: any, i: number) => (
            <div key={i} className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0" />
              <p className="text-gray-700">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Discount Approval Modal */}
      {showDiscountApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-2xl w-full mx-4">
            <DiscountApproval
              basePrice={markedUpTotal}
              requestedPrice={finalPrice}
              discountPercentage={
                ((markedUpTotal - finalPrice) / markedUpTotal) * 100
              }
              reason={
                selectedStrategy?.adjustments?.[0]?.reason || "Manual override"
              }
              onApprove={() => setShowDiscountApproval(false)}
              onReject={() => {
                setFinalPrice(markedUpTotal);
                setShowDiscountApproval(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={() => {
            onUpdate({
              pricing: {
                basePrice: markedUpTotal,
                finalPrice,
                strategy: selectedStrategy,
                winProbability: selectedStrategy?.winProbability || 0.5,
                adjustments: selectedStrategy?.adjustments || [],
                riskFactors,
                confidence: pricingRecommendation?.confidence || 85,
              },
            });
            onNext();
          }}
        >
          Continue to Summary
        </Button>
      </div>
    </div>
  );
}
