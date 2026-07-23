# SafeLine Architecture & Design

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw Agent Framework                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  Agent Action Req   │
                    │ (type, payload)     │
                    └─────────────────────┘
                              ↓
        ┌─────────────────────────────────────────────┐
        │      SafeLine Compliance Guardrail          │
        │                                             │
        │  ┌─────────────────────────────────────┐   │
        │  │  1. Compliance Rules Engine         │   │
        │  │  ├─ Transaction Limits              │   │
        │  │  ├─ Restricted Endpoints            │   │
        │  │  ├─ RBAC Validation                 │   │
        │  │  └─ Email Restrictions              │   │
        │  └─────────────────────────────────────┘   │
        │              ↓                              │
        │  ┌─────────────────────────────────────┐   │
        │  │  2. PII Detection Engine            │   │
        │  │  ├─ SSN Detection                   │   │
        │  │  ├─ Credit Card Detection           │   │
        │  │  ├─ Email Detection                 │   │
        │  │  ├─ Phone Detection                 │   │
        │  │  └─ Account ID Detection            │   │
        │  └─────────────────────────────────────┘   │
        │              ↓                              │
        │  ┌─────────────────────────────────────┐   │
        │  │  3. API Validation Engine           │   │
        │  │  ├─ Endpoint Whitelist              │   │
        │  │  ├─ Auth Enforcement                │   │
        │  │  ├─ Schema Validation               │   │
        │  │  └─ Rate Limiting                   │   │
        │  └─────────────────────────────────────┘   │
        │              ↓                              │
        │  ┌─────────────────────────────────────┐   │
        │  │  4. Immutable Audit Logger          │   │
        │  │  ├─ HMAC-SHA256 Signing             │   │
        │  │  ├─ Tamper Detection                │   │
        │  │  ├─ Entry Filtering                 │   │
        │  │  └─ Compliance Reports              │   │
        │  └─────────────────────────────────────┘   │
        │              ↓                              │
        │      ┌──────────────────────┐              │
        │      │ APPROVED / DENIED    │              │
        │      │ (with Audit ID)      │              │
        │      └──────────────────────┘              │
        └─────────────────────────────────────────────┘
                        ↓ (if approved)
                ┌──────────────────────┐
                │  Execute Action      │
                │ (Agent, External API)│
                └──────────────────────┘
```

## Module Dependency Graph

```
┌──────────────────────────┐
│  safeline/__init__.py    │
│  (Main Entry Point)      │
└──────────────┬───────────┘
               │
               ↓
┌──────────────────────────┐
│  guardrail.py            │
│  (ComplianceGuardrail)   │
└──────┬─────────┬──────┬──┘
       │         │      │
       ↓         ↓      ↓
    ┌──────┐  ┌──────┐  ┌────────┐  ┌─────────┐
    │Compl.│  │PII   │  │API     │  │Audit    │
    │Engine│  │Detect│  │Validat.│  │Logger   │
    └──────┘  └──────┘  └────────┘  └─────────┘
      │         │         │           │
      ↓         ↓         ↓           ↓
   jpmc_    patterns.  whitelist.  crypto.
   rules.py  py         py          py
```

## Data Flow

### Action Validation Flow

```
Input Payload
├── action_type: string
├── payload: dict
│   ├── amount: float
│   ├── recipient: string
│   ├── api_endpoint: string
│   └── [custom fields]
└── context: dict
    ├── agent_id: string
    ├── user: string
    └── user_role: string

                    ↓

            Check Compliance Rules
            ├─ Transaction Limits: ✓/✗
            ├─ Restricted Endpoints: ✓/✗
            ├─ RBAC: ✓/✗
            └─ Email Restrictions: ✓/✗

                    ↓

            Scan for PII
            ├─ SSN: ✓/✗
            ├─ Credit Card: ✓/✗
            ├─ Email: ✓/✗
            ├─ Phone: ✓/✗
            └─ Account ID: ✓/✗

                    ↓

            Validate API
            ├─ Endpoint Whitelist: ✓/✗
            ├─ Authentication: ✓/✗
            └─ Schema: ✓/✗

                    ↓

            Create Audit Entry
            ├─ audit_id: UUID
            ├─ timestamp: ISO-8601
            ├─ checks: List[str]
            ├─ decision: APPROVED/DENIED
            ├─ violations: List[str]
            ├─ signature: HMAC-SHA256
            └─ payload_hash: SHA256

                    ↓

            ValidationResult
            ├── approved: bool
            ├── audit_id: string
            ├── compliance_score: float
            ├── violations: List[string]
            ├── warnings: List[string]
            ├── checks_performed: List[string]
            └── timestamp: datetime
