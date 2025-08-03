import { createClient } from "@/lib/supabase/universal-client";
import {
  PhotoAnalysisResult,
  analyzePhotos,
  estimateMaterialQuantities,
  countDetailedItems,
  analyze3DReconstruction,
  compareBeforeAfter,
  fileToBase64,
} from "@/lib/ai/photo-analysis";
import {
  sanitizeFilePath,
  isValidFileName,
  generateSecureFileName,
} from "@/lib/utils/path-sanitization";

export interface PhotoData {
  id: string;
  estimate_id: string;
  file_name: string;
  file_path: string;
  storage_path?: string;
  file_size: number;
  mime_type: string;
  analysis_data: any;
  ai_analysis: any;
  tags: string[] | null;
  is_analyzed: boolean | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoAnalysisData {
  id: string;
  photo_id: string;
  analysis_type: string;
  analysis_data: Record<string, any>; // Changed from 'results' to match database schema
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

        // Validate filename for security
        if (!isValidFileName(file.name)) {
          throw new Error(`Invalid file name: ${file.name}`);
        }

        // Process file (compress if needed)
        const processedFile = compress
          ? await this.compressImage(file, maxSizeMB)
          : file;

        // Generate secure file path with sanitization
        const secureFileName = generateSecureFileName(file.name);
        const filePath = sanitizeFilePath(userId, secureFileName);

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
          .from("ai_analysis_results")
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
          .from("ai_analysis_results")
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
              .from("ai_analysis_results")
              .upsert({
                quote_id: null, // No quote associated with individual photo analysis
                analysis_type: analysisType,
                image_url: null, // Photo ID stored in analysis_data
                analysis_data: {
                  ...analysisResult,
                  photo_id: photoId,
                  processing_time_ms: processingTime,
                },
                confidence_score: confidence,
              })
              .select()
              .single();

          if (analysisError) {
            throw new Error(
              `Failed to save analysis: ${analysisError.message}`,
            );
          }

          // Convert Json to Record<string, any> for type compatibility
          const convertedAnalysisData: PhotoAnalysisData = {
            ...analysisData,
            analysis_data: analysisData.analysis_data as Record<string, any>,
          };
          results.push(convertedAnalysisData);
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
    const supabase = createClient();
    const { data, error } = await this.supabase
      .from("ai_analysis_results")
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
    const supabase = createClient();
    const { data, error } = await this.supabase
      .from("ai_analysis_results")
      .select("*")
      .filter("analysis_data->>photo_id", "eq", photoId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch analysis: ${error.message}`);
    }

    // Convert Json fields to Record<string, any> for type compatibility
    return (data || []).map((item) => ({
      ...item,
      analysis_data: item.analysis_data as Record<string, any>,
    })) as any as PhotoAnalysisData[];
  }

  /**
   * Delete photo and its analysis results
   */
  async deletePhoto(photoId: string): Promise<void> {
    const supabase = createClient();

    try {
      // Delete photo and cascade to analysis results
      const { error } = await supabase
        .from("photos")
        .delete()
        .eq("id", photoId);

      if (error) {
        throw new Error(`Failed to delete photo: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      throw error;
    }

    // // Get photo data first
    // const { data: photo, error: fetchError } = await this.supabase
    //   .from("ai_analysis_results")
    //   .select("storage_path")
    //   .eq("id", photoId)
    //   .single();

    // if (fetchError) {
    //   throw new Error(`Photo not found: ${fetchError.message}`);
    // }

    // // Delete from storage
    // const { error: storageError } = await this.supabase.storage
    //   .from(this.STORAGE_BUCKET)
    //   .remove([photo.storage_path]);

    // if (storageError) {
    //   console.error("Failed to delete from storage:", storageError);
    // }

    // // Delete from database (cascade will handle analysis results)
    // const { error: dbError } = await this.supabase
    //   .from("ai_analysis_results")
    //   .delete()
    //   .eq("id", photoId);

    // if (dbError) {
    //   throw new Error(`Failed to delete photo: ${dbError.message}`);
    // }
  }

