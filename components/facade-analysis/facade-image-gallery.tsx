"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FacadeAnalysisImage } from "@/lib/types/facade-analysis-types";
import {
  Camera,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FacadeImageGalleryProps {
  images: FacadeAnalysisImage[];
  onUploadImage?: () => void;
  className?: string;
}

export function FacadeImageGallery({
  images,
  onUploadImage,
  className,
}: FacadeImageGalleryProps) {
  const [selectedImage, setSelectedImage] =
    useState<FacadeAnalysisImage | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleImageClick = (image: FacadeAnalysisImage, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
  };

  const handlePrevious = () => {
    const newIndex = (currentIndex - 1 + images.length) % images.length;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const getImageTypeColor = (type: string) => {
    switch (type) {
      case "aerial":
        return "bg-blue-100 text-blue-800";
      case "ground":
        return "bg-green-100 text-green-800";
      case "drone":
        return "bg-purple-100 text-purple-800";
      case "satellite":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getViewAngleIcon = (angle: string) => {
    switch (angle) {
      case "front":
        return "F";
      case "rear":
        return "R";
      case "left":
        return "L";
      case "right":
        return "R";
      case "oblique":
        return "O";
      case "top":
        return "T";
      default:
        return angle[0].toUpperCase();
    }
  };

  if (images.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Camera className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Images Yet</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Upload facade images to enable AI analysis
          </p>
          {onUploadImage && (
            <Button onClick={onUploadImage}>Upload Image</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
          className,
        )}
      >
        {images.map((image, index) => (
          <Card
            key={image.id}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleImageClick(image, index)}
          >
            <div className="relative aspect-video bg-muted">
              <Image
                src={image.image_url}
                alt={`${image.image_type} view - ${image.view_angle}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

              {/* Badges */}
              <div className="absolute top-2 left-2 flex gap-1">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", getImageTypeColor(image.image_type))}
                >
                  {image.image_type}
                </Badge>
                {image.ai_analysis_results &&
                  Object.keys(image.ai_analysis_results).length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI
                    </Badge>
                  )}
              </div>

              {/* View Angle */}
              <div className="absolute bottom-2 right-2">
                <div className="bg-black/60 text-white rounded px-2 py-1 text-xs font-medium">
                  {getViewAngleIcon(image.view_angle)}
                </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40">
                <div className="flex items-center gap-2 text-white">
                  <Eye className="h-5 w-5" />
                  <span className="text-sm font-medium">View Details</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Upload New Image Card */}
        {onUploadImage && (
          <Card
            className="border-dashed cursor-pointer hover:border-primary transition-colors"
            onClick={onUploadImage}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[150px]">
              <Camera className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Add Image</span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Image Detail Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Image Details</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={images.length <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} / {images.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={images.length <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <Image
                  src={selectedImage.image_url}
                  alt={`${selectedImage.image_type} view - ${selectedImage.view_angle}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Type
                  </h4>
                  <Badge
                    className={getImageTypeColor(selectedImage.image_type)}
                  >
                    {selectedImage.image_type}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    View Angle
                  </h4>
                  <span className="capitalize">{selectedImage.view_angle}</span>
                </div>
              </div>

              {selectedImage.confidence_scores && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    AI Confidence Scores
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(selectedImage.confidence_scores).map(
                      ([key, value]) => (
                        <div key={key} className="bg-muted rounded px-3 py-2">
                          <div className="text-xs text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}
                          </div>
                          <div className="font-semibold">{value}%</div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {selectedImage.detected_elements &&
                selectedImage.detected_elements.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Detected Elements
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedImage.detected_elements.map((element, idx) => (
                        <Badge key={idx} variant="outline">
                          {element}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
