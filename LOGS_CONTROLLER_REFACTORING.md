# Logs Controller Refactoring Plan

## Executive Summary

The `logsController.ts` currently has **19.92% test coverage** and is difficult to test due to mixed concerns, heavy file system dependencies, and tightly coupled logic. This document outlines a comprehensive refactoring plan to separate concerns, enable proper testing, and achieve 80%+ test coverage.

## Current State Analysis

### File: `src/controllers/logsController.ts` (655 lines)

**Coverage:**
- Statements: 19.92%
- Branch: 6.39%
- Functions: 22.85%
- Lines: 20.92%

**Problems:**

1. **Mixed Concerns:**
   - File I/O operations (`fs.readFileSync`, `fs.readdirSync`, `fs.statSync`, `fs.accessSync`)
   - Pure parsing logic (regex matching, JSON parsing, timestamp conversion)
   - Business logic (filtering, sorting, limiting)
   - Real-time streaming (SSE with `Tail` library)
   - HTTP response handling
   - All in one 655-line file

2. **Hard to Test:**
   - Direct filesystem access with hardcoded paths (`/var/log/nginx/access.log`)
   - 13 private helper functions that can't be tested in isolation
   - Time dependencies (`getCurrentDate()`)
   - SSE streaming with event listeners and stateful buffers
   - No dependency injection or mocking points

3. **Tight Coupling:**
   - Business logic directly reads from filesystem
   - Parsing functions receive file paths instead of content
   - No abstraction between data source and data processing

4. **Testable Code Buried:**
   - Pure functions like `parseAppLogLine`, `parseNginxLogLine`, `parseLogTimestamp` are actually easy to test
   - But they're private and mixed with I/O operations
   - ~400 lines of pure, testable logic trapped in an untestable context

## Refactoring Strategy

### Goal: Achieve 80%+ Test Coverage

Break the monolithic controller into:
- **Service Layer:** File system operations (mockable)
- **Parser Layer:** Pure functions (100% testable)
- **Filter Layer:** Pure business logic (100% testable)
- **Controller Layer:** Thin orchestration (easy to test with mocks)
- **Stream Service:** Real-time streaming (accept lower coverage)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    logsController.ts                        │
│          (Thin orchestration, 50-100 lines)                 │
│   - Request/Response handling                               │
│   - Calls services and parsers                              │
│   - Returns filtered results                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ calls
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 services/LogFileService.ts                  │
│              (File system abstraction, mockable)            │
│   - readLogFile(path): string                               │
│   - findRotatingLogs(basePath): string[]                    │
│   - fileExists(path): boolean                               │
│   - getLogFilePaths(): Record<string, string>               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  utils/logParsers.ts                        │
│                  (Pure functions, 100% testable)            │
│   - parseAppLogLine(line, service, logFile)                 │
│   - parseNginxLogLine(line, logFile)                        │
│   - parseConsoleLogLine(line, service, logFile)             │
│   - parseErrorLogFile(content, service, logFile)            │
│   - parseLogTimestamp(dateStr): string                      │
│   - normalizeTimestamp(timestamp): string                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  utils/logFilters.ts                        │
│                  (Pure functions, 100% testable)            │
│   - filterLogs(logs, filter): LogEntry[]                    │
│   - determineLogLevel(service, logLine): LogLevel           │
│   - sortLogsByTimestamp(logs): LogEntry[]                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 services/LogStreamService.ts                │
│              (SSE streaming, accept lower coverage)         │
│   - streamLogs(req, res): void                              │
│   - setupLogTail(logPath, service): Tail                    │
│   - handleLogLine(line, service): LogEntry                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  utils/dateHelpers.ts                       │
│                  (Pure functions, 100% testable)            │
│   - getCurrentDate(): string                                │
│   - formatLogDate(date): string                             │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Breakdown

### 1. `src/services/LogFileService.ts`

**Purpose:** Encapsulate all file system operations

**Responsibilities:**
- Read log files from disk
- Find rotating log files
- Check file existence
- Generate log file paths

