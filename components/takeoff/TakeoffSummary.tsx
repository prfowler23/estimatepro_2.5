import { MeasurementEntry } from "@/lib/types/measurements";
import { withTakeoffErrorBoundary } from "./TakeoffErrorBoundary";

interface TakeoffSummaryProps {
  measurements: MeasurementEntry[];
  services: string[];
}

const TakeoffSummaryComponent = ({
  measurements,
  services,
}: TakeoffSummaryProps) => {
  // Group measurements by category
  const grouped = measurements.reduce(
    (acc, m) => {
      if (!acc[m.category]) {
        acc[m.category] = {
          entries: [],
          total: 0,
          unit: m.unit,
        };
      }
      acc[m.category].entries.push(m);
      acc[m.category].total += m.total;
      return acc;
    },
    {} as Record<
      string,
      { entries: MeasurementEntry[]; total: number; unit: string }
    >,
  );

  // Service mapping for better display names
  const serviceNames: Record<string, string> = {
    WC: "Window Cleaning",
    GR: "Glass Restoration",
    BWP: "Building Wash (Pressure)",
    BWS: "Building Wash (Soft)",
    HBW: "High-Rise Building Wash",
    PWF: "Pressure Wash (Flat)",
    HFS: "Hard Floor Scrubbing",
    PC: "Parking Cleaning",
    PWP: "Parking Pressure Wash",
    IW: "Interior Wall Cleaning",
    DC: "Deck Cleaning",
  };

  // Calculate service-specific totals
  const serviceTotals = services.map((service) => {
    let total = 0;
    let unit = "sqft";
    let categories: string[] = [];

    switch (service) {
      case "WC":
      case "GR":
        total =
          (grouped["glass_windows"]?.total || 0) +
          (grouped["glass_doors"]?.total || 0) +
          (grouped["glass_storefront"]?.total || 0);
        unit = "sqft";
        categories = ["glass_windows", "glass_doors", "glass_storefront"];
        break;
      case "BWP":
      case "BWS":
      case "HBW":
        total = Object.entries(grouped)
          .filter(([key]) => key.startsWith("facade_"))
          .reduce((sum, [_, data]) => sum + data.total, 0);
        unit = "sqft";
        categories = Object.keys(grouped).filter((key) =>
          key.startsWith("facade_"),
        );
        break;
      case "PWF":
      case "HFS":
        total = grouped["flat_surface"]?.total || 0;
        unit = "sqft";
        categories = ["flat_surface"];
        break;
      case "PC":
      case "PWP":
        const parkingSpaces = grouped["parking_spaces"]?.entries.length || 0;
        const parkingDeckArea = grouped["parking_deck"]?.total || 0;
        total = parkingSpaces > 0 ? parkingSpaces : parkingDeckArea;
        unit = parkingSpaces > 0 ? "spaces" : "sqft";
        categories = ["parking_spaces", "parking_deck"];
        break;
      case "IW":
        total = grouped["inner_wall"]?.total || 0;
        unit = "sqft";
        categories = ["inner_wall"];
        break;
      case "DC":
        total = grouped["ceiling"]?.total || 0;
        unit = "sqft";
        categories = ["ceiling"];
        break;
      default:
        total = 0;
        unit = "sqft";
        categories = [];
    }

    return {
      service,
      total,
      unit,
      categories,
      name: serviceNames[service] || service,
    };
  });

  // Calculate totals
  const totalMeasurements = measurements.length;
  const totalArea = measurements.reduce((sum, m) => sum + m.total, 0);
  const missingMeasurements = serviceTotals.filter((s) => s.total === 0);

  return (
    <div className="bg-muted/50 p-6 rounded-lg border border-border-primary">
      <h3 className="font-semibold text-lg mb-4 text-text-primary">
        Takeoff Summary
      </h3>

      {/* Overall Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card p-3 rounded text-center border border-border-primary">
          <p className="text-2xl font-bold text-primary">{totalMeasurements}</p>
          <p className="text-sm text-muted-foreground">Total Entries</p>
        </div>
        <div className="bg-card p-3 rounded text-center border border-border-primary">
          <p className="text-2xl font-bold text-success">
            {totalArea.toFixed(0)}
          </p>
          <p className="text-sm text-muted-foreground">Total Area (sqft)</p>
        </div>
        <div className="bg-card p-3 rounded text-center border border-border-primary">
          <p className="text-2xl font-bold text-warning">
            {Object.keys(grouped).length}
          </p>
          <p className="text-sm text-muted-foreground">Categories</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(grouped).length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-3 text-text-primary">
            Measurements by Category
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(grouped).map(([category, data]) => (
              <div
                key={category}
                className="bg-card p-3 rounded border-l-4 border-primary/20 border border-border-primary"
              >
                <p className="text-sm text-muted-foreground capitalize">
                  {category
                    .replace(/_/g, " ")
                    .replace("facade ", "")
                    .replace("glass ", "")
                    .replace("parking ", "")}
                </p>
                <p className="text-lg font-bold text-foreground">
                  {data.total.toFixed(0)} {data.unit}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.entries.length}{" "}
                  {data.entries.length === 1 ? "entry" : "entries"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Requirements */}
      <div className="mb-4">
        <h4 className="font-medium mb-3 text-text-primary">
          Service Requirements
        </h4>
        <div className="space-y-2">
          {serviceTotals.map(({ service, total, unit, name }) => (
            <div
              key={service}
              className={`flex justify-between items-center p-2 rounded border ${
                total === 0
                  ? "bg-destructive/10 border-destructive/20"
                  : "bg-card border-border-primary"
              }`}
            >
              <div>
                <span className="font-medium text-sm">{name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({service})
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`font-medium ${total === 0 ? "text-destructive" : "text-foreground"}`}
                >
                  {total === 0 ? "Missing" : `${total.toFixed(0)} ${unit}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {missingMeasurements.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 p-3 rounded">
          <p className="text-sm font-medium text-destructive mb-1">
            ⚠️ Missing Measurements
          </p>
          <p className="text-xs text-destructive">
            {missingMeasurements.length} service(s) require measurements that
            haven&apos;t been added yet. Add measurements for:{" "}
            {missingMeasurements.map((m) => m.name).join(", ")}.
          </p>
        </div>
      )}

      {/* Completeness Indicator */}
      {missingMeasurements.length === 0 && services.length > 0 && (
        <div className="bg-success/10 border border-success/20 p-3 rounded">
          <p className="text-sm font-medium text-success mb-1">
            ✅ All Requirements Met
          </p>
          <p className="text-xs text-success">
            All selected services have the required measurements for accurate
            estimation.
          </p>
        </div>
      )}

      {/* Empty State */}
      {totalMeasurements === 0 && (
        <div className="bg-warning/10 border border-warning/20 p-4 rounded text-center">
          <p className="text-sm font-medium text-warning mb-1">
            No Measurements Added
          </p>
          <p className="text-xs text-warning">
            Start by adding measurements for your selected services to see the
            takeoff summary.
          </p>
        </div>
      )}
    </div>
  );
};

// Export the component wrapped with error boundary
export const TakeoffSummary = withTakeoffErrorBoundary(TakeoffSummaryComponent);
