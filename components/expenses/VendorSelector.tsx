import { useState, useEffect } from "react";
import {
  Star,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  Plus,
  Truck,
  DollarSign,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Equipment {
  id: string;
  name: string;
  category: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  vendors: VendorPricing[];
}

interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  vendors: VendorPricing[];
}

interface VendorPricing {
  vendorId: string;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  unitCost?: number;
  available: boolean;
  leadTime?: number;
  minOrder?: number;
  deliveryCharge?: number;
  bulkDiscounts?: { quantity: number; discount: number }[];
}

interface Vendor {
  id: string;
  name: string;
  type: "equipment" | "material" | "both";
  rating: number;
  reliability: number;
  preferredVendor: boolean;
  contact: {
    name: string;
    phone: string;
    email: string;
    address?: string;
  };
  paymentTerms: string;
  deliveryRadius: number; // miles
  specialties: string[];
  notes?: string;
  lastUsed?: Date;
}

interface VendorSelectorProps {
  type: "equipment" | "material";
  item: Equipment | Material;
  quantity?: number;
  duration?: number; // for equipment rentals
  onSelect: (vendor: Vendor, pricing: VendorPricing) => void;
  onCancel?: () => void;
}

export function VendorSelector({
  type,
  item,
  quantity = 1,
  duration = 1,
  onSelect,
  onCancel,
}: VendorSelectorProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [customPrice, setCustomPrice] = useState("");
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendors();
  }, [type]);

  const loadVendors = async () => {
    setLoading(true);

    // Mock vendor data - replace with actual API call
    const mockVendors: Vendor[] = [
      {
        id: "sunbelt",
        name: "Sunbelt Rentals",
        type: "equipment",
        rating: 4.5,
        reliability: 0.95,
        preferredVendor: true,
        contact: {
          name: "John Smith",
          phone: "555-0123",
          email: "john@sunbelt.com",
          address: "123 Industrial Blvd",
        },
        paymentTerms: "Net 30",
        deliveryRadius: 50,
        specialties: ["Aerial Equipment", "Power Tools"],
        notes: "Excellent service, fast delivery",
        lastUsed: new Date("2024-01-15"),
      },
      {
        id: "united",
        name: "United Rentals",
        type: "equipment",
        rating: 4.2,
        reliability: 0.92,
        preferredVendor: false,
        contact: {
          name: "Mike Johnson",
          phone: "555-0456",
          email: "mike@united.com",
        },
        paymentTerms: "Net 30",
        deliveryRadius: 75,
        specialties: ["Heavy Equipment", "Generators"],
      },
      {
        id: "chemstation",
        name: "ChemStation",
        type: "material",
        rating: 4.8,
        reliability: 0.98,
        preferredVendor: true,
        contact: {
          name: "Sarah Johnson",
          phone: "555-0789",
          email: "sarah@chemstation.com",
        },
        paymentTerms: "Net 15",
        deliveryRadius: 100,
        specialties: ["Cleaning Chemicals", "Industrial Supplies"],
        lastUsed: new Date("2024-02-01"),
      },
      {
        id: "ecolab",
        name: "Ecolab",
        type: "material",
        rating: 4.6,
        reliability: 0.96,
        preferredVendor: false,
        contact: {
          name: "David Wilson",
          phone: "555-0321",
          email: "david@ecolab.com",
        },
        paymentTerms: "Net 30",
        deliveryRadius: 200,
        specialties: ["Commercial Cleaning", "Sanitization"],
      },
      {
        id: "home-depot",
        name: "Home Depot Pro",
        type: "both",
        rating: 4.0,
        reliability: 0.88,
        preferredVendor: false,
        contact: {
          name: "Store Manager",
          phone: "555-0654",
          email: "pro@homedepot.com",
        },
        paymentTerms: "Net 30",
        deliveryRadius: 25,
        specialties: ["General Supplies", "Small Equipment"],
      },
    ];

    // Filter vendors by type
    const filteredVendors = mockVendors.filter(
      (v) => v.type === type || v.type === "both",
    );

    // Sort by preference, then rating
    filteredVendors.sort((a, b) => {
      if (a.preferredVendor && !b.preferredVendor) return -1;
      if (!a.preferredVendor && b.preferredVendor) return 1;
      return b.rating - a.rating;
    });

    setVendors(filteredVendors);
    setLoading(false);
  };

  const getVendorPricing = (vendorId: string): VendorPricing | null => {
    return item.vendors?.find((v) => v.vendorId === vendorId) || null;
  };

  const calculateTotalCost = (vendorId: string): number => {
    const pricing = getVendorPricing(vendorId);
    if (!pricing) return 0;

    if (type === "equipment") {
      const equipment = item as Equipment;
      // Choose best rate based on duration
      let rate = pricing.dailyRate || equipment.dailyRate;
      let multiplier = duration;

      if (duration >= 30 && pricing.monthlyRate) {
        rate = pricing.monthlyRate;
        multiplier = Math.ceil(duration / 30);
      } else if (duration >= 7 && pricing.weeklyRate) {
        rate = pricing.weeklyRate;
        multiplier = Math.ceil(duration / 7);
      }

      return rate * multiplier * quantity;
    } else {
      const unitCost = pricing.unitCost || (item as Material).unitCost;
      let total = unitCost * quantity;

      // Apply bulk discounts if available
      if (pricing.bulkDiscounts) {
        for (const discount of pricing.bulkDiscounts) {
          if (quantity >= discount.quantity) {
            total *= 1 - discount.discount / 100;
          }
        }
      }

      return total;
    }
  };

  const handleVendorSelect = () => {
    const vendor = vendors.find((v) => v.id === selectedVendor);
    if (!vendor) return;

    let pricing = getVendorPricing(selectedVendor);

    // If no existing pricing or custom price entered, create custom pricing
    if (!pricing || customPrice) {
      const customCost = parseFloat(customPrice);
      if (customPrice && !isNaN(customCost)) {
        pricing = {
          vendorId: selectedVendor,
          available: true,
          ...(type === "equipment"
            ? { dailyRate: customCost }
            : { unitCost: customCost }),
        };
      } else if (!pricing) {
        // Fallback to item's base pricing
        pricing = {
          vendorId: selectedVendor,
          available: true,
          ...(type === "equipment"
            ? { dailyRate: (item as Equipment).dailyRate }
            : { unitCost: (item as Material).unitCost }),
        };
      }
    }

    onSelect(vendor, pricing);
  };

  const getRatingStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < fullStars
                ? "text-yellow-400 fill-current"
                : i === fullStars && hasHalfStar
                  ? "text-yellow-400 fill-current opacity-50"
                  : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading vendors...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === "equipment" ? (
            <Truck className="w-5 h-5" />
          ) : (
            <DollarSign className="w-5 h-5" />
          )}
          Select Vendor for {item.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {type === "equipment"
            ? `${quantity} unit(s) for ${duration} day(s)`
            : `${quantity} ${(item as Material).unit}(s)`}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Vendor List */}
        <div className="space-y-3">
          {vendors.map((vendor) => {
            const pricing = getVendorPricing(vendor.id);
            const totalCost = calculateTotalCost(vendor.id);
            const isSelected = selectedVendor === vendor.id;

            return (
              <label
                key={vendor.id}
                className={`block p-4 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="vendor"
                  value={vendor.id}
                  checked={isSelected}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="sr-only"
                />

                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{vendor.name}</h4>
                      {vendor.preferredVendor && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Preferred
                        </Badge>
                      )}
                      {vendor.lastUsed && (
                        <Badge variant="secondary" className="text-xs">
                          Recently Used
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      {getRatingStars(vendor.rating)}

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {(vendor.reliability * 100).toFixed(0)}% reliable
                        </span>

                        {pricing?.leadTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {pricing.leadTime} day lead time
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {vendor.contact.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {vendor.contact.email}
                        </span>
                      </div>

                      {vendor.paymentTerms && (
                        <p className="text-sm text-gray-600">
                          Payment: {vendor.paymentTerms}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    {pricing?.available ? (
                      <div>
                        <p className="font-semibold text-lg">
                          ${totalCost.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">Total Cost</p>
                        {pricing.minOrder && quantity < pricing.minOrder && (
                          <p className="text-xs text-orange-600">
                            Min order: {pricing.minOrder}
                          </p>
                        )}
                      </div>
                    ) : pricing?.available === false ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Unavailable
                      </Badge>
                    ) : (
                      <p className="text-sm text-gray-500">Custom pricing</p>
                    )}
                  </div>
                </div>

                {vendor.specialties.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {vendor.specialties.slice(0, 3).map((specialty) => (
                      <Badge
                        key={specialty}
                        variant="outline"
                        className="text-xs"
                      >
                        {specialty}
                      </Badge>
                    ))}
                    {vendor.specialties.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{vendor.specialties.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </label>
            );
          })}
        </div>

        {/* Custom Price Input */}
        {selectedVendor && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Custom Price Override
              </label>
              <span className="text-xs text-gray-500">
                Leave blank to use vendor pricing
              </span>
            </div>
            <Input
              type="number"
              step="0.01"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder={`Enter ${
                type === "equipment"
                  ? "daily rate"
                  : `cost per ${(item as Material).unit || "unit"}`
              }`}
            />
          </div>
        )}

        {/* Warning for unavailable vendors */}
        {selectedVendor &&
          getVendorPricing(selectedVendor)?.available === false && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This vendor has marked this item as unavailable. Contact them
                directly or select another vendor.
              </AlertDescription>
            </Alert>
          )}

        {/* Add New Vendor Option */}
        <div className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setShowAddVendor(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Vendor
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button
            onClick={handleVendorSelect}
            disabled={!selectedVendor}
            className="flex-1"
          >
            Select Vendor
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
