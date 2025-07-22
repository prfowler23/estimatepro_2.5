import { createClient } from "@/lib/supabase/server";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  PhotoAnalysisResult,
  analyzePhotos,
  estimateMaterialQuantities,
  countDetailedItems,
  analyze3DReconstruction,
  compareBeforeAfter,
  fileToBase64,
} from "@/lib/ai/photo-analysis";

export interface PhotoData {
  id: string;
  estimate_id?: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  public_url?: string;
  metadata?: Record<string, any>;
  uploaded_at: string;
}

export interface PhotoAnalysisData {
  id: string;
  photo_id: string;
  analysis_type: string;
  results: Record<string, any>;
  confidence?: number;
  processing_time_ms?: number;
  processed_at: string;
}

export interface PhotoUploadOptions {
  estimateId?: string;
  compress?: boolean;
  maxSizeMB?: number;
}

export interface AnalysisProgress {
  totalPhotos: number;
  processedPhotos: number;
  currentStep: string;
  isComplete: boolean;
  errors: string[];
}

export class PhotoService {
  private supabase = createClient();
  private readonly STORAGE_BUCKET = "estimate-photos";
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
  ];

  /**
   * Upload photos to Supabase Storage and save metadata to database
   */
  async uploadPhotos(
    files: File[],
    userId: string,
    options: PhotoUploadOptions = {},
  ): Promise<PhotoData[]> {
    const { estimateId, compress = true, maxSizeMB = 10 } = options;
    const uploadedPhotos: PhotoData[] = [];

    for (const file of files) {
      try {
        // Validate file
        this.validateFile(file);

        // Process file (compress if needed)
        const processedFile = compress
          ? await this.compressImage(file, maxSizeMB)
          : file;

        // Generate unique file path
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } =
          await this.supabase.storage
            .from(this.STORAGE_BUCKET)
            .upload(filePath, processedFile, {
              cacheControl: "3600",
              upsert: false,
            });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = this.supabase.storage
          .from(this.STORAGE_BUCKET)
          .getPublicUrl(filePath);

        // Extract metadata
        const metadata = await this.extractFileMetadata(file);

        // Save to database
        const { data: photoData, error: dbError } = await this.supabase
          .from("photos")
          .insert({
            estimate_id: estimateId,
            user_id: userId,
            file_name: file.name,
            file_size: processedFile.size,
            mime_type: file.type,
            storage_path: filePath,
            public_url: publicUrl,
            metadata,
          })
          .select()
          .single();

        if (dbError) {
          // Clean up uploaded file if database insert fails
          await this.supabase.storage
            .from(this.STORAGE_BUCKET)
            .remove([filePath]);
          throw new Error(`Database save failed: ${dbError.message}`);
        }

        uploadedPhotos.push(photoData);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        throw error;
      }
    }

    return uploadedPhotos;
  }

  /**
   * Analyze photos using AI and save results
   */
  async analyzePhotos(
    photoIds: string[],
    analysisTypes: string[] = ["comprehensive"],
    onProgress?: (progress: AnalysisProgress) => void,
  ): Promise<PhotoAnalysisData[]> {
    const results: PhotoAnalysisData[] = [];
    const errors: string[] = [];
    let processedPhotos = 0;

    onProgress?.({
      totalPhotos: photoIds.length,
      processedPhotos: 0,
      currentStep: "Starting analysis...",
      isComplete: false,
      errors: [],
    });

    for (const photoId of photoIds) {
      try {
        // Get photo data
        const { data: photo, error: photoError } = await this.supabase
          .from("photos")
          .select("*")
          .eq("id", photoId)
          .single();

        if (photoError || !photo) {
          throw new Error(`Photo not found: ${photoId}`);
        }

        onProgress?.({
          totalPhotos: photoIds.length,
          processedPhotos,
          currentStep: `Analyzing ${photo.file_name}...`,
          isComplete: false,
          errors,
        });

        // Download photo for analysis
        const { data: fileData } = await this.supabase.storage
          .from(this.STORAGE_BUCKET)
          .download(photo.storage_path);

        if (!fileData) {
          throw new Error(`Failed to download photo: ${photo.file_name}`);
        }

        // Convert to File object for analysis
        const file = new File([fileData], photo.file_name, {
          type: photo.mime_type,
        });
        const imageBase64 = await fileToBase64(file);

        // Run different analysis types
        for (const analysisType of analysisTypes) {
          const startTime = Date.now();
          let analysisResult: any = {};
          let confidence = 0;

          switch (analysisType) {
            case "comprehensive":
              const fullAnalysis = await analyzePhotos([file]);
              analysisResult = fullAnalysis[0];
              confidence = this.calculateAverageConfidence(analysisResult);
              break;

            case "material_quantities":
              analysisResult = await estimateMaterialQuantities(imageBase64);
              confidence = analysisResult.complexity
                ? (10 - analysisResult.complexity) / 10
                : 0.8;
              break;

            case "item_counts":
              analysisResult = await countDetailedItems(imageBase64);
              confidence = 0.85; // Counting is generally reliable
              break;

            default:
              throw new Error(`Unknown analysis type: ${analysisType}`);
          }

          const processingTime = Date.now() - startTime;

          // Save analysis results
          const { data: analysisData, error: analysisError } =
            await this.supabase
              .from("photo_analysis_results")
              .upsert({
                photo_id: photoId,
                analysis_type: analysisType,
                results: analysisResult,
                confidence,
                processing_time_ms: processingTime,
              })
              .select()
              .single();

          if (analysisError) {
            throw new Error(
              `Failed to save analysis: ${analysisError.message}`,
            );
          }

          results.push(analysisData);
        }

        processedPhotos++;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Photo ${photoId}: ${errorMsg}`);
        console.error(`Analysis failed for photo ${photoId}:`, error);
      }
    }

    onProgress?.({
      totalPhotos: photoIds.length,
      processedPhotos,
      currentStep: "Analysis complete",
      isComplete: true,
      errors,
    });

    return results;
  }

  /**
   * Get photos for an estimate
   */
  async getPhotosForEstimate(estimateId: string): Promise<PhotoData[]> {
    const { data, error } = await this.supabase
      .from("photos")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch photos: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get analysis results for a photo
   */
  async getPhotoAnalysis(photoId: string): Promise<PhotoAnalysisData[]> {
    const { data, error } = await this.supabase
      .from("photo_analysis_results")
      .select("*")
      .eq("photo_id", photoId)
      .order("processed_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch analysis: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete photo and its analysis results
   */
  async deletePhoto(photoId: string): Promise<void> {
    // Get photo data first
    const { data: photo, error: fetchError } = await this.supabase
      .from("photos")
      .select("storage_path")
      .eq("id", photoId)
      .single();

    if (fetchError) {
      throw new Error(`Photo not found: ${fetchError.message}`);
    }

    // Delete from storage
    const { error: storageError } = await this.supabase.storage
      .from(this.STORAGE_BUCKET)
      .remove([photo.storage_path]);

    if (storageError) {
      console.error("Failed to delete from storage:", storageError);
    }

    // Delete from database (cascade will handle analysis results)
    const { error: dbError } = await this.supabase
      .from("photos")
      .delete()
      .eq("id", photoId);

    if (dbError) {
      throw new Error(`Failed to delete photo: ${dbError.message}`);
    }
  }

  /**
   * Batch analysis with progress tracking
   */
  async batchAnalyze3D(photoIds: string[]): Promise<any> {
    if (photoIds.length < 2) {
      throw new Error("At least 2 photos required for 3D analysis");
    }

    // Get all photos
    const photos: PhotoData[] = [];
    for (const photoId of photoIds) {
      const { data: photo, error } = await this.supabase
        .from("photos")
        .select("*")
        .eq("id", photoId)
        .single();

      if (error || !photo) {
        throw new Error(`Photo not found: ${photoId}`);
      }
      photos.push(photo);
    }

    // Download and prepare images
    const imageUrls: string[] = [];
    for (const photo of photos) {
      const { data: fileData } = await this.supabase.storage
        .from(this.STORAGE_BUCKET)
        .download(photo.storage_path);

      if (fileData) {
        const file = new File([fileData], photo.file_name, {
          type: photo.mime_type,
        });
        const imageBase64 = await fileToBase64(file);
        imageUrls.push(imageBase64);
      }
    }

    // Perform 3D analysis
    const result = await analyze3DReconstruction(imageUrls);

    // Save combined analysis result
    const { data: analysisData } = await this.supabase
      .from("photo_analysis_results")
      .insert({
        photo_id: photoIds[0], // Associate with first photo
        analysis_type: "3d_reconstruction",
        results: {
          ...result,
          sourcePhotos: photoIds,
          photoCount: photoIds.length,
        },
        confidence: result.reconstruction?.confidence || 0.7,
      })
      .select()
      .single();

    return analysisData;
  }

  /**
   * Compare before/after photos
   */
  async compareBeforeAfter(
    beforePhotoId: string,
    afterPhotoId: string,
  ): Promise<any> {
    // Get both photos
    const [beforePhoto, afterPhoto] = await Promise.all([
      this.getPhotoById(beforePhotoId),
      this.getPhotoById(afterPhotoId),
    ]);

    // Download both images
    const [beforeFile, afterFile] = await Promise.all([
      this.downloadPhotoFile(beforePhoto),
      this.downloadPhotoFile(afterPhoto),
    ]);

    // Convert to base64
    const [beforeBase64, afterBase64] = await Promise.all([
      fileToBase64(beforeFile),
      fileToBase64(afterFile),
    ]);

    // Perform comparison
    const result = await compareBeforeAfter(beforeBase64, afterBase64);

    // Save comparison result
    const { data: analysisData } = await this.supabase
      .from("photo_analysis_results")
      .insert({
        photo_id: beforePhotoId,
        analysis_type: "before_after_comparison",
        results: {
          ...result,
          beforePhotoId,
          afterPhotoId,
        },
        confidence: 0.9, // Comparisons are generally reliable
      })
      .select()
      .single();

    return analysisData;
  }

  // Private helper methods
  private validateFile(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${file.name}. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type: ${file.type}. Allowed types: ${this.ALLOWED_TYPES.join(", ")}`,
      );
    }
  }

  private async compressImage(file: File, maxSizeMB: number): Promise<File> {
    // Simple compression - in production you might use a proper image compression library
    if (file.size <= maxSizeMB * 1024 * 1024) {
      return file;
    }

    // For now, just return the original file
    // In production, implement actual image compression
    return file;
  }

  private async extractFileMetadata(file: File): Promise<Record<string, any>> {
    return {
      originalName: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      // Add EXIF data extraction here if needed
    };
  }

  private calculateAverageConfidence(
    analysisResult: PhotoAnalysisResult,
  ): number {
    const confidenceValues: number[] = [];

    if (analysisResult.windows?.confidence)
      confidenceValues.push(analysisResult.windows.confidence);
    if (analysisResult.measurements?.confidence)
      confidenceValues.push(analysisResult.measurements.confidence);
    // Add other confidence values as needed

    if (confidenceValues.length === 0) return 0.7; // Default confidence

    return (
      confidenceValues.reduce((sum, val) => sum + val, 0) /
      confidenceValues.length
    );
  }

  private async getPhotoById(photoId: string): Promise<PhotoData> {
    const { data, error } = await this.supabase
      .from("photos")
      .select("*")
      .eq("id", photoId)
      .single();

    if (error || !data) {
      throw new Error(`Photo not found: ${photoId}`);
    }

    return data;
  }

  private async downloadPhotoFile(photo: PhotoData): Promise<File> {
    const { data: fileData } = await this.supabase.storage
      .from(this.STORAGE_BUCKET)
      .download(photo.storage_path);

    if (!fileData) {
      throw new Error(`Failed to download photo: ${photo.file_name}`);
    }

    return new File([fileData], photo.file_name, { type: photo.mime_type });
  }
}

// Export singleton instance for use across the app
export const photoService = new PhotoService();
