# SafeLine Deployment Guide

## Quick Start

### 1. Installation

```bash
# Clone SafeLine into OpenClaw skills directory
cp -r safeLine /path/to/openclaw/skills/

# Install dependencies
cd /path/to/openclaw/skills/safeLine
pip install -r requirements.txt
```

### 2. Configuration

Edit `configs/jpmc_rules.json` to match your organization's compliance requirements:

```json
{
  "compliance_rules": {
    "max_transaction_amount": 1000000,
    "max_daily_transfers": 5000000,
    "restricted_endpoints": ["DELETE /api/users", ...],
    "pii_sensitivity_level": "high"
  }
}
```

### 3. Initialize in Your Agent

```python
from skills.safeline import ComplianceGuardrail

guardrail = ComplianceGuardrail(
    config_path="skills/safeline/configs/jpmc_rules.json",
    audit_log_path="logs/compliance_audit.log"
)
```

### 4. Validate Actions

```python
result = guardrail.validate_action(
    action_type="database_write",
    payload=agent_action.payload,
    context={"user": "trader@jpmc.com", "user_role": "analyst"}
)

if result.approved:
    execute_action(agent_action)
else:
    log_violation(result)
```

---

## Detailed Configuration

### Compliance Rules

Configure your organization's rules in `configs/jpmc_rules.json`:

```json
{
  "compliance_rules": {
    "max_transaction_amount": 1000000,
    "max_daily_transfers": 5000000,
    "max_transactions_per_minute": 10,
    "pii_sensitivity_level": "high|medium|low",
    "restricted_endpoints": [
      "DELETE /api/users",
      "DELETE /api/ledger",
      "PATCH /api/ledger"
    ],
    "required_approvals": {
      "external_transfer": ["manager", "compliance"],
      "database_delete": ["dba", "compliance"],
      "api_modification": ["tech_lead", "security"]
    }
  }
}
```

### API Whitelist

Add approved endpoints to `configs/jpmc_rules.json`:

```json
{
  "approved_endpoints": [
    {
      "method": "GET",
      "path": "/api/transactions",
      "requires_auth": true
    },
    {
      "method": "POST",
      "path": "/api/transactions",
      "requires_auth": true
    }
  ]
}
```

---

## Running Examples

### Basic Usage

```bash
python examples/basic_usage.py
```

Output:
```
============================================================
SafeLine: Basic Usage Example
============================================================

1. Valid Transaction
----------------------------------------
✓ Approved: True
  Audit ID: 550e8400-e29b-41d4-a716-446655440000
  Compliance Score: 1.00
  Checks: compliance_rules, pii_detection, api_validation
```

### Advanced Scenarios

```bash
python examples/advanced_usage.py
```

### OpenClaw Integration

```bash
python examples/integration_demo.py
```

---

## Testing

Run the comprehensive test suite:

```bash
# All tests
pytest tests/ -v

# Specific modules
pytest tests/test_compliance.py -v
pytest tests/test_pii_detection.py -v
pytest tests/test_api_validation.py -v
pytest tests/test_audit_trail.py -v

# With coverage
pytest tests/ --cov=src --cov-report=html
```

---

## Monitoring & Audit

### View Audit Trail

```python
from skills.safeline import ComplianceGuardrail

guardrail = ComplianceGuardrail(...)

# Get all entries
all_entries = guardrail.get_audit_trail()

# Filter by decision
denied = guardrail.get_audit_trail({"decision": "DENIED"})
approved = guardrail.get_audit_trail({"decision": "APPROVED"})

# Filter by action type
writes = guardrail.get_audit_trail({"action_type": "database_write"})
```

### Generate Compliance Report

```python
# Report for date range
report = guardrail.get_compliance_report(
    start_date="2026-04-01T00:00:00Z",
    end_date="2026-04-30T23:59:59Z"
)

print(f"Approval Rate: {report['summary']['approval_rate']*100:.1f}%")
print(f"Avg Compliance Score: {report['summary']['average_compliance_score']:.2f}")
```

### Verify Audit Integrity

```python
# Verify no tampering
integrity_ok = guardrail.verify_audit_integrity()

if integrity_ok:
    print("✓ Audit trail is intact")
else:
    print("✗ Audit trail tampering detected!")
    alert_security_team()
```

---

## Production Deployment Checklist

