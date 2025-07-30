// Damage Assessment Component
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FacadeAnalysisResult } from "./types";
import { getRiskColor } from "./utils";

interface DamageAssessmentProps {
  damage: FacadeAnalysisResult["damage"];
}

export function DamageAssessment({ damage }: DamageAssessmentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Damage Assessment
          <Badge className={getRiskColor(damage.severity)}>
            {damage.severity} severity
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Affected Area</p>
            <p className="text-xl">{damage.affectedArea}%</p>
          </div>
          <div>
            <p className="text-sm font-medium">Repair Urgency</p>
            <Badge className={getRiskColor(damage.repairUrgency)}>
              {damage.repairUrgency}
            </Badge>
          </div>
        </div>

        {damage.staining.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Staining</p>
              <div className="space-y-1">
                {damage.staining.map((stain, index) => (
                  <p key={index} className="text-sm">
                    • {stain}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}

        {damage.oxidation.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Oxidation</p>
              <div className="space-y-1">
                {damage.oxidation.map((oxidation, index) => (
                  <p key={index} className="text-sm">
                    • {oxidation}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}

        {damage.damage.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Physical Damage</p>
              <div className="space-y-1">
                {damage.damage.map((damageItem, index) => (
                  <p key={index} className="text-sm">
                    • {damageItem}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