**Interface:**
```typescript
export class LogFileService {
  /**
   * Read the entire content of a log file
   * @param filePath - Absolute path to log file
   * @returns File content as string, or empty string if file doesn't exist
   */
  readLogFile(filePath: string): string;

  /**
   * Find all rotating log files matching a base path pattern
   * @param basePath - Base path pattern (e.g., /logs/app-YYYY-MM-DD.log)
   * @returns Array of file paths sorted by modification time (newest first)
   */
  findRotatingLogs(basePath: string): string[];

  /**
   * Find the most recent rotating log file
   * @param basePath - Base path pattern
   * @returns Path to latest log file, or null if none found
   */
  findLatestRotatingLog(basePath: string): string | null;

  /**
   * Check if a file exists and is readable
   * @param filePath - Path to check
   * @returns true if file exists and is readable
   */
  fileExists(filePath: string): boolean;

  /**
   * Get all configured log file paths
   * @param filters - Optional date filters to include rotating logs
   * @returns Record mapping log type to file path
   */
  getLogFilePaths(filters?: { startDate?: string; endDate?: string }): Record<string, string>;
}
```

**Why this helps testing:**
- Can be mocked in controller tests
- Can inject a fake implementation for testing
- Can test real filesystem operations in isolation (integration tests)
- Clear contract that's easy to understand

**Lines from current file:**
- Lines 278-304: `findAllRotatingLogs`, `findLatestRotatingLog`
- Lines 306-330: `loadLogs` (file reading part)
- Lines 333-340: `fileExists`
- Lines 23-29: `LOG_PATHS` (move to this service)

---

### 2. `src/utils/logParsers.ts`

**Purpose:** Pure functions for parsing different log formats

**Responsibilities:**
- Parse app logs (JSON format)
- Parse nginx logs (combined log format)
- Parse console logs (winston format)
- Parse error logs (multiline stack traces)
- Parse and normalize timestamps

**Interface:**
```typescript
/**
 * Parse a single line from an app log file (JSON format)
 */
export function parseAppLogLine(
  line: string,
  service: LogService,
  logFile: string
): AppLogEntry | null;

/**
 * Parse a single line from nginx access log
 */
export function parseNginxLogLine(
  line: string,
  logFile: string
): NginxLogEntry | null;

/**
 * Parse a single line from console log (winston format)
 */
export function parseConsoleLogLine(
  line: string,
  service: LogService,
  logFile: string
): LogEntry | null;

/**
 * Parse error log file content containing multiline stack traces
 */
export function parseErrorLogFile(
  content: string,
  service: LogService,
  logFile: string
): ErrorLogEntry[];

/**
 * Parse log timestamp from format [Jul-03-2025 12:49:28] to ISO string
 */
export function parseLogTimestamp(dateTimeStr: string): string;

/**
 * Normalize various timestamp formats to ISO string
 * Handles nginx format: 02/Jul/2025:02:13:02 -0500
 */
export function normalizeTimestamp(timestamp: string): string;

/**
 * Load and parse all logs from a file based on service type
 * This is a convenience function that calls the appropriate parser
 */
export function parseLogFile(
  content: string,
  service: LogService,
  logFile: string
): LogEntry[];
```

**Why this helps testing:**
- Pure functions: same input always produces same output
- No side effects, no I/O, no state
- Can test with simple string fixtures
- Easy to test edge cases (malformed JSON, missing fields, etc.)
- Can achieve 100% coverage

**Test examples:**
```typescript
describe('parseAppLogLine', () => {
  it('should parse valid JSON log line', () => {
    const line = '{"timestamp":"2025-01-01T12:00:00Z","level":"info","message":"Test"}';
    const result = parseAppLogLine(line, LogService.APP, 'test.log');
    expect(result).toEqual({
      timestamp: '2025-01-01T12:00:00Z',
      level: 'info',
      message: 'Test',
      service: LogService.APP,
      logFile: 'test.log'
    });
  });

  it('should return null for invalid JSON', () => {
    const line = 'not valid json';
    const result = parseAppLogLine(line, LogService.APP, 'test.log');
    expect(result).toBeNull();
  });

  it('should handle missing optional fields', () => {
    const line = '{"timestamp":"2025-01-01T12:00:00Z","message":"Test"}';
    const result = parseAppLogLine(line, LogService.APP, 'test.log');
    expect(result?.level).toBeUndefined();
  });
});
```

