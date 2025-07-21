import { useState, useEffect } from "react";
import { error as logError } from "@/lib/utils/logger";
import {
  DollarSign,
  Truck,
  Package,
  Users,
  Calculator,
  FileSpreadsheet,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Eye,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Import new expense management components
import { EquipmentSelector } from "@/lib/expenses/equipment-database";
import { MaterialCalculator } from "@/lib/expenses/materials-database";
import { LaborCalculator } from "@/lib/expenses/labor-calculator";
import { VendorSelector } from "@/components/expenses/VendorSelector";
import { CostBreakdown } from "@/components/expenses/CostBreakdown";
import { HistoricalComparison } from "@/components/expenses/HistoricalComparison";
import { MarginAdjustment } from "@/components/expenses/MarginAdjustment";
import { ExpensesStepData, GuidedFlowData } from "@/lib/types/estimate-types";

interface Equipment {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  quantity: number;
  days: number;
  total: number;
  vendor: string;
  required?: boolean;
}

interface Material {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  quantity: number;
  total: number;
  service: string;
  vendor: string;
  coverage?: number;
}

interface Labor {
  id: string;
  role: string;
  hourlyRate: number;
  hours: number;
  total: number;
  service: string;
  benefits?: number;
}

interface OtherCost {
  id: string;
  description: string;
  amount: number;
  category: string;
}

interface TotalCosts {
  equipment: number;
  materials: number;
  labor: number;
  other: number;
  grand: number;
}

interface Margins {
  equipment: number;
  materials: number;
  labor: number;
  other: number;
}

interface ExpensesProps {
  data: GuidedFlowData;
  onUpdate: (stepData: Partial<GuidedFlowData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Expenses({ data, onUpdate, onNext, onBack }: ExpensesProps) {
  const [expensesData, setExpensesData] = useState<ExpensesStepData>({
    equipment: data?.expenses?.equipment || [],
    materials: data?.expenses?.materials || [],
    labor: data?.expenses?.labor || [],
    otherCosts: data?.expenses?.otherCosts || [],
    totalCosts: data?.expenses?.totalCosts || {
      equipment: 0,
      materials: 0,
      labor: 0,
      other: 0,
      grand: 0,
    },
    margins: data?.expenses?.margins || {
      equipment: 15,
      materials: 20,
      labor: 35,
      other: 15,
    },
  });

  // Sync local state with parent data
  useEffect(() => {
    if (data?.expenses) {
      setExpensesData(data.expenses);
    }
  }, [data?.expenses]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showVendorSelector, setShowVendorSelector] = useState<{
    type: "equipment" | "material";
    item: any;
    index: number;
  } | null>(null);
  const [showAddOther, setShowAddOther] = useState(false);

  // Extract data from previous steps
  const selectedServices = data.scopeDetails?.selectedServices || [];
  const measurements = data.takeoff?.measurements || [];
  const serviceDurations = data.duration?.serviceDurations || [];
  const buildingHeight = Math.ceil(
    (data.filesPhotos?.summary?.measurements?.buildingHeight || 40) / 10,
  );
  const buildingType =
    data.initialContact?.aiExtractedData?.requirements?.buildingType ||
    "office";
  const location =
    data.initialContact?.aiExtractedData?.requirements?.location || "";

  useEffect(() => {
    calculateInitialCosts();
  }, [selectedServices, measurements, serviceDurations, buildingHeight]);

  const calculateInitialCosts = async () => {
    setLoading(true);

    try {
      // Calculate equipment needs
      const equipmentSelector = new EquipmentSelector();
      const totalDuration = serviceDurations.reduce(
        (sum: number, sd: any) => sum + sd.finalDuration,
        0,
      );
      const requiredEquipment = equipmentSelector.selectRequiredEquipment(
        selectedServices,
        totalDuration,
        buildingHeight,
      );

      // Calculate material needs
      const materialCalculator = new MaterialCalculator();
      const requiredMaterials = materialCalculator.calculateRequiredMaterials(
        selectedServices,
        measurements as any, // Type conversion for legacy compatibility
      );

      // Calculate labor costs
      const laborCalculator = new LaborCalculator();
      const laborCosts = laborCalculator.calculateLaborCosts(
        serviceDurations,
        buildingHeight,
      );

      // Convert to expected format
      const equipment = requiredEquipment.map((req) => ({
        id: req.equipment.id,
        name: req.equipment.name,
        category: req.equipment.category,
        dailyRate: req.rate,
        quantity: req.quantity,
        days: req.days,
        total: req.totalCost,
        vendor: req.vendor || "TBD",
        required: true,
      }));

      const materials = requiredMaterials.map((req) => ({
        id: req.material.id,
        name: req.material.name,
        unit: req.material.unit,
        unitCost: req.material.unitCost,
        quantity: req.adjustedQuantity,
        total: req.totalCost,
        service: req.service,
        vendor: req.vendor || "TBD",
        coverage: req.material.coverage,
      }));

      const labor = laborCosts.map((cost) => ({
        id: `${cost.service}-${cost.roleId}`,
        role: cost.role,
        hourlyRate: cost.hourlyRate,
        hours: cost.totalHours,
        total: cost.totalCost,
        service: cost.service,
        benefits: cost.benefitsRate,
      }));

      const totalCosts = calculateTotalCosts(equipment, materials, labor, []);

      setExpensesData({
        equipment,
        materials,
        labor,
        otherCosts: [],
        totalCosts,
        margins: { equipment: 15, materials: 20, labor: 35, other: 15 },
      });
    } catch (error) {
      logError("Cost calculation failed", {
        error,
        component: "Expenses",
        action: "cost_calculation",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCosts = (
    equipment: Equipment[],
    materials: Material[],
    labor: Labor[],
    other: OtherCost[],
  ): TotalCosts => {
    const equipmentTotal = equipment.reduce((sum, item) => sum + item.total, 0);
    const materialsTotal = materials.reduce((sum, item) => sum + item.total, 0);
    const laborTotal = labor.reduce((sum, item) => sum + item.total, 0);
    const otherTotal = other.reduce((sum, item) => sum + item.amount, 0);

    return {
      equipment: equipmentTotal,
      materials: materialsTotal,
      labor: laborTotal,
      other: otherTotal,
      grand: equipmentTotal + materialsTotal + laborTotal + otherTotal,
    };
  };

  const getMarkedUpTotals = () => {
    const { equipment, materials, labor, other } = expensesData.totalCosts;
    const { margins } = expensesData;

    const equipmentMarked = equipment * (1 + margins.equipment / 100);
    const materialsMarked = materials * (1 + margins.materials / 100);
    const laborMarked = labor * (1 + margins.labor / 100);
    const otherMarked = other * (1 + margins.other / 100);

    return {
      equipment: equipmentMarked,
      materials: materialsMarked,
      labor: laborMarked,
      other: otherMarked,
      grand: equipmentMarked + materialsMarked + laborMarked + otherMarked,
    };
  };

  const markedUpTotals = getMarkedUpTotals();

  const handleVendorSelect = (vendor: any, pricing: any) => {
    if (!showVendorSelector) return;

    const { type, index } = showVendorSelector;
    const updated = { ...expensesData };

    if (type === "equipment") {
      updated.equipment[index] = {
        ...updated.equipment[index],
        vendor: vendor.name,
        dailyRate: pricing.dailyRate || updated.equipment[index].dailyRate,
        total:
          (pricing.dailyRate || updated.equipment[index].dailyRate) *
          updated.equipment[index].quantity *
          updated.equipment[index].days,
      };
    } else {
      updated.materials[index] = {
        ...updated.materials[index],
        vendor: vendor.name,
        unitCost: pricing.unitCost || updated.materials[index].unitCost,
        total:
          (pricing.unitCost || updated.materials[index].unitCost) *
          updated.materials[index].quantity,
      };
    }

    updated.totalCosts = calculateTotalCosts(
      updated.equipment,
      updated.materials,
      updated.labor,
      updated.otherCosts,
    );

    setExpensesData(updated);
    setShowVendorSelector(null);
  };

  const handleAddOtherCost = (
    description: string,
    amount: number,
    category: string,
  ) => {
    const newCost: OtherCost = {
      id: Date.now().toString(),
      description,
      amount,
      category,
    };

    const updated = {
      ...expensesData,
      otherCosts: [...expensesData.otherCosts, newCost],
    };

    updated.totalCosts = calculateTotalCosts(
      updated.equipment,
      updated.materials,
      updated.labor,
      updated.otherCosts,
    );

    setExpensesData(updated);
    setShowAddOther(false);
  };

  const handleMarginUpdate = (newMargins: Margins) => {
    setExpensesData({
      ...expensesData,
      margins: newMargins,
    });
  };

  const handleNext = () => {
    onUpdate({
      expenses: {
        ...expensesData,
        markedUpTotals,
      },
    });
    onNext();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calculator className="w-8 h-8 animate-pulse mx-auto mb-4" />
          <p>Calculating project expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Project Expenses</h2>
        <p className="text-muted-foreground">
          Comprehensive cost breakdown with equipment, materials, labor, and
          overhead
        </p>
      </div>

      {/* Cost Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Truck className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-blue-600">
              ${expensesData.totalCosts.equipment.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Equipment</p>
            <p className="text-xs text-blue-600">
              +{expensesData.margins.equipment}% = $
              {markedUpTotals.equipment.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-green-600">
              ${expensesData.totalCosts.materials.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Materials</p>
            <p className="text-xs text-green-600">
              +{expensesData.margins.materials}% = $
              {markedUpTotals.materials.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-purple-600">
              ${expensesData.totalCosts.labor.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Labor</p>
            <p className="text-xs text-purple-600">
              +{expensesData.margins.labor}% = $
              {markedUpTotals.labor.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <FileSpreadsheet className="w-6 h-6 mx-auto mb-2 text-orange-600" />
            <p className="text-2xl font-bold text-orange-600">
              ${expensesData.totalCosts.other.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Other</p>
            <p className="text-xs text-orange-600">
              +{expensesData.margins.other}% = $
              {markedUpTotals.other.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
            <p className="text-2xl font-bold text-indigo-600">
              ${expensesData.totalCosts.grand.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Direct Cost</p>
            <p className="text-xs font-medium text-indigo-700">
              ${markedUpTotals.grand.toLocaleString()} final
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Breakdown */}
            <CostBreakdown
              equipment={expensesData.equipment.map((eq) => ({
                id: eq.id,
                name: eq.name,
                quantity: eq.quantity,
                rate: eq.dailyRate,
                days: eq.days,
                totalCost: eq.total,
                services: selectedServices,
              }))}
              materials={expensesData.materials.map((mat) => ({
                id: mat.id,
                name: mat.name,
                quantity: mat.quantity,
                unitCost: mat.unitCost,
                totalCost: mat.total,
                service: mat.service,
                category: "material",
              }))}
              labor={expensesData.labor.map((lab) => ({
                service: lab.service,
                role: lab.role,
                regularHours: lab.hours * 0.9, // Assume 90% regular
                overtimeHours: lab.hours * 0.1, // Assume 10% overtime
                totalHours: lab.hours,
                totalCost: lab.total,
                workers: 1,
              }))}
              other={expensesData.otherCosts.map((other) => ({
                id: other.id,
                description: other.description,
                amount: other.amount,
                category: other.category,
              }))}
              margins={expensesData.margins}
              services={selectedServices}
            />

            {/* Margin Adjustment */}
            <MarginAdjustment
              margins={expensesData.margins}
              onUpdate={handleMarginUpdate}
              directCosts={{
                equipment: expensesData.totalCosts.equipment,
                materials: expensesData.totalCosts.materials,
                labor: expensesData.totalCosts.labor,
                other: expensesData.totalCosts.other,
                total: expensesData.totalCosts.grand,
              }}
              projectType={buildingType}
            />
          </div>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Equipment Rental
              </CardTitle>
              <CardDescription>
                Auto-selected based on services and building height
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expensesData.equipment.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">
                          {item.category} • {item.quantity} unit(s) •{" "}
                          {item.days} days
                        </p>
                        <p className="text-sm text-gray-600">
                          Vendor: {item.vendor}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ${item.total.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          ${item.dailyRate}/day
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowVendorSelector({
                              type: "equipment",
                              item,
                              index,
                            })
                          }
                          className="mt-2"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Change Vendor
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Materials & Supplies
              </CardTitle>
              <CardDescription>
                Calculated based on coverage requirements and measurements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expensesData.materials.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">
                          For {item.service} • {item.quantity} {item.unit}
                        </p>
                        <p className="text-sm text-gray-600">
                          Vendor: {item.vendor}
                        </p>
                        {item.coverage && (
                          <p className="text-xs text-gray-500">
                            Coverage: {item.coverage} sq ft per {item.unit}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ${item.total.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          ${item.unitCost}/{item.unit}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setShowVendorSelector({
                              type: "material",
                              item,
                              index,
                            })
                          }
                          className="mt-2"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Change Vendor
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Labor Costs
              </CardTitle>
              <CardDescription>
                Based on crew requirements and duration estimates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-2">Service</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-center p-2">Hours</th>
                      <th className="text-center p-2">Rate</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expensesData.labor.map((item, index) => (
                      <tr key={item.id}>
                        <td className="p-2">{item.service}</td>
                        <td className="p-2">{item.role}</td>
                        <td className="p-2 text-center">{item.hours}</td>
                        <td className="p-2 text-center">
                          ${item.hourlyRate}/hr
                        </td>
                        <td className="p-2 text-right font-medium">
                          ${item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Other Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Other Costs
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddOther(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cost
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expensesData.otherCosts.length > 0 ? (
                <div className="space-y-2">
                  {expensesData.otherCosts.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <p className="font-bold">
                        ${item.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No additional costs added
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Historical Comparison */}
          <HistoricalComparison
            currentCosts={{
              equipment: expensesData.totalCosts.equipment,
              materials: expensesData.totalCosts.materials,
              labor: expensesData.totalCosts.labor,
              other: expensesData.totalCosts.other,
              total: expensesData.totalCosts.grand,
            }}
            buildingType={buildingType}
            services={selectedServices}
            location={location}
          />
        </TabsContent>
      </Tabs>

      {/* Vendor Selector Modal */}
      {showVendorSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <VendorSelector
              type={showVendorSelector.type}
              item={showVendorSelector.item}
              onSelect={handleVendorSelect}
              onCancel={() => setShowVendorSelector(null)}
            />
          </div>
        </div>
      )}

      {/* Add Other Cost Modal */}
      {showAddOther && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Other Cost</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Input id="description" placeholder="Enter cost description" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <Input id="amount" type="number" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Category
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permits">Permits & Fees</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="travel">
                      Travel & Transportation
                    </SelectItem>
                    <SelectItem value="misc">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const description = (
                      document.getElementById("description") as HTMLInputElement
                    )?.value;
                    const amount = parseFloat(
                      (document.getElementById("amount") as HTMLInputElement)
                        ?.value || "0",
                    );
                    const category = "misc"; // Would get from select
                    if (description && amount > 0) {
                      handleAddOtherCost(description, amount, category);
                    }
                  }}
                  className="flex-1"
                >
                  Add Cost
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddOther(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Back to Duration
        </Button>
        <Button onClick={handleNext}>Continue to Final Review</Button>
      </div>
    </div>
  );
}
