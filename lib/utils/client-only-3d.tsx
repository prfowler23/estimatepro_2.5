"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Client-only wrapper for React Three Fiber components
export const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  {
    ssr: false,
    loading: () => <div>Loading 3D...</div>,
  },
);

// Export other commonly used components
export const useThree = dynamic(
  () => import("@react-three/fiber").then((mod) => ({ default: mod.useThree })),
  { ssr: false },
);

export const useFrame = dynamic(
  () => import("@react-three/fiber").then((mod) => ({ default: mod.useFrame })),
  { ssr: false },
);

// Drei components
export const OrbitControls = dynamic(
  () => import("@react-three/drei").then((mod) => mod.OrbitControls),
  { ssr: false },
);

export const Box = dynamic(
  () => import("@react-three/drei").then((mod) => mod.Box),
  { ssr: false },
);

export const Html = dynamic(
  () => import("@react-three/drei").then((mod) => mod.Html),
  { ssr: false },
);
