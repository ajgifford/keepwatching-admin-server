import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { getCurrentDate, formatLogDate } from '@utils/dateHelpers';

describe('dateHelpers', () => {
  describe('getCurrentDate', () => {
    beforeEach(() => {
      // Mock Date to return a specific date for deterministic tests
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return date in format: Month-DD-YYYY', () => {
      // Set date to January 15, 2025
      jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));

      const result = getCurrentDate();

      expect(result).toBe('January-15-2025');
    });

    it('should pad single digit days with zero', () => {
      // Set date to March 5, 2025
      jest.setSystemTime(new Date('2025-03-05T12:00:00Z'));

      const result = getCurrentDate();

      expect(result).toBe('March-05-2025');
    });

    it('should handle different months correctly', () => {
      // Test December
      jest.setSystemTime(new Date('2025-12-25T12:00:00Z'));
      expect(getCurrentDate()).toBe('December-25-2025');

      // Test February
      jest.setSystemTime(new Date('2025-02-14T12:00:00Z'));
      expect(getCurrentDate()).toBe('February-14-2025');

      // Test July
      jest.setSystemTime(new Date('2025-07-04T12:00:00Z'));
      expect(getCurrentDate()).toBe('July-04-2025');
    });

    it('should handle end of month dates', () => {
      // January 31
      jest.setSystemTime(new Date('2025-01-31T12:00:00Z'));
      expect(getCurrentDate()).toBe('January-31-2025');

      // February 28 (non-leap year)
      jest.setSystemTime(new Date('2025-02-28T12:00:00Z'));
      expect(getCurrentDate()).toBe('February-28-2025');
    });

    it('should handle leap year correctly', () => {
      // February 29, 2024 (leap year)
      jest.setSystemTime(new Date('2024-02-29T12:00:00Z'));
      expect(getCurrentDate()).toBe('February-29-2024');
    });

    it('should handle year changes correctly', () => {
      // New Year's Day
      jest.setSystemTime(new Date('2026-01-01T00:00:01Z'));
      expect(getCurrentDate()).toBe('January-01-2026');

      // New Year's Eve
      jest.setSystemTime(new Date('2025-12-31T23:59:59Z'));
      expect(getCurrentDate()).toBe('December-31-2025');
    });
  });

  describe('formatLogDate', () => {
    it('should format a date in format: Month-DD-YYYY', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const result = formatLogDate(date);

      expect(result).toBe('January-15-2025');
    });

    it('should pad single digit days with zero', () => {
      const date = new Date('2025-03-05T12:00:00Z');
      const result = formatLogDate(date);

      expect(result).toBe('March-05-2025');
    });

    it('should handle different months correctly', () => {
      expect(formatLogDate(new Date('2025-12-25T12:00:00Z'))).toBe('December-25-2025');
      expect(formatLogDate(new Date('2025-02-14T12:00:00Z'))).toBe('February-14-2025');
      expect(formatLogDate(new Date('2025-07-04T12:00:00Z'))).toBe('July-04-2025');
    });

    it('should handle end of month dates', () => {
      expect(formatLogDate(new Date('2025-01-31T12:00:00Z'))).toBe('January-31-2025');
      expect(formatLogDate(new Date('2025-02-28T12:00:00Z'))).toBe('February-28-2025');
    });

    it('should handle leap year correctly', () => {
      expect(formatLogDate(new Date('2024-02-29T12:00:00Z'))).toBe('February-29-2024');
    });

    it('should handle dates from different years', () => {
      expect(formatLogDate(new Date('2020-06-15T12:00:00Z'))).toBe('June-15-2020');
      expect(formatLogDate(new Date('2030-09-22T12:00:00Z'))).toBe('September-22-2030');
    });

    it('should handle beginning of day', () => {
      const date = new Date('2025-05-10T00:00:00Z');
      const result = formatLogDate(date);

      expect(result).toBe('May-10-2025');
    });

    it('should handle end of day', () => {
      const date = new Date('2025-08-20T23:59:59Z');
      const result = formatLogDate(date);

      expect(result).toBe('August-20-2025');
    });
  });
});
