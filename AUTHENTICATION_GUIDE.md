# Enterprise Authentication in SafeLine

SafeLine supports enterprise-grade authentication with RBAC, multiple authentication methods, and usage tracking.

## Authentication Methods

1. **JWT (JSON Web Tokens)**: Used for user sessions in the web application (e.g., Admin Dashboard). Tokens expire in 1 hour and can be refreshed using a 7-day refresh token.
2. **API Keys**: Used by agents and backend services to authenticate API requests programmatically.

## Workspaces and Organizations

SafeLine is multi-tenant out of the box:
- **Organizations**: The top-level entity representing a company.
- **Workspaces**: Isolated environments within an organization (e.g., Development, Staging, Production). API Keys are scoped to a specific workspace.

## Role-Based Access Control (RBAC)

Users can be assigned roles within an organization.
- **Admin**: Has full access to user management, workspace creation, API key generation, and usage logs.
- **User**: Read-only access to policies and basic validation tools.

## Rate Limiting

To prevent abuse, all authenticated API endpoints are protected by a rate limiter (`express-rate-limit`). The default limit is 100 requests per 15 minutes.

## Using the API

When interacting with the API programmatically, include the API key in the `Authorization` header:

```bash
curl -X POST http://localhost:3000/api/validate \
  -H "Authorization: Bearer sk_test_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "test1", "payload": {}}'
```

## Admin Dashboard

The Admin Dashboard provides a visual interface for managing your enterprise setup:
1. **Usage & Analytics**: View a log of all API requests, showing which endpoint was hit and by which API key/workspace.
2. **User Management**: Invite new users and assign them roles (Admin/User).
3. **API Keys**: Generate, rotate, and revoke API keys scoped to specific workspaces.

### Accessing the Dashboard

Navigate to `/admin` in the web application. Use the default credentials to log in:
- **Email**: admin@acme.com
- **Password**: password
