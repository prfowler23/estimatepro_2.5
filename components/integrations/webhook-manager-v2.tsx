"use client";

import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Activity,
  RefreshCw,
  Download,
  Upload,
  Filter,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComponentErrorBoundary } from "@/components/error-handling/component-error-boundary";
import {
  WebhookForm,
  webhookFormSchema,
  WebhookFormData,
} from "./webhook-form";
import { WebhookCard } from "./webhook-card";
import { WebhookDeliveryTable } from "./webhook-delivery-table";
import { useWebhooks, useWebhookDeliveries } from "@/hooks/useWebhooks";
import {
  WebhookConfig,
  WebhookStats,
  DEFAULT_WEBHOOK_CONFIG,
  WEBHOOK_EVENTS,
} from "@/lib/types/webhook-types";
import { webhookService } from "@/lib/services/webhook-service";
import { toast } from "@/components/ui/use-toast";

function WebhookManagerV2Component() {
  // State management
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(
    null,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);

  // Custom hooks for data management
  const {
    webhooks,
    loading: webhooksLoading,
    total,
    pages,
    stats: webhookStats,
    loadWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    toggleWebhook,
    testWebhook,
  } = useWebhooks({
    page: currentPage,
    limit: 20,
    filters: {
      active: filterStatus === "all" ? undefined : filterStatus === "active",
      event: filterEvent === "all" ? undefined : filterEvent,
      search: searchTerm || undefined,
    },
  });

  const {
    deliveries,
    stats: deliveryStats,
    loading: deliveriesLoading,
    total: deliveriesTotal,
    pages: deliveriesPages,
    loadDeliveries,
    retryFailedDeliveries,
  } = useWebhookDeliveries({
    webhookId: selectedWebhook?.id || "",
    page: 1,
    limit: 50,
    autoLoad: !!selectedWebhook,
  });

  // Forms
  const createForm = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      ...DEFAULT_WEBHOOK_CONFIG,
      url: "",
      events: [],
      description: "",
    },
  });

  const editForm = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
  });

  // Memoized filtered webhooks
  const filteredWebhooks = useMemo(() => {
    return webhooks.filter((webhook) => {
      if (
        searchTerm &&
        !webhook.url.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (filterStatus !== "all") {
        const isActive = filterStatus === "active";
        if (webhook.active !== isActive) return false;
      }
      if (filterEvent !== "all" && !webhook.events.includes(filterEvent)) {
        return false;
      }
      return true;
    });
  }, [webhooks, searchTerm, filterStatus, filterEvent]);

  // Event handlers
  const handleCreateWebhook = async (data: WebhookFormData) => {
    const result = await createWebhook(data as any);
    if (result.success) {
      setIsCreateDialogOpen(false);
      createForm.reset();
    }
  };

  const handleUpdateWebhook = async (data: WebhookFormData) => {
    if (!selectedWebhook) return;

    const result = await updateWebhook(selectedWebhook.id, data);
    if (result.success) {
      setIsEditDialogOpen(false);
      editForm.reset();
    }
  };

  const handleDeleteWebhook = async (webhook: WebhookConfig) => {
    const result = await deleteWebhook(webhook.id);
    if (result.success && selectedWebhook?.id === webhook.id) {
      setSelectedWebhook(null);
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    await testWebhook(webhook.id);
    if (selectedWebhook?.id === webhook.id) {
      await loadDeliveries();
    }
  };

  const handleToggleWebhook = async (webhook: WebhookConfig) => {
    await toggleWebhook(webhook.id);
  };

  const handleExportWebhooks = async () => {
    const blob = await webhookService.exportWebhooks("json");
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `webhooks-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "Webhooks exported successfully",
      });
    }
  };

  const handleImportWebhooks = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await webhookService.importWebhooks(file);
    if (result.success) {
      await loadWebhooks();
      toast({
        title: "Success",
        description: `${result.imported} webhooks imported successfully`,
      });
    } else {
      toast({
        title: "Error",
        description: result.errors.join(", "),
        variant: "destructive",
      });
    }
  };

  const handleSelectDelivery = (id: string, selected: boolean) => {
    setSelectedDeliveries((prev) =>
      selected ? [...prev, id] : prev.filter((d) => d !== id),
    );
  };

  const handleSelectAllDeliveries = (selected: boolean) => {
    setSelectedDeliveries(selected ? deliveries.map((d) => d.id) : []);
  };

  const handleRetryDeliveries = async (deliveryIds: string[]) => {
    if (!selectedWebhook) return;
    await retryFailedDeliveries(deliveryIds);
    setSelectedDeliveries([]);
  };

  const openEditDialog = (webhook: WebhookConfig) => {
    setSelectedWebhook(webhook);
    editForm.reset({
      url: webhook.url,
      events: webhook.events,
      description: webhook.description || "",
      timeout_seconds: webhook.timeout_seconds,
      retry_attempts: webhook.retry_attempts,
      retry_delay_seconds: webhook.retry_delay_seconds,
      active: webhook.active,
    });
    setIsEditDialogOpen(true);
  };

  // Memoized stats display
  const overallStats = useMemo(() => {
    const totalDeliveries = webhooks.reduce(
      (sum, w) => sum + w.success_count + w.failure_count,
      0,
    );
    const totalSuccess = webhooks.reduce((sum, w) => sum + w.success_count, 0);
    const successRate =
      totalDeliveries > 0
        ? Math.round((totalSuccess / totalDeliveries) * 100)
        : 0;

    return {
      totalWebhooks: webhooks.length,
      activeWebhooks: webhooks.filter((w) => w.active).length,
      totalDeliveries,
      successRate,
    };
  }, [webhooks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Webhook Management</h2>
          <p className="text-muted-foreground">
            Configure webhooks to receive real-time notifications
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImportWebhooks}
            className="hidden"
            id="import-webhooks"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById("import-webhooks")?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExportWebhooks}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <Button
              onClick={() => {
                createForm.reset();
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Webhook</DialogTitle>
              </DialogHeader>
              <WebhookForm
                form={createForm}
                onSubmit={handleCreateWebhook}
                submitLabel="Create Webhook"
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {overallStats.totalWebhooks}
            </div>
            <p className="text-xs text-muted-foreground">Total Webhooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {overallStats.activeWebhooks}
            </div>
            <p className="text-xs text-muted-foreground">Active Webhooks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {overallStats.totalDeliveries}
            </div>
            <p className="text-xs text-muted-foreground">Total Deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {overallStats.successRate}%
            </div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search webhooks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(v: any) => setFilterStatus(v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEvent} onValueChange={setFilterEvent}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {WEBHOOK_EVENTS.map((event) => (
              <SelectItem key={event.type} value={event.type}>
                {event.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhooks">
            Webhooks
            {webhooks.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {webhooks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="deliveries" disabled={!selectedWebhook}>
            Deliveries
            {selectedWebhook && deliveries.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {deliveries.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          {webhooksLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : filteredWebhooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || filterStatus !== "all" || filterEvent !== "all"
                    ? "No webhooks found"
                    : "No webhooks configured"}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || filterStatus !== "all" || filterEvent !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first webhook to start receiving real-time notifications"}
                </p>
                {!searchTerm &&
                  filterStatus === "all" &&
                  filterEvent === "all" && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Webhook
                    </Button>
                  )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWebhooks.map((webhook) => (
                <WebhookCard
                  key={webhook.id}
                  webhook={webhook}
                  selected={selectedWebhook?.id === webhook.id}
                  onSelect={() => setSelectedWebhook(webhook)}
                  onEdit={() => openEditDialog(webhook)}
                  onDelete={() => handleDeleteWebhook(webhook)}
                  onTest={() => handleTestWebhook(webhook)}
                  onToggle={() => handleToggleWebhook(webhook)}
                  onViewDetails={() => setSelectedWebhook(webhook)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm">
                Page {currentPage} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
                disabled={currentPage === pages}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          {selectedWebhook && (
            <>
              {/* Delivery Statistics */}
              {deliveryStats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Delivery Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-muted-foreground text-sm">Total</p>
                        <p className="text-2xl font-bold">
                          {deliveryStats.total_deliveries}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Successful
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {deliveryStats.successful_deliveries}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Failed</p>
                        <p className="text-2xl font-bold text-red-600">
                          {deliveryStats.failed_deliveries}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Success Rate
                        </p>
                        <p className="text-2xl font-bold">
                          {deliveryStats.success_rate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Avg Time
                        </p>
                        <p className="text-2xl font-bold">
                          {deliveryStats.avgResponseTimeFormatted}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Deliveries Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  <WebhookDeliveryTable
                    deliveries={deliveries}
                    loading={deliveriesLoading}
                    selectedDeliveries={selectedDeliveries}
                    onSelectDelivery={handleSelectDelivery}
                    onSelectAll={handleSelectAllDeliveries}
                    onRetry={handleRetryDeliveries}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Webhook Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
          </DialogHeader>
          <WebhookForm
            form={editForm}
            onSubmit={handleUpdateWebhook}
            submitLabel="Update Webhook"
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export with error boundary
export function WebhookManagerV2() {
  return (
    <ComponentErrorBoundary
      componentName="WebhookManagerV2"
      showDetails={process.env.NODE_ENV === "development"}
    >
      <WebhookManagerV2Component />
    </ComponentErrorBoundary>
  );
}
