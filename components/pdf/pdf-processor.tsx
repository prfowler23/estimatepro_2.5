// PDF Processing Component
// Handles PDF upload, processing, and display of results

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Upload as UploadIcon,
  FileText as FileIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Image as ImageIcon,
  Ruler as MeasurementIcon,
  X as CancelIcon,
} from "lucide-react";
import { ComponentErrorBoundary } from "@/components/error-handling/component-error-boundary";
import type {
  PDFProcessingOptions,
  PDFProcessingResult,
  PDFMetadata,
  PDFMeasurement,
  PDFImageData,
  PDFSearchMatch,
  MeasurementType,
} from "@/lib/pdf/types";

// Use shared types from lib/pdf/types.ts
interface PDFComponentProcessingResult extends PDFProcessingResult {
  filename: string;
  fileSize: number;
  extractedText: string;
  textLength: number;
  imagesFound: number;
  imageDetails: Array<{
    pageNumber: number;
    imageIndex: number;
    width: number;
    height: number;
    format: string;
    hasOCRText: boolean;
    ocrConfidence?: number;
    textPreview?: string;
  }>;
  pageImages: string[];
  measurementsFound: number;
  buildingAnalysis: {
    length?: number;
    width?: number;
    height?: number;
    area?: number;
    confidence: number;
    hasReliableData: boolean;
    suggestedArea?: number;
    suggestedDimensions: {
      length?: number;
      width?: number;
      height?: number;
    };
  };
  processingStats: {
    pagesProcessed: number;
    totalImages: number;
    totalMeasurements: number;
    ocrPerformed: boolean;
    measurementDetectionEnabled: boolean;
  };
}

