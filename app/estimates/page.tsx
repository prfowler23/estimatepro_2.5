"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Copy,
  Trash2,
  Mail,
  MoreHorizontal,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { QuotePDFGenerator } from "@/lib/pdf/generator";
import { ProtectedRoute } from "@/components/auth/protected-route";

import { EstimateData } from "@/lib/types/estimate-types";

interface Estimate extends EstimateData {
  estimate_number: string;
  services_count?: number;
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

function EstimatesContent() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "customer">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [error, setError] = useState<string | null>(null);

  const fetchEstimates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from("estimates").select(`
          *,
          estimate_services(count)
        `);

      // Apply status filter
      if (statusFilter !== "all" && (statusFilter as any)) {
        query = query.eq(
          "status",
          statusFilter as "draft" | "sent" | "approved" | "rejected",
        );
      }

      // Apply sorting
      const orderColumn =
        sortBy === "date"
          ? "created_at"
          : sortBy === "amount"
            ? "total_price"
            : "customer_name";
      query = query.order(orderColumn, { ascending: sortOrder === "asc" });

      const { data, error } = await query;

      if (error) throw error;

      // Add services count to each estimate and map quote_number to estimate_number
      const estimatesWithCounts = data.map((estimate) => ({
        ...estimate,
        estimate_number:
          (estimate as any).quote_number || (estimate as any).estimate_number,
        services_count: estimate.estimate_services?.[0]?.count || 0,
      }));

      setEstimates(estimatesWithCounts);
    } catch (error: any) {
      setError(error.message);
      console.error("Error fetching estimates:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchEstimates();
  }, [statusFilter, sortBy, sortOrder, fetchEstimates]);

  const filteredEstimates = estimates.filter((estimate) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      estimate.customer_name.toLowerCase().includes(searchLower) ||
      estimate.building_name.toLowerCase().includes(searchLower) ||
      estimate.estimate_number.toLowerCase().includes(searchLower) ||
      estimate.customer_email.toLowerCase().includes(searchLower) ||
      (estimate.company_name || "").toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteEstimate = async (estimateId: string) => {
    if (!confirm("Are you sure you want to delete this estimate?")) return;

    try {
      const { error } = await supabase
        .from("estimates")
        .delete()
        .eq("id", estimateId);

      if (error) throw error;

      await fetchEstimates(); // Refresh the list
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDownloadPDF = async (estimate: Estimate) => {
    try {
      // Need to fetch full estimate data with services
      const { data: fullEstimate, error: estimateError } = await supabase
        .from("estimates")
        .select("*")
        .eq("id", estimate.id)
        .single();

      if (estimateError) throw estimateError;

      const { data: services, error: servicesError } = await supabase
        .from("estimate_services")
        .select("*")
        .eq("estimate_id", estimate.id);

      if (servicesError) throw servicesError;

      await QuotePDFGenerator.downloadQuotePDF({
        ...fullEstimate,
        services,
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDuplicateEstimate = async (estimate: Estimate) => {
    try {
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
          quote_number: newEstimateNumber,
          customer_name: estimate.customer_name + " (Copy)",
          customer_email: estimate.customer_email,
          customer_phone: estimate.customer_phone,
          company_name: estimate.company_name,
          building_name: estimate.building_name,
          building_address: estimate.building_address,
          building_height_stories: estimate.building_height_stories,
          building_height_feet: estimate.building_height_feet,
          total_price: estimate.total_price,
          status: "draft",
        })
        .select()
        .single();

      if (estimateError) throw estimateError;

      // Get original services
      const { data: services, error: servicesError } = await supabase
        .from("estimate_services")
        .select("*")
        .eq("quote_id", estimate.id);

      if (servicesError) throw servicesError;

      // Duplicate services
      if (services.length > 0) {
        const serviceInserts = services.map((service) => ({
          quote_id: newEstimate.id,
          service_type: service.service_type,
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
          quote_id: newEstimate.id, // Ensure quote_id is explicitly set
          totalPrice: service.price, // Map totalPrice to price
        }));

        const { error: duplicateServicesError } = await supabase
          .from("estimate_services")
          .insert(serviceInserts);

        if (duplicateServicesError) throw duplicateServicesError;
      }

      await fetchEstimates(); // Refresh the list
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getStatusBadge = (status: string) => (
    <Badge className={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
    </Badge>
  );

  const getTotalRevenue = () => {
    return filteredEstimates
      .filter((e) => e.status === "approved")
      .reduce((sum, e) => sum + e.total_price, 0);
  };

  const getEstimateStats = () => {
    const total = filteredEstimates.length;
    const draft = filteredEstimates.filter((e) => e.status === "draft").length;
    const sent = filteredEstimates.filter((e) => e.status === "sent").length;
    const approved = filteredEstimates.filter(
      (e) => e.status === "approved",
    ).length;
    const rejected = filteredEstimates.filter(
      (e) => e.status === "rejected",
    ).length;

    return { total, draft, sent, approved, rejected };
  };

  const stats = getEstimateStats();

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { title: "Dashboard", href: "/dashboard" },
          { title: "Estimates" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
          <p className="text-gray-600">
            Manage and track all your project estimates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchEstimates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/calculator">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Estimate
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Estimates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {stats.draft}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${getTotalRevenue().toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters & Search</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-500">
                {filteredEstimates.length} of {estimates.length} estimates
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search estimates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="amount">Estimate Amount</SelectItem>
                <SelectItem value="customer">Customer Name</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Estimates Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading estimates...
            </div>
          ) : filteredEstimates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No estimates found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first estimate"}
              </p>
              <Link href="/calculator">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Estimate
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEstimates.map((estimate) => (
                  <TableRow key={estimate.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {estimate.estimate_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {estimate.customer_name}
                        </div>
                        {estimate.company_name && (
                          <div className="text-sm text-gray-500">
                            {estimate.company_name}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          {estimate.customer_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {estimate.building_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {estimate.building_address}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {estimate.services_count} service
                        {estimate.services_count !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        ${estimate.total_price.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(estimate.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(estimate.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/estimates/${estimate.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/estimates/${estimate.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Estimate
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicateEstimate(estimate)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(estimate)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteEstimate(estimate.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EstimatesPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <EstimatesContent />
      </div>
    </ProtectedRoute>
  );
}
