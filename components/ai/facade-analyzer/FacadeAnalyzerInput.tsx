// Facade Analyzer Input Component
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FacadeAnalyzerInputProps } from "./types";

export function FacadeAnalyzerInput({
  imageUrl,
  setImageUrl,
  buildingType,
  setBuildingType,
  onAnalyze,
  isAnalyzing,
  error,
}: FacadeAnalyzerInputProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Input</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="imageUrl">Building Image URL</Label>
          <Input
            id="imageUrl"
            placeholder="https://example.com/building-image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            aria-label="Building image URL"
            aria-describedby={error ? "input-error" : undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="buildingType">Building Type</Label>
          <Select value={buildingType} onValueChange={setBuildingType}>
            <SelectTrigger id="buildingType" aria-label="Select building type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="industrial">Industrial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={onAnalyze}
          disabled={isAnalyzing || !imageUrl.trim()}
          className="w-full"
          aria-busy={isAnalyzing}
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Facade"}
        </Button>

        {error && (
          <div
            id="input-error"
            className="p-3 bg-red-50 border border-red-200 rounded-md"
            role="alert"
          >
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
