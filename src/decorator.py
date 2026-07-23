"""
@axonic_guardrail Decorator
Intercepts function calls, evaluates payloads against JPMC compliance rules,
logs immutable audit entries, and blocks dangerous operations.
"""

import json
import sqlite3
import functools
from datetime import datetime
from typing import Callable, Any

from .compliance.engine import ComplianceEngine, Decision
from .pii.detector import PIIDetector
from .audit.escalation import EscalationManager


# ──────────────────────────────────────────────────────────────
# Default configuration
# ──────────────────────────────────────────────────────────────

DEFAULT_CONFIG = {
    "compliance_rules": {
        "max_transaction_amount": 500_000,  # Per the blueprint: $500k requires human approval
        "max_daily_transfers": 5_000_000,
        "pii_sensitivity_level": "high"
    }
}

DEFAULT_DB_PATH = "jpmc_mock.db"


# ──────────────────────────────────────────────────────────────
# Action-type inference
# ──────────────────────────────────────────────────────────────

def _infer_action_type(func_name: str) -> str:
    """Infer the action_type from the function name."""
    mapping = {
        "execute_transfer": "database_write",
        "send_client_summary": "email_send",
        "read_client_data": "database_read",
    }
    return mapping.get(func_name, "unknown")


def _build_payload(func_name: str, args: tuple, kwargs: dict) -> dict:
    """Build a compliance payload from function arguments."""
    payload = {"function": func_name, "args": list(args), "kwargs": kwargs}

    if func_name == "execute_transfer":
        # args: (client_id, amount, destination, ...)
        if len(args) >= 1:
            payload["client_id"] = args[0]
        if len(args) >= 2:
            payload["amount"] = args[1]
        if len(args) >= 3:
            payload["destination"] = args[2]
        payload["amount"] = kwargs.get("amount", payload.get("amount", 0))

    elif func_name == "send_client_summary":
        if len(args) >= 1:
            payload["client_id"] = args[0]
        if len(args) >= 2:
            payload["recipient"] = args[1]
        payload["recipient"] = kwargs.get("target_email", payload.get("recipient", ""))

        # Check for external email domains (compliance rule #1)
        recipient = payload.get("recipient", "")
        external_domains = ["gmail.com", "yahoo.com", "outlook.com", "protonmail.com"]
        if any(recipient.endswith(f"@{d}") for d in external_domains):
            payload["subject"] = "Client Account Summary"
            payload["body"] = "Contains confidential account balance and transaction data"

    return payload


def _build_context(user: str = "agent@jpmc.com", user_role: str = "analyst") -> dict:
    """Build execution context."""
    hour = datetime.utcnow().hour
    return {
        "user": user,
        "user_role": user_role,
        "is_after_hours": hour < 7 or hour > 19,
        "agent_id": "openclaw-agent-v1",
    }


# ──────────────────────────────────────────────────────────────
# Audit logging to SQLite
# ──────────────────────────────────────────────────────────────

def _log_to_sqlite(
    db_path: str,
    action: str,
    payload: dict,
    decision: str,
    reason: str,
    risk_score: int = 0,
    rule_ids: list = None,
    review_id: str = None
):
    """Write an immutable audit entry to the Axonic_Audit_Logs table."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO Axonic_Audit_Logs 
        (timestamp, action_attempted, payload, decision, reason, risk_score, rule_ids_triggered, review_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        datetime.utcnow().isoformat(),
        action,
        json.dumps(payload, default=str),
        decision,
        reason,
        risk_score,
        json.dumps(rule_ids or []),
        review_id
    ))

    conn.commit()
    conn.close()


# ──────────────────────────────────────────────────────────────
# The Decorator
# ──────────────────────────────────────────────────────────────

def axonic_guardrail(
    _func: Callable = None,
    *,
    config: dict = None,
    db_path: str = DEFAULT_DB_PATH,
    user: str = "agent@jpmc.com",
    user_role: str = "analyst"
):
    """
    Decorator that intercepts function calls and evaluates them against
    JPMC compliance rules before allowing execution.

    Usage:
        @axonic_guardrail
        def execute_transfer(client_id, amount, destination):
            ...

        @axonic_guardrail(user_role="intern")
        def risky_function(...):
            ...
    """
    effective_config = config or DEFAULT_CONFIG

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            func_name = func.__name__
            action_type = _infer_action_type(func_name)
            payload = _build_payload(func_name, args, kwargs)
            context = _build_context(user=user, user_role=user_role)

            # ── Compliance evaluation ──
            engine = ComplianceEngine(effective_config, db_path=db_path)
            pii_detector = PIIDetector()
            escalation = EscalationManager(db_path=db_path)

            result = engine.check_rules(action_type, payload, context)
            decision = result.decision
            if hasattr(decision, "value"):
                decision = decision.value

            risk_score = result.risk_score
            rule_ids = result.rule_ids_triggered
            explanations = list(result.explanations)

            # ── PII check on arguments ──
            pii_findings = pii_detector.detect_pii_in_payload(payload)
            if pii_findings:
                decision = "BLOCKED"
                explanations.append(
                    f"PII DETECTED: {len(pii_findings)} instance(s) found in payload"
                )
                rule_ids.append("PII_DETECTED")

            # ── Escalation pipeline ──
            review_id = None
            if decision == "REVIEW":
                review_id = escalation.escalate_action(
                    audit_id=f"DEC-{func_name}",
                    action_type=action_type,
                    payload=payload,
                    context=context,
                    risk_score=risk_score,
                    explanations=explanations
                )
                explanations.append(
                    f"ESCALATED: Assigned to compliance_officer (Review ID: {review_id})"
                )

            reason = " | ".join(explanations)

            # ── Audit log ──
            _log_to_sqlite(
                db_path=db_path,
                action=func_name,
                payload=payload,
                decision=decision,
                reason=reason,
                risk_score=risk_score,
                rule_ids=rule_ids,
                review_id=review_id
            )

            # ── Decision gate ──
            if decision == "APPROVED":
                print(f"  ✅ APPROVED  │ {func_name}  │ risk: {risk_score}")
                return func(*args, **kwargs)

            elif decision == "REVIEW":
                print(f"  🟡 REVIEW   │ {func_name}  │ risk: {risk_score}  │ {review_id}")
                print(f"              │ Held for compliance_officer review")
                return {
                    "status": "HELD_FOR_REVIEW",
                    "review_id": review_id,
                    "risk_score": risk_score,
                    "reason": reason
                }

            else:  # BLOCKED
                print(f"  🛑 BLOCKED  │ {func_name}  │ risk: {risk_score}")
                print(f"              │ {reason[:120]}")
                return {
                    "status": "BLOCKED",
                    "risk_score": risk_score,
                    "rule_ids_triggered": rule_ids,
                    "reason": reason
                }

        return wrapper

    # Support both @axonic_guardrail and @axonic_guardrail(...)
    if _func is not None:
        return decorator(_func)
    return decorator
