// Utility functions for Facade Analyzer components
import { RiskLevel } from "./types";

export function getRiskColor(risk: string): string {
  switch (risk.toLowerCase()) {
    case "low":
      return "bg-green-100 text-green-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "high":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getWeatheringRiskLevel(weathering: string): RiskLevel {
  switch (weathering.toLowerCase()) {
    case "heavy":
      return "high";
    case "moderate":
      return "medium";
    case "light":
    case "minimal":
      return "low";
    default:
      return "medium";
  }
}
