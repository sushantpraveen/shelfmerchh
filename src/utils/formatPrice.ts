/**
 * Format a price value as Indian Rupees (₹)
 * @param value - The price value as a number (can be undefined or null)
 * @returns Formatted price string (e.g., "₹400.00")
 */
export const formatPrice = (value?: number | null): string => {
  if (value === undefined || value === null) return '₹0.00';
  return `₹${value.toFixed(2)}`;
};

