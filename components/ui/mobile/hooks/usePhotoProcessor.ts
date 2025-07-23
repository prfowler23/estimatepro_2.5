import { useState, useCallback } from "react";
import { CapturedPhoto } from "../MobilePhotoCapture";

export const usePhotoProcessor = (
  autoCompress: boolean,
  imageQuality: number,
) => {
  const [compressionProgress, setCompressionProgress] = useState<
    Record<string, number>
  >({});

  const getImageDimensions = useCallback(
    (file: File): Promise<{ width: number; height: number }> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.src = URL.createObjectURL(file);
      });
    },
    [],
  );

  const processImage = useCallback(
    async (
      file: File,
      photoId: string,
    ): Promise<{ compressedFile: File; thumbnail: string }> => {
      return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;
        const img = new Image();

        img.onload = () => {
          const maxWidth = 1920;
          const maxHeight = 1920;
          let { width, height } = img;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const thumbCanvas = document.createElement("canvas");
          const thumbCtx = thumbCanvas.getContext("2d")!;
          const thumbSize = 200;
          thumbCanvas.width = thumbSize;
          thumbCanvas.height = thumbSize;

          const scale = Math.min(thumbSize / width, thumbSize / height);
          const thumbWidth = width * scale;
          const thumbHeight = height * scale;
          const offsetX = (thumbSize - thumbWidth) / 2;
          const offsetY = (thumbSize - thumbHeight) / 2;

          thumbCtx.fillStyle = "#f3f4f6";
          thumbCtx.fillRect(0, 0, thumbSize, thumbSize);
          thumbCtx.drawImage(img, offsetX, offsetY, thumbWidth, thumbHeight);

          const thumbnail = thumbCanvas.toDataURL("image/jpeg", 0.7);

          if (autoCompress) {
            setCompressionProgress({ [photoId]: 50 });

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name, {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  });
                  setCompressionProgress({ [photoId]: 100 });
                  setTimeout(() => setCompressionProgress({}), 2000);
                  resolve({ compressedFile, thumbnail });
                } else {
                  resolve({ compressedFile: file, thumbnail });
                }
              },
              "image/jpeg",
              imageQuality,
            );
          } else {
            resolve({ compressedFile: file, thumbnail });
          }
        };

        img.src = URL.createObjectURL(file);
      });
    },
    [autoCompress, imageQuality],
  );

  return {
    compressionProgress,
    getImageDimensions,
    processImage,
  };
};
