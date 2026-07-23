"""
Compliance Rules Engine
Evaluates actions against JPMC compliance rules with risk scoring and LLM fallback
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Tuple
from enum import Enum

from .classifier import DataClassifier, LEVEL_LABELS


class Decision(str, Enum):
    """Compliance decision outcomes"""
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"
    REVIEW = "REVIEW"


@dataclass
class RuleViolation:
    """Represents a rule violation with metadata"""
    rule_id: str
    message: str
    severity: str  # "critical", "high", "medium", "low"
    risk_contribution: int  # 0-100 points to overall risk score


@dataclass
class ComplianceCheckResult:
    """Enhanced result of a compliance check with risk scoring"""
    decision: str  # APPROVED, BLOCKED, REVIEW
    passed: bool
    violations: List[str]
    warnings: List[str]
    risk_score: int  # 0-100
    explanations: List[str] = field(default_factory=list)
    rule_ids_triggered: List[str] = field(default_factory=list)
    llm_reasoning: str = ""  # LLM fallback explanation for ambiguous cases



class JPMCRules:
    """Mock JPMC compliance rules with rule IDs"""
    
    # Transaction Limits
    MAX_SINGLE_TRANSACTION = 1_000_000
    MAX_DAILY_TRANSFERS = 5_000_000
    MAX_TRANSACTIONS_PER_MINUTE = 10
    
    # Rule IDs for tracking
    RULE_IDS = {
        "TXN_AMOUNT_CRITICAL": {"rule_id": "TXN_AMOUNT_CRITICAL", "severity": "critical", "risk": 100},
        "TXN_AMOUNT_WARNING": {"rule_id": "TXN_AMOUNT_WARNING", "severity": "medium", "risk": 35},
        "ENDPOINT_RESTRICTED": {"rule_id": "ENDPOINT_RESTRICTED", "severity": "critical", "risk": 100},
        "METHOD_DELETE": {"rule_id": "METHOD_DELETE", "severity": "high", "risk": 75},
        "METHOD_PATCH_LEDGER": {"rule_id": "METHOD_PATCH_LEDGER", "severity": "high", "risk": 80},
        "RBAC_UNAUTHORIZED": {"rule_id": "RBAC_UNAUTHORIZED", "severity": "critical", "risk": 100},
        "LEDGER_UNAUTHORIZED": {"rule_id": "LEDGER_UNAUTHORIZED", "severity": "critical", "risk": 100},
        "EMAIL_EXTERNAL_SENSITIVE": {"rule_id": "EMAIL_EXTERNAL_SENSITIVE", "severity": "high", "risk": 85},
    }
    
    # Restricted Operations
    RESTRICTED_ENDPOINTS = [
        "DELETE /api/users",
        "DELETE /api/ledger",
        "PATCH /api/ledger",
        "DELETE /api/accounts"
    ]
    
    # Data Classifications
    DATA_CLASSIFICATIONS = {
        "pii": ["email", "ssn", "credit_card", "phone"],
        "confidential": ["salary", "medical", "account_number"],
        "internal": ["strategy", "personnel", "financial_reports"],
        "public": ["press_release", "public_data"]
    }
    
    # Required Approvals
    REQUIRED_APPROVALS = {
        "external_transfer": ["manager", "compliance"],
        "database_delete": ["dba", "compliance"],
        "api_modification": ["tech_lead", "security"],
        "ledger_access": ["finance_lead"]
    }


class RiskScorer:
    """
    Context-aware risk scoring system.
    Calculates risk scores (0-100) based on violations and context.
    """
    
    # Risk thresholds
    LOW_RISK_THRESHOLD = 30
    MEDIUM_RISK_THRESHOLD = 60
    HIGH_RISK_THRESHOLD = 85
    
    # Context multipliers
    CONTEXT_MULTIPLIERS = {
        "after_hours": 1.2,  # Increase risk for off-hours operations
        "batch_operation": 0.9,  # Slightly reduce for batch (more scrutiny already)
        "external_recipient": 1.3,  # Increase for external targets
        "sensitive_data": 1.5,  # Increase for sensitive data
        "unusual_amount": 1.2,  # Increase for unusual amounts
    }
    
    def __init__(self):
        """Initialize risk scorer"""
        self.violation_scores = {}
    
    def calculate_risk_score(
        self,
        violations: List[RuleViolation],
        warnings: List[str],
        context: Dict[str, Any]
    ) -> int:
        """
        Calculate overall risk score (0-100) based on violations and context.
        
        Args:
            violations: List of rule violations
            warnings: List of warning messages
            context: Execution context for multipliers
        
        Returns:
            Risk score 0-100
        """
        if not violations:
            # Low risk from warnings only
            warning_contribution = min(len(warnings) * 5, 20)
            return warning_contribution
        
        # Sum violation contributions
        total_risk = sum(v.risk_contribution for v in violations)
        
        # Apply context multipliers
        multiplier = self._calculate_context_multiplier(context)
        adjusted_risk = int(total_risk * multiplier)
        
        # Cap at 100
        return min(adjusted_risk, 100)
    
    def _calculate_context_multiplier(self, context: Dict[str, Any]) -> float:
        """Calculate risk multiplier based on context."""
        multiplier = 1.0
        
        # Check for after-hours operation
        if context.get("is_after_hours", False):
            multiplier *= self.CONTEXT_MULTIPLIERS["after_hours"]
        
        # Check for external recipients
        if context.get("has_external_recipient", False):
            multiplier *= self.CONTEXT_MULTIPLIERS["external_recipient"]
        
        # Check for sensitive data
        if context.get("contains_sensitive_data", False):
            multiplier *= self.CONTEXT_MULTIPLIERS["sensitive_data"]
        
        # Check for unusual amount
        if context.get("unusual_amount", False):
            multiplier *= self.CONTEXT_MULTIPLIERS["unusual_amount"]
        
        return multiplier
    
    def get_risk_level(self, risk_score: int) -> str:
        """Get risk level name from score."""
        if risk_score >= self.HIGH_RISK_THRESHOLD:
            return "CRITICAL"
        elif risk_score >= self.MEDIUM_RISK_THRESHOLD:
            return "HIGH"
        elif risk_score >= self.LOW_RISK_THRESHOLD:
            return "MEDIUM"
        else:
            return "LOW"


class LLMFallback:
    """
    Mock LLM-based reasoning for ambiguous compliance cases.
    In production, would integrate with actual LLM like GPT-4.
    """
    
    def __init__(self):
        """Initialize LLM fallback system"""
        self.decision_patterns = {
            "high_amount_new_recipient": "Require additional verification for new recipient with large amount",
            "unusual_time_operation": "Unusual operation time - recommend manager review",
            "edge_case_action": "Action doesn't clearly match existing rules - recommend compliance review",
            "borderline_risk": "Risk score near decision boundary - recommend human review",
            "multiple_flags": "Multiple minor violations - recommend compliance team review",
        }
    
    def should_invoke(
        self,
        risk_score: int,
        violation_count: int,
        decision: str
    ) -> bool:
        """
        Determine if LLM reasoning should be invoked.
        
        Args:
            risk_score: Current risk score
            violation_count: Number of violations
            decision: Current decision
        
        Returns:
            True if LLM reasoning should be invoked
        """
        # Invoke LLM for borderline cases
        if 50 <= risk_score <= 70:
            return True
        
        # Invoke for multiple ambiguous violations
        if violation_count >= 2 and risk_score < 80:
            return True
        
        # Invoke for REVIEW decisions to help reasoning
        if decision == Decision.REVIEW:
            return True
        
        return False
    
    def reason_about_action(
        self,
        action_type: str,
        payload: Dict[str, Any],
        context: Dict[str, Any],
        rule_violations: List[str],
        risk_score: int
    ) -> Tuple[str, str]:
        """
        Use mock LLM to reason about ambiguous case.
        
        Args:
            action_type: Type of action
            payload: Action payload
            context: Execution context
            rule_violations: List of violations found
            risk_score: Current risk score
        
        Returns:
            Tuple of (recommendation, reasoning)
        """
        # Mock LLM reasoning - returns reasoning based on patterns
        reasoning = self._generate_reasoning(
            action_type, payload, context, rule_violations, risk_score
        )
        
        # Determine recommendation
        recommendation = self._determine_recommendation(risk_score, len(rule_violations))
        
        return recommendation, reasoning
    
    def _generate_reasoning(
        self,
        action_type: str,
        payload: Dict[str, Any],
        context: Dict[str, Any],
        rule_violations: List[str],
        risk_score: int
    ) -> str:
        """Generate mock LLM reasoning."""
        reasoning_parts = []
        
        # Analyze action type and payload
        if action_type == "database_write":
            amount = payload.get("amount", 0)
            if amount > 500000:
                reasoning_parts.append("Large transaction amount detected")
            if "new_recipient" in payload:
                reasoning_parts.append("New recipient in transaction")
        
        # Analyze context
        if context.get("is_after_hours"):
            reasoning_parts.append("Action requested during off-hours")
        
        if context.get("user_role") == "intern":
            reasoning_parts.append("Operation by junior staff - requires oversight")
        
        # Analyze risk factors
        if risk_score >= 60:
            reasoning_parts.append("Multiple risk factors present")
        
        if len(rule_violations) > 1:
            reasoning_parts.append(f"Multiple rule violations: {', '.join(rule_violations[:2])}")
        
        reasoning = ". ".join(reasoning_parts) + "." if reasoning_parts else "Ambiguous case requires review."
        
        return reasoning
    
    def _determine_recommendation(self, risk_score: int, violation_count: int) -> str:
        """Determine recommendation based on analysis."""
        if risk_score >= 80 or violation_count >= 3:
            return "BLOCK_RECOMMEND"
        elif risk_score >= 60 or violation_count >= 2:
            return "REVIEW_RECOMMEND"
        else:
            return "APPROVE_RECOMMEND"



class ComplianceEngine:
    """
    Advanced compliance engine with risk scoring and LLM fallback.
    Evaluates actions against rules, calculates risk scores, and provides AI-assisted reasoning.
    """
    
    def __init__(self, config: Dict[str, Any], db_path: str = "jpmc_mock.db"):
        """Initialize compliance engine with configuration."""
        self.config = config
        self.db_path = db_path
        self.rules = config.get("compliance_rules", {})
        self.rbac_config = config.get("rbac", {})
        self.risk_scorer = RiskScorer()
        self.llm_fallback = LLMFallback()
        self.data_classifier = DataClassifier(config)
    
    def check_rules(
        self,
        action_type: str,
        payload: Dict[str, Any],
        context: Dict[str, Any]
    ) -> ComplianceCheckResult:
        """
        Check action against all compliance rules with risk scoring and LLM fallback.
        
        Args:
            action_type: Type of action
            payload: Action payload
            context: Execution context
        
        Returns:
            Enhanced ComplianceCheckResult with risk scoring and decision
        """
        violations = []
        warnings = []
        rule_violations_with_metadata = []
        rule_ids_triggered = []
        
        # 1. Transaction Amount Check
        if action_type == "database_write":
            amount_check = self._check_transaction_amount(payload)
            violations.extend(amount_check.violations)
            warnings.extend(amount_check.warnings)
            rule_ids_triggered.extend(amount_check.rule_ids_triggered)
            rule_violations_with_metadata.extend(amount_check.rule_violations_with_metadata)

            # 1b. Daily Aggregate Transaction Limit Check
            daily_check = self._check_daily_aggregate(payload, context)
            violations.extend(daily_check.violations)
            warnings.extend(daily_check.warnings)
            rule_ids_triggered.extend(daily_check.rule_ids_triggered)
            rule_violations_with_metadata.extend(daily_check.rule_violations_with_metadata)
        
        # 2. Restricted Endpoint Check
        if action_type == "external_call":
            endpoint_check = self._check_restricted_endpoints(payload)
            violations.extend(endpoint_check.violations)
            warnings.extend(endpoint_check.warnings)
            rule_ids_triggered.extend(endpoint_check.rule_ids_triggered)
            rule_violations_with_metadata.extend(endpoint_check.rule_violations_with_metadata)
        
        # 3. API Method Check
        method_check = self._check_restricted_methods(payload)
        violations.extend(method_check.violations)
        warnings.extend(method_check.warnings)
        rule_ids_triggered.extend(method_check.rule_ids_triggered)
        rule_violations_with_metadata.extend(method_check.rule_violations_with_metadata)
        
        # 4. Role-Based Access Control
        rbac_check = self._check_rbac(action_type, context)
        violations.extend(rbac_check.violations)
        warnings.extend(rbac_check.warnings)
        rule_ids_triggered.extend(rbac_check.rule_ids_triggered)
        rule_violations_with_metadata.extend(rbac_check.rule_violations_with_metadata)
        
        # 5. Ledger Access Check
        if action_type == "ledger_access":
            ledger_check = self._check_ledger_access(context)
            violations.extend(ledger_check.violations)
            warnings.extend(ledger_check.warnings)
            rule_ids_triggered.extend(ledger_check.rule_ids_triggered)
            rule_violations_with_metadata.extend(ledger_check.rule_violations_with_metadata)
        
        # 6. Email Send Check
        if action_type == "email_send":
            email_check = self._check_email_send(payload)
            violations.extend(email_check.violations)
            warnings.extend(email_check.warnings)
            rule_ids_triggered.extend(email_check.rule_ids_triggered)
            rule_violations_with_metadata.extend(email_check.rule_violations_with_metadata)
        
        # 7. Data Classification Check
        is_external = context.get("has_external_recipient", False)
        user_role_for_class = context.get("user_role", "intern")
        allowed, class_violations, class_risk = self.data_classifier.check_access(
            payload, user_role_for_class, is_external
        )
        if not allowed:
            violations.extend(class_violations)
            for cv in class_violations:
                rule_ids_triggered.append("DATA_CLASSIFICATION")
                rule_violations_with_metadata.append(
                    RuleViolation(
                        rule_id="DATA_CLASSIFICATION",
                        message=cv,
                        severity="critical",
                        risk_contribution=class_risk
                    )
                )
        
        # 8. Action Velocity Check
        velocity_check = self._check_velocity(payload, context)
        violations.extend(velocity_check.violations)
        warnings.extend(velocity_check.warnings)
        rule_ids_triggered.extend(velocity_check.rule_ids_triggered)
        rule_violations_with_metadata.extend(velocity_check.rule_violations_with_metadata)

        # Calculate risk score
        risk_score = self.risk_scorer.calculate_risk_score(
            rule_violations_with_metadata, 
            warnings, 
            context
        )
        
        # Determine initial decision
        decision = self._determine_decision(len(violations), risk_score)
        
        # Generate explanations
        explanations = self._generate_explanations(
            violations, warnings, risk_score, context
        )
        
        # Invoke LLM fallback for ambiguous cases
        llm_reasoning = ""
        if self.llm_fallback.should_invoke(risk_score, len(violations), decision):
            recommendation, llm_reasoning = self.llm_fallback.reason_about_action(
                action_type, payload, context, violations, risk_score
            )
            # Update decision if LLM recommends it
            if recommendation == "BLOCK_RECOMMEND" and decision != Decision.BLOCKED:
                decision = Decision.REVIEW
            elif recommendation == "REVIEW_RECOMMEND" and decision == Decision.APPROVED:
                decision = Decision.REVIEW
        
        # Final decision
        passed = decision == Decision.APPROVED
        
        return ComplianceCheckResult(
            decision=decision,
            passed=passed,
            violations=violations,
            warnings=warnings,
            risk_score=risk_score,
            explanations=explanations,
            rule_ids_triggered=rule_ids_triggered,
            llm_reasoning=llm_reasoning
        )
    
    def evaluate(
        self,
        action_type: str,
        payload: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate an action against compliance rules, calculate context-aware risk,
        and fall back to LLM reasoning for ambiguous cases.
        
        Returns the formatted dictionary as requested.
        """
        result = self.check_rules(action_type, payload, context)
        
        decision_val = result.decision.value if isinstance(result.decision, Decision) else result.decision
        
        return {
            "decision": decision_val,
            "risk_score": result.risk_score,
            "explanations": result.explanations,
            "rule_ids_triggered": result.rule_ids_triggered
        }
    
    def _determine_decision(self, violation_count: int, risk_score: int) -> str:
        """
        Determine compliance decision based on violations and risk score.
        
        Args:
            violation_count: Number of critical violations
            risk_score: Risk score 0-100
        
        Returns:
            Decision (APPROVED, BLOCKED, or REVIEW)
        """
        if violation_count > 0:
            # Has critical violations
            if risk_score >= 85 or violation_count >= 2:
                return Decision.BLOCKED
            else:
                return Decision.REVIEW
        elif risk_score >= 60:
            # No violations but elevated risk
            return Decision.REVIEW
        else:
            # Low risk, no violations
            return Decision.APPROVED
    
    def _generate_explanations(
        self,
        violations: List[str],
        warnings: List[str],
        risk_score: int,
        context: Dict[str, Any]
    ) -> List[str]:
        """Generate human-readable explanations for the decision."""
        explanations = []
        
        # Add violation explanations
        for violation in violations:
            explanations.append(f"VIOLATION: {violation}")
        
        # Add warning explanations
        for warning in warnings:
            explanations.append(f"WARNING: {warning}")
        
        # Add risk score explanation
        risk_level = self.risk_scorer.get_risk_level(risk_score)
        explanations.append(f"Risk Assessment: {risk_level} ({risk_score}/100)")
        
        # Add context explanations
        if context.get("is_after_hours"):
            explanations.append("Note: Operation requested during off-hours")
        
        if context.get("user_role") in ["intern", "junior"]:
            explanations.append("Note: Operation by junior staff - increased scrutiny applied")
        
        return explanations
    
    def _check_transaction_amount(self, payload: Dict[str, Any]) -> ComplianceCheckResult:
        """Check transaction amount limits with risk metadata."""
        violations = []
        warnings = []
        rule_ids = []
        rule_violations_metadata = []
        
        amount = payload.get("amount", 0)
        max_single = self.rules.get("max_transaction_amount", JPMCRules.MAX_SINGLE_TRANSACTION)
        
        if amount > max_single:
            violations.append(
                f"Transaction amount ${amount:,.0f} exceeds limit ${max_single:,.0f}"
            )
            rule_ids.append("TXN_AMOUNT_CRITICAL")
            rule_violations_metadata.append(
                RuleViolation(
                    rule_id="TXN_AMOUNT_CRITICAL",
                    message=f"Transaction ${amount:,.0f} exceeds ${max_single:,.0f}",
                    severity="critical",
                    risk_contribution=100
                )
            )
        elif amount > max_single * 0.8:
            warnings.append(
                f"Transaction amount ${amount:,.0f} is {amount/max_single*100:.1f}% of limit"
            )
            rule_ids.append("TXN_AMOUNT_WARNING")
            rule_violations_metadata.append(
                RuleViolation(
                    rule_id="TXN_AMOUNT_WARNING",
                    message=f"Transaction near limit: {amount/max_single*100:.1f}%",
                    severity="medium",
                    risk_contribution=35
                )
            )
        
        result = ComplianceCheckResult(
            decision=Decision.APPROVED,
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            risk_score=0,
            rule_ids_triggered=rule_ids
        )
        result.rule_violations_with_metadata = rule_violations_metadata
        return result
    
    def _check_restricted_endpoints(self, payload: Dict[str, Any]) -> ComplianceCheckResult:
        """Check for restricted endpoint access with risk metadata."""
        violations = []
        warnings = []
        rule_ids = []
        rule_violations_metadata = []
        
        endpoint = payload.get("api_endpoint", "")
        restricted = self.rules.get("restricted_endpoints", JPMCRules.RESTRICTED_ENDPOINTS)
        
        for restricted_ep in restricted:
            if restricted_ep.lower() in endpoint.lower():
                violations.append(f"Endpoint {endpoint} is restricted")
                rule_ids.append("ENDPOINT_RESTRICTED")
                rule_violations_metadata.append(
                    RuleViolation(
                        rule_id="ENDPOINT_RESTRICTED",
                        message=f"Endpoint {endpoint} is restricted",
                        severity="critical",
                        risk_contribution=100
                    )
                )
                break
        
        result = ComplianceCheckResult(
            decision=Decision.APPROVED,
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            risk_score=0,
            rule_ids_triggered=rule_ids
        )
        result.rule_violations_with_metadata = rule_violations_metadata
        return result
    
    def _check_restricted_methods(self, payload: Dict[str, Any]) -> ComplianceCheckResult:
        """Check for restricted HTTP methods with risk metadata."""
        violations = []
        warnings = []
        rule_ids = []
        rule_violations_metadata = []
        
        method = payload.get("http_method", "").upper()
        api_endpoint = payload.get("api_endpoint", "")
        
        # DELETE operations require approval
        if method == "DELETE":
            violations.append(f"{method} method requires manager and compliance approval")
            rule_ids.append("METHOD_DELETE")
            rule_violations_metadata.append(
                RuleViolation(
                    rule_id="METHOD_DELETE",
                    message=f"DELETE method {api_endpoint} requires approval",
                    severity="high",
                    risk_contribution=75
                )
            )
        
        # PATCH on sensitive endpoints requires approval
        if method == "PATCH" and "/ledger" in api_endpoint.lower():
            violations.append(f"{method} {api_endpoint} requires approval")
            rule_ids.append("METHOD_PATCH_LEDGER")
            rule_violations_metadata.append(
                RuleViolation(
                    rule_id="METHOD_PATCH_LEDGER",
                    message=f"PATCH on ledger endpoint requires approval",
                    severity="high",
                    risk_contribution=80
                )
            )
        
        result = ComplianceCheckResult(
            decision=Decision.APPROVED,
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            risk_score=0,
            rule_ids_triggered=rule_ids
        )
        result.rule_violations_with_metadata = rule_violations_metadata
        return result
    
    def _check_rbac(self, action_type: str, context: Dict[str, Any]) -> ComplianceCheckResult:
        """Check role-based access control using config-driven permissions matrix."""
        violations = []
        warnings = []
        rule_ids = []
        rule_violations_metadata = []
        
        user_role = context.get("user_role", "user")
        roles_cfg = self.rbac_config.get("roles", {})
        
        if roles_cfg:
            # Config-driven RBAC
            role_def = roles_cfg.get(user_role, {})
            permissions = role_def.get("permissions", [])
            if permissions and action_type not in permissions:
                allowed_roles = [
                    r for r, d in roles_cfg.items()
                    if action_type in d.get("permissions", [])
                ]
                violations.append(
                    f"User role '{user_role}' not authorized for {action_type}. "
                    f"Required: {', '.join(allowed_roles)}"
                )
                rule_ids.append("RBAC_UNAUTHORIZED")
                rule_violations_metadata.append(
                    RuleViolation(
                        rule_id="RBAC_UNAUTHORIZED",
                        message=f"Role {user_role} not authorized for {action_type}",
                        severity="critical",
                        risk_contribution=100
                    )
                )
            elif not role_def:
                # Unknown role — block
                violations.append(f"Unknown role '{user_role}'")
                rule_ids.append("RBAC_UNAUTHORIZED")
                rule_violations_metadata.append(
                    RuleViolation(
                        rule_id="RBAC_UNAUTHORIZED",
                        message=f"Unknown role {user_role}",
                        severity="critical",
                        risk_contribution=100
                    )
                )
        else:
            # Fallback hardcoded RBAC
            role_requirements = {
                "database_write": ["analyst", "manager", "admin"],
                "ledger_access": ["finance", "compliance", "admin"],
                "external_call": ["analyst", "manager", "admin"],
                "email_send": ["analyst", "manager", "admin"]
            }
            required_roles = role_requirements.get(action_type, [])
            if required_roles and user_role not in required_roles:
                violations.append(
                    f"User role '{user_role}' not authorized for {action_type}. "
                    f"Required: {', '.join(required_roles)}"
                )
                rule_ids.append("RBAC_UNAUTHORIZED")
                rule_violations_metadata.append(
                    RuleViolation(
                        rule_id="RBAC_UNAUTHORIZED",
                        message=f"Role {user_role} not authorized for {action_type}",
                        severity="critical",
                        risk_contribution=100
                    )
                )
        
        result = ComplianceCheckResult(
            decision=Decision.APPROVED,
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            risk_score=0,
            rule_ids_triggered=rule_ids
        )
        result.rule_violations_with_metadata = rule_violations_metadata
        return result
    
    def _check_ledger_access(self, context: Dict[str, Any]) -> ComplianceCheckResult:
        """Check ledger access permissions with risk metadata."""
        violations = []
        warnings = []
        rule_ids = []
        rule_violations_metadata = []
        
        user_role = context.get("user_role", "")
        
        if user_role not in ["finance", "compliance", "admin", "auditor"]:
            violations.append(
                f"User role '{user_role}' not authorized to access ledger. "
                "Required: finance, compliance, admin, or auditor"
            )
            rule_ids.append("LEDGER_UNAUTHORIZED")
            rule_violations_metadata.append(
                RuleViolation(
                    rule_id="LEDGER_UNAUTHORIZED",
                    message=f"Role {user_role} cannot access ledger",
                    severity="critical",
                    risk_contribution=100
                )
            )
        
        result = ComplianceCheckResult(
            decision=Decision.APPROVED,
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            risk_score=0,
            rule_ids_triggered=rule_ids
        )
        result.rule_violations_with_metadata = rule_violations_metadata
        return result
    
    def _check_email_send(self, payload: Dict[str, Any]) -> ComplianceCheckResult:
        """Check email sending restrictions with risk metadata."""
        violations = []
        warnings = []
        rule_ids = []
        rule_violations_metadata = []
        
        recipient = payload.get("recipient", "")
        subject = payload.get("subject", "")
        body = payload.get("body", "")
        
        # Check for external recipients with sensitive content
        if not recipient.endswith("@jpmc.com"):
            content = f"{subject} {body}".lower()
            sensitive_keywords = ["confidential", "secret", "restricted", "proprietary"]
            
            for keyword in sensitive_keywords:
                if keyword in content:
                    violations.append(
                        f"Cannot send email containing '{keyword}' to external recipient {recipient}"
                    )
                    rule_ids.append("EMAIL_EXTERNAL_SENSITIVE")
                    rule_violations_metadata.append(
                        RuleViolation(
                            rule_id="EMAIL_EXTERNAL_SENSITIVE",
                            message=f"Sensitive content to external recipient",
                            severity="high",
                            risk_contribution=85
                        )
                    )
                    break
        
        result = ComplianceCheckResult(
            decision=Decision.APPROVED,
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            risk_score=0,
            rule_ids_triggered=rule_ids
        )
        result.rule_violations_with_metadata = rule_violations_metadata
        return result

    def _check_daily_aggregate(self, payload: Dict[str, Any], context: Dict[str, Any]) -> ComplianceCheckResult:
        """Check if the sum of transactions in the last 24 hours exceeds daily limit."""
        violations = []
        warnings = []
        rule_ids = []
        rule_violations_metadata = []

        import sqlite3
        import json
        from datetime import datetime, timedelta, timezone

        # Get client_id
        client_id = payload.get("client_id")
        if client_id is None and payload.get("args"):
            client_id = payload["args"][0]
        
        amount = float(payload.get("amount", 0))
        max_daily = self.rules.get("max_daily_transfers", JPMCRules.MAX_DAILY_TRANSFERS)

        if client_id is not None:
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                # Get current date minus 24 hours
                time_limit = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
                
                # Query all approved transaction logs
                cursor.execute("""
                    SELECT payload FROM Axonic_Audit_Logs
                    WHERE decision = 'APPROVED'
                    AND action_attempted = 'execute_transfer'
                    AND timestamp >= ?
                """, (time_limit,))
                rows = cursor.fetchall()
                conn.close()

                daily_sum = 0.0
                for (payload_str,) in rows:
                    try:
                        p = json.loads(payload_str)
                        cid = p.get("client_id")
                        if cid is None and p.get("args"):
                            cid = p["args"][0]
                        if cid == client_id:
                            daily_sum += float(p.get("amount", 0))
                    except Exception:
                        pass
                
                # Check limit
                if daily_sum + amount > max_daily:
                    violations.append(
                        f"Transaction amount ${amount:,.0f} pushes 24h client aggregate (${daily_sum + amount:,.0f}) over daily limit ${max_daily:,.0f}"
                    )
                    rule_ids.append("TXN_DAILY_LIMIT_EXCEEDED")
                    rule_violations_metadata.append(
                        RuleViolation(
                            rule_id="TXN_DAILY_LIMIT_EXCEEDED",
                            message=f"Aggregate transfers ${daily_sum + amount:,.0f} exceeds ${max_daily:,.0f}",
                            severity="critical",
                            risk_contribution=100
                        )
                    )
                elif daily_sum + amount > max_daily * 0.8:
                    warnings.append(
                        f"Transaction amount ${amount:,.0f} pushes 24h client aggregate (${daily_sum + amount:,.0f}) near daily limit ${max_daily:,.0f}"
                    )
                    rule_ids.append("TXN_DAILY_LIMIT_WARNING")
                    rule_violations_metadata.append(
                        RuleViolation(
                            rule_id="TXN_DAILY_LIMIT_WARNING",
                            message=f"Aggregate transfers near limit: {((daily_sum + amount) / max_daily) * 100:.1f}%",
                            severity="medium",
                            risk_contribution=35
                        )
                    )
            except Exception as e:
                warnings.append(f"Failed to verify daily aggregate from database: {str(e)}")

        result = ComplianceCheckResult(
            decision=Decision.APPROVED,
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            risk_score=0,
            rule_ids_triggered=rule_ids
        )
        result.rule_violations_with_metadata = rule_violations_metadata
        return result

    def _check_velocity(self, payload: Dict[str, Any], context: Dict[str, Any]) -> ComplianceCheckResult:
        """Check user action velocity in the last 60 seconds (industry-grade sliding window)."""
        violations = []
        warnings = []
        rule_ids = []
        rule_violations_metadata = []

        import sqlite3
        from datetime import datetime, timedelta, timezone

        user = context.get("user", "unknown")
        max_pm = self.rules.get("max_transactions_per_minute", JPMCRules.MAX_TRANSACTIONS_PER_MINUTE)

        if user != "unknown":
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Get current date minus 60 seconds
                time_limit = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
                
                # Query count of all actions by this user in the last 60 seconds
                cursor.execute("""
                    SELECT COUNT(*) FROM Axonic_Audit_Logs
                    WHERE requester = ?
                    AND timestamp >= ?
                """, (user, time_limit))
                count = cursor.fetchone()[0]
                conn.close()

                if count >= max_pm:
                    violations.append(
                        f"Action velocity block: User '{user}' has triggered {count} actions in the last 60s (limit: {max_pm}/min)"
                    )
                    rule_ids.append("VELOCITY_LIMIT_EXCEEDED")
                    rule_violations_metadata.append(
                        RuleViolation(
                            rule_id="VELOCITY_LIMIT_EXCEEDED",
                            message=f"User {user} velocity {count} actions/min exceeds limit {max_pm}",
                            severity="critical",
                            risk_contribution=100
                        )
                    )
                elif count >= max_pm * 0.8:
                    warnings.append(
                        f"Action velocity warning: User '{user}' has triggered {count} actions in the last 60s (limit: {max_pm}/min)"
                    )
                    rule_ids.append("VELOCITY_LIMIT_WARNING")
                    rule_violations_metadata.append(
                        RuleViolation(
                            rule_id="VELOCITY_LIMIT_WARNING",
                            message=f"User {user} velocity near limit: {count} actions/min",
                            severity="medium",
                            risk_contribution=35
                        )
                    )
            except Exception as e:
                warnings.append(f"Failed to verify transaction velocity from database: {str(e)}")

        result = ComplianceCheckResult(
            decision=Decision.APPROVED,
            passed=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            risk_score=0,
            rule_ids_triggered=rule_ids
        )
        result.rule_violations_with_metadata = rule_violations_metadata
        return result
