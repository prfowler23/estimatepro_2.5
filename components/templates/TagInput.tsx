import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
}

export default function TagInput({
  tags,
  onTagsChange,
  label = "Tags",
  placeholder = "Add tag...",
  maxTags = 10,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const sanitizeInput = useCallback((input: string): string => {
    // Remove potentially dangerous HTML tags and script content
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .trim();
  }, []);

  const handleAddTag = useCallback(() => {
    if (disabled || tags.length >= maxTags) return;

    const sanitizedInput = sanitizeInput(inputValue);
    const trimmedInput = sanitizedInput.trim();

    if (trimmedInput && !tags.includes(trimmedInput.toLowerCase())) {
      const newTags = [...tags, trimmedInput.toLowerCase()];
      onTagsChange(newTags);
      setInputValue("");
    }
  }, [inputValue, tags, onTagsChange, sanitizeInput, disabled, maxTags]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      if (disabled) return;

      const newTags = tags.filter((tag) => tag !== tagToRemove);
      onTagsChange(newTags);
    },
    [tags, onTagsChange, disabled],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  const canAddTag = inputValue.trim() && tags.length < maxTags && !disabled;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={`Add new ${label.toLowerCase()}`}
          aria-describedby="tags-help"
          disabled={disabled || tags.length >= maxTags}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddTag}
          aria-label={`Add ${label.toLowerCase()}`}
          disabled={!canAddTag}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="flex flex-wrap gap-2 mt-2"
        role="list"
        aria-label={`Selected ${label.toLowerCase()}`}
      >
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            role="listitem"
          >
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="flex items-center gap-1 w-full h-full"
              aria-label={`Remove ${label.toLowerCase().slice(0, -1)}: ${tag}`}
              disabled={disabled}
            >
              {tag}
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <p id="tags-help" className="text-xs text-muted-foreground mt-1">
        Press Enter to add a {label.toLowerCase().slice(0, -1)}, or click to
        remove existing ones.
        {maxTags && ` Maximum ${maxTags} ${label.toLowerCase()} allowed.`}
      </p>
    </div>
  );
}
