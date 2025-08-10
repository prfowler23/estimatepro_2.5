import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FacadeAnalysisImage } from "@/lib/types/facade-analysis-types";

interface ImageCacheOptions {
  facadeAnalysisId: string;
  enablePrefetch?: boolean;
  staleTime?: number;
}

// Cache keys for React Query
const CACHE_KEYS = {
  images: (facadeId: string) => ["facade", "images", facadeId] as const,
  image: (imageId: string) => ["facade", "image", imageId] as const,
  allImages: ["facade", "images"] as const,
};

// Fetch images for a facade analysis
async function fetchFacadeImages(
  facadeAnalysisId: string,
): Promise<FacadeAnalysisImage[]> {
  const response = await fetch(
    `/api/facade-analysis/${facadeAnalysisId}/images`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch images");
  }
  return response.json();
}

// Prefetch image data (for preloading)
async function prefetchImage(imageUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () =>
      reject(new Error(`Failed to prefetch image: ${imageUrl}`));
    img.src = imageUrl;
  });
}

export function useFacadeImageCache({
  facadeAnalysisId,
  enablePrefetch = true,
  staleTime = 1000 * 60 * 5, // 5 minutes
}: ImageCacheOptions) {
  const queryClient = useQueryClient();

  // Fetch and cache images
  const {
    data: images = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: CACHE_KEYS.images(facadeAnalysisId),
    queryFn: () => fetchFacadeImages(facadeAnalysisId),
    staleTime,
    gcTime: staleTime * 2, // Keep in cache for 10 minutes
    enabled: !!facadeAnalysisId,
  });

  // Prefetch images when data is loaded
  useQuery({
    queryKey: [...CACHE_KEYS.images(facadeAnalysisId), "prefetch"],
    queryFn: async () => {
      if (enablePrefetch && images.length > 0) {
        await Promise.allSettled(
          images.map((img) => prefetchImage(img.image_url)),
        );
      }
      return true;
    },
    enabled: enablePrefetch && images.length > 0,
    staleTime: Infinity, // Never refetch prefetched images
  });

  // Upload new image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(
        `/api/facade-analysis/${facadeAnalysisId}/images`,
        {
          method: "POST",
          body: formData,
        },
      );
      if (!response.ok) {
        throw new Error("Failed to upload image");
      }
      return response.json();
    },
    onSuccess: (newImage) => {
      // Update cache with new image
      queryClient.setQueryData<FacadeAnalysisImage[]>(
        CACHE_KEYS.images(facadeAnalysisId),
        (old) => [...(old || []), newImage],
      );

      // Prefetch the new image if enabled
      if (enablePrefetch) {
        prefetchImage(newImage.image_url);
      }
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch(
        `/api/facade-analysis/${facadeAnalysisId}/images/${imageId}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to delete image");
      }
    },
    onSuccess: (_, deletedImageId) => {
      // Remove from cache
      queryClient.setQueryData<FacadeAnalysisImage[]>(
        CACHE_KEYS.images(facadeAnalysisId),
        (old) => old?.filter((img) => img.id !== deletedImageId) || [],
      );
    },
  });

  // Invalidate cache
  const invalidateCache = () => {
    queryClient.invalidateQueries({
      queryKey: CACHE_KEYS.images(facadeAnalysisId),
    });
  };

  // Prefetch specific image
  const prefetchSingleImage = async (imageUrl: string) => {
    try {
      await prefetchImage(imageUrl);
    } catch (error) {
      console.error("Failed to prefetch image:", error);
    }
  };

  return {
    images,
    isLoading,
    error,
    refetch,
    uploadImage: uploadImageMutation.mutate,
    deleteImage: deleteImageMutation.mutate,
    isUploading: uploadImageMutation.isPending,
    isDeleting: deleteImageMutation.isPending,
    invalidateCache,
    prefetchSingleImage,
  };
}

// Hook for prefetching multiple facade analyses (for list views)
export function usePrefetchFacadeImages() {
  const queryClient = useQueryClient();

  const prefetchFacadeImages = async (facadeAnalysisId: string) => {
    await queryClient.prefetchQuery({
      queryKey: CACHE_KEYS.images(facadeAnalysisId),
      queryFn: () => fetchFacadeImages(facadeAnalysisId),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };

  return { prefetchFacadeImages };
}