**Lines from current file:**
- Lines 380-424: `parseLogLine`, `parseAppLogLine`
- Lines 426-445: `parseNginxLogLine`
- Lines 447-547: `parseErrorLogFile`
- Lines 552-596: `parseLogTimestamp`
- Lines 598-654: `normalizeTimestamp`
- Lines 20-21: Regex patterns (constants)

---

### 3. `src/utils/logFilters.ts`

**Purpose:** Pure functions for filtering and transforming log entries

**Responsibilities:**
- Filter logs by service, level, date range, search term
- Determine log level from content
- Sort logs by timestamp
- Limit number of results

**Interface:**
```typescript
/**
 * Filter logs based on provided criteria
 */
export function filterLogs(
  logs: LogEntry[],
  filter: LogFilter
): LogEntry[];

/**
 * Determine log level from service name and log line content
 */
export function determineLogLevel(
  service: string,
  logLine: string
): LogLevel;

/**
 * Sort logs by timestamp (newest first)
 */
export function sortLogsByTimestamp(
  logs: LogEntry[],
  order: 'asc' | 'desc' = 'desc'
): LogEntry[];

/**
 * Apply limit to log results
 */
export function limitLogs(
  logs: LogEntry[],
  limit: number = 100
): LogEntry[];

/**
 * Check if a log entry matches filter criteria
 */
export function matchesFilter(
  log: LogEntry,
  filter: LogFilter
): boolean;
```

**Why this helps testing:**
- Pure functions with clear inputs/outputs
- No dependencies on external state
- Easy to test all filter combinations
- Can achieve 100% coverage

**Test examples:**
```typescript
describe('filterLogs', () => {
  const mockLogs: LogEntry[] = [
    { timestamp: '2025-01-01T10:00:00Z', service: LogService.APP, level: LogLevel.INFO, message: 'Info log' },
    { timestamp: '2025-01-01T11:00:00Z', service: LogService.APP, level: LogLevel.ERROR, message: 'Error log' },
    { timestamp: '2025-01-01T12:00:00Z', service: LogService.NGINX, level: LogLevel.INFO, message: 'Nginx log' },
  ];

  it('should filter by service', () => {
    const result = filterLogs(mockLogs, { service: LogService.APP });
    expect(result).toHaveLength(2);
    expect(result.every(log => log.service === LogService.APP)).toBe(true);
  });

  it('should filter by level', () => {
    const result = filterLogs(mockLogs, { level: LogLevel.ERROR });
    expect(result).toHaveLength(1);
    expect(result[0].level).toBe(LogLevel.ERROR);
  });

  it('should filter by search term', () => {
    const result = filterLogs(mockLogs, { searchTerm: 'Error' });
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('Error');
  });

  it('should apply limit', () => {
    const result = filterLogs(mockLogs, { limit: 1 });
    expect(result).toHaveLength(1);
  });
});
```

**Lines from current file:**
- Lines 366-378: `filterLogs`
- Lines 342-364: `determineLogLevel`

---

### 4. `src/services/LogStreamService.ts`

**Purpose:** Handle real-time log streaming via Server-Sent Events

**Responsibilities:**
- Set up SSE connection
- Tail log files in real-time
- Buffer multiline errors
- Send log entries as SSE events
- Clean up connections

**Interface:**
```typescript
export class LogStreamService {
  /**
   * Start streaming logs via Server-Sent Events
   */
  streamLogs(req: Request, res: Response): void;

  /**
   * Set up tail for a specific log file
   */
  private setupLogTail(
    logPath: string,
    service: string,
    res: Response
  ): Tail;

  /**
   * Handle a single log line from tail
   */
  private handleLogLine(
    line: string,
    service: string,
    logPath: string,
    res: Response
  ): void;

  /**
   * Buffer and send multiline error logs
   */
  private handleErrorBuffer(
    line: string,
    service: string,
    isNewError: boolean
  ): void;

  /**
   * Clean up tail connections and timers
   */
  private cleanup(): void;
}
```