```

## Compliance Rules Hierarchy

```
JPMC Compliance Framework
│
├── Financial Controls
│   ├── Transaction Limits
│   │   ├── Single: $1,000,000
│   │   ├── Daily: $5,000,000
│   │   └── Per Minute: 10 transactions
│   │
│   └── Velocity Checks
│       └── Rate limiting per account
│
├── Data Protection
│   ├── PII Detection
│   │   ├── SSN: XXX-XX-XXXX
│   │   ├── Credit Card: Luhn-validated
│   │   ├── Email: user@domain.com
│   │   ├── Phone: (XXX) XXX-XXXX
│   │   └── Account: 10-16 digits
│   │
│   └── Data Classification
│       ├── Public
│       ├── Internal
│       ├── Confidential
│       └── PII
│
├── Access Control
│   ├── Role-Based Access
│   │   ├── Analyst: Write, Read
│   │   ├── Manager: Approve, Write, Read
│   │   ├── Finance: Ledger access
│   │   └── Compliance: Audit review
│   │
│   └── Ledger Access
│       └── Restricted to: Finance, Compliance, Admin
│
├── API Security
│   ├── Endpoint Whitelist
│   │   ├── GET /api/transactions
│   │   ├── POST /api/transactions
│   │   └── GET /api/accounts
│   │
│   ├── Authentication
│   │   ├── Bearer Token (JWT)
│   │   └── Basic Auth
│   │
│   └── Restricted Operations
│       ├── DELETE operations require approval
│       └── PATCH /ledger requires approval
│
└── Communication Control
    ├── External Email
    │   ├── Allowed: Standard content
    │   └── Blocked: Confidential keywords
    │
    └── Internal Email
        └── Allowed: All
```

## PII Detection Pattern Hierarchy

```
PII Detection Engine
│
├── SSN Pattern
│   ├── Format: XXX-XX-XXXX
│   ├── Regex: \b\d{3}-\d{2}-\d{4}\b
│   └── False Positive Check: Exclude all-same-digits
│
├── Credit Card Pattern
│   ├── Visa: 4XXXXXXXXXXXXXXXXX
│   ├── Mastercard: 5[1-5]XXXXXXXXXXXXXXX
│   ├── Amex: 3[47]XXXXXXXXXXXXX
│   ├── Luhn Check: Validates checksum
│   └── False Positive: Reject if Luhn fails
│
├── Email Pattern
│   ├── Format: user@domain.com
│   ├── Regex: [A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}
│   └── Masking: u***@domain.com
│
├── Phone Pattern
│   ├── Formats: (XXX) XXX-XXXX, XXX-XXX-XXXX
│   ├── Regex: (?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}
│   └── Masking: (***) ***-XXXX
│
├── Account Number Pattern
│   ├── Length: 10-16 digits
│   ├── Regex: \b\d{10,16}\b
│   └── Confidence: Medium (high false positive rate)
│
└── Routing Number Pattern
    ├── Length: Exactly 9 digits
    ├── Regex: \b\d{9}\b
    └── Note: Additional validation in production
```

## Audit Trail Security Model

```
Immutable Audit Trail Architecture

Entry Creation
├── Generate UUID (audit_id)
├── Get current timestamp
├── Record action details
├── Serialize to JSON
└── Calculate signature

                    ↓

HMAC-SHA256 Signing
├── Message: Entry JSON (sorted keys)
├── Key: SAFELINE_AUDIT_SECRET
├── Algorithm: SHA256
└── Output: 64-char hex signature

                    ↓

