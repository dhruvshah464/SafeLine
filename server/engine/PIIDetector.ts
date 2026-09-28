import { PIIDetectionResult, IPIIDetector } from '../types';

export class DefaultPIIDetector implements IPIIDetector {
  public async detect(payload: unknown): Promise<PIIDetectionResult> {
    const detected: string[] = [];
    if (!payload) {
      return { detected, sanitizedPayload: payload };
    }
    const payloadStr = JSON.stringify(payload);
    if (!payloadStr) {
      return { detected, sanitizedPayload: payload };
    }

    let sanitizedStr = payloadStr;

    // Detect and redact SSN
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(sanitizedStr)) {
      detected.push('SSN');
      sanitizedStr = sanitizedStr.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
    }

    // Detect and redact Credit Card (PAN)
    if (/\b(?:\d{4}[ -]?){3}\d{4}\b/.test(sanitizedStr)) {
      detected.push('Credit Card');
      sanitizedStr = sanitizedStr.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CC]');
    }

    // Detect and redact Email
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(sanitizedStr)) {
      detected.push('Email Address');
      sanitizedStr = sanitizedStr.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]');
    }

    // Detect and redact Phone Numbers (simple format)
    if (/\b\+?1?[-.]?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/.test(sanitizedStr)) {
      detected.push('Phone Number');
      sanitizedStr = sanitizedStr.replace(/\b\+?1?[-.]?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED_PHONE]');
    }

    // Detect and redact JWT
    if (/eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_=]+/.test(sanitizedStr)) {
      detected.push('JWT Token');
      sanitizedStr = sanitizedStr.replace(/eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_=]+/g, '[REDACTED_JWT]');
    }

    // Detect and redact Generic API Keys/Secrets (mock logic looking for common patterns)
    if (/(?:api_?key|secret|token)["']?\s*:\s*["']?([A-Za-z0-9-_]{16,})["']?/i.test(sanitizedStr)) {
      detected.push('Secret');
      sanitizedStr = sanitizedStr.replace(/((?:api_?key|secret|token)["']?\s*:\s*["']?)([A-Za-z0-9-_]{16,})(["']?)/gi, '$1[REDACTED_SECRET]$3');
    }

    let sanitizedPayload = payload;
    if (detected.length > 0) {
      try {
        sanitizedPayload = JSON.parse(sanitizedStr);
      } catch (e) {
        sanitizedPayload = payload; // fallback
      }
    }

    return {
      detected,
      sanitizedPayload
    };
  }
}

export const piiDetector = new DefaultPIIDetector();