**Why this is separate:**
- SSE streaming is inherently difficult to test
- Requires actual server and long-lived connections
- Heavy use of event listeners and stateful buffers
- Separating it allows us to accept lower coverage here (30-40%)
- The rest of the system can still achieve 80%+ coverage

**Testing strategy:**
- Integration tests with actual HTTP server
- Mock the Tail library
- Test error buffering logic in isolation
- Accept that full coverage isn't practical here

**Lines from current file:**
- Lines 85-268: Entire `streamLogs` function

---

### 5. `src/utils/dateHelpers.ts`

**Purpose:** Date/time utilities

**Responsibilities:**
- Generate current date in log format
- Format dates for file names

**Interface:**
```typescript
/**
 * Get current date in format: January-01-2025
 */
export function getCurrentDate(): string;

/**
 * Format a date for log file naming
 */
export function formatLogDate(date: Date): string;
```

**Why this helps testing:**
- Can inject current date for testing
- Pure functions are predictable

**Lines from current file:**
- Lines 270-276: `getCurrentDate`

---

### 6. `src/controllers/logsController.ts` (Refactored)

**Purpose:** Thin orchestration layer

**New structure (50-100 lines):**
```typescript
import { LogFileService } from '@services/LogFileService';
import { parseLogFile } from '@utils/logParsers';
import { filterLogs } from '@utils/logFilters';
import { LogStreamService } from '@services/LogStreamService';

const logFileService = new LogFileService();
const logStreamService = new LogStreamService();

export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  try {
    // 1. Parse query filters
    const filters: LogFilter = {
      service: req.query.service as string,
      level: req.query.level as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      searchTerm: req.query.searchTerm as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    };

    // 2. Get log file paths (handles rotating logs based on date filters)
    const logFiles = logFileService.getLogFilePaths(filters);

    // 3. Load and parse all log files
    let logs: LogEntry[] = [];
    for (const [logType, filePath] of Object.entries(logFiles)) {
      const content = logFileService.readLogFile(filePath);
      if (content) {
        const service = getServiceFromLogType(logType);
        const parsedLogs = parseLogFile(content, service, filePath);
        logs = logs.concat(parsedLogs);
      }
    }

    // 4. Filter and return
    const filteredLogs = filterLogs(logs, filters);
    res.json(filteredLogs);
  } catch (error) {
    next(error);
  }
});

export const streamLogs = asyncHandler(async (req: Request, res: Response) => {
  logStreamService.streamLogs(req, res);
});
```

**Why this is better:**
- Clear, linear flow
- Easy to understand
- Easy to test with mocked services
- All complexity pushed to testable services/utils
- 80%+ coverage achievable

---

## Implementation Steps

### Phase 1: Create Service and Util Files (No Breaking Changes)

1. **Create `src/services/LogFileService.ts`**
   - Copy file operations from logsController
   - Export class with public methods
   - Keep private implementation details private
   - Add JSDoc comments

2. **Create `src/utils/logParsers.ts`**
   - Copy all parsing functions
   - Export all functions
   - Keep regex patterns as constants
   - Add JSDoc comments

3. **Create `src/utils/logFilters.ts`**
   - Copy filtering functions
   - Export all functions
   - Add JSDoc comments

4. **Create `src/utils/dateHelpers.ts`**
   - Copy date utilities
   - Export functions
   - Add JSDoc comments

5. **Create `src/services/LogStreamService.ts`**
   - Copy streamLogs function
   - Convert to class method
   - Keep state management internal
   - Add JSDoc comments

### Phase 2: Write Tests

1. **Test `logParsers.ts`** (100% coverage goal)
   - Test each parser with valid input
   - Test with invalid/malformed input
   - Test edge cases (empty strings, missing fields)
   - Test timestamp parsing/normalization

2. **Test `logFilters.ts`** (100% coverage goal)
   - Test each filter type
   - Test filter combinations
   - Test sorting and limiting
   - Test edge cases

3. **Test `dateHelpers.ts`** (100% coverage goal)
   - Test date formatting
   - Can mock Date.now() for deterministic tests

4. **Test `LogFileService.ts`** (80% coverage goal)
   - Mock `fs` module
   - Test with fixture files
   - Test error handling
   - Integration tests optional

