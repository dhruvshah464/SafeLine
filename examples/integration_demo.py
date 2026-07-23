"""
OpenClaw Integration Example
How to integrate SafeLine compliance guardrail with OpenClaw agents
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.guardrail import ComplianceGuardrail


class OpenClawComplianceMiddleware:
    """
    Middleware for OpenClaw agents to enforce compliance.
    Wraps all agent action executions with SafeLine validation.
    """
    
    def __init__(self, config_path: str, audit_log_path: str):
        """Initialize compliance middleware."""
        self.guardrail = ComplianceGuardrail(config_path, audit_log_path)
    
    async def intercept_action(self, action):
        """
        Intercept and validate OpenClaw action before execution.
        
        Args:
            action: OpenClaw action object with type, payload, context
        
        Returns:
            Validated action or raises ComplianceViolationError
        
        Raises:
            ComplianceViolationError: If action violates compliance rules
        """
        # Validate action
        result = self.guardrail.validate_action(
            action_type=action.type,
            payload=action.payload,
            context={
                "agent_id": action.agent_id,
                "user": action.requester,
                "user_role": action.user_role
            }
        )
        
        # Check approval
        if not result.approved:
            raise ComplianceViolationError(
                f"Action blocked by compliance guardrail. "
                f"Violations: {'; '.join(result.violations)}. "
                f"Audit ID: {result.audit_id}"
            )
        
        # Log approval
        print(f"✓ Action approved by compliance guardrail (Audit: {result.audit_id})")
        
        return action
    
    def get_audit_trail(self, filters=None):
        """Get audit trail entries."""
        return self.guardrail.get_audit_trail(filters)
    
    def verify_integrity(self):
        """Verify audit trail integrity."""
        return self.guardrail.verify_audit_integrity()


class ComplianceViolationError(Exception):
    """Raised when action violates compliance rules."""
    pass


# ============================================================================
# Example: Integrating with OpenClaw Agent
# ============================================================================

class MockOpenClawAction:
    """Mock OpenClaw action object for demonstration."""
    
    def __init__(self, action_type, payload, agent_id, requester, user_role="analyst"):
        self.type = action_type
        self.payload = payload
        self.agent_id = agent_id
        self.requester = requester
        self.user_role = user_role


class MockOpenClawAgent:
    """Mock OpenClaw agent with compliance middleware."""
    
    def __init__(self, agent_id, config_path, audit_log_path):
        self.agent_id = agent_id
        self.compliance = OpenClawComplianceMiddleware(config_path, audit_log_path)
    
    async def execute_action(self, action):
        """
        Execute action with compliance check.
        
        In production, this would execute the actual action.
        """
        # Intercept and validate
        validated_action = await self.compliance.intercept_action(action)
        
        # In production, would execute:
        # return await super().execute_action(validated_action)
        
        return {"status": "executed", "audit_id": validated_action.audit_id}


async def main():
    """Demonstrate OpenClaw integration."""
    
    print("=" * 70)
    print("SafeLine: OpenClaw Integration Example")
    print("=" * 70)
    
    # Initialize agent with compliance middleware
    config_path = str(Path(__file__).parent.parent / "configs" / "jpmc_rules.json")
    log_path = str(Path(__file__).parent.parent / "logs" / "audit_trail.log")
    
    agent = MockOpenClawAgent(
        agent_id="compliance-agent-001",
        config_path=config_path,
        audit_log_path=log_path
    )
    
    # Example 1: Approved action
    print("\n1. Executing Approved Action")
    print("-" * 70)
    
    action = MockOpenClawAction(
        action_type="database_write",
        payload={"table": "transactions", "amount": 500000},
        agent_id="compliance-agent-001",
        requester="trader@jpmc.com",
        user_role="analyst"
    )
    
    try:
        result = await agent.execute_action(action)
        print(f"✓ Action executed successfully")
        print(f"  Result: {result}")
    except ComplianceViolationError as e:
        print(f"✗ Action blocked: {e}")
    
    # Example 2: Blocked action - transaction too large
    print("\n2. Executing Blocked Action (Amount Exceeds Limit)")
    print("-" * 70)
    
    action = MockOpenClawAction(
        action_type="database_write",
        payload={"table": "transactions", "amount": 5000000},
        agent_id="compliance-agent-001",
        requester="trader@jpmc.com",
        user_role="analyst"
    )
    
    try:
        result = await agent.execute_action(action)
        print(f"✓ Action executed successfully")
    except ComplianceViolationError as e:
        print(f"✗ Action blocked by guardrail")
        print(f"  Reason: {e}")
    
    # Example 3: Blocked action - unauthorized role
    print("\n3. Executing Blocked Action (Unauthorized Role)")
    print("-" * 70)
    
    action = MockOpenClawAction(
        action_type="ledger_access",
        payload={"ledger_type": "general_ledger"},
        agent_id="compliance-agent-001",
        requester="intern@jpmc.com",
        user_role="intern"
    )
    
    try:
        result = await agent.execute_action(action)
        print(f"✓ Action executed successfully")
    except ComplianceViolationError as e:
        print(f"✗ Action blocked by guardrail")
        print(f"  Reason: {e}")
    
    # Audit summary
    print("\n" + "=" * 70)
    print("Audit Trail Summary")
    print("=" * 70)
    
    entries = agent.compliance.get_audit_trail()
    approved = sum(1 for e in entries if e.get("decision") == "APPROVED")
    denied = sum(1 for e in entries if e.get("decision") == "DENIED")
    
    print(f"Total actions: {len(entries)}")
    print(f"Approved: {approved}")
    print(f"Denied: {denied}")
    print(f"Audit integrity: {agent.compliance.verify_integrity()}")
    
    print("\n" + "=" * 70)


# ============================================================================
# Integration with OpenClaw Skills System
# ============================================================================

"""
To integrate SafeLine as an OpenClaw skill:

1. Place SafeLine in your OpenClaw skills directory:
   openclaw/skills/safeline/

2. Add to your OpenClaw agent initialization:

   from skills.safeline import ComplianceGuardrail
   
   guardrail = ComplianceGuardrail(
       config_path="skills/safeline/configs/jpmc_rules.json",
       audit_log_path="logs/compliance_audit.log"
   )

3. Wrap agent execution:

   async def run_agent_with_compliance(agent, action):
       result = guardrail.validate_action(
           action_type=action.type,
           payload=action.payload,
           context=action.context
       )
       
       if result.approved:
           return await agent.execute(action)
       else:
           raise ComplianceViolation(result.violations)

4. Monitor compliance:

   # Get all denied actions
   denied = guardrail.get_audit_trail({"decision": "DENIED"})
   
   # Generate compliance report
   report = guardrail.get_compliance_report(
       start_date="2026-04-01T00:00:00Z",
       end_date="2026-04-30T23:59:59Z"
   )
"""


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
