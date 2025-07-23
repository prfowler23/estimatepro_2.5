import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Camera, Mail, Mic, Calculator } from "lucide-react";

interface AICreateEstimateCardProps {
  navigateTo: (path: string) => void;
}

export const AICreateEstimateCard: React.FC<AICreateEstimateCardProps> = ({
  navigateTo,
}) => {
  return (
    <div className="mb-8">
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <Bot className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Create AI Estimate
            </h2>
            <p className="text-gray-600 mb-4">
              Drop email, photos, or describe your project - AI does the rest
            </p>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              onClick={() => navigateTo("/estimates/new/guided")}
            >
              <Bot className="mr-2 h-5 w-5" />
              Start AI Estimation
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button
              variant="outline"
              className="h-auto p-3 flex-col"
              onClick={() => navigateTo("/estimates/new/guided?start=photos")}
            >
              <Camera className="h-5 w-5 mb-1" />
              <span className="text-xs">Photo Analysis</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 flex-col"
              onClick={() => navigateTo("/estimates/new/guided?start=email")}
            >
              <Mail className="h-5 w-5 mb-1" />
              <span className="text-xs">Email Parse</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 flex-col"
              onClick={() => navigateTo("/estimates/new/guided?start=voice")}
            >
              <Mic className="h-5 w-5 mb-1" />
              <span className="text-xs">Voice Input</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 flex-col"
              onClick={() => navigateTo("/calculator")}
            >
              <Calculator className="h-5 w-5 mb-1" />
              <span className="text-xs">Calculator</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 flex-col border-purple-200 bg-purple-50"
              onClick={() => navigateTo("/ai-assistant")}
            >
              <Bot className="h-5 w-5 mb-1 text-purple-600" />
              <span className="text-xs">AI Assistant</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
