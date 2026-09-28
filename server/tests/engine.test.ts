import { describe, it, expect, beforeEach } from 'vitest';
import { piiDetector } from '../engine/PIIDetector';
import { policyEngine } from '../engine/PolicyEngine';

describe('PIIDetector', () => {
  it('should detect an SSN', async () => {
    const result = await piiDetector.detect({ notes: 'Here is my SSN: 123-45-6789' });
    expect(result.detected).toContain('SSN');
    expect(JSON.stringify(result.sanitizedPayload)).toContain('[REDACTED_SSN]');
  });

  it('should detect an Email', async () => {
    const result = await piiDetector.detect({ user: 'test@example.com' });
    expect(result.detected).toContain('Email Address');
  });

  it('should return empty for safe payload', async () => {
    const result = await piiDetector.detect({ user: 'John Doe', age: 30 });
    expect(result.detected.length).toBe(0);
  });
});

describe('PolicyEngine', () => {
  beforeEach(() => {
    policyEngine.loadRules();
  });

  it('should deny large charges', async () => {
    const request = { scenarioId: 'test', payload: { amount: 60000 } };
    const result = await policyEngine.evaluate(request);
    expect(result.passed).toBe(false);
  });

  it('should allow small charges', async () => {
    const request = { scenarioId: 'test', payload: { amount: 1000 } };
    const result = await policyEngine.evaluate(request);
    expect(result.passed).toBe(true);
  });
  
  it('should deny DELETE methods', async () => {
    const request = { scenarioId: 'test', method: 'DELETE', payload: {} };
    const result = await policyEngine.evaluate(request);
    expect(result.passed).toBe(false);
  });
});
