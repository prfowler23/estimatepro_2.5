'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pressureWashingSchema, type PressureWashingFormData } from '@/lib/schemas/service-forms'
import { PressureWashingCalculator } from '@/lib/calculations/services/pressure-washing'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useEffect } from 'react'
import { AlertTriangle, Calculator, Droplets, Info } from 'lucide-react'

interface PressureWashingFormProps {
  onSubmit: (result: any) => void
  onCancel: () => void
}

export function PressureWashingForm({ onSubmit, onCancel }: PressureWashingFormProps) {
  const [calculation, setCalculation] = useState<any>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  
  const form = useForm<PressureWashingFormData>({
    resolver: zodResolver(pressureWashingSchema),
    defaultValues: {
      location: 'raleigh',
      crewSize: 2,
      shiftLength: 8,
      workWeek: 5,
      numberOfDrops: 1,
      buildingHeightStories: 1,
      surfaceType: 'regular',
      includesHardscapes: false,
    },
  })

  const watchedValues = form.watch()

  // Auto-calculate when form values change
  useEffect(() => {
    if (watchedValues.facadeArea > 0) {
      setIsCalculating(true)
      
      const timer = setTimeout(() => {
        try {
          const calculator = new PressureWashingCalculator()
          const result = calculator.calculate(watchedValues)
          setCalculation(result)
        } catch (error) {
          console.error('Calculation error:', error)
        } finally {
          setIsCalculating(false)
        }
      }, 500)

      return () => clearTimeout(timer)
    } else {
      setCalculation(null)
    }
  }, [watchedValues])

  const handleSubmit = () => {
    if (calculation) {
      onSubmit(calculation)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Droplets className="h-5 w-5 text-primary-action" />
        <h2 className="text-2xl font-bold">Pressure Washing Calculator</h2>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          High-pressure cleaning for building facades and flat surfaces. Pricing varies by surface type and location.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-4">
                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="raleigh">Raleigh</SelectItem>
                          <SelectItem value="charlotte">Charlotte</SelectItem>
                          <SelectItem value="greensboro">Greensboro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Facade Area */}
                <FormField
                  control={form.control}
                  name="facadeArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facade Area (sq ft)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter facade area"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Total facade area to be pressure washed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Surface Type */}
                <FormField
                  control={form.control}
                  name="surfaceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surface Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select surface type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regular">Regular Facade</SelectItem>
                          <SelectItem value="ornate">Ornate Facade</SelectItem>
                          <SelectItem value="mixed">Mixed Surfaces</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Regular: $0.35/sq ft, Ornate: $0.50/sq ft
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Flat Surface Area */}
                <FormField
                  control={form.control}
                  name="flatSurfaceArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flat Surface Area (sq ft) - Optional</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter flat surface area"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Sidewalks, patios, flat building surfaces
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Hardscapes */}
                <FormField
                  control={form.control}
                  name="includesHardscapes"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Includes Hardscapes
                        </FormLabel>
                        <FormDescription>
                          Driveways, walkways, parking areas
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Hardscape Area */}
                {watchedValues.includesHardscapes && (
                  <FormField
                    control={form.control}
                    name="hardscapeArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hardscape Area (sq ft)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter hardscape area"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Total hardscape area to be cleaned
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Building Height */}
                <FormField
                  control={form.control}
                  name="buildingHeightStories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building Height (stories)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter number of stories"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Height determines equipment requirements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Number of Drops */}
                <FormField
                  control={form.control}
                  name="numberOfDrops"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Drops</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter number of access points"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of access points needed for the job
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Crew Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="crewSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Crew Size</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shiftLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift Length (hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="4"
                            max="12"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="workWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Week (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="3"
                          max="7"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of working days per week
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </CardContent>
        </Card>

        {/* Calculation Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isCalculating ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-action"></div>
                <span className="ml-2 text-muted-foreground">Calculating...</span>
              </div>
            ) : calculation ? (
              <div className="space-y-4">
                {/* Total Price */}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary-action">
                    {formatCurrency(calculation.basePrice)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Project Cost</div>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Cost Breakdown</h4>
                  {calculation.breakdown?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{item.label}</span>
                      <Badge variant="outline">{item.value}</Badge>
                    </div>
                  ))}
                </div>

                {/* Equipment */}
                {calculation.equipment && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Equipment</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{calculation.equipment.type}</span>
                      <Badge variant="outline">
                        {formatCurrency(calculation.equipment.cost)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {calculation.timeline && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Timeline</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Working Days: {calculation.timeline.workingDays}</div>
                      <div>Total Hours: {calculation.timeline.totalHours}</div>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {calculation.warnings && calculation.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {calculation.warnings.map((warning: string, index: number) => (
                          <li key={index} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleSubmit}
                    className="flex-1"
                    disabled={!calculation}
                  >
                    Add to Quote
                  </Button>
                  <Button variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Droplets className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter project details to see calculation</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}