5. **Test `LogStreamService.ts`** (30-40% coverage acceptable)
   - Mock Tail library
   - Test error buffering logic
   - Integration tests optional

### Phase 3: Update Controller

1. **Refactor `logsController.ts`**
   - Import services and utils
   - Simplify getLogs to orchestration
   - Simplify streamLogs to delegation
   - Remove old code (now in services/utils)

2. **Test refactored controller** (80% coverage goal)
   - Mock LogFileService
   - Mock parser and filter functions (or use real ones)
   - Test request/response handling
   - Test error handling

### Phase 4: Verify and Clean Up

1. Run full test suite
2. Verify coverage meets goals (80%+ overall)
3. Update any integration tests
4. Remove dead code
5. Update documentation

---

## Testing Strategy

### Unit Tests (High Coverage)

**Pure Functions (100% coverage):**
- `logParsers.ts` - Test with string fixtures
- `logFilters.ts` - Test with mock log arrays
- `dateHelpers.ts` - Test with mocked dates

**Mockable Services (80% coverage):**
- `LogFileService.ts` - Mock `fs` module
- `logsController.ts` - Mock services

### Integration Tests (Optional)

**File System Integration:**
- Create fixture log files in `tests/fixtures/logs/`
- Test LogFileService with real files
- Test end-to-end parsing

**HTTP Integration:**
- Test getLogs endpoint with real HTTP server
- Use supertest for SSE streaming tests (limited)

### Acceptance Criteria

- [ ] Overall controller test coverage: 80%+
- [ ] logParsers.ts: 100% coverage
- [ ] logFilters.ts: 100% coverage
- [ ] dateHelpers.ts: 100% coverage
- [ ] LogFileService.ts: 80% coverage
- [ ] logsController.ts: 80% coverage
- [ ] LogStreamService.ts: 30% coverage (acceptable)
- [ ] All existing functionality works
- [ ] No breaking changes to API

---

## Expected Coverage Improvement

**Before:**
- Statements: 19.92%
- Branch: 6.39%
- Functions: 22.85%
- Lines: 20.92%

**After (Projected):**
- Statements: 82%
- Branch: 75%
- Functions: 85%
- Lines: 83%

**Coverage Breakdown:**

| File | Current | Target | Notes |
|------|---------|--------|-------|
| logsController.ts | 19.92% | 80% | Thin orchestration, easy to mock |
| logParsers.ts | - | 100% | Pure functions |
| logFilters.ts | - | 100% | Pure functions |
| dateHelpers.ts | - | 100% | Pure functions |
| LogFileService.ts | - | 80% | Mock fs, test logic |
| LogStreamService.ts | - | 35% | SSE is hard to test |

---

## Benefits

### 1. **Testability**
- Pure functions are 100% testable
- Services can be mocked
- Clear boundaries for testing

### 2. **Maintainability**
- Single Responsibility Principle
- Each module has one clear purpose
- Easier to understand and modify

### 3. **Reusability**
- Parsers can be reused in other contexts
- Filters can be applied anywhere
- Services can be used by other controllers

### 4. **Reliability**
- High test coverage catches regressions
- Pure functions are predictable
- Fewer bugs in production

### 5. **Developer Experience**
- Clear where to add new features
- Easy to onboard new developers
- Self-documenting code structure

---

## File Structure After Refactoring

```
src/
├── controllers/
│   └── logsController.ts           (50-100 lines, orchestration)
├── services/
│   ├── LogFileService.ts           (150-200 lines, file I/O)
│   └── LogStreamService.ts         (200-250 lines, SSE streaming)
└── utils/
    ├── logParsers.ts               (250-300 lines, pure parsing)
    ├── logFilters.ts               (100-150 lines, pure filtering)
    └── dateHelpers.ts              (20-30 lines, date utilities)

tests/
├── unit/
│   ├── controllers/
│   │   └── logsController.test.ts  (Mock services, test orchestration)
│   ├── services/
│   │   ├── LogFileService.test.ts  (Mock fs, test file operations)
│   │   └── LogStreamService.test.ts (Limited coverage, test key logic)
│   └── utils/
│       ├── logParsers.test.ts      (100% coverage, string fixtures)
│       ├── logFilters.test.ts      (100% coverage, mock data)
│       └── dateHelpers.test.ts     (100% coverage, simple tests)
└── fixtures/
    └── logs/                        (Sample log files for integration tests)
        ├── app-sample.log
        ├── nginx-sample.log
        └── error-sample.log
```

