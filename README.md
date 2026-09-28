# SafeLine

SafeLine is an open-source AI Safety & Compliance Engine.

## Alpha Architecture

SafeLine is transitioning from an interactive demo to a full production API and engine platform.

### Core Modules

- **ValidationEngine**: Coordinates schema checks, policy evaluations, and PII detection.
- **PolicyEngine**: Evaluates JSON payloads against dynamic policy rules.
- **PIIDetector**: Identifies and redacts sensitive information.

### API Endpoints

- `POST /api/validate` - Submit a scenario and payload for full evaluation.
- `POST /api/detect-pii` - Submit an arbitrary payload to find PII.
- `GET /api/rules` - Fetch current active rules.
- `POST /api/reload` - Reload rules from disk.
- `GET /api/metrics` - Fetch real-time validation metrics.

### Plugin Architecture

SafeLine is built on extensible interfaces to support ecosystem integration (e.g., HexIQ Studio).

Interfaces defined in `server/types/index.ts`:
- `IPolicyProvider`
- `IPIIDetector`
- `IAuditProvider`
- `IAPIValidator`

### Development

```bash
# Install dependencies
npm install

# Start the full-stack server (Vite + Express)
npm run dev

# Run unit tests
npm test

# Build for production
npm run build
```
