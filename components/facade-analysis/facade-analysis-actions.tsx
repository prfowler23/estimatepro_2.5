"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  Download,
  Trash2,
  MoreVertical,
  RefreshCw,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FacadeAnalysisActionsProps {
  hasAIAnalysis: boolean;
  onRunAnalysis?: () => Promise<void>;
  onExport?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onGenerateReport?: () => Promise<void>;
  onExportImages?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function FacadeAnalysisActions({
  hasAIAnalysis,
  onRunAnalysis,
  onExport,
  onDelete,
  onGenerateReport,
  onExportImages,
  isLoading = false,
  className,
}: FacadeAnalysisActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {onRunAnalysis && (
        <Button onClick={onRunAnalysis} disabled={isLoading} className="gap-2">
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : hasAIAnalysis ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Re-analyze
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Run AI Analysis
            </>
          )}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onGenerateReport && (
            <DropdownMenuItem onClick={onGenerateReport}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </DropdownMenuItem>
          )}
          {onExport && (
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </DropdownMenuItem>
          )}
          {onExportImages && (
            <DropdownMenuItem onClick={onExportImages}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Export Images
            </DropdownMenuItem>
          )}
          {(onGenerateReport || onExport || onExportImages) && onDelete && (
            <DropdownMenuSeparator />
          )}
          {onDelete && (
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Analysis
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
