/**
 * Get current date in format: January-01-2025
 * Used for log file naming
 */
export function getCurrentDate(): string {
  const date = new Date();
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = date.getUTCDate().toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}-${day}-${year}`;
}

/**
 * Format a date for log file naming
 * @param date - Date to format
 * @returns Formatted date string in format: January-01-2025
 */
export function formatLogDate(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = date.getUTCDate().toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}-${day}-${year}`;
}
