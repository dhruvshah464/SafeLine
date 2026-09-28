import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { generateTokens } from '../auth';

export const authRouter = Router();
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-refresh-secret-key';

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const tokens = generateTokens(user);
  res.json({ ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

authRouter.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const decoded: any = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = db.users.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
