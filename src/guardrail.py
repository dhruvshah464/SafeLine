"""
SafeLine: Enterprise Compliance Guardrail for OpenClaw
Main guardrail orchestration and validation logic
"""

import json
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from .compliance.engine import ComplianceEngine
from .pii.detector import PIIDetector
from .api_validator.validator import APIValidator
from .audit.logger import AuditLogger
from .audit.escalation import EscalationManager


@dataclass
class ValidationResult:
    """Result of compliance validation"""
    approved: bool
    checks_performed: List[str]
    violations: List[str]
    warnings: List[str]
    audit_id: str
    timestamp: datetime
    compliance_score: float = 1.0
    decision: str = "APPROVED"
    risk_score: int = 0
    rule_ids_triggered: List[str] = None
    explanations: List[str] = None
    review_id: Optional[str] = None
    
    def __post_init__(self):
        if self.rule_ids_triggered is None:
            self.rule_ids_triggered = []
        if self.explanations is None:
            self.explanations = []


class ComplianceGuardrail:
    """
    Main compliance guardrail for OpenClaw agent actions.
    
    Intercepts, validates, and logs all sensitive agent operations against
    enterprise compliance rules, PII regulations, and API policies.
    """
    
    def __init__(self, config_path: str, audit_log_path: str, db_path: str = "jpmc_mock.db"):
        """
        Initialize compliance guardrail.
        
        Args:
            config_path: Path to JPMC compliance rules configuration
            audit_log_path: Path to immutable audit trail log
            db_path: Path to the SQLite database
        """
        self.config_path = Path(config_path)
        self.audit_log_path = Path(audit_log_path)
        self.db_path = Path(db_path)
        
        # Load configuration
        self.config = self._load_config(self.config_path)
        
        # Initialize subsystems
        self.compliance_engine = ComplianceEngine(self.config, db_path=str(self.db_path))
        self.pii_detector = PIIDetector()
        self.api_validator = APIValidator(self.config)
        self.audit_logger = AuditLogger(str(self.audit_log_path))
        self.escalation_manager = EscalationManager(db_path=str(self.db_path))
        
    def _load_config(self, config_path: Path) -> Dict[str, Any]:
        """Load compliance rules configuration."""
        if not config_path.exists():
            raise FileNotFoundError(f"Config not found: {config_path}")
        
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def validate_action(
        self,
        action_type: str,
        payload: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ValidationResult:
        """
        Validate an OpenClaw agent action against all compliance checks.
        
        Args:
            action_type: Type of action (database_write, external_call, ledger_access, email_send)
            payload: Action payload data
            context: Execution context (agent_id, user, etc.)
        
        Returns:
            ValidationResult with approval decision and details
        """
        audit_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()
        checks_performed = []
        violations = []
        warnings = []
        compliance_score = 1.0
        
        try:
            # 1. Compliance Rules Check
            check_name = "compliance_rules"
            checks_performed.append(check_name)
            compliance_result = self.compliance_engine.check_rules(
                action_type=action_type,
                payload=payload,
                context=context
            )
            
            # Initialize outputs from compliance engine
            risk_score = compliance_result.risk_score
            rule_ids_triggered = list(compliance_result.rule_ids_triggered)
            explanations = list(compliance_result.explanations)
            
            # Base decision from compliance rules
            decision = compliance_result.decision
            if hasattr(decision, 'value'):
                decision = decision.value
            
            if not compliance_result.passed:
                violations.extend(compliance_result.violations)
                compliance_score -= 0.3
            
            if compliance_result.warnings:
                warnings.extend(compliance_result.warnings)
            
            # 2. PII Detection Check
            check_name = "pii_detection"
            checks_performed.append(check_name)
            pii_findings = self.pii_detector.detect_pii_in_payload(payload)
            
            if pii_findings and self.config.get("compliance_rules", {}).get("pii_sensitivity_level") == "high":
                violations.append(f"PII detected: {len(pii_findings)} findings")
                explanations.append(f"VIOLATION: PII detected ({len(pii_findings)} findings)")
                compliance_score -= 0.25
                decision = "BLOCKED"
            elif pii_findings:
                warnings.append(f"PII detected but not blocked: {len(pii_findings)} findings")
                explanations.append(f"WARNING: PII detected but not blocked ({len(pii_findings)} findings)")
            
            # 3. API Validation Check
            check_name = "api_validation"
            checks_performed.append(check_name)
            if "api_endpoint" in payload or "api_call" in payload:
                api_result = self.api_validator.validate_api_call(payload)
                if not api_result.approved:
                    violations.extend(api_result.violations)
                    for v in api_result.violations:
                        explanations.append(f"VIOLATION: {v}")
                    compliance_score -= 0.25
                    decision = "BLOCKED"
                if api_result.warnings:
                    warnings.extend(api_result.warnings)
            
            # Determine overall approval
            # Count violations added AFTER the compliance engine
            engine_violation_count = len(compliance_result.violations) if not compliance_result.passed else 0
            extra_violations = len(violations) - engine_violation_count
            
            if decision == "REVIEW" and extra_violations > 0:
                # PII or API checks found additional problems — escalate to BLOCKED
                decision = "BLOCKED"
            elif decision == "APPROVED" and len(violations) > 0:
                # Engine approved but downstream checks found violations
                decision = "BLOCKED"
                
            approved = (decision == "APPROVED")
            review_id = None
            
            # Escalation Pipeline
            if decision == "REVIEW":
                review_id = self.escalation_manager.escalate_action(
                    audit_id=audit_id,
                    action_type=action_type,
                    payload=payload,
                    context=context,
                    risk_score=risk_score,
                    explanations=explanations
                )
                explanations.append(f"ACTION ESCALATED: Assigned to compliance_officer (Review ID: {review_id})")
            
            # 4. Log to audit trail
            audit_entry = {
                "audit_id": audit_id,
                "timestamp": timestamp.isoformat(),
                "action_type": action_type,
                "agent_id": context.get("agent_id", "unknown"),
                "requester": context.get("user", "unknown"),
                "checks": [
                    {
                        "name": check,
                        "passed": check not in violations
                    } for check in checks_performed
                ],
                "decision": decision,
                "risk_score": risk_score,
                "rule_ids_triggered": rule_ids_triggered,
                "explanations": explanations,
                "review_id": review_id,
                "violations": violations,
                "warnings": warnings,
                "payload_hash": self.audit_logger.hash_payload(payload),
                "compliance_score": max(0, compliance_score)
            }
            
            self.audit_logger.log_entry(audit_entry)
            
            return ValidationResult(
                approved=approved,
                checks_performed=checks_performed,
                violations=violations,
                warnings=warnings,
                audit_id=audit_id,
                timestamp=timestamp,
                compliance_score=max(0, compliance_score),
                decision=decision,
                risk_score=risk_score,
                rule_ids_triggered=rule_ids_triggered,
                explanations=explanations,
                review_id=review_id
            )
            
        except Exception as e:
            # Fail-safe: block on any error
            violations.append(f"Validation error: {str(e)}")
            
            audit_entry = {
                "audit_id": audit_id,
                "timestamp": timestamp.isoformat(),
                "action_type": action_type,
                "agent_id": context.get("agent_id", "unknown"),
                "requester": context.get("user", "unknown"),
                "checks": checks_performed,
                "decision": "DENIED",
                "error": str(e),
                "compliance_score": 0
            }
            
            self.audit_logger.log_entry(audit_entry)
            
            return ValidationResult(
                approved=False,
                checks_performed=checks_performed,
                violations=violations,
                warnings=warnings,
                audit_id=audit_id,
                timestamp=timestamp,
                compliance_score=0.0
            )
    
    def get_audit_trail(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Retrieve audit trail entries with optional filtering.
        
        Args:
            filters: Optional dict with filter criteria (decision, action_type, etc.)
        
        Returns:
            List of audit entries matching filters
        """
        return self.audit_logger.get_entries(filters)
    
    def verify_audit_integrity(self) -> bool:
        """
        Verify the integrity of the entire audit trail.
        
        Returns:
            True if audit trail is intact and unmodified
        """
        return self.audit_logger.verify_integrity()
    
    def get_compliance_report(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """
        Generate compliance report for date range.
        
        Args:
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
        
        Returns:
            Compliance statistics and summary
        """
        entries = self.audit_logger.get_entries({
            "date_range": (start_date, end_date)
        })
        
        total = len(entries)
        approved = sum(1 for e in entries if e.get("decision") == "APPROVED")
        denied = sum(1 for e in entries if e.get("decision") == "DENIED")
        avg_compliance_score = sum(e.get("compliance_score", 1) for e in entries) / max(1, total)
        
        violations_by_type = {}
        for entry in entries:
            if entry.get("decision") == "DENIED":
                for violation in entry.get("violations", []):
                    violations_by_type[violation] = violations_by_type.get(violation, 0) + 1
        
        return {
            "period": {
                "start": start_date,
                "end": end_date
            },
            "summary": {
                "total_actions": total,
                "approved": approved,
                "denied": denied,
                "approval_rate": approved / max(1, total),
                "average_compliance_score": avg_compliance_score
            },
            "violations_by_type": violations_by_type,
            "audit_integrity_verified": self.verify_audit_integrity()
        }