interface PDFSearchResults {
  success: boolean;
  totalMatches: number;
  matches: PDFSearchMatch[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function PDFProcessorComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PDFComponentProcessingResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PDFSearchResults | null>(
    null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [options, setOptions] = useState<PDFProcessingOptions>({
    extractImages: true,
    performOCR: true,
    detectMeasurements: true,
    ocrLanguage: "eng",
    convertToImages: false,
    imageFormat: "png",
    imageDensity: 150,
  });

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];

      if (!selectedFile) {
        return;
      }

      // Validate file type
      if (selectedFile.type !== "application/pdf") {
        setError("Please select a valid PDF file");
        return;
      }

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(
          `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        );
        return;
      }

      setFile(selectedFile);
      setResult(null);
      setError(null);
      setSearchResults(null);
    },
    [],
  );

  const processPDF = async () => {
    if (!file) return;

    // Cancel any existing processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("options", JSON.stringify(options));

      // Simulate progress
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/pdf/process", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "PDF processing failed");
      }

      const result = await response.json();
      setResult(result);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setError("Processing cancelled");
      } else {
        console.error("PDF processing error:", error);
        setError(error instanceof Error ? error.message : "Processing failed");
      }
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const searchInPDF = async () => {
    if (!file || !searchTerm.trim()) return;

    // Validate search term length
    if (searchTerm.length > 100) {
      setError("Search term is too long (max 100 characters)");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("searchTerm", searchTerm.trim());
      formData.append("useRegex", "false");

      const response = await fetch("/api/pdf/process?operation=search", {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const searchResult = await response.json();
      setSearchResults(searchResult);
    } catch (error) {
      console.error("Search error:", error);
      setError(error instanceof Error ? error.message : "Search failed");
    }
  };

  const downloadResults = () => {
    if (!result) return;

    const data = {
      filename: result.filename,
      extractedText: result.extractedText,
      measurements: result.measurements,
      buildingAnalysis: result.buildingAnalysis,
      metadata: result.metadata,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.filename}_analysis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getMeasurementTypeColor = (type: MeasurementType) => {
    switch (type) {
      case "dimension":
        return "bg-blue-100 text-blue-800";
      case "area":
        return "bg-green-100 text-green-800";
      case "scale":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear any running intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">PDF Processor</h1>
        <p className="text-muted-foreground">
          Extract text, images, and measurements from PDF documents with
          AI-powered analysis
        </p>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" />
            Upload PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <FileIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">Choose PDF file</p>
                <p className="text-sm text-muted-foreground">
                  Maximum size: {MAX_FILE_SIZE / (1024 * 1024)}MB
                </p>
              </label>
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {isProcessing ? (
                  <Button
                    onClick={cancelProcessing}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <CancelIcon className="h-4 w-4" />
                    Cancel
                  </Button>
                ) : (
                  <Button
                    onClick={processPDF}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    Process PDF
                  </Button>
                )}
              </div>
            )}

            {/* Processing Options */}
            {file && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Processing Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="extract-images">Extract Images</Label>
                      <Switch
                        id="extract-images"
                        checked={options.extractImages}
                        onCheckedChange={(checked) =>
                          setOptions((prev) => ({
                            ...prev,
                            extractImages: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="perform-ocr">Perform OCR</Label>
                      <Switch
                        id="perform-ocr"
                        checked={options.performOCR}
                        onCheckedChange={(checked) =>
                          setOptions((prev) => ({
                            ...prev,
                            performOCR: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="detect-measurements">
                        Detect Measurements
                      </Label>
                      <Switch
                        id="detect-measurements"
                        checked={options.detectMeasurements}
                        onCheckedChange={(checked) =>
                          setOptions((prev) => ({
                            ...prev,
                            detectMeasurements: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="convert-images">Convert to Images</Label>
                      <Switch
                        id="convert-images"
                        checked={options.convertToImages}
                        onCheckedChange={(checked) =>
                          setOptions((prev) => ({
                            ...prev,
                            convertToImages: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {options.performOCR && (
                    <div className="space-y-2">
                      <Label>OCR Language</Label>
                      <Select
                        value={options.ocrLanguage}
                        onValueChange={(value) =>
                          setOptions((prev) => ({
                            ...prev,
                            ocrLanguage: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eng">English</SelectItem>
                          <SelectItem value="spa">Spanish</SelectItem>
                          <SelectItem value="fra">French</SelectItem>
                          <SelectItem value="deu">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {options.convertToImages && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Image Format</Label>
                        <Select
                          value={options.imageFormat}
                          onValueChange={(value: "png" | "jpeg") =>
                            setOptions((prev) => ({
                              ...prev,
                              imageFormat: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="png">PNG</SelectItem>
                            <SelectItem value="jpeg">JPEG</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Image Quality (DPI)</Label>
                        <Input
                          type="number"
                          min="72"
                          max="300"
                          value={options.imageDensity}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              imageDensity: parseInt(e.target.value) || 150,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing PDF...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileIcon className="h-5 w-5" />
                Processing Results
              </CardTitle>
              <Button onClick={downloadResults} variant="outline" size="sm">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="measurements">Measurements</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {result.metadata.pageCount}
                      </div>
                      <p className="text-sm text-muted-foreground">Pages</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {result.textLength.toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Characters
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {result.imagesFound}
                      </div>
                      <p className="text-sm text-muted-foreground">Images</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {result.measurementsFound}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Measurements
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Building Analysis */}
                {result.buildingAnalysis.hasReliableData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MeasurementIcon className="h-5 w-5" />
                        Building Analysis
                        <Badge
                          variant={
                            result.buildingAnalysis.confidence > 0.8
                              ? "default"
                              : "secondary"
                          }
                        >
                          {Math.round(result.buildingAnalysis.confidence * 100)}
                          % confidence
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {result.buildingAnalysis.suggestedDimensions.length && (
                          <div>
                            <p className="text-sm font-medium">Length</p>
                            <p className="text-lg">
                              {result.buildingAnalysis.suggestedDimensions.length?.toFixed(
                                1,
                              )}{" "}
                              ft
                            </p>
                          </div>
                        )}
                        {result.buildingAnalysis.suggestedDimensions.width && (
                          <div>
                            <p className="text-sm font-medium">Width</p>
                            <p className="text-lg">
                              {result.buildingAnalysis.suggestedDimensions.width?.toFixed(
                                1,
                              )}{" "}
                              ft
                            </p>
                          </div>
                        )}
                        {result.buildingAnalysis.suggestedDimensions.height && (
                          <div>
                            <p className="text-sm font-medium">Height</p>
                            <p className="text-lg">
                              {result.buildingAnalysis.suggestedDimensions.height?.toFixed(
                                1,
                              )}{" "}
                              ft
                            </p>
                          </div>
                        )}
                        {result.buildingAnalysis.suggestedArea && (
                          <div>
                            <p className="text-sm font-medium">Area</p>
                            <p className="text-lg">
                              {result.buildingAnalysis.suggestedArea?.toLocaleString()}{" "}
                              sq ft
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* File Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle>Document Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Filename:</span>{" "}
                        {result.filename}
                      </div>
                      <div>
                        <span className="font-medium">File Size:</span>{" "}
                        {formatFileSize(result.fileSize)}
                      </div>
                      {result.metadata.title && (
                        <div>
                          <span className="font-medium">Title:</span>{" "}
                          {result.metadata.title}
                        </div>
                      )}
                      {result.metadata.author && (
                        <div>
                          <span className="font-medium">Author:</span>{" "}
                          {result.metadata.author}
                        </div>
                      )}
                      {result.metadata.creator && (
                        <div>
                          <span className="font-medium">Creator:</span>{" "}
                          {result.metadata.creator}
                        </div>
                      )}
                      {result.metadata.creationDate && (
                        <div>
                          <span className="font-medium">Created:</span>{" "}
                          {new Date(
                            result.metadata.creationDate,
                          ).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Text Tab */}
              <TabsContent value="text" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Extracted Text</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={result.extractedText}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                      placeholder="No text extracted from PDF"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Images Tab */}
              <TabsContent value="images" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.imageDetails.map((image, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Image {image.imageIndex + 1} (Page {image.pageNumber})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Size:</span>{" "}
                            {image.width} × {image.height}
                          </div>
                          <div>
                            <span className="font-medium">Format:</span>{" "}
                            {image.format.toUpperCase()}
                          </div>
                          {image.hasOCRText && (
                            <>
                              <div>
                                <span className="font-medium">
                                  OCR Confidence:
                                </span>{" "}
                                {image.ocrConfidence?.toFixed(2)}%
                              </div>
                              {image.textPreview && (
                                <div>
                                  <span className="font-medium">
                                    Text Preview:
                                  </span>
                                  <p className="text-xs bg-gray-50 p-2 rounded mt-1">
                                    {image.textPreview}...
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Page Images */}
                {result.pageImages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Page Images</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {result.pageImages.map((imageUrl, index) => (
                          <div
                            key={index}
                            className="border rounded-lg overflow-hidden"
                          >
                            <img
                              src={imageUrl}
                              alt={`Page ${index + 1}`}
                              className="w-full h-auto"
                            />
                            <div className="p-2 text-center text-sm bg-gray-50">
                              Page {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Measurements Tab */}
              <TabsContent value="measurements" className="space-y-4">
                <div className="space-y-4">
                  {result.measurements.map((measurement, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={getMeasurementTypeColor(
                                  measurement.type,
                                )}
                              >
                                {measurement.type}
                              </Badge>
                              <span className="font-medium">
                                {measurement.value}{" "}
                                {measurement.unit.replace(/_/g, " ")}
                              </span>
                              <Badge variant="outline">
                                Page {measurement.pageNumber}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Raw text: &ldquo;{measurement.rawText}&rdquo;
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {Math.round(measurement.confidence * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              confidence
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {result.measurements.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <MeasurementIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-lg font-medium">
                          No measurements detected
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Try enabling measurement detection in processing
                          options
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Search Tab */}
              <TabsContent value="search" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <SearchIcon className="h-5 w-5" />
                      Search in PDF
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter search term..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && searchInPDF()}
                      />
                      <Button
                        onClick={searchInPDF}
                        disabled={!searchTerm.trim()}
                      >
                        Search
                      </Button>
                    </div>

                    {searchResults && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {searchResults.totalMatches} matches found
                          </span>
                        </div>
                        <Separator />
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {searchResults.matches.map(
                            (match: PDFSearchMatch, index: number) => (
                              <Card key={index}>
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline">
                                      Page {match.pageNumber}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      Match {index + 1}
                                    </span>
                                  </div>
                                  <p className="text-sm">
                                    ...{match.context}...
                                  </p>
                                </CardContent>
                              </Card>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export wrapped with error boundary
export function PDFProcessor() {
  return (
    <ComponentErrorBoundary
      componentName="PDFProcessor"
      showDetails={process.env.NODE_ENV === "development"}
    >
      <PDFProcessorComponent />
    </ComponentErrorBoundary>
  );
}