---

## Example Implementation

### Example: `logParsers.ts`

```typescript
import { AppLogEntry, LogService, LogEntry } from '@ajgifford/keepwatching-types';
import path from 'path';

const logRegex = /\[([\w\-]+ [\d:]+)\] (?:\x1b?\[\d+m)?(\w+)(?:\x1b?\s?\[\d+m)? \(([\d\.]+)\): (.+)/;

/**
 * Parse a single line from an app log file (JSON format)
 * @param line - Log line to parse
 * @param service - Service type (e.g., LogService.APP)
 * @param logFile - Log file name for reference
 * @returns Parsed AppLogEntry or null if parsing fails
 */
export function parseAppLogLine(
  line: string,
  service: LogService,
  logFile: string
): AppLogEntry | null {
  try {
    const parsed = JSON.parse(line);
    return {
      timestamp: parsed.timestamp,
      service: service,
      message: parsed.message,
      level: parsed.level,
      logId: parsed.logId,
      logFile: path.basename(logFile),
      request: parsed.data?.request
        ? {
            url: parsed.data.request.path || 'N/A',
            method: parsed.data.request.method || 'N/A',
            body: parsed.data.request.body || {},
            params: parsed.data.request.params || {},
            query: parsed.data.request.query || {},
          }
        : {},
      response: parsed.data?.response
        ? {
            statusCode: parsed.data.response.statusCode || 'N/A',
            body: parsed.data.response.body || {},
          }
        : {},
    };
  } catch (e) {
    return null;
  }
}

/**
 * Parse entire log file content based on service type
 * @param content - Raw file content
 * @param service - Service type
 * @param logFile - Log file name
 * @returns Array of parsed log entries
 */
export function parseLogFile(
  content: string,
  service: LogService,
  logFile: string
): LogEntry[] {
  const lines = content.split('\n');

  switch (service) {
    case LogService.APP:
      return lines
        .map(line => parseAppLogLine(line, service, logFile))
        .filter((entry): entry is AppLogEntry => entry !== null);

    case LogService.NGINX:
      return lines
        .map(line => parseNginxLogLine(line, logFile))
        .filter((entry): entry is NginxLogEntry => entry !== null);

    case LogService.CONSOLE:
      return lines
        .map(line => parseConsoleLogLine(line, service, logFile))
        .filter((entry): entry is LogEntry => entry !== null);

    case LogService.CONSOLE_ERROR:
      return parseErrorLogFile(content, service, logFile);

    default:
      return [];
  }
}

// ... other parser functions
```

### Example: `logParsers.test.ts`

