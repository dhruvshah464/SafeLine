"""
Advanced Usage Example
Complex compliance scenarios and custom rules
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from guardrail import ComplianceGuardrail
from pii.detector import PIIDetector
from api_validator.validator import APIValidator


def main():
    """Run advanced usage examples."""
    
    print("=" * 60)
    print("SafeLine: Advanced Usage Example")
    print("=" * 60)
    
    # Initialize components
    config_path = str(Path(__file__).parent.parent / "configs" / "jpmc_rules.json")
    log_path = str(Path(__file__).parent.parent / "logs" / "audit_trail.log")
    
    guardrail = ComplianceGuardrail(
        config_path=config_path,
        audit_log_path=log_path
    )
    
    # Example 1: Batch transaction validation
    print("\n1. Batch Transaction Processing")
    print("-" * 40)
    
    transactions = [
        {"amount": 500000, "recipient": "acc-001"},
        {"amount": 250000, "recipient": "acc-002"},
        {"amount": 100000, "recipient": "acc-003"},
        {"amount": 2000000, "recipient": "acc-004"},  # Will exceed limit
    ]
    
    approved_count = 0
    for i, tx in enumerate(transactions, 1):
        result = guardrail.validate_action(
            action_type="database_write",
            payload=tx,
            context={
                "agent_id": "batch-agent",
                "user": "processor@jpmc.com",
                "user_role": "analyst"
            }
        )
        status = "✓" if result.approved else "✗"
        print(f"{i}. {status} ${tx['amount']:,} -> {tx['recipient']} "
              f"(Score: {result.compliance_score:.2f})")
        if result.approved:
            approved_count += 1
    
    print(f"Result: {approved_count}/{len(transactions)} approved")
    
    # Example 2: PII Detection and Masking
    print("\n2. PII Detection and Masking")
    print("-" * 40)
    
    detector = PIIDetector()
    
    sensitive_data = {
        "customer_name": "John Doe",
        "email": "john.doe@example.com",
        "ssn": "123-45-6789",
        "phone": "(555) 987-6543",
        "card_number": "4111-1111-1111-1111",
        "account_id": "1234567890"
    }
    
    findings = detector.detect_pii_in_payload(sensitive_data)
    print(f"PII Findings: {len(findings)} items detected")
    for finding in findings[:5]:
        print(f"  - {finding.pii_type}: {finding.location}")
    
    masked_data = detector.mask_pii_in_payload(sensitive_data)
    print(f"\nMasked Data:")
    print(f"  Email: {masked_data['email']}")
    print(f"  SSN: {masked_data['ssn']}")
    print(f"  Phone: {masked_data['phone']}")
    print(f"  Card: {masked_data['card_number']}")
    
    # Example 3: API Whitelist Management
    print("\n3. API Endpoint Management")
    print("-" * 40)
    
    validator = APIValidator(guardrail.config)
    
    print("Current Approved Endpoints:")
    for ep in validator.get_whitelist()[:3]:
        print(f"  {ep['method']} {ep['path']} (Auth: {ep.get('requires_auth', True)})")
    
    # Add custom endpoint
    print("\nAdding custom endpoint...")
    validator.add_endpoint_to_whitelist("POST", "/api/custom/process", requires_auth=True)
    
    result = validator.validate_api_call({
        "http_method": "POST",
        "api_endpoint": "/api/custom/process",
        "authorization": "Bearer token123..."
    })
    print(f"Custom endpoint validation: {result.approved}")
    
    # Example 4: Compliance Report Generation
    print("\n4. Compliance Report")
    print("-" * 40)
    
    # Generate report for today
    from datetime import datetime, timedelta
    
    today = datetime.utcnow()
    start = (today - timedelta(days=1)).isoformat()
    end = today.isoformat()
    
    report = guardrail.get_compliance_report(start, end)
    
    print(f"Period: {report['period']['start'][:10]} to {report['period']['end'][:10]}")
    print(f"Summary:")
    print(f"  Total Actions: {report['summary']['total_actions']}")
    print(f"  Approved: {report['summary']['approved']}")
    print(f"  Denied: {report['summary']['denied']}")
    print(f"  Approval Rate: {report['summary']['approval_rate']*100:.1f}%")
    print(f"  Avg Compliance Score: {report['summary']['average_compliance_score']:.2f}")
    print(f"  Audit Integrity: {report['summary']['audit_integrity_verified']}")
    
    if report.get('violations_by_type'):
        print(f"Top Violations:")
        for violation, count in list(report['violations_by_type'].items())[:3]:
            print(f"  {violation}: {count}")
    
    # Example 5: Audit Trail Export
    print("\n5. Audit Trail Export")
    print("-" * 40)
    
    denied_entries = guardrail.get_audit_trail({"decision": "DENIED"})
    print(f"Total denied actions: {len(denied_entries)}")
    
    if denied_entries:
        latest = denied_entries[-1]
        print(f"\nLatest Denial:")
        print(f"  Action: {latest.get('action_type')}")
        print(f"  Reason: {latest.get('violations', ['Unknown'])}")
    
    # Example 6: Audit Integrity Verification
    print("\n6. Audit Trail Integrity")
    print("-" * 40)
    
    integrity_ok = guardrail.verify_audit_integrity()
    print(f"Audit trail integrity verified: {integrity_ok}")
    
    total_entries = len(guardrail.get_audit_trail())
    print(f"Total logged entries: {total_entries}")


if __name__ == "__main__":
    main()
