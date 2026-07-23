# SafeLine Quick Reference

## Initialize Guardrail

```python
from safeline import ComplianceGuardrail

guardrail = ComplianceGuardrail(
    config_path="configs/jpmc_rules.json",
    audit_log_path="logs/audit_trail.log"
)
```

## Validate Actions

```python
result = guardrail.validate_action(
    action_type="database_write|external_call|ledger_access|email_send",
    payload={...},
    context={"agent_id": "...", "user": "...", "user_role": "..."}
)

if result.approved:
    execute_action()
else:
    print(f"Denied: {result.violations}")
```

## Check Results

```python
result.approved              # bool
result.audit_id              # str (UUID)
result.compliance_score      # float 0.0-1.0
result.violations            # List[str]
result.warnings              # List[str]
result.checks_performed      # List[str]
result.timestamp             # datetime
```

## Audit Trail

```python
# Get all entries
entries = guardrail.get_audit_trail()

# Filter by decision
denied = guardrail.get_audit_trail({"decision": "DENIED"})
approved = guardrail.get_audit_trail({"decision": "APPROVED"})

# Filter by user
user_actions = guardrail.get_audit_trail({"user": "trader@jpmc.com"})

# Verify integrity
is_valid = guardrail.verify_audit_integrity()

# Generate report
report = guardrail.get_compliance_report(start_date, end_date)
```

## PII Detection

```python
from safeline.pii import PIIDetector

detector = PIIDetector()

# Detect PII
findings = detector.detect_pii("SSN: 123-45-6789")
findings = detector.detect_pii_in_payload(payload_dict)

# Get summary
summary = detector.get_pii_summary(findings)

# Mask PII
masked = detector.mask_pii(text)
masked_payload = detector.mask_pii_in_payload(payload_dict)
```

## API Validation

```python
from safeline.api_validator import APIValidator

validator = APIValidator(config)

# Validate API call
result = validator.validate_api_call({
    "http_method": "POST",
    "api_endpoint": "/api/transactions",
    "authorization": "Bearer token..."
})

# Manage whitelist
validator.add_endpoint_to_whitelist("POST", "/api/custom", True)
validator.remove_endpoint_from_whitelist("GET", "/api/old")
whitelist = validator.get_whitelist()
```

## Compliance Engine

```python
from safeline.compliance import ComplianceEngine

engine = ComplianceEngine(config)

result = engine.check_rules(
    action_type="database_write",
    payload={"amount": 500000},
    context={"user_role": "analyst"}
)

# Check specific rules
tx_result = engine._check_transaction_amount(payload)
endpoint_result = engine._check_restricted_endpoints(payload)
rbac_result = engine._check_rbac(action_type, context)
```

## Audit Logger

```python
from safeline.audit import AuditLogger

logger = AuditLogger("logs/audit_trail.log")

# Log entry
audit_id = logger.log_entry(entry_dict)

# Retrieve entries
entries = logger.get_entries(filters)
denied_report = logger.get_denial_report()

# Verify integrity
is_valid = logger.verify_integrity()

# Export entries
logger.export_entries("export.json", filters)
```

## Configuration

### Compliance Rules
```json
{
  "compliance_rules": {
    "max_transaction_amount": 1000000,
    "max_daily_transfers": 5000000,
    "pii_sensitivity_level": "high",
    "restricted_endpoints": ["DELETE /api/users"],
    "required_approvals": {
      "external_transfer": ["manager", "compliance"]
    }
  }
}
```

### API Whitelist
```json
{
  "approved_endpoints": [
    {
      "method": "POST",
      "path": "/api/transactions",
      "requires_auth": true
    }
  ]
}
```

## Test Suite

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_compliance.py -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Run single test
pytest tests/test_compliance.py::TestComplianceEngine::test_transaction_amount_check_pass -v
```

## Examples

```bash
# Basic usage
python examples/basic_usage.py

# Advanced scenarios
python examples/advanced_usage.py

# OpenClaw integration
python examples/integration_demo.py
```

## Action Types

| Type | Description | Key Fields |
|------|-------------|-----------|
| `database_write` | Database write operation | `amount`, `table` |
| `external_call` | External API call | `api_endpoint`, `http_method` |
| `ledger_access` | Ledger access | `ledger_type` |
| `email_send` | Email sending | `recipient`, `subject`, `body` |

## JPMC Mock Rules

| Rule | Value |
|------|-------|
| Max single transaction | $1,000,000 |
| Max daily transfers | $5,000,000 |
| Max transactions/min | 10 |
| PII sensitivity | high/medium/low |
| Restricted endpoints | DELETE *, PATCH /ledger |
| Approved roles | analyst, manager, finance, admin |

## Environment Variables

```bash
# Audit secret (for HMAC signing)
export SAFELINE_AUDIT_SECRET="your-secret-here"

# Log path
export SAFELINE_LOG_PATH="/var/log/safeline/audit.log"
```

## Common Violations

- Transaction amount exceeds limit
- Restricted endpoint access
- Missing authorization header
- Unauthorized user role
- PII detected in payload
- External email with sensitive content
- Unauthorized API endpoint

## Integration Checklist

- [ ] Install SafeLine to OpenClaw skills directory
- [ ] Customize configs/jpmc_rules.json
- [ ] Initialize ComplianceGuardrail in agent
- [ ] Wrap agent.execute() with guardrail.validate_action()
- [ ] Handle ComplianceViolationError
- [ ] Set up audit log path
- [ ] Configure environment variables
- [ ] Run examples to verify setup
- [ ] Run test suite
- [ ] Deploy to production
- [ ] Set up monitoring/alerts
