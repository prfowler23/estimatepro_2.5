"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Filter,
  Save,
  Download,
  Upload,
  Reset,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Share,
  Palette,
  Grid,
  BarChart3,
  Bell,
  Clock,
  User,
  Target,
  Zap,
  Lightbulb,
  ChevronRight,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

interface FilterRule {
  id: string;
  name: string;
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than" | "between";
  value: any;
  isActive: boolean;
}

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  rules: FilterRule[];
  isQuickFilter: boolean;
  isFavorite: boolean;
  createdAt: string;
  usageCount: number;
}

interface CustomView {
  id: string;
  name: string;
  description?: string;
  layout: string[];
  metrics: string[];
  filters: SavedFilter[];
  chartConfig: any;
  isDefault: boolean;
  isShared: boolean;
  createdAt: string;
}

interface PersonalizationSettings {
  theme: "light" | "dark" | "auto";
  density: "compact" | "comfortable" | "spacious";
  animations: boolean;
  notifications: {
    realTime: boolean;
    anomalies: boolean;
    dailyReports: boolean;
    thresholdAlerts: boolean;
  };
  chartDefaults: {
    type: "line" | "bar" | "area" | "pie";
    colors: string[];
    showGrid: boolean;
    showLegend: boolean;
  };
  autoRefresh: {
    enabled: boolean;
    interval: number; // seconds
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
}

const AdvancedFilteringPersonalization: React.FC = () => {
  const [activeTab, setActiveTab] = useState("filters");
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [customViews, setCustomViews] = useState<CustomView[]>([]);
  const [settings, setSettings] = useState<PersonalizationSettings>({
    theme: "auto",
    density: "comfortable",
    animations: true,
    notifications: {
      realTime: true,
      anomalies: true,
      dailyReports: false,
      thresholdAlerts: true,
    },
    chartDefaults: {
      type: "line",
      colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
      showGrid: true,
      showLegend: true,
    },
    autoRefresh: {
      enabled: true,
      interval: 300,
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
    },
  });

  const [newFilter, setNewFilter] = useState<Partial<SavedFilter>>({
    name: "",
    description: "",
    rules: [],
    isQuickFilter: false,
    isFavorite: false,
  });

  const [newRule, setNewRule] = useState<Partial<FilterRule>>({
    name: "",
    field: "",
    operator: "equals",
    value: "",
    isActive: true,
  });

  const [isCreateFilterOpen, setIsCreateFilterOpen] = useState(false);
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created" | "usage">("name");

  // Smart filter recommendations based on usage patterns
  const filterRecommendations = useMemo(() => {
    return [
      {
        name: "High Revenue Estimates",
        description: "Estimates with revenue > $5,000",
        confidence: 0.9,
        usage: "frequently_used",
      },
      {
        name: "This Month's Activity",
        description: "Data from current month",
        confidence: 0.85,
        usage: "trending",
      },
      {
        name: "Commercial Clients",
        description: "Filter for commercial customer segments",
        confidence: 0.8,
        usage: "role_based",
      },
    ];
  }, []);

  // Load user preferences
  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      // Simulate loading user preferences
      const mockFilters: SavedFilter[] = [
        {
          id: "filter_1",
          name: "High Value Estimates",
          description: "Estimates above $5,000",
          rules: [
            {
              id: "rule_1",
              name: "Revenue Filter",
              field: "revenue",
              operator: "greater_than",
              value: 5000,
              isActive: true,
            },
          ],
          isQuickFilter: true,
          isFavorite: true,
          createdAt: new Date().toISOString(),
          usageCount: 45,
        },
        {
          id: "filter_2",
          name: "Recent Activity",
          description: "Last 30 days",
          rules: [
            {
              id: "rule_2",
              name: "Date Filter",
              field: "created_at",
              operator: "greater_than",
              value: "30d",
              isActive: true,
            },
          ],
          isQuickFilter: true,
          isFavorite: false,
          createdAt: new Date().toISOString(),
          usageCount: 32,
        },
      ];

      setSavedFilters(mockFilters);
    } catch (error) {
      console.error("Failed to load user preferences:", error);
    }
  };

  const saveUserPreferences = async () => {
    try {
      // API call to save preferences
      console.log("Saving preferences:", {
        savedFilters,
        customViews,
        settings,
      });

      // Show success message
      alert("Preferences saved successfully!");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      alert("Failed to save preferences. Please try again.");
    }
  };

  const createFilter = useCallback(() => {
    if (!newFilter.name || !newFilter.rules?.length) return;

    const filter: SavedFilter = {
      id: `filter_${Date.now()}`,
      name: newFilter.name,
      description: newFilter.description || "",
      rules: newFilter.rules,
      isQuickFilter: newFilter.isQuickFilter || false,
      isFavorite: newFilter.isFavorite || false,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    setSavedFilters((prev) => [...prev, filter]);
    setNewFilter({
      name: "",
      description: "",
      rules: [],
      isQuickFilter: false,
      isFavorite: false,
    });
    setIsCreateFilterOpen(false);
  }, [newFilter]);

  const addFilterRule = useCallback(() => {
    if (!newRule.name || !newRule.field) return;

    const rule: FilterRule = {
      id: `rule_${Date.now()}`,
      name: newRule.name,
      field: newRule.field,
      operator: newRule.operator || "equals",
      value: newRule.value,
      isActive: newRule.isActive !== false,
    };

    setNewFilter((prev) => ({
      ...prev,
      rules: [...(prev.rules || []), rule],
    }));

    setNewRule({
      name: "",
      field: "",
      operator: "equals",
      value: "",
      isActive: true,
    });
  }, [newRule]);

  const toggleFilterFavorite = useCallback((filterId: string) => {
    setSavedFilters((prev) =>
      prev.map((filter) =>
        filter.id === filterId
          ? { ...filter, isFavorite: !filter.isFavorite }
          : filter,
      ),
    );
  }, []);

  const deleteFilter = useCallback((filterId: string) => {
    setSavedFilters((prev) => prev.filter((filter) => filter.id !== filterId));
  }, []);

  const duplicateFilter = useCallback(
    (filterId: string) => {
      const originalFilter = savedFilters.find((f) => f.id === filterId);
      if (!originalFilter) return;

      const duplicatedFilter: SavedFilter = {
        ...originalFilter,
        id: `filter_${Date.now()}`,
        name: `${originalFilter.name} (Copy)`,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };

      setSavedFilters((prev) => [...prev, duplicatedFilter]);
    },
    [savedFilters],
  );

  const exportPreferences = useCallback(() => {
    const data = {
      filters: savedFilters,
      views: customViews,
      settings,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-preferences-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [savedFilters, customViews, settings]);

  const filteredFilters = useMemo(() => {
    let filtered = savedFilters;

    if (searchQuery) {
      filtered = filtered.filter(
        (filter) =>
          filter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          filter.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "created":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "usage":
          return b.usageCount - a.usageCount;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [savedFilters, searchQuery, sortBy]);

  const renderFilterManager = () => (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Filter Management</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage custom filters for your analytics data
          </p>
        </div>
        <Dialog open={isCreateFilterOpen} onOpenChange={setIsCreateFilterOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Filter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Filter</DialogTitle>
              <DialogDescription>
                Build a custom filter with multiple rules and conditions
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="filter-name">Filter Name</Label>
                  <Input
                    id="filter-name"
                    value={newFilter.name || ""}
                    onChange={(e) =>
                      setNewFilter((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., High Value Estimates"
                  />
                </div>
                <div className="flex items-center space-x-4 pt-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="quick-filter"
                      checked={newFilter.isQuickFilter || false}
                      onCheckedChange={(checked) =>
                        setNewFilter((prev) => ({
                          ...prev,
                          isQuickFilter: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="quick-filter">Quick Filter</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="favorite"
                      checked={newFilter.isFavorite || false}
                      onCheckedChange={(checked) =>
                        setNewFilter((prev) => ({
                          ...prev,
                          isFavorite: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="favorite">Favorite</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="filter-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="filter-description"
                  value={newFilter.description || ""}
                  onChange={(e) =>
                    setNewFilter((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what this filter does..."
                  rows={2}
                />
              </div>

              {/* Filter Rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Filter Rules</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFilterRule}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Rule
                  </Button>
                </div>

                {/* Add Rule Form */}
                <Card className="p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs">Rule Name</Label>
                      <Input
                        value={newRule.name || ""}
                        onChange={(e) =>
                          setNewRule((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Rule name"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Field</Label>
                      <Select
                        value={newRule.field || ""}
                        onValueChange={(value) =>
                          setNewRule((prev) => ({ ...prev, field: value }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="customer_type">
                            Customer Type
                          </SelectItem>
                          <SelectItem value="service_type">
                            Service Type
                          </SelectItem>
                          <SelectItem value="created_at">
                            Created Date
                          </SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={newRule.operator || "equals"}
                        onValueChange={(value: any) =>
                          setNewRule((prev) => ({ ...prev, operator: value }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="greater_than">
                            Greater Than
                          </SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="between">Between</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Value</Label>
                      <Input
                        value={newRule.value || ""}
                        onChange={(e) =>
                          setNewRule((prev) => ({
                            ...prev,
                            value: e.target.value,
                          }))
                        }
                        placeholder="Value"
                        className="h-8"
                      />
                    </div>
                  </div>
                </Card>

                {/* Existing Rules */}
                <div className="space-y-2">
                  {newFilter.rules?.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge variant="secondary">{rule.field}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {rule.operator}
                        </span>
                        <span className="font-medium">{rule.value}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setNewFilter((prev) => ({
                            ...prev,
                            rules: prev.rules?.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateFilterOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createFilter}>Create Filter</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Smart Recommendations */}
      {filterRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Smart Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filterRecommendations.map((rec, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rec.name}</h4>
                    <Badge variant="secondary">
                      {(rec.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {rec.description}
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    <Plus className="h-3 w-3 mr-1" />
                    Create Filter
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Search and Sort */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search filters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort by Name</SelectItem>
            <SelectItem value="created">Sort by Created</SelectItem>
            <SelectItem value="usage">Sort by Usage</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filters List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredFilters.map((filter) => (
          <Card key={filter.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{filter.name}</CardTitle>
                  {filter.isQuickFilter && (
                    <Badge variant="secondary">Quick</Badge>
                  )}
                  {filter.isFavorite && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => toggleFilterFavorite(filter.id)}
                    >
                      {filter.isFavorite ? (
                        <StarOff className="h-4 w-4 mr-2" />
                      ) : (
                        <Star className="h-4 w-4 mr-2" />
                      )}
                      {filter.isFavorite
                        ? "Remove from favorites"
                        : "Add to favorites"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => duplicateFilter(filter.id)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteFilter(filter.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {filter.description && (
                <p className="text-sm text-muted-foreground">
                  {filter.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filter.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Badge variant="outline" className="text-xs">
                      {rule.field}
                    </Badge>
                    <span className="text-muted-foreground">
                      {rule.operator}
                    </span>
                    <span className="font-medium">{rule.value}</span>
                    {rule.isActive ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <X className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Used {filter.usageCount} times
                </span>
                <span className="text-xs text-muted-foreground">
                  Created {new Date(filter.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFilters.length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No filters found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? "No filters match your search criteria"
              : "Create your first custom filter to get started"}
          </p>
          <Button onClick={() => setIsCreateFilterOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Filter
          </Button>
        </div>
      )}
    </div>
  );

  const renderPersonalizationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Personalization Settings</h3>
        <p className="text-sm text-muted-foreground">
          Customize your analytics experience with themes, notifications, and
          display preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme & Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme & Display
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value: any) =>
                  setSettings((prev) => ({ ...prev, theme: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Density</Label>
              <Select
                value={settings.density}
                onValueChange={(value: any) =>
                  setSettings((prev) => ({ ...prev, density: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="animations">Enable Animations</Label>
              <Switch
                id="animations"
                checked={settings.animations}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, animations: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="realtime">Real-time Updates</Label>
              <Switch
                id="realtime"
                checked={settings.notifications.realTime}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, realTime: checked },
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="anomalies">Anomaly Alerts</Label>
              <Switch
                id="anomalies"
                checked={settings.notifications.anomalies}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      anomalies: checked,
                    },
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="daily-reports">Daily Reports</Label>
              <Switch
                id="daily-reports"
                checked={settings.notifications.dailyReports}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      dailyReports: checked,
                    },
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="threshold-alerts">Threshold Alerts</Label>
              <Switch
                id="threshold-alerts"
                checked={settings.notifications.thresholdAlerts}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      thresholdAlerts: checked,
                    },
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Chart Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Chart Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Chart Type</Label>
              <Select
                value={settings.chartDefaults.type}
                onValueChange={(value: any) =>
                  setSettings((prev) => ({
                    ...prev,
                    chartDefaults: { ...prev.chartDefaults, type: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-grid">Show Grid</Label>
              <Switch
                id="show-grid"
                checked={settings.chartDefaults.showGrid}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    chartDefaults: { ...prev.chartDefaults, showGrid: checked },
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-legend">Show Legend</Label>
              <Switch
                id="show-legend"
                checked={settings.chartDefaults.showLegend}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    chartDefaults: {
                      ...prev.chartDefaults,
                      showLegend: checked,
                    },
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto Refresh */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Auto Refresh
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-refresh">Enable Auto Refresh</Label>
              <Switch
                id="auto-refresh"
                checked={settings.autoRefresh.enabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoRefresh: { ...prev.autoRefresh, enabled: checked },
                  }))
                }
              />
            </div>

            {settings.autoRefresh.enabled && (
              <div>
                <Label>Refresh Interval (seconds)</Label>
                <div className="mt-2">
                  <Slider
                    value={[settings.autoRefresh.interval]}
                    onValueChange={([value]) =>
                      setSettings((prev) => ({
                        ...prev,
                        autoRefresh: { ...prev.autoRefresh, interval: value },
                      }))
                    }
                    min={30}
                    max={3600}
                    step={30}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>30s</span>
                    <span className="font-medium">
                      {settings.autoRefresh.interval}s
                    </span>
                    <span>1h</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Advanced Analytics Personalization
            </h1>
            <p className="text-slate-600 mt-2">
              Customize your analytics experience with advanced filtering and
              personalization options
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <Button variant="outline" onClick={exportPreferences}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={saveUserPreferences}>
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="filters">Smart Filters</TabsTrigger>
            <TabsTrigger value="views">Custom Views</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="import-export">Import/Export</TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="space-y-6">
            {renderFilterManager()}
          </TabsContent>

          <TabsContent value="views" className="space-y-6">
            <div className="text-center py-12">
              <Grid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Custom Views</h3>
              <p className="text-muted-foreground mb-4">
                Create and manage custom dashboard views (Coming Soon)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {renderPersonalizationSettings()}
          </TabsContent>

          <TabsContent value="import-export" className="space-y-6">
            <div className="text-center py-12">
              <Share className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Import/Export</h3>
              <p className="text-muted-foreground mb-4">
                Backup and restore your preferences (Coming Soon)
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedFilteringPersonalization;
