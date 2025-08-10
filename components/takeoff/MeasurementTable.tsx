import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Save, AlertCircle } from "lucide-react";
import {
  MeasurementEntry,
  MeasurementCategory,
  isMeasurementCategory,
} from "@/lib/types/measurements";
import {
  validateMeasurementEntryUpdate,
  sanitizeInput,
  validateDimensions,
} from "@/lib/takeoff/schemas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDebounce } from "@/hooks/useDebounce";
import { withTakeoffErrorBoundary } from "./TakeoffErrorBoundary";

interface MeasurementTableProps {
  category: string;
  categoryLabel: string;
  entries: MeasurementEntry[];
  onUpdate: (entries: MeasurementEntry[]) => void;
  calculation: "area" | "linear" | "count";
}

const MeasurementTableComponent = ({
  category,
  categoryLabel,
  entries,
  onUpdate,
  calculation,
}: MeasurementTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string[]>
  >({});
  const [isDirty, setIsDirty] = useState(false);

  const addEntry = useCallback(() => {
    // Validate category is a valid measurement category
    const validatedCategory = isMeasurementCategory(category)
      ? category
      : ("glass_windows" as MeasurementCategory); // fallback

    const newEntry: MeasurementEntry = {
      id: crypto.randomUUID(),
      category: validatedCategory,
      description: "",
      location: "",
      width: 0,
      height: 0,
      quantity: 1,
      unit:
        calculation === "area"
          ? "sqft"
          : calculation === "linear"
            ? "lf"
            : "ea",
      total: 0,
    };
    onUpdate([...entries, newEntry]);
    setEditingId(newEntry.id);
  }, [category, calculation, entries, onUpdate]);

  // Debounced update function for performance
  const debouncedUpdateEntry = useCallback(
    (id: string, field: string, value: any) => {
      const updated = entries.map((entry) => {
        if (entry.id === id) {
          // Sanitize string inputs to prevent XSS
          const sanitizedValue =
            typeof value === "string" &&
            ["description", "location", "notes"].includes(field)
              ? sanitizeInput(value)
              : value;

          const updatedEntry = { ...entry, [field]: sanitizedValue };

          // Auto-calculate total
          if (calculation === "area") {
            updatedEntry.total =
              updatedEntry.width * updatedEntry.height * updatedEntry.quantity;
          } else if (calculation === "linear") {
            updatedEntry.total =
              (updatedEntry.width || updatedEntry.length || 0) *
              updatedEntry.quantity;
          } else {
            updatedEntry.total = updatedEntry.quantity;
          }

          // Validate the updated entry
          const validation = validateMeasurementEntryUpdate(updatedEntry);
          if (!validation.success) {
            setValidationErrors((prev) => ({
              ...prev,
              [id]: validation.error
                ? Object.values(validation.error).flat()
                : ["Validation failed"],
            }));
          } else {
            // Clear validation errors for this entry
            setValidationErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[id];
              return newErrors;
            });
          }

          // Additional dimension validation
          if (
            ["width", "height", "length"].includes(field) &&
            typeof sanitizedValue === "number"
          ) {
            const dimValidation = validateDimensions(
              updatedEntry.width,
              updatedEntry.height,
              updatedEntry.length,
            );
            if (!dimValidation.valid) {
              setValidationErrors((prev) => ({
                ...prev,
                [id]: [...(prev[id] || []), ...dimValidation.errors],
              }));
            }
          }

          return updatedEntry;
        }
        return entry;
      });

      onUpdate(updated);
      setIsDirty(true);
    },
    [entries, calculation, onUpdate],
  );

  // Immediate update function for UI responsiveness
  const updateEntry = useCallback(
    (id: string, field: string, value: any) => {
      debouncedUpdateEntry(id, field, value);
    },
    [debouncedUpdateEntry],
  );

  const removeEntry = useCallback(
    (id: string) => {
      const filtered = entries.filter((e) => e.id !== id);
      onUpdate(filtered);
      // Clear validation errors for removed entry
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    },
    [entries, onUpdate],
  );

  // Memoized total calculation for performance
  const totalArea = useMemo(
    () => entries.reduce((sum, e) => sum + e.total, 0),
    [entries],
  );

  // Check if there are any validation errors
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="bg-bg-base rounded-lg shadow-sm border border-border-primary">
      <div className="px-4 py-3 border-b border-border-primary flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-primary">{categoryLabel}</h3>
          {hasValidationErrors && (
            <AlertCircle className="w-4 h-4 text-destructive" />
          )}
        </div>
        <button
          onClick={addEntry}
          className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
          aria-label={`Add new ${categoryLabel.toLowerCase()} entry`}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Row
        </button>
      </div>

      {/* Validation Errors Display */}
      {hasValidationErrors && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
          <Alert className="border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm text-destructive">
              Please fix the following validation errors:
              <ul className="mt-2 ml-4 list-disc">
                {Object.entries(validationErrors).map(([id, errors]) => (
                  <li key={id}>{errors.join(", ")}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border-primary">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                Description*
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                Location*
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                Width (ft)*
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                {calculation === "area" ? "Height (ft)*" : "Length (ft)*"}
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                Qty*
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                Total (
                {calculation === "area"
                  ? "sq ft"
                  : calculation === "linear"
                    ? "lf"
                    : "ea"}
                )
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary">
            {entries.map((entry) => {
              const hasEntryErrors = validationErrors[entry.id]?.length > 0;
              return (
                <tr
                  key={entry.id}
                  className={`hover:bg-muted/50 transition-colors ${
                    hasEntryErrors ? "bg-destructive/5" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(e) =>
                        updateEntry(entry.id, "description", e.target.value)
                      }
                      className={`w-full px-2 py-1 border border-input rounded-md bg-background text-foreground 
                        placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                        ${hasEntryErrors ? "border-destructive focus:ring-destructive" : ""}
                        transition-colors`}
                      placeholder="e.g., North Facade"
                      aria-label="Description"
                      aria-invalid={hasEntryErrors}
                      aria-describedby={
                        hasEntryErrors ? `error-${entry.id}` : undefined
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={entry.location}
                      onChange={(e) =>
                        updateEntry(entry.id, "location", e.target.value)
                      }
                      className={`w-full px-2 py-1 border border-input rounded-md bg-background text-foreground 
                        placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                        ${hasEntryErrors ? "border-destructive focus:ring-destructive" : ""}
                        transition-colors`}
                      placeholder="e.g., Floor 1-5"
                      aria-label="Location"
                      aria-invalid={hasEntryErrors}
                      aria-describedby={
                        hasEntryErrors ? `error-${entry.id}` : undefined
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={entry.width}
                      onChange={(e) =>
                        updateEntry(
                          entry.id,
                          "width",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className={`w-20 px-2 py-1 border border-input rounded-md bg-background text-foreground text-center 
                        focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                        ${hasEntryErrors ? "border-destructive focus:ring-destructive" : ""}
                        transition-colors`}
                      aria-label="Width in feet"
                      aria-invalid={hasEntryErrors}
                      min="0"
                      step="0.1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={
                        calculation === "area" ? entry.height : entry.length
                      }
                      onChange={(e) =>
                        updateEntry(
                          entry.id,
                          calculation === "area" ? "height" : "length",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className={`w-20 px-2 py-1 border border-input rounded-md bg-background text-foreground text-center 
                        focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                        ${hasEntryErrors ? "border-destructive focus:ring-destructive" : ""}
                        transition-colors`}
                      aria-label={
                        calculation === "area"
                          ? "Height in feet"
                          : "Length in feet"
                      }
                      aria-invalid={hasEntryErrors}
                      min="0"
                      step="0.1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={entry.quantity}
                      onChange={(e) =>
                        updateEntry(
                          entry.id,
                          "quantity",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className={`w-16 px-2 py-1 border border-input rounded-md bg-background text-foreground text-center 
                        focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                        ${hasEntryErrors ? "border-destructive focus:ring-destructive" : ""}
                        transition-colors`}
                      aria-label="Quantity"
                      aria-invalid={hasEntryErrors}
                      min="1"
                      step="1"
                    />
                  </td>
                  <td className="px-4 py-2 text-center font-medium text-foreground">
                    {entry.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="text-destructive hover:text-destructive/80 transition-colors p-1 rounded-md hover:bg-destructive/10"
                      aria-label={`Delete measurement for ${entry.description || "this entry"}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted border-t border-border-primary">
            <tr>
              <td
                colSpan={5}
                className="px-4 py-2 text-right font-medium text-foreground"
              >
                Total:
              </td>
              <td className="px-4 py-2 text-center font-bold text-foreground">
                {totalArea.toFixed(2)}
              </td>
              <td className="px-4 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// Export the component wrapped with error boundary
export const MeasurementTable = withTakeoffErrorBoundary(
  MeasurementTableComponent,
);
