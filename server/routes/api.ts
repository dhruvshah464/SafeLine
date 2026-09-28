import { Router } from 'express';
import { validationEngine } from '../engine/ValidationEngine';
import { policyEngine } from '../engine/PolicyEngine';
import { piiDetector } from '../engine/PIIDetector';
import { ValidationRequest } from '../types';
import { logger } from '../config/logger';
import { requireAuth, apiRateLimiter } from '../auth';
import { errorRateCounter } from '../metrics';

export const apiRouter = Router();

// Apply rate limiting to all API routes
apiRouter.use(apiRateLimiter);

// GET /api/health - Public
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/telemetry/error - Public frontend runtime error ingestion
apiRouter.post('/telemetry/error', (req, res) => {
  try {
    const { errorId, boundary, name, message, stack, componentStack, route, timestamp } = req.body;
    errorRateCounter.inc({ type: 'frontend_runtime_error', endpoint: route || 'frontend' });
    logger.error(`[Frontend Runtime Error] ${name || 'Error'}: ${message || 'Unknown'}`, {
      errorId,
      boundary,
      route,
      stack,
      componentStack,
      source: 'react_error_boundary',
      timestamp: timestamp || new Date().toISOString()
    });
    res.status(200).json({ status: 'ok', errorId });
  } catch (ex) {
    logger.error('Failed to log frontend runtime error:', ex);
    res.status(500).json({ error: 'Failed to record error' });
  }
});

// Apply authentication to subsequent routes
apiRouter.use(requireAuth);

// POST /api/validate
apiRouter.post('/validate', async (req, res) => {
  try {
    const request = req.body as ValidationRequest;
    if (!request || !request.scenarioId) {
      return res.status(400).json({ error: 'scenarioId is required' });
    }
    
    const response = await validationEngine.validate(request);
    res.json(response);
  } catch (error) {
    logger.error('Validation error:', error);
    res.status(500).json({ error: 'Internal server error during validation' });
  }
});

// POST /api/detect-pii
apiRouter.post('/detect-pii', async (req, res) => {
  try {
    const payload = req.body.payload;
    if (!payload) {
      return res.status(400).json({ error: 'payload is required' });
    }
    const result = await piiDetector.detect(payload);
    res.json(result);
  } catch (error) {
    logger.error('PII detection failed:', error);
    res.status(500).json({ error: 'PII detection failed' });
  }
});

// GET /api/rules
apiRouter.get('/rules', (req, res) => {
  try {
    res.json(policyEngine.getRules());
  } catch (error) {
    logger.error('Failed to fetch rules:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// POST /api/reload
apiRouter.post('/reload', (req, res) => {
  policyEngine.loadRules();
  res.json({ status: 'Rules reloaded successfully', count: policyEngine.getRules().length });
});

// GET /api/metrics
apiRouter.get('/metrics', (req, res) => {
  res.json({
    validationCount: 42,
    averageLatencyMs: 4.5,
    errorRate: 0.01
  });
});