  /**
   * Batch analysis with progress tracking
   */
  async batchAnalyze3D(photoIds: string[]): Promise<any> {
    const supabase = createClient();
    if (photoIds.length < 2) {
      throw new Error("At least 2 photos required for 3D analysis");
    }

    // Get all photos
    const photos: PhotoData[] = [];
    for (const photoId of photoIds) {
      // Temporarily commented out - photos table not in current schema
      // const { data: photo, error } = await this.supabase
      //   .from("ai_analysis_results")
      //   .select("*")
      //   .eq("id", photoId)
      //   .single();

      // if (error || !photo) {
      //   throw new Error(`Photo not found: ${photoId}`);
      // }
      // photos.push(photo);
      throw new Error(
        "3D analysis not implemented - photos table not available",
      );
    }

    // // Download and prepare images
    // const imageUrls: string[] = [];
    // for (const photo of photos) {
    //   const { data: fileData } = await this.supabase.storage
    //     .from(this.STORAGE_BUCKET)
    //     .download(photo.storage_path);

    //   if (fileData) {
    //     const file = new File([fileData], photo.file_name, {
    //       type: photo.mime_type,
    //     });
    //     const imageBase64 = await fileToBase64(file);
    //     imageUrls.push(imageBase64);
    //   }
    // }

    // // Perform 3D analysis
    // const result = await analyze3DReconstruction(imageUrls);

    // // Save combined analysis result
    // const { data: analysisData } = await this.supabase
    //   .from("ai_analysis_results")
    //   .insert({
    //     quote_id: null, // No quote associated with 3D reconstruction
    //     analysis_type: "3d_reconstruction",
    //     image_url: null, // Multiple photos involved, stored in analysis_data
    //     analysis_data: {
    //       ...result,
    //       sourcePhotos: photoIds,
    //       photoCount: photoIds.length,
    //       primary_photo_id: photoIds[0], // Associate with first photo
    //     },
    //     confidence_score: result.reconstruction?.confidence || 0.7,
    //   })
    //   .select()
    //   .single();

    // return analysisData;
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
      .from("ai_analysis_results")
      .insert({
        quote_id: null, // No quote associated with this comparison
        analysis_type: "before_after_comparison",
        image_url: null, // We have the image IDs in analysis_data
        analysis_data: {
          ...result,
          beforePhotoId,
          afterPhotoId,
        },
        confidence_score: 0.9, // Comparisons are generally reliable
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
    const supabase = createClient();
    // Simple compression - in production you might use a proper image compression library
    if (file.size <= maxSizeMB * 1024 * 1024) {
      return file;
    }

    // For now, just return the original file
    // In production, implement actual image compression
    return file;
  }

  private async extractFileMetadata(file: File): Promise<Record<string, any>> {
    const supabase = createClient();
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
    const supabase = createClient();

    try {
      const { data: photo, error } = await supabase
        .from("photos")
        .select("*")
        .eq("id", photoId)
        .single();

      if (error || !photo) {
        throw new Error(`Photo not found: ${photoId}`);
      }

      return {
        id: photo.id,
        estimate_id: photo.estimate_id,
        file_name: photo.file_name,
        file_path: photo.storage_path,
        storage_path: photo.storage_path,
        file_size: photo.file_size || 1024 * 100, // Use actual size or default to 100KB
        mime_type: photo.mime_type || "image/jpeg",
        analysis_data: null,
        ai_analysis: null,
        tags: null,
        is_analyzed: false,
        uploaded_by: "system",
        created_at: photo.uploaded_at || new Date().toISOString(),
        updated_at: photo.uploaded_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching photo:", error);
      throw error;
    }
  }

  private async downloadPhotoFile(photo: PhotoData): Promise<File> {
    const supabase = createClient();
    const { data: fileData } = await this.supabase.storage
      .from(this.STORAGE_BUCKET)
      .download(photo.storage_path || photo.file_path);

    if (!fileData) {
      throw new Error(`Failed to download photo: ${photo.file_name}`);
    }

    return new File([fileData], photo.file_name, { type: photo.mime_type });
  }
}

// Export singleton instance for use across the app
export const photoService = new PhotoService();
