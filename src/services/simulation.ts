export interface ValidationRequest {
  id: string;
  timestamp: string;
  agentId: string;
  method: string;
  path: string;
  payload: any;
}

export interface RuleEvaluation {
  ruleId: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  passed: boolean;
  latencyMs: number;
}

export interface PIIFinding {
  type: string;
  value: string;
  redactedValue: string;
  path: string;
}

export interface APISchemaValidation {
  valid: boolean;
  errors: { path: string; message: string }[];
}

export interface ValidationResponse {
  decision: 'ALLOW' | 'DENY' | 'REDACT_AND_ALLOW';
  latencyMs: number;
  evaluations: RuleEvaluation[];
  piiFindings: PIIFinding[];
  schemaValidation: APISchemaValidation;
  redactedPayload?: any;
  auditHash: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  request: ValidationRequest;
  expectedDecision: 'ALLOW' | 'DENY' | 'REDACT_AND_ALLOW';
}

export const SCENARIOS: Scenario[] = [
  {
    id: "financial_transfer",
    name: "Financial Transfer",
    description: "Agent attempts to transfer funds between internal accounts.",
    expectedDecision: 'DENY',
    request: {
      id: "req_fin_001",
      timestamp: new Date().toISOString(),
      agentId: "agent-finance-01",
      method: "POST",
      path: "/api/v1/transfer",
      payload: {
        fromAccount: "acc_internal_ops",
        toAccount: "acc_external_vendor",
        amount: 250000,
        currency: "USD",
        reason: "Vendor payment"
      }
    }
  },
  {
    id: "healthcare_export",
    name: "Healthcare Record Export",
    description: "Agent exports patient records containing sensitive PII.",
    expectedDecision: 'REDACT_AND_ALLOW',
    request: {
      id: "req_hlt_002",
      timestamp: new Date().toISOString(),
      agentId: "agent-health-support",
      method: "POST",
      path: "/api/v1/records/export",
      payload: {
        patientId: "pt_9921",
        notes: "Patient John Doe (SSN: 000-11-2222) was seen for a checkup.",
        diagnosis: "Healthy"
      }
    }
  },
  {
    id: "db_delete",
    name: "Database Delete",
    description: "Agent attempts a destructive DELETE operation.",
    expectedDecision: 'DENY',
    request: {
      id: "req_db_003",
      timestamp: new Date().toISOString(),
      agentId: "agent-ops-02",
      method: "DELETE",
      path: "/api/v1/users",
      payload: {
        query: { active: false }
      }
    }
  },
  {
    id: "github_actions",
    name: "GitHub Actions Deployment",
    description: "Agent triggers a production deployment.",
    expectedDecision: 'ALLOW',
    request: {
      id: "req_gh_004",
      timestamp: new Date().toISOString(),
      agentId: "agent-devops-01",
      method: "POST",
      path: "/repos/org/core/dispatches",
      payload: {
        event_type: "deploy-production",
        client_payload: { version: "v2.1.0" }
      }
    }
  }
];

export interface IEngineService {
  executeScenario(scenario: Scenario, overridePayload?: any): Promise<ValidationResponse>;
}

export class EngineSimulationService implements IEngineService {
  async executeScenario(scenario: Scenario, overridePayload?: any): Promise<ValidationResponse> {
    const requestPayload = overridePayload || scenario.request.payload;
    
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scenarioId: scenario.id,
          payload: requestPayload,
          method: scenario.request.method,
          path: scenario.request.path
        })
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
      }

      // We map the backend types back to the frontend types in simulation.ts
      const data = await res.json();
      
      const piiFindings: PIIFinding[] = data.piiDetection?.detected?.map((type: string) => ({
        type,
        value: '***',
        redactedValue: `[REDACTED_${type.toUpperCase()}]`,
        path: 'payload'
      })) || [];

      let finalDecision = data.decision;
      if (finalDecision === 'ALLOW' && piiFindings.length > 0) {
        finalDecision = 'REDACT_AND_ALLOW';
      }

      return {
        decision: finalDecision,
        latencyMs: data.totalLatencyMs || 5.0,
        evaluations: data.policyEvaluations || [],
        piiFindings,
        schemaValidation: data.schemaValidation || { valid: true, errors: [] },
        redactedPayload: piiFindings.length > 0 ? data.piiDetection?.sanitizedPayload : undefined,
        auditHash: data.auditHash || 'UNKNOWN_HASH'
      };
    } catch (error) {
      console.error('Failed to execute scenario via API', error);
      // Fallback
      return {
        decision: 'DENY',
        latencyMs: 0,
        evaluations: [],
        piiFindings: [],
        schemaValidation: { valid: false, errors: [{ path: 'network', message: 'Failed to reach validation engine' }] },
        auditHash: 'ERR_HASH'
      };
    }
  }
}

export const simulator = new EngineSimulationService();
