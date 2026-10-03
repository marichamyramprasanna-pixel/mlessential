/**
 * Enterprise Input Sanitization and XSS / Injection Defense Utilities
 */

/**
 * Escapes HTML special characters to prevent Reflected and Stored Cross-Site Scripting (XSS).
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#x60;");
}

/**
 * Strips script tags, iframe tags, and inline JavaScript event handlers.
 */
export function stripDangerousTags(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

/**
 * Prevents CSV / Spreadsheet Formula Injection (CWE-1236).
 * If a cell starts with =, +, -, @, \t, or \r, spreadsheet applications can execute external code.
 * Neutralizes leading formula operators by prepending an apostrophe.
 */
export function sanitizeCsvField(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Recursively sanitizes strings in an object or array payload.
 */
export function sanitizePayload<T>(payload: T): T {
  if (typeof payload === "string") {
    return stripDangerousTags(payload) as unknown as T;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item)) as unknown as T;
  }
  if (payload !== null && typeof payload === "object") {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
      cleaned[key] = sanitizePayload(value);
    }
    return cleaned as T;
  }
  return payload;
}

/**
 * Validates and limits text input to prevent Denial of Service via huge string allocations.
 */
export function validateStringLength(
  input: string,
  maxLength: number = 2048,
  fieldName: string = "Input"
): string {
  if (typeof input !== "string") {
    throw new Error(`${fieldName} must be a valid text string.`);
  }
  if (input.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum allowed length of ${maxLength} characters.`);
  }
  return input;
}
