import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../routes/api';
import { policyEngine } from '../engine/PolicyEngine';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

const AUTH_HEADER = ['Authorization', 'Bearer sk_test_1234567890abcdef'];

describe('API Routes Verification', () => {
  beforeAll(() => {
    policyEngine.loadRules();
  });

  it('GET /api/health should return 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/telemetry/error should ingest frontend error and return 200', async () => {
    const res = await request(app)
      .post('/api/telemetry/error')
      .send({
        errorId: 'err_test123',
        boundary: 'AppRoutesBoundary',
        name: 'TypeError',
        message: 'Cannot read properties of undefined',
        route: '/docs',
        stack: 'Error: stack trace test',
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.errorId).toBe('err_test123');
  });

  it('GET /api/rules should return rules', async () => {
    const res = await request(app).get('/api/rules').set(AUTH_HEADER[0], AUTH_HEADER[1]);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/metrics should return metrics', async () => {
    const res = await request(app).get('/api/metrics').set(AUTH_HEADER[0], AUTH_HEADER[1]);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('validationCount');
  });

  it('POST /api/reload should reload rules', async () => {
    const res = await request(app).post('/api/reload').set(AUTH_HEADER[0], AUTH_HEADER[1]);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
  });

  it('POST /api/detect-pii should require payload', async () => {
    const res = await request(app).post('/api/detect-pii').set(AUTH_HEADER[0], AUTH_HEADER[1]).send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/detect-pii should detect and redact PII', async () => {
    const res = await request(app).post('/api/detect-pii').set(AUTH_HEADER[0], AUTH_HEADER[1]).send({
      payload: { text: 'my token is eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' }
    });
    expect(res.status).toBe(200);
    expect(res.body.detected).toContain('JWT Token');
    expect(JSON.stringify(res.body.sanitizedPayload)).toContain('[REDACTED_JWT]');
  });

  it('POST /api/validate should require scenarioId', async () => {
    const res = await request(app).post('/api/validate').set(AUTH_HEADER[0], AUTH_HEADER[1]).send({ payload: {} });
    expect(res.status).toBe(400);
  });

  it('POST /api/validate should allow safe payload', async () => {
    const res = await request(app).post('/api/validate').set(AUTH_HEADER[0], AUTH_HEADER[1]).send({
      scenarioId: 'test1',
      payload: { message: 'hello' }
    });
    expect(res.status).toBe(200);
    expect(res.body.decision).toBe('ALLOW');
  });

  it('POST /api/validate should deny unsafe payload (amount > 50000)', async () => {
    const res = await request(app).post('/api/validate').set(AUTH_HEADER[0], AUTH_HEADER[1]).send({
      scenarioId: 'test2',
      payload: { amount: 60000 }
    });
    expect(res.status).toBe(200);
    expect(res.body.decision).toBe('DENY');
  });

  it('POST /api/validate should block DELETE request', async () => {
    const res = await request(app).post('/api/validate').set(AUTH_HEADER[0], AUTH_HEADER[1]).send({
      scenarioId: 'test3',
      method: 'DELETE',
      payload: {}
    });
    expect(res.status).toBe(200);
    expect(res.body.decision).toBe('DENY');
  });
});
