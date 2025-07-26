"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useEstimateFlow } from "../../EstimateFlowProvider";
import { ServiceType, Expense } from "@/lib/types/estimate-types";
import {
  Clock,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  Plus,
  Trash2,
  Calculator,
  AlertCircle,
  TrendingUp,
  Percent,
  Sparkles,
  Package,
  Truck,
  Shield,
  Wrench,
  Info,
} from "lucide-react";
import { RealTimeCostBreakdown } from "../RealTimeCostBreakdown";
import { SmartDefaultsProvider } from "@/components/ai/SmartDefaultsProvider";
import { validateClientEnv } from "@/lib/config/env-validation";
import { cn } from "@/lib/utils";

// Common expense templates
const EXPENSE_TEMPLATES = [
  { name: "Materials", icon: Package, category: "materials" },
  { name: "Equipment Rental", icon: Wrench, category: "equipment" },
  { name: "Transportation", icon: Truck, category: "transport" },
  { name: "Insurance", icon: Shield, category: "insurance" },
  { name: "Supplies", icon: Briefcase, category: "supplies" },
];

export default function UnifiedPricing() {
  const { flowData, updateFlowData, validateCurrentStep } = useEstimateFlow();
  const env = validateClientEnv();

  // Duration state
  const [workDays, setWorkDays] = useState(
    flowData.duration?.workDays?.toString() || "1",
  );
  const [hoursPerDay, setHoursPerDay] = useState(
    flowData.duration?.hoursPerDay?.toString() || "8",
  );
  const [workers, setWorkers] = useState(
    flowData.duration?.workers?.toString() || "2",
  );
  const [startDate, setStartDate] = useState(
    flowData.duration?.startDate || "",
  );
  const [endDate, setEndDate] = useState(flowData.duration?.endDate || "");

  // Pricing state
  const [pricingMethod, setPricingMethod] = useState<"hourly" | "fixed">(
    flowData.pricing?.pricingMethod || "hourly",
  );
  const [hourlyRate, setHourlyRate] = useState(
    flowData.pricing?.hourlyRate?.toString() || "75",
  );
  const [fixedPrice, setFixedPrice] = useState(
    flowData.pricing?.fixedPrice?.toString() || "",
  );
  const [markup, setMarkup] = useState(
    flowData.pricing?.markup?.toString() || "35",
  );
  const [taxRate, setTaxRate] = useState(
    flowData.pricing?.taxRate?.toString() || "8.25",
  );
  const [includeTax, setIncludeTax] = useState(
    flowData.pricing?.includeTax ?? true,
  );

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>(
    flowData.expenses?.items || [],
  );
  const [showExpenses, setShowExpenses] = useState(
    expenses.length > 0 || false,
  );

  // Validation state
  const [errors, setErrors] = useState<string[]>([]);

  // Calculate total hours
  const totalHours =
    parseFloat(workDays) * parseFloat(hoursPerDay) * parseFloat(workers);

  // Calculate labor cost
  const laborCost =
    pricingMethod === "hourly"
      ? totalHours * parseFloat(hourlyRate)
      : parseFloat(fixedPrice) || 0;

  // Calculate total expenses
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0,
  );

  // Calculate subtotal
  const subtotal = laborCost + totalExpenses;

  // Calculate markup amount
  const markupAmount = subtotal * (parseFloat(markup) / 100);

  // Calculate total before tax
  const totalBeforeTax = subtotal + markupAmount;

  // Calculate tax amount
  const taxAmount = includeTax
    ? totalBeforeTax * (parseFloat(taxRate) / 100)
    : 0;

  // Calculate final total
  const totalPrice = totalBeforeTax + taxAmount;

  // Update end date when start date or work days change
  useEffect(() => {
    if (startDate && workDays) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + parseInt(workDays) - 1);
      setEndDate(end.toISOString().split("T")[0]);
    }
  }, [startDate, workDays]);

  // Update flow data
  useEffect(() => {
    updateFlowData({
      duration: {
        workDays: parseInt(workDays) || 1,
        hoursPerDay: parseFloat(hoursPerDay) || 8,
        workers: parseInt(workers) || 1,
        totalHours,
        startDate,
        endDate,
      },
      pricing: {
        pricingMethod,
        hourlyRate: parseFloat(hourlyRate) || 0,
        fixedPrice: parseFloat(fixedPrice) || 0,
        laborCost,
        markup: parseFloat(markup) || 0,
        markupAmount,
        taxRate: parseFloat(taxRate) || 0,
        taxAmount,
        includeTax,
        subtotal,
        totalPrice,
      },
      expenses: {
        items: expenses,
        totalAmount: totalExpenses,
      },
    });
  }, [
    workDays,
    hoursPerDay,
    workers,
    startDate,
    endDate,
    pricingMethod,
    hourlyRate,
    fixedPrice,
    markup,
    taxRate,
    includeTax,
    expenses,
    totalHours,
    laborCost,
    totalExpenses,
    subtotal,
    markupAmount,
    taxAmount,
    totalPrice,
  ]);

  // Add expense
  const addExpense = (template?: (typeof EXPENSE_TEMPLATES)[0]) => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      name: template?.name || "",
      category: template?.category || "other",
      amount: 0,
      quantity: 1,
      unitPrice: 0,
    };
    setExpenses([...expenses, newExpense]);
  };

  // Remove expense
  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  // Update expense
  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(
      expenses.map((e) => {
        if (e.id === id) {
          const updated = { ...e, ...updates };
          // Auto-calculate amount if quantity and unit price are set
          if (
            updates.quantity !== undefined ||
            updates.unitPrice !== undefined
          ) {
            updated.amount = (updated.quantity || 0) * (updated.unitPrice || 0);
          }
          return updated;
        }
        return e;
      }),
    );
  };

  // Validate pricing
  useEffect(() => {
    const validation = validateCurrentStep();
    setErrors(validation.errors);
  }, [totalPrice]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Duration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline & Resources
          </CardTitle>
          <CardDescription>How long will this project take?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workDays" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Work Days
              </Label>
              <Input
                id="workDays"
                type="number"
                min="1"
                value={workDays}
                onChange={(e) => setWorkDays(e.target.value)}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hoursPerDay" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hours per Day
              </Label>
              <Input
                id="hoursPerDay"
                type="number"
                min="1"
                max="24"
                step="0.5"
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
                placeholder="8"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Workers
              </Label>
              <Input
                id="workers"
                type="number"
                min="1"
                value={workers}
                onChange={(e) => setWorkers(e.target.value)}
                placeholder="2"
              />
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                readOnly
                className="bg-bg-subtle"
              />
            </div>
          </div>

          <div className="bg-bg-subtle rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Total Labor Hours:</span>
              <span className="font-semibold">
                {totalHours.toFixed(1)} hours
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Strategy
          </CardTitle>
          <CardDescription>Set your pricing and profit margins</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pricing Method Selection */}
          <Tabs
            value={pricingMethod}
            onValueChange={(v) => setPricingMethod(v as any)}
          >
            <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
              <TabsTrigger value="hourly">Hourly Rate</TabsTrigger>
              <TabsTrigger value="fixed">Fixed Price</TabsTrigger>
            </TabsList>

            <TabsContent value="hourly" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Hourly Rate
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    $
                  </span>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="0"
                    step="5"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="pl-8"
                    placeholder="75"
                  />
                </div>
                <p className="text-xs text-text-secondary">
                  Based on {totalHours.toFixed(1)} total hours
                </p>
              </div>
            </TabsContent>

            <TabsContent value="fixed" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="fixedPrice" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Fixed Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    $
                  </span>
                  <Input
                    id="fixedPrice"
                    type="number"
                    min="0"
                    step="100"
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    className="pl-8"
                    placeholder="5000"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Markup */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="markup" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Markup / Profit Margin
              </Label>
              <span className="text-sm font-medium">{markup}%</span>
            </div>
            <Slider
              id="markup"
              min={0}
              max={100}
              step={5}
              value={[parseFloat(markup)]}
              onValueChange={(v) => setMarkup(v[0].toString())}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-secondary">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          <Separator />

          {/* Tax */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="includeTax" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Include Tax
              </Label>
              <Switch
                id="includeTax"
                checked={includeTax}
                onCheckedChange={setIncludeTax}
              />
            </div>

            {includeTax && (
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="20"
                  step="0.25"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="8.25"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expenses Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Additional Expenses
              </CardTitle>
              <CardDescription>
                Materials, equipment, and other costs
              </CardDescription>
            </div>
            <Switch checked={showExpenses} onCheckedChange={setShowExpenses} />
          </div>
        </CardHeader>

        {showExpenses && (
          <CardContent className="space-y-4">
            {/* Quick Add Templates */}
            <div className="flex flex-wrap gap-2">
              {EXPENSE_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <Button
                    key={template.category}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addExpense(template)}
                    className="flex items-center gap-1"
                  >
                    <Icon className="h-3 w-3" />
                    {template.name}
                  </Button>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addExpense()}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Custom
              </Button>
            </div>

            {/* Expense List */}
            {expenses.length > 0 && (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="p-3">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Input
                          value={expense.name}
                          onChange={(e) =>
                            updateExpense(expense.id, { name: e.target.value })
                          }
                          placeholder="Expense name"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExpense(expense.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={expense.quantity}
                            onChange={(e) =>
                              updateExpense(expense.id, {
                                quantity: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="1"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Unit Price</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                              $
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={expense.unitPrice}
                              onChange={(e) =>
                                updateExpense(expense.id, {
                                  unitPrice: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="pl-6"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Total</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                              $
                            </span>
                            <Input
                              type="number"
                              value={expense.amount?.toFixed(2)}
                              readOnly
                              className="pl-6 bg-bg-subtle"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Expenses Total */}
                <div className="bg-bg-subtle rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Total Expenses:</span>
                    <span className="font-semibold">
                      ${totalExpenses.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Real-time Cost Breakdown */}
      <RealTimeCostBreakdown />

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-medium">Please fix the following:</p>
          </div>
          <ul className="list-disc list-inside space-y-1 mt-2">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-600">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
