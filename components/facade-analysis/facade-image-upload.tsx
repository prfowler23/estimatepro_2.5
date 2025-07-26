"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, Link, Camera, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FacadeImageUploadProps {
  facadeAnalysisId: string;
  onUploadComplete?: () => void;
  className?: string;
}

export function FacadeImageUpload({
  facadeAnalysisId,
  onUploadComplete,
  className,
}: FacadeImageUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("file");
  const [imageUrl, setImageUrl] = useState("");
  const [imageType, setImageType] = useState<string>("ground");
  const [viewAngle, setViewAngle] = useState<string>("front");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    disabled: uploadMethod !== "file",
  });

  const handleUpload = async () => {
    if (uploadMethod === "file" && !selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }

    if (uploadMethod === "url" && !imageUrl) {
      toast({
        title: "No URL provided",
        description: "Please enter an image URL",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      if (uploadMethod === "file" && selectedFile) {
        formData.append("image", selectedFile);
      } else if (uploadMethod === "url") {
        formData.append("imageUrl", imageUrl);
      }
      formData.append("imageType", imageType);
      formData.append("viewAngle", viewAngle);

      const response = await fetch(
        `/api/facade-analysis/${facadeAnalysisId}/images`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }

      toast({
        title: "Image uploaded",
        description: "The image has been added to the facade analysis",
      });

      setIsOpen(false);
      setSelectedFile(null);
      setImageUrl("");
      onUploadComplete?.();
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className={className}>
        <Upload className="h-4 w-4 mr-2" />
        Upload Image
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Facade Image</DialogTitle>
            <DialogDescription>
              Add an image to the facade analysis for AI processing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload Method Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={uploadMethod === "file" ? "default" : "outline"}
                onClick={() => setUploadMethod("file")}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Upload File
              </Button>
              <Button
                variant={uploadMethod === "url" ? "default" : "outline"}
                onClick={() => setUploadMethod("url")}
                className="gap-2"
              >
                <Link className="h-4 w-4" />
                Image URL
              </Button>
            </div>

            {/* File Upload */}
            {uploadMethod === "file" && (
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary",
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-sm">Drop the image here...</p>
                ) : selectedFile ? (
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm">
                      Drag & drop an image here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* URL Input */}
            {uploadMethod === "url" && (
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/facade-image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            )}

            {/* Image Type */}
            <div className="space-y-2">
              <Label htmlFor="imageType">Image Type</Label>
              <Select value={imageType} onValueChange={setImageType}>
                <SelectTrigger id="imageType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ground">Ground Level</SelectItem>
                  <SelectItem value="aerial">Aerial</SelectItem>
                  <SelectItem value="drone">Drone</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Angle */}
            <div className="space-y-2">
              <Label htmlFor="viewAngle">View Angle</Label>
              <Select value={viewAngle} onValueChange={setViewAngle}>
                <SelectTrigger id="viewAngle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">Front</SelectItem>
                  <SelectItem value="rear">Rear</SelectItem>
                  <SelectItem value="left">Left Side</SelectItem>
                  <SelectItem value="right">Right Side</SelectItem>
                  <SelectItem value="oblique">Oblique</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
