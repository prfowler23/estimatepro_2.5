export interface RiskFactor {
  category: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  mitigation: string;
}

export interface RiskAssessment {
  projectDescription: string;
  overallRisk: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
  recommendations: string[];
  confidenceScore: number;
}

export class RiskAssessmentService {
  async analyze(params: {
    description: string;
    factors?: string[];
  }): Promise<RiskAssessment> {
    const { description, factors = [] } = params;

    // Simulate risk analysis
    // In production, this would use AI or rules engine
    const riskFactors: RiskFactor[] = [
      {
        category: "Weather",
        description: "Potential weather delays during project timeline",
        severity: "medium",
        mitigation: "Include weather contingency days in schedule",
      },
      {
        category: "Access",
        description: "Limited access hours for building entry",
        severity: "low",
        mitigation:
          "Coordinate with building management for optimal access times",
      },
    ];

    // Add custom factors if provided
    factors.forEach((factor) => {
      riskFactors.push({
        category: "Custom",
        description: factor,
        severity: "medium",
        mitigation: "Requires further analysis and planning",
      });
    });

    // Calculate overall risk
    const severityScores = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const avgScore =
      riskFactors.reduce((sum, f) => sum + severityScores[f.severity], 0) /
      riskFactors.length;

    let overallRisk: "low" | "medium" | "high" | "critical";
    if (avgScore <= 1.5) overallRisk = "low";
    else if (avgScore <= 2.5) overallRisk = "medium";
    else if (avgScore <= 3.5) overallRisk = "high";
    else overallRisk = "critical";

    return {
      projectDescription: description,
      overallRisk,
      factors: riskFactors,
      recommendations: [
        "Review and update risk assessment weekly",
        "Maintain clear communication channels with all stakeholders",
        "Document all risk mitigation actions taken",
      ],
      confidenceScore: 0.85,
    };
  }
}