```typescript
import { parseAppLogLine, parseLogFile } from '@utils/logParsers';
import { LogService, LogLevel } from '@ajgifford/keepwatching-types';

describe('logParsers', () => {
  describe('parseAppLogLine', () => {
    it('should parse valid JSON log line', () => {
      const line = JSON.stringify({
        timestamp: '2025-01-01T12:00:00Z',
        level: 'info',
        message: 'Test message',
        logId: '123',
      });

      const result = parseAppLogLine(line, LogService.APP, 'test.log');

      expect(result).toEqual({
        timestamp: '2025-01-01T12:00:00Z',
        service: LogService.APP,
        message: 'Test message',
        level: 'info',
        logId: '123',
        logFile: 'test.log',
        request: {},
        response: {},
      });
    });

    it('should return null for invalid JSON', () => {
      const line = 'not valid json';
      const result = parseAppLogLine(line, LogService.APP, 'test.log');
      expect(result).toBeNull();
    });

    it('should parse log with request data', () => {
      const line = JSON.stringify({
        timestamp: '2025-01-01T12:00:00Z',
        level: 'info',
        message: 'Request received',
        logId: '456',
        data: {
          request: {
            path: '/api/test',
            method: 'GET',
            body: { foo: 'bar' },
            params: { id: '1' },
            query: { filter: 'active' },
          },
        },
      });

      const result = parseAppLogLine(line, LogService.APP, 'test.log');

      expect(result?.request).toEqual({
        url: '/api/test',
        method: 'GET',
        body: { foo: 'bar' },
        params: { id: '1' },
        query: { filter: 'active' },
      });
    });

    it('should handle missing optional fields gracefully', () => {
      const line = JSON.stringify({
        timestamp: '2025-01-01T12:00:00Z',
        message: 'Minimal log',
      });

      const result = parseAppLogLine(line, LogService.APP, 'test.log');

      expect(result).toBeTruthy();
      expect(result?.level).toBeUndefined();
      expect(result?.logId).toBeUndefined();
    });
  });

  describe('parseLogFile', () => {
    it('should parse multiple app log lines', () => {
      const content = [
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', message: 'Log 1', level: 'info' }),
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', message: 'Log 2', level: 'error' }),
        'invalid line',
        JSON.stringify({ timestamp: '2025-01-01T12:00:00Z', message: 'Log 3', level: 'warn' }),
      ].join('\n');

      const result = parseLogFile(content, LogService.APP, 'test.log');

      expect(result).toHaveLength(3);
      expect(result[0].message).toBe('Log 1');
      expect(result[1].message).toBe('Log 2');
      expect(result[2].message).toBe('Log 3');
    });

    it('should filter out invalid lines', () => {
      const content = [
        'invalid line 1',
        'invalid line 2',
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', message: 'Valid log' }),
      ].join('\n');

      const result = parseLogFile(content, LogService.APP, 'test.log');

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Valid log');
    });
  });
});
```

---

## Success Metrics

After refactoring:

- [ ] Test coverage increased from 20% to 80%+
- [ ] All pure functions have 100% coverage
- [ ] Controller tests use mocks and run in <100ms
- [ ] No breaking changes to API
- [ ] Code is easier to understand (verified by team review)
- [ ] New log parser can be added in <50 lines
- [ ] New filter can be added in <20 lines

---

## Timeline Estimate

- **Phase 1 (Create files):** 2-3 hours
- **Phase 2 (Write tests):** 4-6 hours
- **Phase 3 (Update controller):** 1-2 hours
- **Phase 4 (Verify):** 1 hour

**Total: 8-12 hours** of development time

---

## Additional Notes

### Service Mapping Constants

Move to LogFileService or a constants file:

```typescript
// src/constants/logConstants.ts
export const SERVICE_MAPPING: { [key: string]: LogService } = {
  'KeepWatching-App': LogService.APP,
  'KeepWatching-App-Error': LogService.APP,
  'nginx': LogService.NGINX,
  'KeepWatching-Console': LogService.CONSOLE,
  'KeepWatching-Console-Error': LogService.CONSOLE_ERROR,
};
```

### Regex Patterns

Move to parser constants:

```typescript
// src/utils/logParsers.ts
const NGINX_LOG_PATTERN = /^(\S+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d+) (\d+) "([^"]*)" "([^"]*)"$/;
const WINSTON_LOG_PATTERN = /\[([\w\-]+ [\d:]+)\] (?:\x1b?\[\d+m)?(\w+)(?:\x1b?\s?\[\d+m)? \(([\d\.]+)\): (.+)/;
const TIMESTAMP_PATTERN = /^\[([A-Za-z]{3}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})\]\s+(\w+):\s*(.*)$/;
```

### Error Handling

Each service/util should have consistent error handling:

```typescript
export function parseAppLogLine(...): AppLogEntry | null {
  try {
    // parsing logic
  } catch (error) {
    cliLogger.warn(`Failed to parse app log line: ${error.message}`);
    return null;
  }
}
```

---

## Conclusion

This refactoring transforms an untestable 655-line controller into a well-organized, highly testable system with clear separation of concerns. The pure parsing and filtering logic achieves 100% coverage, while the orchestration layer becomes simple and easy to test with mocks.

**Key Takeaway:** Move I/O to services (mockable), business logic to utils (pure functions), and keep controllers thin (orchestration). This pattern works for any complex controller.
