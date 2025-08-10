"use client";

import { DollarSign, TrendingUp } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EstimateSummarySectionProps {
  form: UseFormReturn<any>;
  isEditing: boolean;
  totalPrice: number;
  formatCurrency: (amount: number) => string;
}

export function EstimateSummarySection({
  form,
  isEditing,
  totalPrice,
  formatCurrency,
}: EstimateSummarySectionProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-text-primary" />
          <span>Estimate Summary</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!isEditing}
                >
                  <FormControl>
                    <SelectTrigger className="transition-colors focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                        <span>Draft</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sent">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>Sent</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="approved">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Approved</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span>Rejected</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <Label className="text-text-secondary">Total Price</Label>
            <div className="flex items-center space-x-2">
              <div className="text-3xl font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">
                {formatCurrency(totalPrice)}
              </div>
              {totalPrice > 0 && (
                <TrendingUp className="h-5 w-5 text-green-500" />
              )}
            </div>
            {totalPrice === 0 && (
              <p className="text-xs text-text-secondary">
                Add services to calculate total
              </p>
            )}
          </div>
        </div>

        {/* Additional summary information */}
        {totalPrice > 0 && (
          <div className="border-t border-border-primary pt-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary">
                  Base Amount
                </p>
                <p className="text-lg text-text-secondary">
                  {formatCurrency(totalPrice * 0.85)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary">
                  Tax & Fees
                </p>
                <p className="text-lg text-text-secondary">
                  {formatCurrency(totalPrice * 0.15)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary">
                  Final Total
                </p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(totalPrice)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
