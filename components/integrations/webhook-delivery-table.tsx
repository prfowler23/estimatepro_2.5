"use client";

import React, { useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { WebhookDelivery } from "@/lib/types/webhook-types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface WebhookDeliveryTableProps {
  deliveries: WebhookDelivery[];
  loading?: boolean;
  selectedDeliveries?: string[];
  onSelectDelivery?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onRetry?: (deliveryIds: string[]) => void;
  virtualizeThreshold?: number;
  rowHeight?: number;
  maxHeight?: number;
}

export function WebhookDeliveryTable({
  deliveries,
  loading = false,
  selectedDeliveries = [],
  onSelectDelivery,
  onSelectAll,
  onRetry,
  virtualizeThreshold = 100,
  rowHeight = 60,
  maxHeight = 600,
}: WebhookDeliveryTableProps) {
  // Memoize failed deliveries for retry
  const failedDeliveries = useMemo(
    () => deliveries.filter((d) => d.status === "failed"),
    [deliveries],
  );

  // Check if all deliveries are selected
  const allSelected = useMemo(
    () =>
      deliveries.length > 0 &&
      deliveries.every((d) => selectedDeliveries.includes(d.id)),
    [deliveries, selectedDeliveries],
  );

  // Check if some deliveries are selected
  const someSelected = useMemo(
    () =>
      selectedDeliveries.length > 0 &&
      selectedDeliveries.length < deliveries.length,
    [selectedDeliveries, deliveries],
  );

  const getStatusIcon = (status: WebhookDelivery["status"]) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "retrying":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (
    status: WebhookDelivery["status"],
  ): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case "delivered":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      case "retrying":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const formatResponseTime = (createdAt: string, deliveredAt?: string) => {
    if (!deliveredAt) return "-";
    const diff =
      new Date(deliveredAt).getTime() - new Date(createdAt).getTime();
    if (diff < 1000) return `${diff}ms`;
    return `${(diff / 1000).toFixed(2)}s`;
  };

  // Row component for virtualized list
  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const delivery = deliveries[index];
    const isSelected = selectedDeliveries.includes(delivery.id);

    return (
      <div style={style} className="flex items-center border-b">
        <DeliveryRow
          delivery={delivery}
          isSelected={isSelected}
          onSelect={onSelectDelivery}
          getStatusIcon={getStatusIcon}
          getStatusBadgeVariant={getStatusBadgeVariant}
          formatDate={formatDate}
          formatResponseTime={formatResponseTime}
        />
      </div>
    );
  };

  // Render virtualized table for large datasets
  if (deliveries.length > virtualizeThreshold) {
    return (
      <div className="space-y-4">
        {onRetry && failedDeliveries.length > 0 && (
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {failedDeliveries.length} failed deliveries
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRetry(failedDeliveries.map((d) => d.id))}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry All Failed
            </Button>
          </div>
        )}

        <div className="border rounded-lg">
          <div className="flex items-center p-3 border-b bg-muted/50">
            {onSelectAll && (
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
                className="mr-3"
              />
            )}
            <div className="grid grid-cols-7 gap-4 flex-1 text-sm font-medium">
              <div>Event</div>
              <div>Status</div>
              <div>Attempts</div>
              <div>Response</div>
              <div>Created</div>
              <div>Delivered</div>
              <div>Response Time</div>
            </div>
          </div>

          <List
            height={Math.min(maxHeight, deliveries.length * rowHeight)}
            itemCount={deliveries.length}
            itemSize={rowHeight}
            width="100%"
          >
            {Row}
          </List>
        </div>
      </div>
    );
  }

  // Render standard table for small datasets
  return (
    <div className="space-y-4">
      {onRetry && failedDeliveries.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {failedDeliveries.length} failed deliveries
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRetry(failedDeliveries.map((d) => d.id))}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry All Failed
          </Button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectAll && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                    aria-label="Select all deliveries"
                  />
                </TableHead>
              )}
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Attempts</TableHead>
              <TableHead>Response</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={onSelectAll ? 8 : 7}
                  className="text-center py-8"
                >
                  Loading deliveries...
                </TableCell>
              </TableRow>
            ) : deliveries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={onSelectAll ? 8 : 7}
                  className="text-center py-8"
                >
                  No deliveries found
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((delivery) => (
                <DeliveryTableRow
                  key={delivery.id}
                  delivery={delivery}
                  isSelected={selectedDeliveries.includes(delivery.id)}
                  onSelect={onSelectDelivery}
                  getStatusIcon={getStatusIcon}
                  getStatusBadgeVariant={getStatusBadgeVariant}
                  formatDate={formatDate}
                  formatResponseTime={formatResponseTime}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Shared row component for both virtualized and standard tables
interface DeliveryRowProps {
  delivery: WebhookDelivery;
  isSelected: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  getStatusIcon: (status: WebhookDelivery["status"]) => JSX.Element;
  getStatusBadgeVariant: (
    status: WebhookDelivery["status"],
  ) => "default" | "destructive" | "secondary" | "outline";
  formatDate: (date: string) => string;
  formatResponseTime: (createdAt: string, deliveredAt?: string) => string;
}

function DeliveryRow({
  delivery,
  isSelected,
  onSelect,
  getStatusIcon,
  getStatusBadgeVariant,
  formatDate,
  formatResponseTime,
}: DeliveryRowProps) {
  return (
    <div className="grid grid-cols-7 gap-4 p-3 items-center">
      {onSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(delivery.id, !!checked)}
          className="mr-3"
        />
      )}
      <div className="font-medium text-sm">{delivery.event}</div>
      <div className="flex items-center gap-2">
        {getStatusIcon(delivery.status)}
        <Badge
          variant={getStatusBadgeVariant(delivery.status)}
          className="text-xs"
        >
          {delivery.status}
        </Badge>
      </div>
      <div className="text-center">{delivery.attempts}</div>
      <div>
        {delivery.response_status ? (
          <Badge
            variant={delivery.response_status < 300 ? "default" : "destructive"}
            className="text-xs"
          >
            {delivery.response_status}
          </Badge>
        ) : (
          "-"
        )}
      </div>
      <div className="text-sm">{formatDate(delivery.created_at)}</div>
      <div className="text-sm">
        {delivery.delivered_at ? formatDate(delivery.delivered_at) : "-"}
      </div>
      <div className="text-sm">
        {formatResponseTime(delivery.created_at, delivery.delivered_at)}
      </div>
    </div>
  );
}