- [ ] Review and customize `configs/jpmc_rules.json`
- [ ] Set `SAFELINE_AUDIT_SECRET` environment variable (use secure vault)
- [ ] Configure audit log storage (consider encryption at rest)
- [ ] Set up log rotation for audit trail
- [ ] Configure monitoring/alerting for denied actions
- [ ] Test with sample data
- [ ] Run full test suite: `pytest tests/ -v`
- [ ] Train users on compliance rules
- [ ] Schedule regular audit trail reviews
- [ ] Document custom compliance rules
- [ ] Set up audit trail backups

### Environment Variables

```bash
# Set audit secret (use strong value in production)
export SAFELINE_AUDIT_SECRET="your-secure-secret-key-here"

# Set log path
export SAFELINE_LOG_PATH="/var/log/safeline/audit_trail.log"
```

---

## Troubleshooting

### Issue: "Config not found"

**Solution**: Verify config path is correct and file exists:
```bash
ls -la configs/jpmc_rules.json
```

### Issue: "Invalid authentication token"

**Solution**: Ensure Bearer token is at least 20 characters:
```python
# Valid: long token
authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Invalid: short token
authorization = "Bearer short"
```

### Issue: "Audit trail tampering detected"

**Solution**: Check:
1. Verify file permissions: `chmod 600 logs/audit_trail.log`
2. Check for manual file edits
3. Review access logs to identify who modified the file

### Issue: All actions denied

**Check**:
1. Verify user role is in allowed list
2. Check transaction amounts against limits
3. Review PII sensitivity level setting

---

## Architecture

SafeLine intercepts at four levels:

```
OpenClaw Agent Action
    ↓
┌─────────────────────────────┐
│ Compliance Rules Engine     │ ← Checks transaction limits, role access
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ PII Detection Engine        │ ← Scans for SSN, credit cards, emails
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ API Validation Engine       │ ← Whitelist check, auth enforcement
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ Immutable Audit Logger      │ ← Cryptographic signing, tamper detection
└─────────────────────────────┘
    ↓
Decision: ALLOW / DENY → Action Executed / Blocked
```

---

## Security Considerations

1. **Audit Secret**: Store `SAFELINE_AUDIT_SECRET` in secure vault (AWS Secrets Manager, HashiCorp Vault, etc.)
2. **File Permissions**: Set audit log file permissions to `600` (read/write owner only)
3. **Encryption**: Consider encrypting audit logs at rest
4. **Access Control**: Restrict who can read audit logs
5. **Backup**: Regular backups of audit trail for compliance
6. **Monitoring**: Alert on denied actions and verification failures

---

## Customization

### Adding Custom Compliance Rules

Edit `src/compliance/engine.py` and add a method:

```python
def _check_custom_rule(self, payload):
    """Custom compliance check."""
    violations = []
    
    if payload.get("custom_field") == "forbidden_value":
        violations.append("Custom rule violated")
    
    return ComplianceCheckResult(
        passed=len(violations) == 0,
        violations=violations,
        warnings=[]
    )
```

Then call it from `check_rules()`:

```python
custom_check = self._check_custom_rule(payload)
violations.extend(custom_check.violations)
```

### Adding Custom PII Patterns

Edit `src/pii/detector.py` and add to `PIIPatterns`:

```python
CUSTOM_PATTERN = re.compile(r"your-pattern-here")
```

---

## Support & Maintenance

### Regular Tasks

- **Daily**: Monitor audit trail for unusual activity
- **Weekly**: Generate compliance reports
- **Monthly**: Review and audit denied actions
- **Quarterly**: Update compliance rules based on policy changes
- **Annually**: Full security audit and penetration testing

### Getting Help

1. Check logs: `tail -f logs/audit_trail.log`
2. Review tests: `pytest tests/ -v`
3. Run examples: `python examples/basic_usage.py`
4. Check documentation: See README.md and SKILL.md

---

## Next Steps

1. ✓ Install SafeLine
2. ✓ Configure compliance rules
3. ✓ Run tests
4. ✓ Deploy to development
5. ✓ Validate with sample actions
6. ✓ Deploy to staging
7. ✓ Monitor and refine rules
8. ✓ Deploy to production
9. ✓ Set up monitoring and alerts
10. ✓ Schedule regular audits

**SafeLine is now ready to protect your OpenClaw agents with enterprise-grade compliance!**
