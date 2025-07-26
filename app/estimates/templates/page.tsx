"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  WorkflowTemplateService,
  WorkflowTemplate,
} from "@/lib/services/workflow-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, Tag, TrendingUp, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedComplexity, setSelectedComplexity] = useState<string | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Get all templates
  const allTemplates = useMemo(
    () => WorkflowTemplateService.getAllTemplates(),
    [],
  );
  const popularTemplates = useMemo(
    () => WorkflowTemplateService.getPopularTemplates(3),
    [],
  );

  // Filter templates based on search and filters
  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    // Apply search filter
    if (searchQuery) {
      templates = WorkflowTemplateService.searchTemplates(searchQuery);
    }

    // Apply category filter
    if (selectedCategory) {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    // Apply complexity filter
    if (selectedComplexity) {
      templates = templates.filter((t) => t.complexity === selectedComplexity);
    }

    return templates;
  }, [allTemplates, searchQuery, selectedCategory, selectedComplexity]);

  // Categories and complexities for filters
  const categories = ["commercial", "residential", "industrial", "specialty"];
  const complexities = ["simple", "moderate", "complex"];

  // Handle template selection
  const handleSelectTemplate = (template: WorkflowTemplate) => {
    // Store template in session storage for the flow to pick up
    sessionStorage.setItem("selectedTemplateId", template.id);
    router.push("/estimates/new/guided");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-text-primary">
            Choose a Template
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Start with a pre-configured template for faster estimate creation
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary h-4 w-4" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Category filters */}
            <div className="flex gap-2">
              <span className="text-sm text-text-secondary self-center">
                Category:
              </span>
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={
                    selectedCategory === category ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Complexity filters */}
            <div className="flex gap-2">
              <span className="text-sm text-text-secondary self-center">
                Complexity:
              </span>
              <Button
                variant={selectedComplexity === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedComplexity(null)}
              >
                All
              </Button>
              {complexities.map((complexity) => (
                <Button
                  key={complexity}
                  variant={
                    selectedComplexity === complexity ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedComplexity(complexity)}
                  className="capitalize"
                >
                  {complexity}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Popular Templates */}
        {!searchQuery && !selectedCategory && !selectedComplexity && (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent-primary" />
              <h2 className="text-xl font-semibold text-text-primary">
                Popular Templates
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {popularTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                  showDetails={showDetails === template.id}
                  onToggleDetails={() =>
                    setShowDetails(
                      showDetails === template.id ? null : template.id,
                    )
                  }
                  isPopular
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* All Templates */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            {searchQuery || selectedCategory || selectedComplexity
              ? `Templates (${filteredTemplates.length})`
              : "All Templates"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelectTemplate}
                showDetails={showDetails === template.id}
                onToggleDetails={() =>
                  setShowDetails(
                    showDetails === template.id ? null : template.id,
                  )
                }
              />
            ))}
          </div>
        </motion.div>

        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <motion.div
            variants={itemVariants}
            className="text-center py-12 space-y-4"
          >
            <p className="text-text-secondary">
              No templates found matching your criteria
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory(null);
                setSelectedComplexity(null);
              }}
            >
              Clear Filters
            </Button>
          </motion.div>
        )}

        {/* Skip button */}
        <motion.div variants={itemVariants} className="text-center pt-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/estimates/new/guided")}
            className="text-text-secondary"
          >
            Skip and start from scratch
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Template Card Component
function TemplateCard({
  template,
  onSelect,
  showDetails,
  onToggleDetails,
  isPopular = false,
}: {
  template: WorkflowTemplate;
  onSelect: (template: WorkflowTemplate) => void;
  showDetails: boolean;
  onToggleDetails: () => void;
  isPopular?: boolean;
}) {
  const complexityColors = {
    simple: "bg-success-subtle text-success-primary",
    moderate: "bg-warning-subtle text-warning-primary",
    complex: "bg-error-subtle text-error-primary",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="h-full"
    >
      <Card
        className={cn(
          "h-full flex flex-col cursor-pointer transition-all",
          "hover:border-accent-primary hover:shadow-md",
          isPopular && "border-accent-primary",
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">{template.icon}</span>
                {template.name}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {template.description}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onToggleDetails();
              }}
              className="shrink-0"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {template.category}
            </Badge>
            <Badge className={complexityColors[template.complexity]}>
              {template.complexity}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.floor(template.estimatedDuration / 60)}h
            </Badge>
          </div>

          {/* Services */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">
              Required Services:
            </p>
            <div className="flex flex-wrap gap-1">
              {template.requiredServices.map((service) => (
                <Badge key={service} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
            </div>
          </div>

          {/* Details (expandable) */}
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-3 border-t"
            >
              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="ghost" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Recommendations */}
              {template.recommendations.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-secondary">
                    Key Points:
                  </p>
                  <ul className="text-xs text-text-tertiary space-y-1">
                    {template.recommendations.slice(0, 2).map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-accent-primary mt-0.5">•</span>
                        <span className="line-clamp-2">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {/* Action button */}
          <Button
            onClick={() => onSelect(template)}
            className="w-full"
            variant={isPopular ? "default" : "outline"}
          >
            Use This Template
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
