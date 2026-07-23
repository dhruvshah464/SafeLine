"""
Basic Usage Example
Simple compliance guardrail demo
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from guardrail import ComplianceGuardrail


def main():
    """Run basic usage example."""
    
    print("=" * 60)
    print("SafeLine: Basic Usage Example")
    print("=" * 60)
    
    # Initialize guardrail with JPMC rules
    config_path = str(Path(__file__).parent.parent / "configs" / "jpmc_rules.json")
    log_path = str(Path(__file__).parent.parent / "logs" / "audit_trail.log")
    
    guardrail = ComplianceGuardrail(
        config_path=config_path,
        audit_log_path=log_path
    )
    
    # Example 1: Valid transaction
    print("\n1. Valid Transaction")
    print("-" * 40)
    
    result = guardrail.validate_action(
        action_type="database_write",
        payload={
            "table": "transactions",
            "amount": 50000,
            "recipient": "account-456"
        },
        context={
            "agent_id": "agent-001",
            "user": "trader@jpmc.com",
            "user_role": "analyst"
        }
    )
    
    print(f"✓ Approved: {result.approved}")
    print(f"  Audit ID: {result.audit_id}")
    print(f"  Compliance Score: {result.compliance_score:.2f}")
    print(f"  Checks: {', '.join(result.checks_performed)}")
    
    # Example 2: Transaction exceeding limit
    print("\n2. Transaction Exceeding Limit")
    print("-" * 40)
    
    result = guardrail.validate_action(
        action_type="database_write",
        payload={
            "table": "transactions",
            "amount": 2000000,  # Exceeds $1M limit
            "recipient": "account-789"
        },
        context={
            "agent_id": "agent-002",
            "user": "trader@jpmc.com",
            "user_role": "analyst"
        }
    )
    
    print(f"✗ Approved: {result.approved}")
    print(f"  Violations: {result.violations}")
    print(f"  Compliance Score: {result.compliance_score:.2f}")
    
    # Example 3: Unauthorized role
    print("\n3. Unauthorized User Role")
    print("-" * 40)
    
    result = guardrail.validate_action(
        action_type="ledger_access",
        payload={"ledger_type": "general"},
        context={
            "agent_id": "agent-003",
            "user": "junior_analyst@jpmc.com",
            "user_role": "intern"
        }
    )
    
    print(f"✗ Approved: {result.approved}")
    print(f"  Violations: {result.violations}")
    print(f"  Compliance Score: {result.compliance_score:.2f}")
    
    # Example 4: PII Detection
    print("\n4. Data with PII")
    print("-" * 40)
    
    result = guardrail.validate_action(
        action_type="database_write",
        payload={
            "table": "customers",
            "email": "john.doe@example.com",
            "ssn": "123-45-6789",
            "phone": "(555) 123-4567"
        },
        context={
            "agent_id": "agent-004",
            "user": "data_analyst@jpmc.com",
            "user_role": "analyst"
        }
    )
    
    print(f"✗ Approved: {result.approved}")
    print(f"  PII Found: Yes")
    print(f"  Violations: {result.violations}")
    
    # Example 5: API call with missing auth
    print("\n5. API Call Without Authentication")
    print("-" * 40)
    
    result = guardrail.validate_action(
        action_type="external_call",
        payload={
            "http_method": "POST",
            "api_endpoint": "/api/transactions",
            "data": {"amount": 100000}
        },
        context={
            "agent_id": "agent-005",
            "user": "integration@jpmc.com",
            "user_role": "analyst"
        }
    )
    
    print(f"✗ Approved: {result.approved}")
    print(f"  Violations: {result.violations}")
    
    # Example 6: Valid API call with auth
    print("\n6. Valid API Call with Authentication")
    print("-" * 40)
    
    result = guardrail.validate_action(
        action_type="external_call",
        payload={
            "http_method": "GET",
            "api_endpoint": "/api/transactions",
            "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        },
        context={
            "agent_id": "agent-006",
            "user": "integration@jpmc.com",
            "user_role": "analyst"
        }
    )
    
    print(f"✓ Approved: {result.approved}")
    print(f"  Compliance Score: {result.compliance_score:.2f}")
    
    # Display audit summary
    print("\n" + "=" * 60)
    print("Audit Trail Summary")
    print("=" * 60)
    
    entries = guardrail.get_audit_trail()
    approved_count = sum(1 for e in entries if e.get("decision") == "APPROVED")
    denied_count = sum(1 for e in entries if e.get("decision") == "DENIED")
    
    print(f"Total actions logged: {len(entries)}")
    print(f"Approved: {approved_count}")
    print(f"Denied: {denied_count}")
    print(f"Audit integrity verified: {guardrail.verify_audit_integrity()}")


if __name__ == "__main__":
    main()
