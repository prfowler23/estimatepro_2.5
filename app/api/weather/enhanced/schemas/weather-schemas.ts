import { z } from "zod";

// Request validation schema
export const WeatherRequestSchema = z.object({
  location: z.string().min(1, "Location is required"),
  services: z.array(z.string()).optional().default([]),
  projectDuration: z.number().min(1).max(365).optional().default(30),
  includeAlerts: z.boolean().optional().default(true),
  includeAirQuality: z.boolean().optional().default(false),
  includeHistorical: z.boolean().optional().default(true),
  detailLevel: z
    .enum(["basic", "detailed", "comprehensive"])
    .optional()
    .default("detailed"),
});

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export const BulkAnalysisSchema = z.object({
  locations: z.array(z.any()).min(1).max(10),
  services: z.array(z.string()).optional(),
  projectDuration: z.number().min(1).max(365).optional().default(30),
});

export const LocationSearchSchema = z.object({
  query: z.string().min(2, "Query must be at least 2 characters"),
  limit: z.number().min(1).max(50).optional().default(10),
  country: z.string().optional().default("US"),
});

export const HistoricalLookupSchema = z.object({
  location: z.string().min(1, "Location is required"),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid start date format",
  }),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid end date format",
  }),
  metrics: z
    .array(z.enum(["temperature", "precipitation", "wind", "humidity"]))
    .optional()
    .default(["temperature", "precipitation", "wind"]),
});

export const AlertsSubscriptionSchema = z.object({
  action: z.enum(["create", "update", "delete", "list"]),
  locations: z.array(z.string()).optional(),
  alert_types: z
    .array(
      z.enum([
        "severe_weather",
        "high_wind",
        "precipitation",
        "temperature_extreme",
      ]),
    )
    .optional(),
  thresholds: z
    .object({
      wind_speed_mph: z.number().optional(),
      precipitation_inches: z.number().optional(),
      temperature_low: z.number().optional(),
      temperature_high: z.number().optional(),
      visibility_miles: z.number().optional(),
    })
    .optional(),
  notification_methods: z.array(z.enum(["email", "sms", "push"])).optional(),
  subscription_id: z.string().optional(),
});
