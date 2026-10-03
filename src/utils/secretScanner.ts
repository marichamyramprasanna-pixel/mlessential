/**
 * Secret Scanner and Security Audit Engine
 * Scans code and files for exposed API keys, private credentials, and authorization tokens.
 */

export interface SecretFinding {
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  patternName: string;
  location: string;
  maskedSnippet: string;
}

const SECRET_PATTERNS = [
  {
    name: "OpenRouter API Key",
    regex: /sk-or-v1-[a-zA-Z0-9]{64}/g,
    severity: "CRITICAL" as const,
    type: "API_KEY",
  },
  {
    name: "Google / Gemini API Key",
    regex: /AIza[0-9A-Za-z-_]{35}/g,
    severity: "CRITICAL" as const,
    type: "API_KEY",
  },
  {
    name: "OpenAI API Key",
    regex: /sk-[a-zA-Z0-9]{48}/g,
    severity: "CRITICAL" as const,
    type: "API_KEY",
  },
  {
    name: "RSA / SSH Private Key",
    regex: /-----BEGIN\s+PRIVATE\s+KEY-----/g,
    severity: "CRITICAL" as const,
    type: "PRIVATE_KEY",
  },
  {
    name: "Hardcoded Password in Code",
    regex: /(?:password|passwd|secret)\s*[:=]\s*["'][^"']{6,}["']/gi,
    severity: "HIGH" as const,
    type: "HARDCODED_CREDENTIAL",
  },
  {
    name: "JWT Bearer Token",
    regex: /eyJ[a-zA-Z0-9-_]{10,}\.eyJ[a-zA-Z0-9-_]{10,}\.[a-zA-Z0-9-_]{10,}/g,
    severity: "HIGH" as const,
    type: "AUTH_TOKEN",
  },
];

/**
 * Masks a secret string showing only the first 4 and last 4 characters.
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return "********";
  }
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

/**
 * Scans text content for sensitive secret patterns.
 */
export function scanTextForSecrets(text: string, locationName: string = "source"): SecretFinding[] {
  const findings: SecretFinding[] = [];

  for (const pattern of SECRET_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = re.exec(text)) !== null) {
      // Ignore placeholder examples or template comments
      const matchedStr = match[0];
      if (
        matchedStr.includes("MY_GEMINI_API_KEY") ||
        matchedStr.includes("MY_OPENROUTER_API_KEY") ||
        matchedStr.includes("example")
      ) {
        continue;
      }

      findings.push({
        type: pattern.type,
        severity: pattern.severity,
        patternName: pattern.name,
        location: locationName,
        maskedSnippet: maskSecret(matchedStr),
      });
    }
  }

  return findings;
}
