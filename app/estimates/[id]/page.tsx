"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { QuotePDFGenerator } from "@/lib/pdf/generator";
import { Button } from "@/components/ui/button";
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
  Download,
  Edit,
  Copy,
  Mail,
  Share2,
  AlertTriangle,
  RefreshCw,
  User,
  Building2,
  Calculator,
  DollarSign,
  Calendar,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
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
  status: "draft" | "sent" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
  updated_at: string;
  services: EstimateService[];
}

interface EstimateService {
  id: string;
  service_type: string;
  area_sqft: number | null;
  glass_sqft: number | null;
  price: number;
  labor_hours: number | null;
  setup_hours: number | null;
  rig_hours: number | null;
  total_hours: number | null;
  crew_size: number | null;
  equipment_type: string | null;
  equipment_days: number | null;
  equipment_cost: number | null;
  calculation_details: any;
}

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
};

function EstimateDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimate = async () => {
    try {
      setLoading(true);
      setError(null);

      const estimateId = Array.isArray(params.id) ? params.id[0] : params.id;

      const { data: estimateData, error: estimateError } = await supabase
        .from("estimates")
        .select("*")
        .eq("id", estimateId)
        .single();

      if (estimateError) throw estimateError;

      const { data: servicesData, error: servicesError } = await supabase
        .from("estimate_services")
        .select("*")
        .eq("quote_id", estimateId);

      if (servicesError) throw servicesError;

      setEstimate({
        ...estimateData,
        estimate_number:
          estimateData.quote_number || (estimateData as any).estimate_number, // Map quote_number to estimate_number
        services: servicesData,
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

  const handleStatusChange = async (newStatus: string) => {
    if (!estimate) return;

    try {
      setUpdating(true);
      setError(null);

      const { error } = await supabase
        .from("estimates")
        .update({
          status: newStatus as "draft" | "sent" | "approved" | "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", estimate.id);

      if (error) throw error;

      setEstimate((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus as "draft" | "sent" | "approved" | "rejected",
            }
          : null,
      );
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!estimate) return;

    try {
      await QuotePDFGenerator.downloadQuotePDF(estimate);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF");
    }
  };

  const handleDuplicate = async () => {
    if (!estimate) return;

    try {
      setUpdating(true);
      setError(null);

      // Create new estimate number
      const now = new Date();
      const year = now.getFullYear();
      const dayOfYear = Math.floor(
        (now.getTime() - new Date(year, 0, 0).getTime()) / 86400000,
      );
      const timeComponent = Math.floor((now.getTime() % 86400000) / 1000);
      const newEstimateNumber = `EST-${year}-${dayOfYear.toString().padStart(3, "0")}-${timeComponent.toString().padStart(5, "0")}`;

      // Duplicate estimate
      const { data: newEstimate, error: estimateError } = await supabase
        .from("estimates")
        .insert({
          estimate_number: newEstimateNumber,
          customer_name: estimate.customer_name + " (Copy)",
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
          status: "draft",
        })
        .select()
        .single();

      if (estimateError) throw estimateError;

      // Duplicate services
      if (estimate.services.length > 0) {
        const serviceInserts = estimate.services.map((service) => ({
          quote_id: newEstimate.id, // Changed from estimate_id to quote_id
          service_type: service.service_type as any, // Type cast for service_type
          area_sqft: service.area_sqft,
          glass_sqft: service.glass_sqft,
          price: service.price,
          labor_hours: service.labor_hours,
          setup_hours: service.setup_hours,
          rig_hours: service.rig_hours,
          total_hours: service.total_hours,
          crew_size: service.crew_size,
          equipment_type: service.equipment_type,
          equipment_days: service.equipment_days,
          equipment_cost: service.equipment_cost,
          calculation_details: service.calculation_details,
        }));

        const { error: duplicateServicesError } = await supabase
          .from("estimate_services")
          .insert(serviceInserts);

        if (duplicateServicesError) throw duplicateServicesError;
      }

      router.push(`/estimates/${newEstimate.id}`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const calculateTotalEquipmentCost = () => {
    if (!estimate) return 0;
    return estimate.services.reduce(
      (sum, service) => sum + (service.equipment_cost || 0),
      0,
    );
  };

  const calculateTotalLaborHours = () => {
    if (!estimate) return 0;
    return estimate.services.reduce(
      (sum, service) => sum + service.total_hours,
      0,
    );
  };

  const getStatusBadge = (status: string) => (
    <Badge className={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
    </Badge>
  );

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
            <h1 className="text-3xl font-bold text-gray-900">Quote Details</h1>
            <p className="text-gray-600">{estimate.estimate_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleDuplicate}
            disabled={updating}
          >
            {updating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Duplicate
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Link href={`/estimates/${estimate.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Quote
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status and Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {getStatusBadge(estimate.status)}
            <Select
              value={estimate.status}
              onValueChange={handleStatusChange}
              disabled={updating}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              $
              {(
                estimate.total_price + calculateTotalEquipmentCost()
              ).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              Services: ${estimate.total_price.toLocaleString()}
              {calculateTotalEquipmentCost() > 0 && (
                <span>
                  {" "}
                  + Equipment: ${calculateTotalEquipmentCost().toLocaleString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {estimate.services.length}
            </div>
            <div className="text-xs text-gray-500">
              {calculateTotalLaborHours().toFixed(1)} total hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {format(new Date(estimate.created_at), "MMM d, yyyy")}
            </div>
            <div className="text-xs text-gray-500">
              Updated {format(new Date(estimate.updated_at), "MMM d, yyyy")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Customer Name
                </div>
                <div className="text-lg font-medium">
                  {estimate.customer_name}
                </div>
              </div>
              {estimate.company_name && (
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Company
                  </div>
                  <div>{estimate.company_name}</div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Email</div>
                <div>{estimate.customer_email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Phone</div>
                <div>{estimate.customer_phone || "N/A"}</div>
              </div>
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
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">
                  Building Name
                </div>
                <div className="text-lg font-medium">
                  {estimate.building_name}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600">Address</div>
                <div>{estimate.building_address}</div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-600">Height</div>
                <div>
                  {estimate.building_height_stories} stories
                  {estimate.building_height_feet &&
                    ` (${estimate.building_height_feet} feet)`}
                </div>
              </div>
              {estimate.building_type && (
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Building Type
                  </div>
                  <div className="capitalize">
                    {estimate.building_type.replace("_", " ")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Services Breakdown
          </CardTitle>
          <CardDescription>
            Detailed breakdown of all services included in this estimate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {estimate.services.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No services added to this estimate</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Labor Hours</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="text-right">Price</TableHead>
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
                          {service.total_hours
                            ? service.total_hours.toFixed(1)
                            : "0.0"}{" "}
                          total
                        </div>
                        <div className="text-gray-500">
                          {service.labor_hours
                            ? service.labor_hours.toFixed(1)
                            : "0.0"}{" "}
                          +{" "}
                          {service.setup_hours
                            ? service.setup_hours.toFixed(1)
                            : "0.0"}{" "}
                          +{" "}
                          {service.rig_hours
                            ? service.rig_hours.toFixed(1)
                            : "0.0"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.equipment_type ? (
                        <div className="text-sm">
                          <div>{service.equipment_type}</div>
                          {service.equipment_cost &&
                            service.equipment_cost > 0 && (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Quote Summary */}
          {estimate.services.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between text-lg">
                  <span>Services Subtotal:</span>
                  <span className="font-medium">
                    ${estimate.total_price.toLocaleString()}
                  </span>
                </div>
                {calculateTotalEquipmentCost() > 0 && (
                  <div className="flex justify-between text-lg">
                    <span>Equipment Rental:</span>
                    <span className="font-medium">
                      ${calculateTotalEquipmentCost().toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t">
                  <span>Total Quote:</span>
                  <span>
                    $
                    {(
                      estimate.total_price + calculateTotalEquipmentCost()
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {estimate.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-gray-700">
              {estimate.notes}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function EstimateDetailPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <EstimateDetailContent />
      </div>
    </ProtectedRoute>
  );
}
