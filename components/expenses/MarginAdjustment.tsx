import { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, TrendingUp, AlertTriangle, Info, Target, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CostMargins {
  equipment: number;
  materials: number;
  labor: number;
  other: number;
}

interface MarginPreset {
  name: string;
  description: string;
  margins: CostMargins;
  recommended: string[];
}

interface MarginAdjustmentProps {
  margins: CostMargins;
  onUpdate: (margins: CostMargins) => void;
  directCosts?: {
    equipment: number;
    materials: number;
    labor: number;
    other: number;
    total: number;
  };
  projectType?: string;
}

const MARGIN_PRESETS: MarginPreset[] = [
  {
    name: 'Conservative',
    description: 'Lower margins for competitive pricing',
    margins: { equipment: 10, materials: 15, labor: 25, other: 10 },
    recommended: ['competitive bidding', 'large projects', 'repeat clients']
  },
  {
    name: 'Standard',
    description: 'Industry standard margins',
    margins: { equipment: 15, materials: 20, labor: 35, other: 15 },
    recommended: ['most projects', 'standard commercial work']
  },
  {
    name: 'Premium',
    description: 'Higher margins for specialized work',
    margins: { equipment: 20, materials: 25, labor: 45, other: 20 },
    recommended: ['specialized services', 'high-risk work', 'rush jobs']
  },
  {
    name: 'High-Risk',
    description: 'Maximum margins for complex projects',
    margins: { equipment: 25, materials: 30, labor: 50, other: 25 },
    recommended: ['high-rise work', 'restoration', 'emergency services']
  }
];

const MARGIN_GUIDELINES = {
  equipment: { min: 5, max: 30, target: 15, rationale: 'Cover rental risks and logistics' },
  materials: { min: 10, max: 35, target: 20, rationale: 'Account for waste and price volatility' },
  labor: { min: 20, max: 60, target: 35, rationale: 'Cover overhead, benefits, and expertise' },
  other: { min: 5, max: 25, target: 15, rationale: 'Miscellaneous costs and contingencies' }
};

export function MarginAdjustment({ 
  margins, 
  onUpdate, 
  directCosts,
  projectType = 'standard'
}: MarginAdjustmentProps) {
  const [editMode, setEditMode] = useState(false);
  const [tempMargins, setTempMargins] = useState<CostMargins>(margins);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    setTempMargins(margins);
  }, [margins]);

  const calculateImpact = () => {
    if (!directCosts) return null;

    const currentTotal = 
      directCosts.equipment * (1 + margins.equipment / 100) +
      directCosts.materials * (1 + margins.materials / 100) +
      directCosts.labor * (1 + margins.labor / 100) +
      directCosts.other * (1 + margins.other / 100);

    const newTotal = 
      directCosts.equipment * (1 + tempMargins.equipment / 100) +
      directCosts.materials * (1 + tempMargins.materials / 100) +
      directCosts.labor * (1 + tempMargins.labor / 100) +
      directCosts.other * (1 + tempMargins.other / 100);

    const difference = newTotal - currentTotal;
    const percentChange = currentTotal > 0 ? (difference / currentTotal) * 100 : 0;

    return {
      current: currentTotal,
      new: newTotal,
      difference,
      percentChange,
      profit: newTotal - directCosts.total
    };
  };

  const impact = calculateImpact();

  const handleSave = () => {
    onUpdate(tempMargins);
    setEditMode(false);
  };

  const handleCancel = () => {
    setTempMargins(margins);
    setEditMode(false);
  };

  const applyPreset = (preset: MarginPreset) => {
    setTempMargins(preset.margins);
    setSelectedPreset(preset.name);
  };

  const getMarginColor = (category: keyof CostMargins, value: number): string => {
    const guidelines = MARGIN_GUIDELINES[category];
    if (value < guidelines.min) return 'text-red-600';
    if (value > guidelines.max) return 'text-orange-600';
    if (Math.abs(value - guidelines.target) <= 5) return 'text-green-600';
    return 'text-blue-600';
  };

  const getMarginStatus = (category: keyof CostMargins, value: number): string => {
    const guidelines = MARGIN_GUIDELINES[category];
    if (value < guidelines.min) return 'Low Risk';
    if (value > guidelines.max) return 'High Margin';
    if (Math.abs(value - guidelines.target) <= 5) return 'Optimal';
    return value > guidelines.target ? 'Above Target' : 'Below Target';
  };

  const calculateBlendedMargin = (margins: CostMargins): number => {
    if (!directCosts || directCosts.total === 0) {
      return Object.values(margins).reduce((sum, margin) => sum + margin, 0) / Object.keys(margins).length;
    }

    const weightedMargin = 
      (margins.equipment * directCosts.equipment +
       margins.materials * directCosts.materials +
       margins.labor * directCosts.labor +
       margins.other * directCosts.other) / directCosts.total;

    return weightedMargin;
  };

  const blendedMargin = calculateBlendedMargin(tempMargins);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Profit Margin Configuration
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuidelines(!showGuidelines)}
            >
              <Info className="w-4 h-4 mr-2" />
              Guidelines
            </Button>
            <Button
              variant={editMode ? "outline" : "default"}
              size="sm"
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Cancel' : 'Adjust Margins'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {showGuidelines && (
          <Alert className="mb-4">
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Margin Guidelines:</strong> Equipment (15%), Materials (20%), Labor (35%), Other (15%). 
              Adjust based on project risk, competition, and market conditions.
            </AlertDescription>
          </Alert>
        )}

        {editMode ? (
          <Tabs defaultValue="adjust" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="adjust">Adjust Margins</TabsTrigger>
              <TabsTrigger value="presets">Presets</TabsTrigger>
            </TabsList>

            <TabsContent value="adjust" className="space-y-4">
              {/* Margin Adjustments */}
              <div className="space-y-6">
                {Object.entries(tempMargins).map(([category, value]) => {
                  const guidelines = MARGIN_GUIDELINES[category as keyof CostMargins];
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="capitalize font-medium">{category}</Label>
                        <div className="flex items-center gap-2">
                          <Badge className={getMarginColor(category as keyof CostMargins, value)}>
                            {getMarginStatus(category as keyof CostMargins, value)}
                          </Badge>
                          <Input
                            type="number"
                            value={value}
                            onChange={(e) => setTempMargins({
                              ...tempMargins,
                              [category]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                            })}
                            className="w-20 text-center"
                            min="0"
                            max="100"
                          />
                          <span className="text-sm font-medium">%</span>
                        </div>
                      </div>
                      
                      <div className="px-2">
                        <Slider
                          value={[value]}
                          onValueChange={(newValue) => setTempMargins({
                            ...tempMargins,
                            [category]: newValue[0]
                          })}
                          max={60}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{guidelines.min}% min</span>
                          <span>{guidelines.target}% target</span>
                          <span>{guidelines.max}% max</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-600 px-2">
                        {guidelines.rationale}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Impact Analysis */}
              {impact && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Cost Impact Analysis
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Current Total:</p>
                      <p className="font-medium">${impact.current.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">New Total:</p>
                      <p className="font-medium">${impact.new.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Difference:</p>
                      <p className={`font-medium ${impact.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {impact.difference >= 0 ? '+' : ''}${impact.difference.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Change:</p>
                      <p className={`font-medium ${impact.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {impact.percentChange >= 0 ? '+' : ''}{impact.percentChange.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm">
                      <span className="text-gray-600">Gross Profit: </span>
                      <span className="font-medium text-green-600">${impact.profit.toFixed(2)}</span>
                      <span className="text-gray-600 ml-2">
                        ({((impact.profit / impact.new) * 100).toFixed(1)}% margin)
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Blended Margin Display */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Blended Margin:</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xl font-bold">{blendedMargin.toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {directCosts ? 'Weighted by cost category' : 'Simple average of all categories'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => applyPreset(MARGIN_PRESETS[1])} // Standard preset
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="presets" className="space-y-4">
              <div className="space-y-3">
                {MARGIN_PRESETS.map((preset) => (
                  <div
                    key={preset.name}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPreset === preset.name 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-medium">{preset.name}</h5>
                        <p className="text-sm text-gray-600">{preset.description}</p>
                      </div>
                      <Badge variant="outline">
                        {calculateBlendedMargin(preset.margins).toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                      <div>Equipment: {preset.margins.equipment}%</div>
                      <div>Materials: {preset.margins.materials}%</div>
                      <div>Labor: {preset.margins.labor}%</div>
                      <div>Other: {preset.margins.other}%</div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <strong>Recommended for:</strong> {preset.recommended.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Display Mode */
          <div className="space-y-4">
            {/* Current Margins Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(margins).map(([category, value]) => (
                <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 capitalize mb-1">{category}</p>
                  <p className={`text-2xl font-bold ${getMarginColor(category as keyof CostMargins, value)}`}>
                    {value}%
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {getMarginStatus(category as keyof CostMargins, value)}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Summary Statistics */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Blended Margin</p>
                  <p className="text-3xl font-bold text-green-700">{blendedMargin.toFixed(1)}%</p>
                </div>
                {impact && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Gross Profit</p>
                    <p className="text-xl font-bold text-green-600">${impact.profit.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Warnings */}
            {Object.entries(margins).some(([category, value]) => {
              const guidelines = MARGIN_GUIDELINES[category as keyof CostMargins];
              return value < guidelines.min;
            }) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some margins are below recommended minimums. This may impact profitability and ability to handle project risks.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}