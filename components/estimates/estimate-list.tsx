"use client";

import { useState, useMemo, memo } from "react";
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { EstimateCard } from "./estimate-card";
import type { EstimateStoreState } from "@/lib/stores/estimate-store";

interface EstimateListProps {
  estimates: EstimateStoreState[];
  onView?: (estimateId: string) => void;
  onEdit?: (estimateId: string) => void;
  onDuplicate?: (estimateId: string) => void;
  onDelete?: (estimateId: string) => void;
  loading?: boolean;
  className?: string;
}

type SortField = "created_at" | "customer_name" | "total_price" | "status";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "list";

const statusOptions = ["all", "draft", "sent", "approved", "rejected"];

export const EstimateList = memo(function EstimateList({
  estimates,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  loading = false,
  className,
}: EstimateListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filtered and sorted estimates
  const filteredEstimates = useMemo(() => {
    let filtered = estimates;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (estimate) =>
          estimate.customer_name?.toLowerCase().includes(query) ||
          estimate.company_name?.toLowerCase().includes(query) ||
          estimate.building_name?.toLowerCase().includes(query) ||
          estimate.estimate_number?.toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (estimate) => estimate.status === statusFilter,
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "created_at":
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case "customer_name":
          aValue = a.customer_name || "";
          bValue = b.customer_name || "";
          break;
        case "total_price":
          aValue = a.total_price || 0;
          bValue = b.total_price || 0;
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [estimates, searchQuery, statusFilter, sortField, sortOrder]);

  const handleSortChange = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const EmptyState = () => (
    <div className="text-center py-12">
      <FileText className="h-12 w-12 text-text-secondary mx-auto mb-4 opacity-50" />
      <h3 className="text-lg font-medium text-text-primary mb-2">
        {searchQuery || statusFilter !== "all"
          ? "No estimates found"
          : "No estimates yet"}
      </h3>
      <p className="text-text-secondary mb-6">
        {searchQuery || statusFilter !== "all"
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Get started by creating your first estimate."}
      </p>
      {searchQuery || statusFilter !== "all" ? (
        <Button
          variant="outline"
          onClick={() => {
            setSearchQuery("");
            setStatusFilter("all");
          }}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ""}`}>
        {/* Skeleton loader */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-10 bg-bg-subtle rounded-md animate-pulse flex-1" />
          <div className="h-10 bg-bg-subtle rounded-md w-32 animate-pulse" />
          <div className="h-10 bg-bg-subtle rounded-md w-24 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-bg-subtle rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            placeholder="Search estimates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status === "all"
                  ? ""
                  : ` (${estimates.filter((e) => e.status === status).length})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort & View Controls */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Sort
                {sortOrder === "asc" ? (
                  <SortAsc className="h-4 w-4 ml-2" />
                ) : (
                  <SortDesc className="h-4 w-4 ml-2" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSortChange("created_at")}>
                Date{" "}
                {sortField === "created_at" &&
                  (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSortChange("customer_name")}
              >
                Customer{" "}
                {sortField === "customer_name" &&
                  (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("total_price")}>
                Amount{" "}
                {sortField === "total_price" &&
                  (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("status")}>
                Status{" "}
                {sortField === "status" && (sortOrder === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {(searchQuery || statusFilter !== "all") && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            {filteredEstimates.length} of {estimates.length} estimates
          </p>
          {(searchQuery || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Estimates Grid/List */}
      {filteredEstimates.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {filteredEstimates.map((estimate) => (
            <EstimateCard
              key={estimate.id}
              estimate={estimate}
              onView={onView}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              className={viewMode === "list" ? "max-w-none" : ""}
            />
          ))}
        </div>
      )}
    </div>
  );
});
