import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface RecommendationsListProps {
  recommendations: string[];
  onRecommendationsChange: (recommendations: string[]) => void;
  label?: string;
  placeholder?: string;
  maxRecommendations?: number;
  disabled?: boolean;
}

export default function RecommendationsList({
  recommendations,
  onRecommendationsChange,
  label = "Best Practices & Recommendations",
  placeholder = "Add recommendation...",
  maxRecommendations = 20,
  disabled = false,
}: RecommendationsListProps) {
  const [inputValue, setInputValue] = useState("");

  const sanitizeInput = useCallback((input: string): string => {
    // Remove potentially dangerous HTML tags and script content
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .trim();
  }, []);

  const handleAddRecommendation = useCallback(() => {
    if (disabled || recommendations.length >= maxRecommendations) return;

    const sanitizedInput = sanitizeInput(inputValue);
    const trimmedInput = sanitizedInput.trim();

    if (trimmedInput) {
      const newRecommendations = [...recommendations, trimmedInput];
      onRecommendationsChange(newRecommendations);
      setInputValue("");
    }
  }, [
    inputValue,
    recommendations,
    onRecommendationsChange,
    sanitizeInput,
    disabled,
    maxRecommendations,
  ]);

  const handleRemoveRecommendation = useCallback(
    (index: number) => {
      if (disabled) return;

      const newRecommendations = recommendations.filter((_, i) => i !== index);
      onRecommendationsChange(newRecommendations);
    },
    [recommendations, onRecommendationsChange, disabled],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddRecommendation();
      }
    },
    [handleAddRecommendation],
  );

  const canAddRecommendation =
    inputValue.trim() &&
    recommendations.length < maxRecommendations &&
    !disabled;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Add new recommendation"
          aria-describedby="recommendations-help"
          disabled={disabled || recommendations.length >= maxRecommendations}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddRecommendation}
          aria-label="Add recommendation"
          disabled={!canAddRecommendation}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ul className="space-y-1 mt-2" aria-label="Recommendations list">
        {recommendations.map((rec, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="text-primary">•</span>
            <span className="flex-1">{rec}</span>
            <button
              type="button"
              onClick={() => handleRemoveRecommendation(idx)}
              className="text-muted-foreground hover:text-destructive focus:text-destructive focus:outline-none focus:ring-1 focus:ring-destructive rounded-sm p-1"
              aria-label={`Remove recommendation: ${rec}`}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>

      <p
        id="recommendations-help"
        className="text-xs text-muted-foreground mt-1"
      >
        Press Enter to add a recommendation, or click the X to remove existing
        ones.
        {maxRecommendations &&
          ` Maximum ${maxRecommendations} recommendations allowed.`}
      </p>
    </div>
  );
}
