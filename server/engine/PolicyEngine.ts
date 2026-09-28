import { RuleEvaluation, IPolicyProvider, ValidationRequest, PolicyRule } from '../types';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import { ruleExecutionDuration } from '../metrics';

export class DefaultPolicyProvider implements IPolicyProvider {
  private rules: PolicyRule[] = [];

  constructor() {
    this.loadRules();
  }

  public loadRules() {
    try {
      const rulesPath = path.join(process.cwd(), 'public', 'data', 'rules.json');
      if (fs.existsSync(rulesPath)) {
        const rulesData = fs.readFileSync(rulesPath, 'utf-8');
        this.rules = JSON.parse(rulesData);
      }
    } catch (err) {
      logger.error('Failed to load policy rules', err);
    }
  }

  public getRules(): PolicyRule[] {
    return this.rules;
  }

  public async evaluate(request: ValidationRequest): Promise<{ evaluations: RuleEvaluation[]; passed: boolean }> {
    const evaluations: RuleEvaluation[] = [];
    let allPassed = true;
    const payload = (request.payload as Record<string, any>) || {};

    // Simulate evaluating rules
    for (const rule of this.rules) {
      let passed = true;
      const startTime = performance.now();
      const timer = ruleExecutionDuration.startTimer();
      
      // Simple string/JS-based evaluation mock for MVP
      if (rule.id === 'safeline.finance.deny_large_charges') {
        if (payload.amount && typeof payload.amount === 'number' && payload.amount > 50000) {
          passed = false;
        }
      } else if (rule.id === 'safeline.db.block_delete') {
        if (request.method === 'DELETE' || payload.method === 'DELETE' || payload.query?.toUpperCase().includes('DELETE')) {
          passed = false;
        }
      }

      if (!passed) allPassed = false;

      const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
      timer({ rule_id: rule.id, decision: passed ? 'ALLOW' : 'DENY' });
      
      evaluations.push({
        ruleId: rule.id,
        name: rule.name,
        severity: rule.severity,
        passed,
        latencyMs: latencyMs === 0 ? 0.1 : latencyMs,
      });
    }

    return { evaluations, passed: allPassed };
  }
}

export const policyEngine = new DefaultPolicyProvider();
