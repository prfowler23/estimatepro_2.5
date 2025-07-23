import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Clock, Target, Zap, Bot } from "lucide-react";

export const AIBusinessInsights: React.FC = () => {
  return (
    <div className="mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Clock className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-green-700">40+ hrs</div>
              <div className="text-xs text-green-600">AI saved this month</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Target className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-blue-700">95%</div>
              <div className="text-xs text-blue-600">
                Photo analysis accuracy
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Zap className="h-6 w-6 text-purple-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-purple-700">3 min</div>
              <div className="text-xs text-purple-600">Avg estimate time</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Bot className="h-6 w-6 text-orange-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-orange-700">85%</div>
              <div className="text-xs text-orange-600">Automation rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
