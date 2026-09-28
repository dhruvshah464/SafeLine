import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'user';
  orgId: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Workspace {
  id: string;
  orgId: string;
  name: string;
}

export interface ApiKey {
  id: string;
  key: string;
  orgId: string;
  workspaceId: string;
  name: string;
  createdAt: Date;
}

export interface ApiUsage {
  id: string;
  orgId: string;
  workspaceId: string;
  endpoint: string;
  timestamp: Date;
}

class MockDatabase {
  users: User[] = [];
  orgs: Organization[] = [];
  workspaces: Workspace[] = [];
  apiKeys: ApiKey[] = [];
  usage: ApiUsage[] = [];

  constructor() {
    this.seed();
  }

  seed() {
    const orgId = 'org_' + uuidv4();
    this.orgs.push({ id: orgId, name: 'Acme Corp' });

    const workspaceId = 'ws_' + uuidv4();
    this.workspaces.push({ id: workspaceId, orgId, name: 'Production' });

    this.users.push({
      id: 'usr_' + uuidv4(),
      email: 'admin@acme.com',
      passwordHash: '$2a$10$XU0H3M0B.aE9f/5nS0bL7ub2rQ/H78.uA2tD3j9oI.2q.3f0r8B7W', // 'password'
      name: 'Admin User',
      role: 'admin',
      orgId
    });

    this.apiKeys.push({
      id: 'key_static_test',
      key: 'sk_test_1234567890abcdef',
      orgId,
      workspaceId,
      name: 'Test Key',
      createdAt: new Date()
    });
  }

  recordUsage(orgId: string, workspaceId: string, endpoint: string) {
    this.usage.push({
      id: 'usage_' + uuidv4(),
      orgId,
      workspaceId,
      endpoint,
      timestamp: new Date()
    });
  }
}

export const db = new MockDatabase();
