"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  RefreshCw,
  User,
  Building2,
  Calculator,
  DollarSign,
} from "lucide-react";
import { SERVICE_TYPES } from "@/lib/calculations/constants";
import { ProtectedRoute } from "@/components/auth/protected-route";

interface EstimateData {
  id: string;
  estimate_number: string;
  quote_number?: string; // For backward compatibility
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  company_name: string | null;
  building_name: string;
  building_address: string;
  building_height_stories: number;
  building_height_feet: number | null;
  building_type: string | null;
  total_price: number;
  status: string;
  notes: string | null;
  services: EstimateService[];
}

interface EstimateService {
  id: string;
  service_type: string;
  area_sqft: number;
  glass_sqft: number;
  price: number;
  labor_hours: number;
  setup_hours: number;
  rig_hours: number;
  total_hours: number;
  crew_size: number;
  equipment_type: string;
  equipment_days: number;
  equipment_cost: number;
  calculation_details: any;
}

function EstimateEditContent() {
  const params = useParams();
  const router = useRouter();
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchEstimate = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: estimateData, error: estimateError } = await supabase
        .from("estimates")
        .select("*")
        .eq("id", Array.isArray(params.id) ? params.id[0] : params.id)
        .single();

      if (estimateError) throw estimateError;

      const { data: servicesData, error: servicesError } = await supabase
        .from("estimate_services")
        .select("*")
        .eq("quote_id", Array.isArray(params.id) ? params.id[0] : params.id);

      if (servicesError) throw servicesError;

      setEstimate({
        ...estimateData,
        estimate_number: estimateData.quote_number, // Map quote_number to estimate_number
        services: servicesData.map((service: any) => ({
          ...service,
          serviceType: service.service_type,
          description: service.description || `${service.service_type} service`,
          quantity: service.area_sqft || 1,
          unit: "sqft",
          unitPrice: service.price / (service.area_sqft || 1),
          totalPrice: service.price,
          duration: service.total_hours || 8,
          dependencies: [],
        })),
      });
    } catch (error: any) {
      setError(error.message);
      console.error("Error fetching estimate:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate();
  }, [params.id]);

  const updateEstimateField = (field: string, value: any) => {
    if (!estimate) return;

    setEstimate((prev) => (prev ? { ...prev, [field]: value } : null));
    setHasChanges(true);
  };

  const removeService = async (serviceId: string) => {
    if (!estimate) return;

    try {
      const { error } = await supabase
        .from("estimate_services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;

      setEstimate((prev) =>
        prev
          ? {
              ...prev,
              services: prev.services.filter((s) => s.id !== serviceId),
              total_price: prev.services
                .filter((s) => s.id !== serviceId)
                .reduce((sum, s) => sum + s.price, 0),
            }
          : null,
      );
      setHasChanges(true);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const saveEstimate = async () => {
    if (!estimate) return;

    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from("estimates")
        .update({
          customer_name: estimate.customer_name,
          customer_email: estimate.customer_email,
          customer_phone: estimate.customer_phone,
          company_name: estimate.company_name,
          building_name: estimate.building_name,
          building_address: estimate.building_address,
          building_height_stories: estimate.building_height_stories,
          building_height_feet: estimate.building_height_feet,
          building_type: estimate.building_type,
          total_price: estimate.total_price,
          notes: estimate.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", estimate.id);

      if (error) throw error;

      setHasChanges(false);
      router.push(`/estimates/${estimate.id}`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!estimate) return 0;
    return estimate.services.reduce((sum, service) => sum + service.price, 0);
  };

  const getTotalEquipmentCost = () => {
    if (!estimate) return 0;
    return estimate.services.reduce(
      (sum, service) => sum + (service.equipment_cost || 0),
      0,
    );
  };

  const getTotalLaborHours = () => {
    if (!estimate) return 0;
    return estimate.services.reduce(
      (sum, service) => sum + service.total_hours,
      0,
    );
  };

  // Update total price when services change
  useEffect(() => {
    if (estimate) {
      const newTotal = calculateTotalPrice();
      if (newTotal !== estimate.total_price) {
        setEstimate((prev) =>
          prev ? { ...prev, total_price: newTotal } : null,
        );
        setHasChanges(true);
      }
    }
  }, [estimate?.services]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading estimate...
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || "Estimate not found"}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Estimate</h1>
            <p className="text-gray-600">{estimate.estimate_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-orange-600">
              Unsaved Changes
            </Badge>
          )}
          <Button onClick={saveEstimate} disabled={saving || !hasChanges}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={estimate.customer_name}
                onChange={(e) =>
                  updateEstimateField("customer_name", e.target.value)
                }
                placeholder="Customer Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={estimate.company_name || ""}
                onChange={(e) =>
                  updateEstimateField("company_name", e.target.value)
                }
                placeholder="ABC Company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Email *</Label>
              <Input
                id="customer_email"
                type="email"
                value={estimate.customer_email}
                onChange={(e) =>
                  updateEstimateField("customer_email", e.target.value)
                }
                placeholder="customer@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Phone</Label>
              <Input
                id="customer_phone"
                value={estimate.customer_phone || ""}
                onChange={(e) =>
                  updateEstimateField("customer_phone", e.target.value)
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Building Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Building Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="building_name">Building Name *</Label>
              <Input
                id="building_name"
                value={estimate.building_name}
                onChange={(e) =>
                  updateEstimateField("building_name", e.target.value)
                }
                placeholder="Downtown Office Complex"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building_type">Building Type</Label>
              <Select
                value={estimate.building_type || ""}
                onValueChange={(value) =>
                  updateEstimateField("building_type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select building type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="office">Office Building</SelectItem>
                  <SelectItem value="retail">Retail/Commercial</SelectItem>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="hospital">Hospital/Medical</SelectItem>
                  <SelectItem value="school">School/Educational</SelectItem>
                  <SelectItem value="warehouse">
                    Warehouse/Industrial
                  </SelectItem>
                  <SelectItem value="hotel">Hotel/Hospitality</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="building_address">Address *</Label>
              <Input
                id="building_address"
                value={estimate.building_address}
                onChange={(e) =>
                  updateEstimateField("building_address", e.target.value)
                }
                placeholder="123 Main St, City, State 12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height_stories">Height (Stories) *</Label>
              <Input
                id="height_stories"
                type="number"
                value={estimate.building_height_stories}
                onChange={(e) =>
                  updateEstimateField(
                    "building_height_stories",
                    parseInt(e.target.value),
                  )
                }
                placeholder="10"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height_feet">Height (Feet)</Label>
              <Input
                id="height_feet"
                type="number"
                value={estimate.building_height_feet || ""}
                onChange={(e) =>
                  updateEstimateField(
                    "building_height_feet",
                    parseInt(e.target.value) || null,
                  )
                }
                placeholder="120"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Services
              </CardTitle>
              <CardDescription>
                Manage services included in this estimate
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {estimate.services.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No services added yet</p>
              <Button variant="outline" className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Add First Service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimate.services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {
                            SERVICE_TYPES[
                              service.service_type as keyof typeof SERVICE_TYPES
                            ]
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {service.service_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {service.area_sqft && service.area_sqft > 0 && (
                          <div>{service.area_sqft.toLocaleString()} sq ft</div>
                        )}
                        {service.glass_sqft && service.glass_sqft > 0 && (
                          <div>
                            {service.glass_sqft.toLocaleString()} sq ft glass
                          </div>
                        )}
                        <div className="text-gray-500">
                          Crew: {service.crew_size} people
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {service.total_hours ? service.total_hours.toFixed(1) : '0.0'} total
                        </div>
                        <div className="text-gray-500">
                          {service.labor_hours ? service.labor_hours.toFixed(1) : '0.0'} +{" "}
                          {service.setup_hours ? service.setup_hours.toFixed(1) : '0.0'} +{" "}
                          {service.rig_hours ? service.rig_hours.toFixed(1) : '0.0'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.equipment_type ? (
                        <div className="text-sm">
                          <div>{service.equipment_type}</div>
                          {service.equipment_cost && service.equipment_cost > 0 && (
                            <div className="text-gray-500">
                              ${service.equipment_cost.toLocaleString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${service.price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeService(service.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Estimate Summary */}
          {estimate.services.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    {estimate.services.length}
                  </div>
                  <div className="text-sm text-blue-600">Services</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">
                    {getTotalLaborHours().toFixed(1)}
                  </div>
                  <div className="text-sm text-purple-600">Total Hours</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-700">
                    ${getTotalEquipmentCost().toLocaleString()}
                  </div>
                  <div className="text-sm text-orange-600">Equipment Cost</div>
                </div>
              </div>

              <div className="space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between text-lg">
                  <span>Services Total:</span>
                  <span className="font-medium">
                    ${estimate.total_price.toLocaleString()}
                  </span>
                </div>
                {getTotalEquipmentCost() > 0 && (
                  <div className="flex justify-between text-lg">
                    <span>Equipment Rental:</span>
                    <span className="font-medium">
                      ${getTotalEquipmentCost().toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t">
                  <span>Total Estimate:</span>
                  <span>
                    $
                    {(
                      estimate.total_price + getTotalEquipmentCost()
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Additional information or special requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={estimate.notes || ""}
            onChange={(e) => updateEstimateField("notes", e.target.value)}
            placeholder="Add any special notes, requirements, or additional information..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Save Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-lg font-semibold">
                Total Estimate: $
                {(
                  estimate.total_price + getTotalEquipmentCost()
                ).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={saveEstimate} disabled={saving || !hasChanges}>
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EstimateEditPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <EstimateEditContent />
      </div>
    </ProtectedRoute>
  );
}
