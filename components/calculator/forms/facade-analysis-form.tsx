"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Upload,
  Camera,
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2,
  Ruler,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useFacadeAnalysis } from "@/hooks/use-facade-analysis-form";
import { FacadeVisualization } from "@/components/visualizer/facade-visualization";
import { MaterialBreakdown } from "@/components/calculator/material-breakdown";
import { MeasurementValidation } from "@/components/calculator/measurement-validation";

const formSchema = z.object({
  building_address: z.string().min(1, "Building address is required"),
  building_type: z.enum([
    "office",
    "retail",
    "residential",
    "industrial",
    "mixed-use",
    "institutional",
  ]),
  building_height_stories: z.number().min(1).max(100),
  primary_material: z.string(),
  has_covered_areas: z.boolean(),
  is_historic: z.boolean(),
  images: z
    .array(
      z.object({
        url: z.string(),
        type: z.enum(["aerial", "ground", "drone", "satellite"]),
        view_angle: z.enum([
          "front",
          "rear",
          "left",
          "right",
          "oblique",
          "top",
        ]),
      }),
    )
    .min(1, "At least one image is required"),
});

type FormData = z.infer<typeof formSchema>;

export function FacadeAnalysisForm() {
  const { toast } = useToast();
  const { analyzeImages, isAnalyzing, progress, results } = useFacadeAnalysis();
  const [uploadedImages, setUploadedImages] = useState<
    Array<{
      url: string;
      type: string;
      view_angle: string;
      file: File;
    }>
  >([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      building_type: "office",
      has_covered_areas: false,
      is_historic: false,
      images: [],
    },
  });

  const handleImageUpload = useCallback(
    async (files: FileList) => {
      const newImages = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image file`,
            variant: "destructive",
          });
          continue;
        }

        // Create preview URL
        const url = URL.createObjectURL(file);
        newImages.push({
          url,
          type: "ground", // Default, user can change
          view_angle: "front", // Default, user can change
          file,
        });
      }

      setUploadedImages((prev) => [...prev, ...newImages]);
    },
    [toast],
  );

  const onSubmit = async (data: FormData) => {
    try {
      // Upload images to Supabase storage first
      const uploadedUrls = await Promise.all(
        uploadedImages.map(async (img) => {
          // Upload logic here
          return {
            url: img.url, // Replace with actual uploaded URL
            type: img.type,
            view_angle: img.view_angle,
          };
        }),
      );

      // Run AI analysis
      const analysisResults = await analyzeImages({
        ...data,
        images: uploadedUrls,
      });

      // Results will be in the `results` state from the hook
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Facade Analysis Calculator
          </CardTitle>
          <CardDescription>
            AI-powered building measurement and material analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Building Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="building_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Main St, City, State"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="building_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select building type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="office">
                            Office Building
                          </SelectItem>
                          <SelectItem value="retail">
                            Retail/Shopping
                          </SelectItem>
                          <SelectItem value="residential">
                            Residential
                          </SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                          <SelectItem value="mixed-use">Mixed Use</SelectItem>
                          <SelectItem value="institutional">
                            Institutional
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Building Images</h3>
                  <span className="text-sm text-muted-foreground">
                    {uploadedImages.length} image(s) uploaded
                  </span>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files && handleImageUpload(e.target.files)
                    }
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-12 w-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF up to 10MB each
                    </span>
                  </label>
                </div>

                {/* Image Preview Grid */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {uploadedImages.map((img, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="aspect-square relative">
                          <img
                            src={img.url}
                            alt={`Upload ${index + 1}`}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <CardContent className="p-2 space-y-2">
                          <Select
                            value={img.type}
                            onValueChange={(value) => {
                              const updated = [...uploadedImages];
                              updated[index].type = value;
                              setUploadedImages(updated);
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aerial">Aerial</SelectItem>
                              <SelectItem value="ground">Ground</SelectItem>
                              <SelectItem value="drone">Drone</SelectItem>
                              <SelectItem value="satellite">
                                Satellite
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={img.view_angle}
                            onValueChange={(value) => {
                              const updated = [...uploadedImages];
                              updated[index].view_angle = value;
                              setUploadedImages(updated);
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="front">Front</SelectItem>
                              <SelectItem value="rear">Rear</SelectItem>
                              <SelectItem value="left">Left Side</SelectItem>
                              <SelectItem value="right">Right Side</SelectItem>
                              <SelectItem value="oblique">Oblique</SelectItem>
                              <SelectItem value="top">Top</SelectItem>
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Options */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="has_covered_areas"
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
                          Has covered walkways or breezeways
                        </FormLabel>
                        <FormDescription>
                          Check if the building has covered pedestrian areas
                          that may not be visible from above
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_historic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Historic or ornate building</FormLabel>
                        <FormDescription>
                          Historic buildings often have complex facades
                          requiring special cleaning methods
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isAnalyzing || uploadedImages.length === 0}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing... {progress}%
                  </>
                ) : (
                  <>
                    <Ruler className="mr-2 h-4 w-4" />
                    Analyze Building
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Processing images with AI vision model...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {results && !isAnalyzing && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="visualization">3D View</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>
                  Confidence Level: {results.confidence_level}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Measurement Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Total Facade
                    </p>
                    <p className="text-2xl font-bold">
                      {results.total_facade_sqft?.toLocaleString()} sq ft
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Glass Area</p>
                    <p className="text-2xl font-bold">
                      {results.total_glass_sqft?.toLocaleString()} sq ft
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Net Facade</p>
                    <p className="text-2xl font-bold">
                      {results.net_facade_sqft?.toLocaleString()} sq ft
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Glass Ratio</p>
                    <p className="text-2xl font-bold">
                      {results.glass_to_facade_ratio?.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Validation Warnings */}
                {results.validation_warnings &&
                  results.validation_warnings.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {results.validation_warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                {/* Service Recommendations */}
                <div className="space-y-2">
                  <h4 className="font-medium">Recommended Services</h4>
                  <div className="space-y-2">
                    {results.recommended_services?.map((service, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{service.service}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.reason}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {service.estimated_sqft.toLocaleString()} sq ft
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {service.confidence}% confidence
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <MaterialBreakdown materials={results.materials} />
          </TabsContent>

          <TabsContent value="visualization">
            <FacadeVisualization analysis={results} />
          </TabsContent>

          <TabsContent value="report">
            <Card>
              <CardHeader>
                <CardTitle>Professional Report</CardTitle>
                <CardDescription>Export-ready analysis report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <h3>Building Analysis Report</h3>
                  <p>
                    <strong>Address:</strong> {results.building_address}
                  </p>
                  <p>
                    <strong>Type:</strong> {results.building_type}
                  </p>
                  <p>
                    <strong>Analysis Date:</strong>{" "}
                    {new Date().toLocaleDateString()}
                  </p>

                  <h4>Executive Summary</h4>
                  <p>{results.executive_summary}</p>

                  <h4>Measurements</h4>
                  <ul>
                    <li>
                      Total Facade Area:{" "}
                      {results.total_facade_sqft?.toLocaleString()} sq ft
                    </li>
                    <li>
                      Glass Area: {results.total_glass_sqft?.toLocaleString()}{" "}
                      sq ft
                    </li>
                    <li>
                      Net Facade Area:{" "}
                      {results.net_facade_sqft?.toLocaleString()} sq ft
                    </li>
                    <li>
                      Building Height: {results.building_height_stories} stories
                      ({results.building_height_feet} feet)
                    </li>
                  </ul>

                  <div className="mt-6 flex gap-2">
                    <Button variant="outline">Export PDF</Button>
                    <Button variant="outline">Save to Estimate</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