Audit Entry Storage
{
  "entry": {
    "audit_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-04-22T10:30:45.123Z",
    "action_type": "database_write",
    "decision": "APPROVED",
    "violations": [],
    "compliance_score": 0.98
  },
  "signature": "a3f5d8e9c2b1f4a6...",
  "log_timestamp": "2026-04-22T10:30:45.500Z"
}

                    ↓

Integrity Verification
├── For each entry:
│   ├── Extract JSON and signature
│   ├── Recalculate HMAC-SHA256
│   └── Compare signatures
├── All entries verified: ✓
└── Any mismatch detected: ✗ TAMPERING
```

## Configuration Schema

```
configs/jpmc_rules.json

{
  "compliance_rules": {
    "max_transaction_amount": number (dollars),
    "max_daily_transfers": number (dollars),
    "max_transactions_per_minute": number (count),
    "pii_sensitivity_level": "high" | "medium" | "low",
    "restricted_endpoints": [
      "METHOD /path"
    ],
    "required_approvals": {
      "operation_name": ["role1", "role2"]
    }
  },
  "approved_endpoints": [
    {
      "method": "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
      "path": "/api/path/with/*/wildcards",
      "requires_auth": boolean
    }
  ]
}
```

## Test Coverage Map

```
SafeLine Test Suite Coverage

Compliance Engine (8 tests)
├─ Transaction Amount Checks
│  ├─ Valid amount
│  ├─ Exceeds limit
│  └─ Near limit warning
├─ Endpoint Restrictions
├─ HTTP Method Validation
├─ RBAC Validation
├─ Email Restrictions
└─ Full Rules Integration

PII Detection (10 tests)
├─ Individual Type Detection
│  ├─ SSN
│  ├─ Credit Card
│  ├─ Email
│  ├─ Phone
│  └─ Account Number
├─ Multiple Types
├─ Nested Payload Scanning
├─ Masking (all types)
├─ Summary Generation
└─ False Positive Detection

API Validation (9 tests)
├─ Endpoint Whitelist
├─ Endpoint Not in Whitelist
├─ Missing Authentication
├─ Invalid Token
├─ Valid Token
├─ Path Matching (exact)
├─ Path Matching (wildcard)
├─ Add to Whitelist
├─ Remove from Whitelist
└─ Get Whitelist

Audit Trail (11 tests)
├─ Entry Logging
├─ Entry Signature
├─ Signature Verification
├─ Payload Hashing
├─ Empty Log Integrity
├─ Valid Log Integrity
├─ Get Entries (no filter)
├─ Get Entries (filtered)
├─ Denial Report
├─ Export Entries
└─ Compliance Statistics
```

## Integration Points with OpenClaw

```
OpenClaw Agent Lifecycle

1. Agent Initialization
   └─> Initialize ComplianceGuardrail

2. Action Planning
   └─> (No compliance interaction)

3. Action Preparation
   ├─> Guardrail.validate_action()
   ├─> Receive ValidationResult
   └─> Decision: Proceed or Abort

4. Action Execution
   ├─> If approved: Execute action
   └─> If denied: Raise ComplianceViolationError

5. Action Logging
   └─> Audit trail automatically logged

6. Monitoring
   └─> Review audit trail, generate reports
```

## Performance Characteristics

```
Operation | Complexity | Typical Time
-----------|-----------|-------------
Compliance check | O(n) | < 1ms
PII scan | O(n) | < 5ms
API validation | O(m) | < 1ms
Audit logging | O(1) | < 2ms
Integrity check | O(k) | < 100ms
-----------|-----------|-------------
Total validation | O(n+m+k) | < 10ms

Where:
n = payload size
m = endpoint count
k = audit log entries
```

## Security Layers

```
Multiple layers of protection:

1. Input Validation
   └─> Ensure valid JSON and required fields

2. Compliance Rules
   └─> Check against business rules

3. PII Protection
   └─> Detect and prevent data leakage

4. API Security
   └─> Restrict to approved endpoints only

5. Authentication
   └─> Enforce valid auth tokens

6. Audit Logging
   └─> Record all actions with signatures

7. Integrity Verification
   └─> Detect tampering with HMAC checks

8. Fail-Safe Defaults
   └─> Block by default on any error
```

---

This architecture ensures comprehensive compliance enforcement while maintaining performance, security, and auditability.
