"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Edit,
  Trash2,
  MoreVertical,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WebhookConfig } from "@/lib/types/webhook-types";
import { toast } from "@/components/ui/use-toast";

interface WebhookCardProps {
  webhook: WebhookConfig;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: () => void;
  onToggle?: () => void;
  onViewDetails?: () => void;
}

export function WebhookCard({
  webhook,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onTest,
  onToggle,
  onViewDetails,
}: WebhookCardProps) {
  // Calculate success rate
  const successRate = useMemo(() => {
    const total = webhook.success_count + webhook.failure_count;
    if (total === 0) return 0;
    return Math.round((webhook.success_count / total) * 100);
  }, [webhook.success_count, webhook.failure_count]);

  // Format last triggered date
  const lastTriggered = useMemo(() => {
    if (!webhook.last_triggered) return "Never";
    const date = new Date(webhook.last_triggered);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "< 1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  }, [webhook.last_triggered]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhook.url);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  const handleCopySecret = () => {
    if (webhook.secret) {
      navigator.clipboard.writeText(webhook.secret);
      toast({
        title: "Copied",
        description: "Webhook secret copied to clipboard",
      });
    }
  };

  return (
    <Card
      className={`transition-all hover:shadow-lg cursor-pointer ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-medium truncate max-w-md">
                {webhook.url}
              </CardTitle>
              <Badge
                variant={webhook.active ? "default" : "secondary"}
                className="shrink-0"
              >
                {webhook.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            {webhook.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {webhook.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {onTest && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onTest();
                  }}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Test Webhook
                </DropdownMenuItem>
              )}

              {onToggle && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                  }}
                >
                  {webhook.active ? (
                    <>
                      <ToggleLeft className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleRight className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyUrl();
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy URL
              </DropdownMenuItem>

              {webhook.secret && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopySecret();
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Secret
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Events */}
        <div className="flex flex-wrap gap-1">
          {webhook.events.slice(0, 3).map((event) => (
            <Badge key={event} variant="outline" className="text-xs">
              {event}
            </Badge>
          ))}
          {webhook.events.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{webhook.events.length - 3} more
            </Badge>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            {successRate >= 90 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : successRate >= 70 ? (
              <Activity className="h-4 w-4 text-yellow-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <div>
              <p className="text-muted-foreground text-xs">Success Rate</p>
              <p className="font-medium">{successRate}%</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Deliveries</p>
              <p className="font-medium">
                {webhook.success_count + webhook.failure_count}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground text-xs">Last Triggered</p>
              <p className="font-medium text-xs">{lastTriggered}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Timeout</p>
              <p className="font-medium">{webhook.timeout_seconds}s</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {onViewDetails && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
            >
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
