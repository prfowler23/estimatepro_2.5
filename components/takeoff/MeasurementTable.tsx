import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { MeasurementEntry } from "@/lib/types/measurements";

interface MeasurementTableProps {
  category: string;
  categoryLabel: string;
  entries: MeasurementEntry[];
  onUpdate: (entries: MeasurementEntry[]) => void;
  calculation: "area" | "linear" | "count";
}

export function MeasurementTable({
  category,
  categoryLabel,
  entries,
  onUpdate,
  calculation,
}: MeasurementTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addEntry = () => {
    const newEntry: MeasurementEntry = {
      id: Math.random().toString(36).substr(2, 9),
      category: category as any,
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
  };

  const updateEntry = (id: string, field: string, value: any) => {
    const updated = entries.map((entry) => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };

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

        return updatedEntry;
      }
      return entry;
    });
    onUpdate(updated);
  };

  const removeEntry = (id: string) => {
    onUpdate(entries.filter((e) => e.id !== id));
  };

  const totalArea = entries.reduce((sum, e) => sum + e.total, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-4 py-3 border-b flex justify-between items-center">
        <h3 className="font-semibold">{categoryLabel}</h3>
        <button
          onClick={addEntry}
          className="flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Row
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Description
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                Location
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                Width (ft)
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                {calculation === "area" ? "Height (ft)" : "Length (ft)"}
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                Qty
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                Total (
                {calculation === "area"
                  ? "sq ft"
                  : calculation === "linear"
                    ? "lf"
                    : "ea"}
                )
              </th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={entry.description}
                    onChange={(e) =>
                      updateEntry(entry.id, "description", e.target.value)
                    }
                    className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., North Facade"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={entry.location}
                    onChange={(e) =>
                      updateEntry(entry.id, "location", e.target.value)
                    }
                    className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., Floor 1-5"
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
                    className="w-20 px-2 py-1 border rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={calculation === "area" ? entry.height : entry.length}
                    onChange={(e) =>
                      updateEntry(
                        entry.id,
                        calculation === "area" ? "height" : "length",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="w-20 px-2 py-1 border rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    className="w-16 px-2 py-1 border rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-2 text-center font-medium">
                  {entry.total.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t">
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right font-medium">
                Total:
              </td>
              <td className="px-4 py-2 text-center font-bold">
                {totalArea.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
