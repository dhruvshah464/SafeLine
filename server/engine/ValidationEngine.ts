import crypto from 'crypto';
import { ValidationRequest, ValidationResponse } from '../types';
import { policyEngine } from './PolicyEngine';
import { piiDetector } from './PIIDetector';
import { logger } from '../config/logger';

export class ValidationEngine {
  public async validate(request: ValidationRequest): Promise<ValidationResponse> {
    const startTime = performance.now();
    logger.info(`Starting validation for scenario: ${request.scenarioId}`);

    // 1. Schema Validation (mocked basic validation)
    const schemaValidation = {
      valid: true,
      errors: [] as { path: string; message: string }[]
    };

    if (!request.payload) {
      schemaValidation.valid = false;
      schemaValidation.errors.push({ path: 'root', message: 'Payload is missing' });
    }

    // 2. Policy Evaluation
    const { evaluations, passed: policyPassed } = await policyEngine.evaluate(request);

    // 3. PII Detection
    const piiDetection = await piiDetector.detect(request.payload);

    // 4. Decision Logic
    let decision: 'ALLOW' | 'DENY' = 'ALLOW';
    if (!schemaValidation.valid || !policyPassed) {
      decision = 'DENY';
    }

    const totalLatencyMs = Math.round((performance.now() - startTime) * 100) / 100;

    // 5. Audit Trail Generation
    const timestamp = new Date().toISOString();
    const id = `req_${crypto.randomBytes(8).toString('hex')}`;
    
    // Hash of the decision state for immutability check
    const hashPayload = `${id}:${decision}:${JSON.stringify(evaluations)}:${JSON.stringify(piiDetection.detected)}`;
    const auditHash = crypto.createHash('sha256').update(hashPayload).digest('hex').substring(0, 16);

    const response: ValidationResponse = {
      id,
      timestamp,
      decision,
      schemaValidation,
      policyEvaluations: evaluations,
      piiDetection,
      auditHash,
      totalLatencyMs
    };

    logger.info(`Validation complete: ${decision}`, { id, latency: totalLatencyMs });

    return response;
  }
}

export const validationEngine = new ValidationEngine();
