"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  windowCleaningSchema,
  type WindowCleaningFormData,
} from "@/lib/schemas/service-forms";
import { WindowCleaningCalculator } from "@/lib/calculations/services/window-cleaning";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { calculationError } from "@/lib/utils/logger";
import { Sparkles, Calculator, Info, AlertTriangle } from "lucide-react";

interface WindowCleaningFormProps {
  onSubmit: (result: any) => void;
  onCancel: () => void;
}

export function WindowCleaningForm({
  onSubmit,
  onCancel,
}: WindowCleaningFormProps) {
  const [calculation, setCalculation] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const form = useForm<WindowCleaningFormData>({
    resolver: zodResolver(windowCleaningSchema),
    defaultValues: {
      location: "raleigh",
      crewSize: 2,
      shiftLength: 8,
      workWeek: 5,
      numberOfDrops: 1,
      buildingHeightStories: 1,
      hasRoofAnchors: false,
    },
  });

  // Calculate estimate in real-time using subscription
  useEffect(() => {
    const subscription = form.watch((values) => {
      const {
        glassArea,
        location,
        buildingHeightStories,
        numberOfDrops,
        crewSize,
        shiftLength,
      } = values;
      if (
        glassArea &&
        glassArea > 0 &&
        location &&
        buildingHeightStories &&
        numberOfDrops &&
        crewSize &&
        shiftLength
      ) {
        setIsCalculating(true);
        setTimeout(() => {
          try {
            const calculator = new WindowCleaningCalculator();
            const result = calculator.calculate(values as any);
            setCalculation(result);
          } catch (error) {
            calculationError(new Error("Window cleaning calculation failed"), {
              error,
              formData: watchedValues,
            });
            setCalculation(null);
          } finally {
            setIsCalculating(false);
          }
        }, 300);
      } else {
        setCalculation(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // For derived values, use form.watch directly in render
  const watchedValues = form.watch();
  const estimatedWindows = watchedValues.glassArea
    ? Math.ceil(watchedValues.glassArea / 24)
    : 0;
  const hourlyRate = watchedValues.location === "charlotte" ? 65 : 75;
  const accessMethod = getAccessMethod(
    watchedValues.buildingHeightStories,
    watchedValues.hasRoofAnchors,
  );

  function getAccessMethod(
    heightStories: number,
    hasRoofAnchors: boolean,
  ): string {
    if (heightStories <= 1) return "Ground Level";
    if (heightStories <= 4) return "Scissor Lift";
    if (heightStories <= 9) return "Boom Lift";
    if (heightStories <= 15 && hasRoofAnchors)
      return "RDS (Rope Descent System)";
    if (heightStories > 15) return "RDS Required";
    return "High-reach Boom Lift";
  }

  const handleSubmit = (data: WindowCleaningFormData) => {
    if (calculation) {
      onSubmit(calculation);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-feedback-success" />
          <h3 className="text-lg font-semibold">Window Cleaning Details</h3>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Building Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Building Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="glassArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Glass Area (sq ft)*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1200"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Total glass surface area to clean
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="buildingHeightStories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (Stories)*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="8"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Building height determines access method
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numberOfDrops"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Drops</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Access locations around building
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location*</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="raleigh">
                              Raleigh ($75/hr)
                            </SelectItem>
                            <SelectItem value="charlotte">
                              Charlotte ($65/hr)
                            </SelectItem>
                            <SelectItem value="greensboro">
                              Greensboro ($75/hr)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Real-time feedback */}
                <div className="grid grid-cols-2 gap-4">
                  {estimatedWindows > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Info className="h-4 w-4 text-feedback-success" />
                      <span className="text-sm text-foreground">
                        Estimated Windows: <strong>{estimatedWindows}</strong>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Info className="h-4 w-4 text-primary-action" />
                    <span className="text-sm text-foreground">
                      Access Method: <strong>{accessMethod}</strong>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Access Requirements */}
            {watchedValues.buildingHeightStories > 10 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">High-Rise Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="hasRoofAnchors"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Verified Roof Anchors</FormLabel>
                          <FormDescription>
                            Required for RDS (Rope Descent System) access
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {!watchedValues.hasRoofAnchors && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        High-rise buildings require verified roof anchors for
                        safe RDS access. Alternative access methods may increase
                        cost.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Project Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="crewSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Crew Size</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 Person</SelectItem>
                            <SelectItem value="2">2 People</SelectItem>
                            <SelectItem value="3">3 People</SelectItem>
                            <SelectItem value="4">4 People</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shiftLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift Length</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(parseInt(value))
                          }
                          defaultValue={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="8">8 Hours</SelectItem>
                            <SelectItem value="10">10 Hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!calculation || isCalculating}>
                {isCalculating ? "Calculating..." : "Add to Estimate"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Calculation Preview */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-feedback-success" />
          <h3 className="text-lg font-semibold">Price Calculation</h3>
        </div>

        {calculation ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Window Cleaning Estimate</span>
                <Badge variant="secondary">
                  ${calculation.basePrice.toLocaleString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-feedback-success">
                    {estimatedWindows}
                  </p>
                  <p className="text-sm text-muted-foreground">Windows</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-action">
                    ${hourlyRate}/hr
                  </p>
                  <p className="text-sm text-muted-foreground">Rate</p>
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Hours:</span>
                  <span>{calculation.totalHours.toFixed(1)} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Project Duration:</span>
                  <span>{calculation.projectDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Access Method:</span>
                  <span>{accessMethod}</span>
                </div>
              </div>

              {/* Equipment */}
              {calculation.equipment && (
                <>
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Equipment Rental</h4>
                    <div className="flex justify-between">
                      <span>{calculation.equipment.type}:</span>
                      <span>
                        ${calculation.equipment.cost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Warnings */}
              {calculation.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {calculation.warnings.map(
                        (warning: string, index: number) => (
                          <li key={index} className="text-sm">
                            {warning}
                          </li>
                        ),
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Total */}
              <div className="flex justify-between text-lg font-bold text-primary pt-4 border-t">
                <span>Total Price:</span>
                <span>${calculation.basePrice.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter glass area to see price calculation</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
