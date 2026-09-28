import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireAdmin } from '../auth';
import { v4 as uuidv4 } from 'uuid';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get('/users', (req, res) => {
  const users = db.users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, orgId: u.orgId }));
  res.json(users);
});

adminRouter.post('/users', (req, res) => {
  // basic mock create
  const { email, name, role, orgId, password } = req.body;
  const user = {
    id: 'usr_' + uuidv4(),
    email,
    name,
    role: role || 'user',
    orgId: orgId || db.orgs[0].id,
    passwordHash: '$2a$10$XU0H3M0B.aE9f/5nS0bL7ub2rQ/H78.uA2tD3j9oI.2q.3f0r8B7W'
  };
  db.users.push(user);
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

adminRouter.get('/orgs', (req, res) => {
  res.json(db.orgs);
});

adminRouter.get('/workspaces', (req, res) => {
  res.json(db.workspaces);
});

adminRouter.get('/keys', (req, res) => {
  res.json(db.apiKeys);
});

adminRouter.post('/keys', (req, res) => {
  const { name, workspaceId } = req.body;
  const orgId = db.workspaces.find(w => w.id === workspaceId)?.orgId || db.orgs[0].id;
  const newKey = {
    id: 'key_' + uuidv4(),
    key: 'sk_test_' + uuidv4().replace(/-/g, ''),
    orgId,
    workspaceId: workspaceId || db.workspaces[0].id,
    name,
    createdAt: new Date()
  };
  db.apiKeys.push(newKey);
  res.json(newKey);
});

adminRouter.get('/usage', (req, res) => {
  res.json(db.usage);
});
