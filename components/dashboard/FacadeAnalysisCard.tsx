"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Sparkles, ArrowRight, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function FacadeAnalysisCard() {
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                AI Facade Analysis
              </CardTitle>
              <CardDescription>
                Analyze building facades with AI-powered measurements
              </CardDescription>
            </div>
            <div className="bg-primary/10 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span>Upload facade photos</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span>AI extracts measurements & materials</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>Auto-populate estimate fields</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 group-hover:bg-primary group-hover:text-white transition-colors"
              onClick={() => router.push("/estimates/new/guided")}
            >
              Start New Estimate
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setShowInfo(true);
              }}
            >
              ?
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              AI Facade Analysis
            </DialogTitle>
            <DialogDescription>
              Advanced AI-powered building analysis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 text-sm">
              <h4 className="font-semibold">How it works:</h4>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Upload photos of building facades</li>
                <li>
                  AI analyzes images to detect:
                  <ul className="ml-6 mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Total facade area</li>
                    <li>Window/glass measurements</li>
                    <li>Building materials</li>
                    <li>Complexity assessment</li>
                  </ul>
                </li>
                <li>Measurements auto-populate your estimate</li>
                <li>Review and adjust as needed</li>
              </ol>
            </div>

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Perfect for:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Window cleaning estimates</li>
                <li>• Pressure washing quotes</li>
                <li>• Building maintenance</li>
                <li>• Facade restoration</li>
              </ul>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setShowInfo(false);
                router.push("/estimates/new/guided");
              }}
            >
              Try It Now
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
