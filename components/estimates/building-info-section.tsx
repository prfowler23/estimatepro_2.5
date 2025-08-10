"use client";

import { Building, MapPin } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface BuildingInfoSectionProps {
  form: UseFormReturn<any>;
  isEditing: boolean;
}

export function BuildingInfoSection({
  form,
  isEditing,
}: BuildingInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building className="h-5 w-5 text-text-primary" />
          <span>Building Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="building_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Building Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={!isEditing}
                  className="transition-colors focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="building_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>Address</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  disabled={!isEditing}
                  rows={2}
                  className="transition-colors focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="building_height_stories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stories</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min="1"
                    disabled={!isEditing}
                    className="transition-colors focus:ring-2 focus:ring-primary/20"
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="building_height_feet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height (feet)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    disabled={!isEditing}
                    className="transition-colors focus:ring-2 focus:ring-primary/20"
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="building_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Building Type</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={!isEditing}
                    placeholder="e.g., Office, Retail"
                    className="transition-colors focus:ring-2 focus:ring-primary/20"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
