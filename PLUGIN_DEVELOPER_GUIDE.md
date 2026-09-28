# SafeLine Plugin Developer Guide

SafeLine is designed as an extensible platform. You can extend its capabilities by writing custom plugins for various stages of the compliance pipeline.

## Plugin Architecture

All plugins implement the `SafeLinePlugin` interface and are registered with the `globalRegistry`. A plugin can be hot-loaded at runtime.

### Plugin Types

1. **`POLICY`**: Provides custom evaluation rules.
2. **`PII`**: Provides custom logic to detect and redact sensitive information.
3. **`AUDIT`**: Records audit trails to external systems (e.g., SIEM, Databases).
4. **`NOTIFICATION`**: Sends alerts when critical events occur (e.g., Slack, Email, PagerDuty).
5. **`VALIDATOR`**: Performs complex pre-evaluation validation on incoming requests.
6. **`OUTPUT`**: Routes the final, sanitized payload to its destination (e.g., Webhook, API Gateway).

## Writing a Plugin

### 1. The Base Interface

Every plugin must define its `name`, `version`, and `type`.

```typescript
import { BasePlugin } from 'safeline/sdk';

export interface MyPlugin extends BasePlugin {
  type: 'POLICY'; // or PII, AUDIT, etc.
  // ... specific methods
}
```

### 2. Implementing Specific Types

#### Policy Provider
Return a list of `PolicyRule` objects. Each rule evaluates a payload and returns `{ passed: boolean, reason?: string }`.

#### PII Provider
Implement `detect(payload)` to return an array of `PiiFinding`, and `redact(payload, findings)` to return the sanitized payload.

#### Notification Provider
Implement `send(event)` to handle routing alerts to your chosen platform.

## Registering Plugins

Use the global registry to register your plugins:

```typescript
import { globalRegistry } from 'safeline/sdk';
import { CustomBusinessPolicy } from './plugins/custom-policy';

await globalRegistry.register(CustomBusinessPolicy, { /* optional config */ });
```

## Examples

We have provided examples in the `examples/plugins/` directory:
- `custom-policy/`: Example of evaluating business hours and transaction limits.
- `custom-pii/`: Example of detecting a custom customer ID format using Regex.
- `slack-notification/`: Example of sending pipeline alerts to Slack.
- `webhook-sink/`: Example of forwarding the final request to a webhook.

## Hot-Loading

Because plugins are registered in memory, you can dynamically load and unload them:

```typescript
await globalRegistry.unregister('custom-business-policy');
// Load new version
await globalRegistry.register(NewBusinessPolicy);
```

This allows SafeLine to update policies and detectors without downtime.
