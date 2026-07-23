# SafeLine: Enterprise Compliance Guardrail

## Overview

SafeLine is an Axonic-integrated compliance interception skill for OpenClaw agents. It acts as a financial compliance guardrail, intercepting and validating all sensitive agent actions before execution against enterprise compliance rules, PII regulations, and API authorization policies.

## Skill Metadata

- **Name**: SafeLine Compliance Guardrail
- **Version**: 1.0.0
- **Provider**: Axonic Layer
- **Target**: OpenClaw Agent Actions
- **Compliance Framework**: JPMC Enterprise Standards

## Core Capabilities

### 1. Payload Interception
Intercepts all agent action requests before execution to validate against compliance rules.

```python
{
  "action_type": "database_write | external_call | ledger_access | email_send",
  "payload": {...},
  "context": {...}
}
```

### 2. Compliance Rules Engine
Evaluates actions against mock JPMC compliance rules:
- Financial transaction limits and thresholds
- Unauthorized API endpoint detection
- Data classification enforcement
- Role-based access control (RBAC)

### 3. PII Detection & Masking
Detects and flags Personally Identifiable Information:
- SSN patterns
- Credit card numbers
- Email addresses
- Phone numbers
- Account identifiers

### 4. API Validation
Validates API calls against whitelist:
- Approved endpoints
- Required authentication
- Rate limiting
- Request/response schemas

### 5. Immutable Audit Trail
Logs all interceptions with:
- Timestamp
- Action details
- Compliance checks performed
- Decision (allow/deny)
- Requester identity
- Tamper-proof logging

## Usage in OpenClaw

### Basic Integration

```python
from safeline import ComplianceGuardrail

# Initialize guardrail
guardrail = ComplianceGuardrail(
    config_path="configs/jpmc_rules.json",
    audit_log_path="logs/audit_trail.log"
)

# Intercept action before execution
result = guardrail.validate_action(
    action_type="database_write",
    payload=agent_action_payload,
    context=execution_context
)

if result.approved:
    # Execute agent action
    execute_action(agent_action_payload)
else:
    # Log denial and alert
    log_compliance_violation(result)
```

### Configuration

```yaml
# configs/jpmc_rules.json
{
  "compliance_rules": {
    "max_transaction_amount": 1000000,
    "max_daily_transfers": 5000000,
    "restricted_endpoints": ["DELETE /api/users", "PATCH /api/ledger"],
    "pii_sensitivity_level": "high",
    "required_approvals": {
      "external_transfer": ["manager", "compliance"],
      "database_delete": ["dba", "compliance"]
    }
  }
}
```

## Skill Execution Flow

```
OpenClaw Agent Action
    ↓
SafeLine Guardrail (Interception)
    ↓
    ├─ Payload Validation
    ├─ PII Detection
    ├─ API Whitelisting
    ├─ Compliance Rules Check
    └─ Audit Trail Logging
    ↓
Decision: ALLOW / DENY
    ↓
    ├─ ALLOW → Execute Action → Log Success
    └─ DENY → Block Action → Alert Stakeholders
```

## Compliance Rules

SafeLine enforces mock JPMC rules including:

1. **Transaction Limits**: Single transaction < $1M, Daily aggregate < $5M
2. **Data Access**: Role-based restrictions on sensitive datasets
3. **External Calls**: Only whitelisted financial APIs allowed
4. **API Methods**: DELETE and destructive PATCH operations require approval
5. **PII Protection**: Automatic detection and redaction in logs
6. **Audit Requirements**: All modifications must be logged and immutable

## API Reference

### ComplianceGuardrail Class

```python
class ComplianceGuardrail:
    def __init__(self, config_path: str, audit_log_path: str)
    def validate_action(self, action_type: str, payload: dict, context: dict) -> ValidationResult
    def get_audit_trail(self, filters: dict) -> List[AuditEntry]
    def verify_audit_integrity() -> bool
```

### ValidationResult

```python
@dataclass
class ValidationResult:
    approved: bool
    checks_performed: List[str]
    violations: List[str]
    warnings: List[str]
    audit_id: str
    timestamp: datetime
```

## Audit Trail Schema

```json
{
  "audit_id": "uuid",
  "timestamp": "2026-04-22T10:30:45Z",
  "action_type": "database_write",
  "agent_id": "agent-001",
  "requester": "user@jpmc.com",
  "checks": [
    {"name": "compliance_rules", "passed": true},
    {"name": "pii_detection", "passed": true},
    {"name": "api_validation", "passed": true}
  ],
  "decision": "APPROVED",
  "payload_hash": "sha256...",
  "compliance_score": 0.98
}
```

## Deployment

SafeLine integrates as a custom skill directory in OpenClaw:

```
openclaw/
  ├── skills/
  │   ├── default_skills/
  │   └── safeline/              # SafeLine skill directory
  │       ├── SKILL.md
  │       ├── __init__.py
  │       ├── guardrail.py
  │       └── rules/
```

## Testing

Run the compliance test suite:

```bash
python -m pytest tests/test_compliance.py -v
python -m pytest tests/test_pii_detection.py -v
python -m pytest tests/test_api_validation.py -v
python -m pytest tests/test_audit_trail.py -v
```

## Key Design Decisions

1. **Non-Invasive**: SafeLine wraps actions without modifying OpenClaw core
2. **Immutable Logging**: Audit trail uses cryptographic hashing
3. **Mock Rules**: JPMC rules are configurable and mockable for testing
4. **Fail-Safe**: Errors default to blocking actions
5. **Transparent**: All decisions are logged and explainable

## Future Enhancements

- Real-time compliance dashboard
- Machine learning-based anomaly detection
- Integration with external compliance APIs
- Multi-tenant rule management
- Real-time compliance alerts
