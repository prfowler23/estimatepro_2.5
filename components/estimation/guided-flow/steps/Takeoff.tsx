import { useState, useEffect } from "react";
import { error as logError } from "@/lib/utils/logger";
import {
  Table,
  Plus,
  Trash2,
  Calculator,
  Upload,
  FileSpreadsheet,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { MeasurementTable } from "@/components/takeoff/MeasurementTable";
import { TakeoffSummary } from "@/components/takeoff/TakeoffSummary";
import { TakeoffImportService } from "@/lib/takeoff/import-service";
import { TakeoffExportService } from "@/lib/takeoff/export-service";
import { TakeoffValidationService } from "@/lib/takeoff/validation-service";
import { TakeoffSuggestionsEngine } from "@/lib/takeoff/suggestions-engine";
import { MeasurementEntry } from "@/lib/types/measurements";
import { TakeoffStepData } from "@/lib/types/estimate-types";

interface TakeoffProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const MEASUREMENT_CATEGORIES = {
  glass: {
    name: "Glass",
    description: "Windows, doors, storefronts",
    unit: "sqft" as const,
    fields: [
      "Description/Location",
      "Width (ft)",
      "Height (ft)",
      "Quantity",
      "Total (sqft)",
      "Notes",
    ],
  },
  facade: {
    name: "Facade",
    description: "Wall surfaces by material type",
    unit: "sqft" as const,
    fields: [
      "Description/Location",
      "Width (ft)",
      "Height (ft)",
      "Quantity",
      "Total (sqft)",
      "Notes",
    ],
  },
  flatSurfaces: {
    name: "Flat Surfaces",
    description: "Sidewalks, plazas, horizontal surfaces",
    unit: "sqft" as const,
    fields: [
      "Description/Location",
      "Width (ft)",
      "Length (ft)",
      "Quantity",
      "Total (sqft)",
      "Notes",
    ],
  },
  parking: {
    name: "Parking",
    description: "Parking spaces, lanes, deck levels",
    unit: "ea" as const,
    fields: [
      "Description/Location",
      "Spaces/Units",
      "Length (ft)",
      "Quantity",
      "Total Count",
      "Notes",
    ],
  },
  specialized: {
    name: "Specialized",
    description: "Retaining walls, ceilings, custom areas",
    unit: "sqft" as const,
    fields: [
      "Description/Location",
      "Width (ft)",
      "Height/Length (ft)",
      "Quantity",
      "Total (sqft)",
      "Notes",
    ],
  },
};

export function Takeoff({ data, onUpdate, onNext, onBack }: TakeoffProps) {
  const [measurements, setMeasurements] = useState<
    Record<string, MeasurementEntry[]>
  >({});
  const [validation, setValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>({ valid: true, errors: [], warnings: [] });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [importSource, setImportSource] = useState<
    "manual" | "nearmap" | "csv" | "photo_analysis"
  >("manual");
  const [notes, setNotes] = useState("");

  const selectedServices = data.scopeDetails?.selectedServices || [];
  const photoAnalysis = data.filesPhotos?.summary || {};
  const areaMeasurements = data.areaOfWork?.measurements || [];

  // Initialize from existing data
  useEffect(() => {
    if (data.takeoff) {
      setMeasurements(data.takeoff.measurements || {});
      setImportSource(data.takeoff.importSource || "manual");
      setNotes(data.takeoff.notes || "");
    }
  }, [data.takeoff]);

  // Auto-import from previous steps
  useEffect(() => {
    if (photoAnalysis.windows && Object.keys(measurements).length === 0) {
      const importService = new TakeoffImportService();
      const imported = importService.importFromPhotoAnalysis(photoAnalysis);

      const grouped = imported.reduce(
        (acc, m) => {
          if (!acc[m.category]) acc[m.category] = [];
          acc[m.category].push(m);
          return acc;
        },
        {} as Record<string, MeasurementEntry[]>,
      );

      setMeasurements(grouped);
      setImportSource("photo_analysis");
    }
  }, [photoAnalysis, measurements]);

  // Auto-import from area measurements
  useEffect(() => {
    if (areaMeasurements.length > 0 && Object.keys(measurements).length === 0) {
      const importService = new TakeoffImportService();
      const imported =
        importService.importFromAreaMeasurements(areaMeasurements);

      const grouped = imported.reduce(
        (acc, m) => {
          if (!acc[m.category]) acc[m.category] = [];
          acc[m.category].push(m);
          return acc;
        },
        {} as Record<string, MeasurementEntry[]>,
      );

      setMeasurements((prev) => ({ ...prev, ...grouped }));
    }
  }, [areaMeasurements, measurements]);

  // Get suggestions and validate
  useEffect(() => {
    const engine = new TakeoffSuggestionsEngine();
    const validator = new TakeoffValidationService();
    const allMeasurements = Object.values(measurements).flat();

    // Get suggestions
    const buildingType =
      data.initialContact?.extractedData?.requirements?.buildingType ||
      "office";
    const newSuggestions = engine.getSuggestionsForBuildingType(
      buildingType,
      selectedServices,
      allMeasurements,
    );
    setSuggestions(newSuggestions);

    // Validate measurements
    const validationResult = validator.validateMeasurements(
      allMeasurements,
      selectedServices,
      {
        buildingType,
        photoAnalysis,
        areaMapping: { shapes: areaMeasurements },
      },
    );
    setValidation(validationResult);
  }, [
    measurements,
    selectedServices,
    photoAnalysis,
    areaMeasurements,
    data.initialContact,
  ]);

  const handleImportCSV = async (file: File) => {
    try {
      const importService = new TakeoffImportService();
      const imported = await importService.importFromCSV(file);

      const grouped = imported.reduce(
        (acc, m) => {
          if (!acc[m.category]) acc[m.category] = [];
          acc[m.category].push(m);
          return acc;
        },
        {} as Record<string, MeasurementEntry[]>,
      );

      setMeasurements((prev) => ({ ...prev, ...grouped }));
      setImportSource("csv");
    } catch (error) {
      logError("Takeoff import failed", {
        error,
        component: "Takeoff",
        action: "import_data",
      });
    }
  };

  const handleExport = async () => {
    const exportService = new TakeoffExportService();
    const allMeasurements = Object.values(measurements).flat();

    try {
      const blob = await exportService.exportToExcel(allMeasurements);
      exportService.downloadFile(blob, "takeoff-measurements.xlsx");
    } catch (error) {
      // Fallback to CSV
      const csv = exportService.exportToCSV(allMeasurements);
      exportService.downloadFile(csv, "takeoff-measurements.csv", "text/csv");
    }
  };

  const handleImportFromPhotos = () => {
    if (photoAnalysis.windows) {
      const importService = new TakeoffImportService();
      const imported = importService.importFromPhotoAnalysis(photoAnalysis);

      const grouped = imported.reduce(
        (acc, m) => {
          if (!acc[m.category]) acc[m.category] = [];
          acc[m.category].push(m);
          return acc;
        },
        {} as Record<string, MeasurementEntry[]>,
      );

      setMeasurements((prev) => ({ ...prev, ...grouped }));
      setImportSource("photo_analysis");
    }
  };

  const measurementCategories = [
    { key: "glass_windows", label: "Windows", calculation: "area" as const },
    { key: "glass_doors", label: "Glass Doors", calculation: "area" as const },
    {
      key: "glass_storefront",
      label: "Storefronts",
      calculation: "area" as const,
    },
    {
      key: "facade_brick",
      label: "Brick Facade",
      calculation: "area" as const,
    },
    {
      key: "facade_concrete",
      label: "Concrete Facade",
      calculation: "area" as const,
    },
    {
      key: "facade_metal",
      label: "Metal Facade",
      calculation: "area" as const,
    },
    {
      key: "facade_stone",
      label: "Stone Facade",
      calculation: "area" as const,
    },
    {
      key: "flat_surface",
      label: "Flat Surfaces",
      calculation: "area" as const,
    },
    {
      key: "parking_spaces",
      label: "Parking Spaces",
      calculation: "count" as const,
    },
    {
      key: "parking_deck",
      label: "Parking Deck",
      calculation: "area" as const,
    },
    {
      key: "retaining_wall",
      label: "Retaining Walls",
      calculation: "area" as const,
    },
    {
      key: "inner_wall",
      label: "Interior Walls",
      calculation: "area" as const,
    },
    { key: "ceiling", label: "Ceilings/Decks", calculation: "area" as const },
    {
      key: "footprint",
      label: "Building Footprint",
      calculation: "area" as const,
    },
  ];

  // Filter categories based on existing measurements and selected services
  const relevantCategories = measurementCategories.filter((cat) => {
    const hasData = measurements[cat.key] && measurements[cat.key].length > 0;
    const isRelevant = selectedServices.some((service: string) => {
      // Map services to categories
      if (
        (service === "WC" || service === "GR") &&
        cat.key.startsWith("glass_")
      )
        return true;
      if (
        (service === "BWP" || service === "BWS" || service === "HBW") &&
        cat.key.startsWith("facade_")
      )
        return true;
      if (
        (service === "PWF" || service === "HFS") &&
        cat.key === "flat_surface"
      )
        return true;
      if (
        (service === "PC" || service === "PWP") &&
        cat.key.startsWith("parking_")
      )
        return true;
      if (service === "IW" && cat.key === "inner_wall") return true;
      if (service === "DC" && cat.key === "ceiling") return true;
      return false;
    });
    return hasData || isRelevant;
  });

  // Add default categories if none are relevant
  const displayCategories =
    relevantCategories.length > 0
      ? relevantCategories
      : measurementCategories.slice(0, 6);

  const handleNext = () => {
    const takeoffData = {
      measurements,
      validation,
      suggestions,
      importSource,
      notes,
    };
    onUpdate({ takeoff: takeoffData });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Takeoff & Measurements</h2>
        <p className="text-muted-foreground">
          Enter measurements for the selected services
        </p>
      </div>

      {/* Import/Export Options */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Import & Export Options</CardTitle>
            <Badge
              variant={importSource === "manual" ? "default" : "secondary"}
            >
              {importSource === "manual"
                ? "Manual Entry"
                : importSource === "nearmap"
                  ? "NearMap Import"
                  : importSource === "csv"
                    ? "CSV Import"
                    : "Photo Analysis"}
            </Badge>
          </div>
          <CardDescription>
            Import measurements from external sources or export current data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) =>
                e.target.files?.[0] && handleImportCSV(e.target.files[0])
              }
              className="hidden"
              id="import-file"
            />
            <label htmlFor="import-file">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV/Excel
                </span>
              </Button>
            </label>
            <Button
              variant="outline"
              onClick={handleImportFromPhotos}
              disabled={!photoAnalysis.windows}
            >
              <Calculator className="w-4 h-4 mr-2" />
              From Photos
            </Button>
            <Button onClick={handleExport} variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium mb-2">Measurement Suggestions</p>
              <ul className="text-sm space-y-1">
                {suggestions.slice(0, 3).map((s: any, i: number) => (
                  <li
                    key={i}
                    className={`flex items-start gap-2 ${
                      s.priority === "critical"
                        ? "text-red-600"
                        : s.priority === "high"
                          ? "text-orange-600"
                          : "text-blue-600"
                    }`}
                  >
                    <span className="text-xs mt-1">•</span>
                    <span>{s.message}</span>
                  </li>
                ))}
                {suggestions.length > 3 && (
                  <li className="text-xs text-muted-foreground mt-2">
                    +{suggestions.length - 3} more suggestions
                  </li>
                )}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Measurement Tables */}
      <div className="space-y-6">
        {displayCategories.map(({ key, label, calculation }) => (
          <MeasurementTable
            key={key}
            category={key}
            categoryLabel={label}
            entries={measurements[key] || []}
            onUpdate={(entries) =>
              setMeasurements((prev) => ({
                ...prev,
                [key]: entries,
              }))
            }
            calculation={calculation}
          />
        ))}
      </div>

      {/* Summary */}
      <TakeoffSummary
        measurements={Object.values(measurements).flat()}
        services={selectedServices}
      />

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium mb-2">Validation Errors</p>
              <ul className="text-sm space-y-1">
                {validation.errors.map((error: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-xs mt-1">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium mb-2">Warnings</p>
              <ul className="text-sm space-y-1">
                {validation.warnings
                  .slice(0, 3)
                  .map((warning: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-xs mt-1">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                {validation.warnings.length > 3 && (
                  <li className="text-xs text-muted-foreground mt-2">
                    +{validation.warnings.length - 3} more warnings
                  </li>
                )}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any additional notes about measurements, access issues, or special considerations..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        <Button onClick={handleNext} disabled={validation.errors.length > 0}>
          Continue to Duration
        </Button>
      </div>
    </div>
  );
}
