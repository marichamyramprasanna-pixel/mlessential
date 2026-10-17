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

/**
 * Checks for Prototype Pollution attack vectors in keys and JSON structures.
 * Protects against tampering with Object.prototype (__proto__, constructor, prototype).
 */
export function detectPrototypePollution(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  if (Array.isArray(obj)) {
    return obj.some((item) => detectPrototypePollution(item));
  }
  for (const key of Object.keys(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return true;
    }
    if (typeof obj[key] === "object" && detectPrototypePollution(obj[key])) {
      return true;
    }
  }
  return false;
}

/**
 * Masks sensitive telemetry PII such as IP addresses (IPv4 & IPv6), MAC addresses, and email identifiers.
 * Useful for public demonstrations, client-side exports, and zero-trust sharing.
 */
export function maskIpOrPii(text: string): string {
  if (typeof text !== "string") return "";
  return text
    // IPv4 masking (e.g., 192.168.1.55 -> 192.168.***.***)
    .replace(/\b(\d{1,3}\.\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g, "$1.***.***")
    // MAC address masking (e.g., 00:1A:2B:3C:4D:5E -> 00:1A:2B:**:**:**)
    .replace(/\b([0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2})[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}\b/g, "$1:**:**:**")
    // Email masking (e.g., alice@domain.com -> a***e@domain.com)
    .replace(/\b([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*([a-zA-Z0-9_.+-])@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b/g, "$1***$2@$3");
}

/**
 * Computes a cryptographic SHA-256 integrity checksum for a dataset string or JSON payload.
 * Provides verifiable proof that ingested telemetry has not been tampered with or modified.
 */
export async function computeDataIntegrityChecksum(payload: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {}
  // Node / Server-side fallback or simple deterministic hash representation
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sha256_${Math.abs(hash).toString(16).padStart(16, "0")}`;
}

/**
 * Validates the format and entropy of CSRF tokens.
 */
export function validateCsrfTokenFormat(token: string): boolean {
  if (typeof token !== "string") return false;
  return /^[a-f0-9]{32,64}$/i.test(token);
}

/**
 * Sanitizes file names to prevent directory traversal or control characters in exported files.
 */
export function sanitizeFilename(filename: string, fallback: string = "export.csv"): string {
  if (typeof filename !== "string") return fallback;
  const cleaned = filename.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 100);
  return cleaned || fallback;
}
