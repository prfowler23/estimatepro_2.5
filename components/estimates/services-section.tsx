"use client";

import { Plus, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EstimateService } from "@/lib/stores/estimate-store";

interface ServicesSectionProps {
  services: EstimateService[];
  isEditing: boolean;
  onAddService: () => void;
  onRemoveService: (serviceId: string) => void;
  formatCurrency: (amount: number) => string;
}

export function ServicesSection({
  services,
  isEditing,
  onAddService,
  onRemoveService,
  formatCurrency,
}: ServicesSectionProps) {
  const formatServiceType = (serviceType: string) => {
    return serviceType
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-text-primary" />
            <span>Services</span>
            {services.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {services.length}
              </Badge>
            )}
          </div>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddService}
              className="hover:bg-primary/10 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <div className="text-center py-8">
            <Wrench className="h-12 w-12 text-text-secondary mx-auto mb-4 opacity-50" />
            <p className="text-text-secondary">
              No services added yet.{" "}
              {isEditing && <>Click &quot;Add Service&quot; to get started.</>}
            </p>
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                className="mt-4"
                onClick={onAddService}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Service
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="border border-border-primary rounded-lg p-4 hover:shadow-sm transition-shadow bg-bg-subtle/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                        <span className="text-sm font-semibold text-primary">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-text-primary">
                          {formatServiceType(service.serviceType)}
                        </h4>
                        <p className="text-sm text-text-secondary">
                          {formatCurrency(
                            service.calculationResult?.basePrice || 0,
                          )}
                        </p>
                      </div>
                    </div>
                    {service.calculationResult?.description && (
                      <p className="text-xs text-text-secondary mt-2 ml-11">
                        {service.calculationResult.description}
                      </p>
                    )}
                  </div>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveService(service.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