function DeliveryTableRow({
  delivery,
  isSelected,
  onSelect,
  getStatusIcon,
  getStatusBadgeVariant,
  formatDate,
  formatResponseTime,
}: DeliveryRowProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        {onSelect && (
          <TableCell>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(delivery.id, !!checked)}
              aria-label={`Select delivery ${delivery.id}`}
            />
          </TableCell>
        )}
        <TableCell className="font-medium">{delivery.event}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {getStatusIcon(delivery.status)}
            <Badge variant={getStatusBadgeVariant(delivery.status)}>
              {delivery.status}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="text-center">{delivery.attempts}</TableCell>
        <TableCell>
          {delivery.response_status ? (
            <Badge
              variant={
                delivery.response_status < 300 ? "default" : "destructive"
              }
            >
              {delivery.response_status}
            </Badge>
          ) : (
            "-"
          )}
        </TableCell>
        <TableCell>{formatDate(delivery.created_at)}</TableCell>
        <TableCell>
          {delivery.delivered_at ? formatDate(delivery.delivered_at) : "-"}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {formatResponseTime(delivery.created_at, delivery.delivered_at)}
            {delivery.error_message && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="h-6 w-6 p-0"
              >
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {delivery.error_message && (
        <TableRow>
          <TableCell colSpan={onSelect ? 8 : 7} className="p-0">
            <Collapsible open={isOpen}>
              <CollapsibleContent>
                <div className="p-4 bg-muted/30 border-t">
                  <p className="text-sm font-medium mb-1">Error Details:</p>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap">
                    {delivery.error_message}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
