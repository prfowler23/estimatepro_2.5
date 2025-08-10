"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { WEBHOOK_EVENTS } from "@/lib/types/webhook-types";
import { validateWebhookURL } from "@/lib/utils/webhook-security";

// Zod validation schema for webhook form
export const webhookFormSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .url("Please enter a valid URL")
    .refine(
      (url) => {
        const validation = validateWebhookURL(url);
        return validation.valid;
      },
      (url) => {
        const validation = validateWebhookURL(url);
        return { message: validation.error || "Invalid URL" };
      },
    ),
  events: z
    .array(z.string())
    .min(1, "At least one event must be selected")
    .max(10, "Maximum 10 events allowed"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
  timeout_seconds: z
    .number()
    .int("Timeout must be a whole number")
    .min(1, "Timeout must be at least 1 second")
    .max(30, "Timeout cannot exceed 30 seconds"),
  retry_attempts: z
    .number()
    .int("Retry attempts must be a whole number")
    .min(0, "Retry attempts cannot be negative")
    .max(5, "Maximum 5 retry attempts allowed"),
  retry_delay_seconds: z
    .number()
    .int("Retry delay must be a whole number")
    .min(1, "Retry delay must be at least 1 second")
    .max(300, "Retry delay cannot exceed 5 minutes"),
  active: z.boolean(),
});

export type WebhookFormData = z.infer<typeof webhookFormSchema>;

interface WebhookFormProps {
  form: UseFormReturn<WebhookFormData>;
  onSubmit: (data: WebhookFormData) => void | Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}

export function WebhookForm({
  form,
  onSubmit,
  loading = false,
  submitLabel = "Save Webhook",
  onCancel,
}: WebhookFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webhook URL *</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://your-domain.com/webhook"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormDescription>
                Must be a valid HTTPS URL for security. Local addresses are not
                allowed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="events"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Events *</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {Object.entries(
                    WEBHOOK_EVENTS.reduce(
                      (acc, event) => {
                        if (!acc[event.category]) {
                          acc[event.category] = [];
                        }
                        acc[event.category].push(event);
                        return acc;
                      },
                      {} as Record<string, typeof WEBHOOK_EVENTS>,
                    ),
                  ).map(([category, events]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-sm font-medium capitalize">
                        {category.replace("_", " ")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {events.map((event) => (
                          <div
                            key={event.type}
                            className="flex items-start space-x-2"
                          >
                            <input
                              type="checkbox"
                              id={event.type}
                              checked={field.value.includes(event.type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, event.type]);
                                } else {
                                  field.onChange(
                                    field.value.filter((e) => e !== event.type),
                                  );
                                }
                              }}
                              disabled={loading}
                              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              aria-describedby={`${event.type}-description`}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={event.type}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {event.label}
                              </Label>
                              <p
                                id={`${event.type}-description`}
                                className="text-xs text-muted-foreground"
                              >
                                {event.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </FormControl>
              <FormDescription>
                Select the events you want to receive notifications for (max 10)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description for this webhook"
                  {...field}
                  disabled={loading}
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                Help identify this webhook's purpose (max 500 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="timeout_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timeout (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 10)
                    }
                    disabled={loading}
                  />
                </FormControl>
                <FormDescription>1-30 seconds</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="retry_attempts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retry Attempts</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 3)
                    }
                    disabled={loading}
                  />
                </FormControl>
                <FormDescription>0-5 attempts</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="retry_delay_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retry Delay (seconds)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 5)
                    }
                    disabled={loading}
                  />
                </FormControl>
                <FormDescription>1-300 seconds</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  Enable this webhook to receive events immediately
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={loading}
                  aria-label="Toggle webhook active state"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
