export interface ValidationRequest {
  scenarioId: string;
  payload: unknown;
  method?: string;
  path?: string;
}

export interface RuleEvaluation {
  ruleId: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  passed: boolean;
  latencyMs: number;
}

export interface PIIDetectionResult {
  detected: string[];
  sanitizedPayload?: unknown;
}

export interface ValidationResponse {
  id: string;
  timestamp: string;
  decision: 'ALLOW' | 'DENY';
  schemaValidation: {
    valid: boolean;
    errors: Array<{ path: string; message: string }>;
  };
  policyEvaluations: RuleEvaluation[];
  piiDetection: PIIDetectionResult;
  auditHash: string;
  totalLatencyMs: number;
}

// Plugin Architecture Interfaces
export interface PolicyRule {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trigger: string;
  file: string;
}

export interface IPolicyProvider {
  loadRules(): void | Promise<void>;
  getRules(): PolicyRule[];
  evaluate(request: ValidationRequest): Promise<{ evaluations: RuleEvaluation[]; passed: boolean }>;
}

export interface IPIIDetector {
  detect(payload: unknown): Promise<PIIDetectionResult>;
}

export interface IAuditProvider {
  log(response: ValidationResponse): Promise<void>;
}

export interface IAPIValidator {
  validateSchema(request: ValidationRequest): Promise<{ valid: boolean; errors: { path: string; message: string }[] }>;
}
