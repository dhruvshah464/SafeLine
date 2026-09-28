import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-refresh-secret-key';

export const generateTokens = (user: any) => {
  const token = jwt.sign({ id: user.id, role: user.role, orgId: user.orgId }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
  return { token, refreshToken };
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  if (authHeader.startsWith('Bearer sk_')) {
    const keyString = authHeader.split(' ')[1];
    const apiKey = db.apiKeys.find(k => k.key === keyString);
    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    (req as any).auth = { type: 'api_key', orgId: apiKey.orgId, workspaceId: apiKey.workspaceId };
    db.recordUsage(apiKey.orgId, apiKey.workspaceId, req.path);
    return next();
  } else if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).auth = { type: 'jwt', user: decoded };
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  return res.status(401).json({ error: 'Invalid authorization format' });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const auth = (req as any).auth;
  if (!auth || auth.type !== 'jwt' || auth.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
