# SafeLine: Enterprise Compliance Guardrail for OpenClaw

![SafeLine Logo](https://img.shields.io/badge/SafeLine-Compliance%20Guardrail-blue)
![Python 3.9+](https://img.shields.io/badge/Python-3.9+-green)
![License](https://img.shields.io/badge/License-Apache%202.0-orange)

SafeLine is a production-grade compliance interception layer for OpenClaw agents, providing enterprise-level financial compliance enforcement. It intercepts sensitive agent actions, validates them against JPMC compliance rules, detects PII, validates API calls, and maintains an immutable audit trail.

## 🎯 Key Features

- **Real-time Action Interception**: Intercepts all sensitive OpenClaw agent actions before execution
- **Compliance Rule Engine**: Evaluates actions against configurable JPMC compliance rules
- **PII Detection**: Automatically detects and masks SSN, credit cards, emails, phone numbers, and account IDs
- **API Validation**: Whitelist-based API endpoint validation with authentication enforcement
- **Immutable Audit Trail**: Cryptographically signed audit logs with tamper detection
- **Fail-Safe Design**: Defaults to blocking on any validation error
- **Mock Rules**: Fully mockable JPMC compliance rules for testing and demo environments

## 📋 Requirements

- Python 3.9+
- OpenClaw (compatible with latest version)
- Axonic layer for skill integration
- No external API dependencies (all mock/local)

## 🚀 Quick Start

### Installation

```bash
# Clone SafeLine into your OpenClaw skills directory
cp -r safeLine /path/to/openclaw/skills/

# Install dependencies
pip install -r requirements.txt
```

### Basic Usage

```python
from safeline import ComplianceGuardrail

# Initialize with JPMC rules
guardrail = ComplianceGuardrail(
    config_path="configs/jpmc_rules.json",
    audit_log_path="logs/audit_trail.log"
)

# Validate an agent action
result = guardrail.validate_action(
    action_type="database_write",
    payload={
        "table": "transactions",
        "data": {"amount": 50000, "recipient_email": "user@example.com"}
    },
    context={"agent_id": "agent-001", "user": "trader@jpmc.com"}
)

if result.approved:
    print("✓ Action approved - proceeding")
else:
    print(f"✗ Action blocked: {result.violations}")
```

### Configuration

Create `configs/jpmc_rules.json`:

```json
{
  "compliance_rules": {
    "max_transaction_amount": 1000000,
    "max_daily_transfers": 5000000,
    "restricted_endpoints": [
      "DELETE /api/users",
      "PATCH /api/ledger"
    ],
    "pii_sensitivity_level": "high",
    "required_approvals": {
      "external_transfer": ["manager", "compliance"],
      "database_delete": ["dba", "compliance"]
    }
  }
}
```

## 📁 Project Structure

```
safeLine/
├── SKILL.md                    # OpenClaw skill specification
├── README.md                   # This file
├── requirements.txt            # Python dependencies
├── src/
│   ├── __init__.py
│   ├── guardrail.py           # Main ComplianceGuardrail class
│   ├── compliance/
│   │   ├── __init__.py
│   │   ├── engine.py          # Compliance rules engine
│   │   ├── jpmc_rules.py      # JPMC-specific rules
│   │   └── validators.py      # Rule validators
│   ├── pii/
│   │   ├── __init__.py
│   │   ├── detector.py        # PII detection engine
│   │   ├── patterns.py        # PII regex patterns
│   │   └── masker.py          # PII masking utilities
│   ├── api_validator/
│   │   ├── __init__.py
│   │   ├── whitelist.py       # API whitelist engine
│   │   └── validator.py       # Request/response validation
│   └── audit/
│       ├── __init__.py
│       ├── logger.py          # Audit trail logger
│       ├── crypto.py          # Cryptographic signing
│       └── integrity.py       # Integrity verification
├── configs/
│   ├── jpmc_rules.json        # JPMC compliance rules
│   └── api_whitelist.json     # Approved API endpoints
├── examples/
│   ├── basic_usage.py         # Basic guardrail usage
│   ├── advanced_usage.py      # Advanced scenarios
│   └── integration_demo.py    # OpenClaw integration example
└── tests/
    ├── test_compliance.py     # Compliance engine tests
    ├── test_pii_detection.py  # PII detection tests
    ├── test_api_validation.py # API validation tests
    ├── test_audit_trail.py    # Audit trail tests
    └── fixtures.py            # Test fixtures and mocks
```

## 🔒 Compliance Rules

SafeLine enforces the following mock JPMC compliance rules:

### 1. Transaction Limits
- **Single Transaction**: Cannot exceed $1,000,000
- **Daily Aggregate**: Cannot exceed $5,000,000
- **Velocity Check**: Max 10 transactions per minute per account

### 2. Data Access Control
- **Role-Based**: Only authorized roles can access sensitive datasets
- **Classification**: PII, Confidential, Internal, Public
- **Audit Logging**: All access logged and immutable

### 3. External API Calls
- **Whitelist Only**: Only pre-approved endpoints allowed
- **Authentication**: Must include valid authorization header
- **Rate Limiting**: Standard API rate limits enforced

### 4. Database Operations
- **Write Operations**: Require transaction validation
- **Delete Operations**: Require manager and compliance approval
- **Updates**: Require before/after logging

### 5. PII Protection
- **Automatic Detection**: SSN, Credit Card, Email, Phone, Account ID
- **Redaction**: PII redacted in logs and responses
- **Incident Logging**: PII detection triggers compliance alert

## 🛡️ PII Detection

SafeLine detects and manages:

```python
from safeline.pii import PIIDetector

detector = PIIDetector()

# Detect PII in text
text = "Customer SSN: 123-45-6789, Email: john@example.com"
findings = detector.detect_pii(text)

# Mask PII
masked = detector.mask_pii(text)
# Output: "Customer SSN: XXX-XX-6789, Email: j***@example.com"
```

## 📊 Audit Trail

Every action is logged with immutable audit trail:

```json
{
  "audit_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-04-22T10:30:45.123Z",
  "action_type": "database_write",
  "agent_id": "agent-001",
  "requester": "trader@jpmc.com",
  "checks": [
    {
      "name": "transaction_limits",
      "status": "PASSED",
      "details": {"amount": 50000, "limit": 1000000}
    },
    {
      "name": "pii_detection",
      "status": "PASSED",
      "details": {"pii_found": 0}
    },
    {
      "name": "api_validation",
      "status": "PASSED",
      "endpoint": "/api/transactions"
    }
  ],
  "decision": "APPROVED",
  "payload_hash": "sha256:a3f5d...",
  "signature": "base64-encoded-signature..."
}
```

### Verify Audit Integrity

```python
from safeline.audit import AuditLogger

logger = AuditLogger("logs/audit_trail.log")

# Verify no tampered entries
integrity_check = logger.verify_integrity()
print(f"Audit trail integrity: {integrity_check}")
```

## 🧪 Testing

Run comprehensive test suite:

```bash
# All tests
pytest tests/ -v

# Specific test modules
pytest tests/test_compliance.py -v
pytest tests/test_pii_detection.py -v
pytest tests/test_api_validation.py -v
pytest tests/test_audit_trail.py -v

# With coverage
pytest tests/ --cov=src --cov-report=html
```

## 📚 Examples

### Example 1: Basic Compliance Check

```python
from safeline import ComplianceGuardrail

guardrail = ComplianceGuardrail(
    config_path="configs/jpmc_rules.json",
    audit_log_path="logs/audit_trail.log"
)

# Check transaction
result = guardrail.validate_action(
    action_type="database_write",
    payload={"amount": 500000},
    context={"user": "trader@jpmc.com"}
)

print(f"Approved: {result.approved}")
print(f"Audit ID: {result.audit_id}")
```

### Example 2: PII Detection

```python
from safeline.pii import PIIDetector

detector = PIIDetector()
text = "SSN: 123-45-6789, CC: 4111-1111-1111-1111"
findings = detector.detect_pii(text)

for finding in findings:
    print(f"Found {finding.pii_type}: {finding.location}")
```

### Example 3: Audit Trail Review

```python
from safeline.audit import AuditLogger

logger = AuditLogger("logs/audit_trail.log")

# Get all denied actions
denied = logger.get_audit_trail({"decision": "DENIED"})
for entry in denied:
    print(f"Denied action: {entry.action_type} - {entry.violations}")
```

## 🔧 API Reference

### ComplianceGuardrail

```python
class ComplianceGuardrail:
    def __init__(self, config_path: str, audit_log_path: str):
        """Initialize the compliance guardrail."""
    
    def validate_action(self, action_type: str, payload: dict, context: dict) -> ValidationResult:
        """Validate an action against all compliance rules."""
    
    def get_audit_trail(self, filters: Optional[dict] = None) -> List[AuditEntry]:
        """Retrieve audit trail entries with optional filtering."""
    
    def verify_audit_integrity(self) -> bool:
        """Verify the integrity of the audit trail."""
    
    def get_compliance_report(self, start_date: str, end_date: str) -> dict:
        """Generate compliance report for date range."""
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

## 🚀 Deployment Guide

### 1. Install in OpenClaw

```bash
cp -r safeLine /path/to/openclaw/skills/
```

### 2. Configure Compliance Rules

Edit `configs/jpmc_rules.json` with your organization's rules.

### 3. Initialize Guardrail in Agent

```python
from skills.safeline import ComplianceGuardrail

guardrail = ComplianceGuardrail(
    config_path="skills/safeline/configs/jpmc_rules.json",
    audit_log_path="logs/compliance_audit.log"
)
```

### 4. Integrate with Agent Actions

```python
async def execute_action(action):
    result = guardrail.validate_action(
        action_type=action.type,
        payload=action.payload,
        context=action.context
    )
    
    if result.approved:
        return await agent.execute(action)
    else:
        raise ComplianceViolationError(result.violations)
```

## 📈 Monitoring

Track compliance metrics:

```bash
# View audit trail
tail -f logs/audit_trail.log

# Check compliance statistics
python scripts/compliance_stats.py

# Verify audit integrity
python scripts/verify_integrity.py
```

## 🤝 Contributing

SafeLine is an open framework. To extend with your own rules:

1. Create custom rule validators in `src/compliance/validators.py`
2. Add configuration to `configs/jpmc_rules.json`
3. Add tests in `tests/`
4. Document in SKILL.md

## 📜 License

Apache License 2.0 - See LICENSE file for details

## ⚠️ Disclaimer

SafeLine provides mock JPMC compliance rules for demonstration and testing purposes. For production use with real financial data, customize rules to match your organization's actual compliance requirements and consult with your compliance and legal teams.

## 🔗 Related Resources

- [OpenClaw Documentation](https://openclaw.dev)
- [Axonic Integration Layer](https://axonic.dev)
- [JPMC Compliance Standards](https://internal.jpmc.com/compliance)
- [Financial Compliance Best Practices](https://www.sec.gov/rules)

## 📞 Support

For issues and questions:
- GitHub Issues: [SafeLine Issues](https://github.com/safeline/issues)
- Documentation: [SafeLine Docs](https://safeline-docs.readthedocs.io)
- Email: safeline@example.com
