export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

/**
 * Calculate square footage from dimensions
 */
export const calculateSquareFootage = (
  length: number,
  width: number,
): number => {
  return length * width;
};

/**
 * Calculate area with validation
 */
export const calculateArea = (dimensions: {
  length: number;
  width: number;
}): number => {
  const { length, width } = dimensions;
  if (length <= 0 || width <= 0) {
    throw new Error("Dimensions must be positive numbers");
  }
  return length * width;
};

/**
 * Calculate perimeter of a rectangle
 */
export const calculatePerimeter = (length: number, width: number): number => {
  return 2 * (length + width);
};

/**
 * Calculate volume of a rectangular space
 */
export const calculateVolume = (
  length: number,
  width: number,
  height: number,
): number => {
  return length * width * height;
};

/**
 * Calculate distance between two points
 */
export const calculateDistance = (
  point1: { x: number; y: number },
  point2: { x: number; y: number },
): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Round number to specified decimal places
 */
export const roundToDecimal = (value: number, decimals: number = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
