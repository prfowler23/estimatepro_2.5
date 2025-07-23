import { useState, useCallback } from "react";

export interface CameraState {
  isActive: boolean;
  facingMode: "user" | "environment";
  flashEnabled: boolean;
  gridEnabled: boolean;
  stream: MediaStream | null;
  error: string | null;
  permissions: {
    camera: boolean;
    location: boolean;
  };
}

export const useCamera = (initialState: Partial<CameraState> = {}) => {
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    facingMode: "environment",
    flashEnabled: false,
    gridEnabled: true,
    stream: null,
    error: null,
    permissions: {
      camera: false,
      location: false,
    },
    ...initialState,
  });

  const switchCamera = useCallback(() => {
    setCameraState((prev) => ({
      ...prev,
      facingMode: prev.facingMode === "user" ? "environment" : "user",
    }));
  }, []);

  const toggleFlash = useCallback(() => {
    setCameraState((prev) => ({ ...prev, flashEnabled: !prev.flashEnabled }));
  }, []);

  const toggleGrid = useCallback(() => {
    setCameraState((prev) => ({ ...prev, gridEnabled: !prev.gridEnabled }));
  }, []);

  const setStream = useCallback((stream: MediaStream | null) => {
    setCameraState((prev) => ({ ...prev, stream }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setCameraState((prev) => ({ ...prev, error }));
  }, []);

  const setPermissions = useCallback(
    (permissions: Partial<CameraState["permissions"]>) => {
      setCameraState((prev) => ({
        ...prev,
        permissions: { ...prev.permissions, ...permissions },
      }));
    },
    [],
  );

  return {
    cameraState,
    switchCamera,
    toggleFlash,
    toggleGrid,
    setStream,
    setError,
    setPermissions,
    setCameraState,
  };
};
