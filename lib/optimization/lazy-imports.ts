/**
 * Centralized lazy import utilities for heavy dependencies
 */

// Lazy load PDF libraries
export const lazyJsPDF = () => import("jspdf");
export const lazyJsPDFAutoTable = () => import("jspdf-autotable");

// Lazy load Three.js and related
export const lazyThree = () => import("three");
export const lazyReactThreeFiber = () => import("@react-three/fiber");
export const lazyReactThreeDrei = () => import("@react-three/drei");

// Lazy load chart libraries
export const lazyRecharts = () => import("recharts");

// Lazy load heavy processing libraries
export const lazyTesseract = () => import("tesseract.js");
export const lazyExcelJS = () => import("exceljs");
export const lazyHtml2Canvas = () => import("html2canvas");

// Lazy load PDF processing
export const lazyPdfJs = () => import("pdfjs-dist");
export const lazyReactPdf = () => import("@react-pdf/renderer");

// Lazy load heavy UI components
export const lazyQuill = () => import("quill");

// Utility function to preload multiple libraries
export async function preloadLibraries(libraries: (() => Promise<any>)[]) {
  await Promise.all(libraries.map((lib) => lib()));
}

// Utility to load library on idle
export function loadOnIdle(importFn: () => Promise<any>) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => importFn());
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(() => importFn(), 1);
  }
}

// Intersection Observer based lazy loading
export function loadOnVisible(
  element: HTMLElement,
  importFn: () => Promise<any>,
) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          importFn();
          observer.disconnect();
        }
      });
    },
    { rootMargin: "50px" },
  );

  observer.observe(element);
  return () => observer.disconnect();
}
