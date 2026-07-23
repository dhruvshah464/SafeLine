"""
API Validation Engine
Validates API calls against whitelisted endpoints and policies.
Includes API risk detection for external domains, suspicious endpoints, and exfiltration.
"""

import json
import re
from dataclasses import dataclass, field
from typing import Dict, Any, List
from enum import Enum


class APIRiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


@dataclass
class APIValidationResult:
    """Result of API validation"""
    approved: bool
    violations: List[str]
    warnings: List[str]
    api_risk: str = "LOW"
    risk_factors: List[str] = field(default_factory=list)


class APIValidator:
    """
    Validates API calls against whitelist and policies.
    Enforces authentication, rate limits, endpoint restrictions,
    and detects API-level risk (external domains, exfiltration, suspicious endpoints).
    """

    DEFAULT_ENDPOINTS = [
        {"method": "GET", "path": "/api/transactions", "requires_auth": True},
        {"method": "GET", "path": "/api/accounts", "requires_auth": True},
        {"method": "POST", "path": "/api/transactions", "requires_auth": True},
        {"method": "GET", "path": "/api/ledger", "requires_auth": True},
        {"method": "GET", "path": "/api/compliance/status", "requires_auth": True},
        {"method": "POST", "path": "/api/reports", "requires_auth": True},
    ]

    SUSPICIOUS_ENDPOINTS = [
        "/admin", "/export", "/bulk", "/dump", "/backup",
        "/migrate", "/raw", "/debug", "/internal", "/root",
    ]

    EXFIL_KEYWORDS = [
        "ssn", "password", "secret", "credit_card", "token",
        "private_key", "api_key", "credentials",
    ]

    EXTERNAL_DOMAIN_PATTERNS = [
        r".*\.external\.com$",
        r".*\.offshore\.io$",
        r".*\.onion$",
        r".*\.darkweb\.",
    ]

    def __init__(self, config: Dict[str, Any]):
        """Initialize API validator with configuration."""
        self.config = config
        self.approved_endpoints = self._load_endpoints()
        risk_cfg = config.get("api_risk_detection", {})
        self.suspicious_eps = risk_cfg.get("suspicious_endpoints", self.SUSPICIOUS_ENDPOINTS)
        self.exfil_cfg = risk_cfg.get("exfiltration_patterns", {})

    def _load_endpoints(self) -> List[Dict[str, Any]]:
        cfg = self.config.get("approved_endpoints", [])
        return cfg if cfg else self.DEFAULT_ENDPOINTS

    # ──────────────────────────────────────────────────────────
    # Main validation
    # ──────────────────────────────────────────────────────────

    def validate_api_call(self, payload: Dict[str, Any]) -> APIValidationResult:
        """Validate an API call against whitelist, auth, and risk policies."""
        violations = []
        warnings = []
        risk_factors = []

        endpoint = payload.get("api_endpoint", "")
        method = payload.get("http_method", "GET").upper()
        auth_header = payload.get("authorization", "")

        if not endpoint:
            return APIValidationResult(approved=True, violations=[], warnings=[])

        # 1. Whitelist check
        if not self._check_endpoint_whitelist(method, endpoint):
            violations.append(f"API endpoint {method} {endpoint} is not whitelisted")

        # 2. Auth check
        if self._check_endpoint_whitelist(method, endpoint):
            ep_cfg = self._get_endpoint_config(method, endpoint)
            if ep_cfg and ep_cfg.get("requires_auth") and not auth_header:
                violations.append(f"API endpoint {endpoint} requires authentication")
            elif auth_header and not self._validate_auth_header(auth_header):
                violations.append("Invalid or expired authentication token")

        # 3. Schema check
        if not self._validate_request_schema(method, endpoint, payload):
            warnings.append("Request payload doesn't match expected schema")

        # 4. Rate limiting
        if not self._check_rate_limit(endpoint):
            violations.append(f"API endpoint {endpoint} rate limit exceeded")

        # 5. API Risk Detection
        api_risk, detected_factors = self.assess_api_risk(payload)
        risk_factors.extend(detected_factors)
        if api_risk == APIRiskLevel.HIGH:
            violations.append(f"API call classified as HIGH risk: {', '.join(detected_factors)}")
        elif api_risk == APIRiskLevel.MEDIUM:
            warnings.append(f"API call classified as MEDIUM risk: {', '.join(detected_factors)}")

        return APIValidationResult(
            approved=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            api_risk=api_risk.value,
            risk_factors=risk_factors,
        )

    # ──────────────────────────────────────────────────────────
    # API Risk Detection
    # ──────────────────────────────────────────────────────────

    def assess_api_risk(self, payload: Dict[str, Any]) -> tuple:
        """
        Assess API risk level by detecting:
        - External/suspicious domains
        - Suspicious endpoint patterns (/admin, /export, /bulk, etc.)
        - Data exfiltration patterns

        Returns:
            (APIRiskLevel, list_of_risk_factors)
        """
        factors = []
        endpoint = payload.get("api_endpoint", "")
        domain = payload.get("api_domain", payload.get("destination", ""))
        body = json.dumps(payload, default=str).lower()

        # External domain detection
        if domain:
            for pattern in self.EXTERNAL_DOMAIN_PATTERNS:
                if re.match(pattern, domain.lower()):
                    factors.append(f"External/suspicious domain: {domain}")
                    break

        # Suspicious endpoint detection
        for sus in self.suspicious_eps:
            if sus.lower() in endpoint.lower():
                factors.append(f"Suspicious endpoint pattern: {sus}")
                break

        # Exfiltration pattern detection
        exfil_hits = []
        sensitive_kw = self.exfil_cfg.get("sensitive_field_keywords", self.EXFIL_KEYWORDS)
        for kw in sensitive_kw:
            if kw in body:
                exfil_hits.append(kw)
        if exfil_hits:
            factors.append(f"Sensitive data in payload: {', '.join(exfil_hits[:3])}")

        # Batch size detection
        batch_threshold = self.exfil_cfg.get("large_batch_threshold", 100)
        limit = payload.get("limit", payload.get("batch_size", 0))
        if isinstance(limit, (int, float)) and limit > batch_threshold:
            factors.append(f"Large batch request: {limit} records")

        # Determine level
        if len(factors) >= 2 or any("External" in f or "exfil" in f.lower() for f in factors):
            level = APIRiskLevel.HIGH
        elif len(factors) >= 1:
            level = APIRiskLevel.MEDIUM
        else:
            level = APIRiskLevel.LOW

        return level, factors

    # ──────────────────────────────────────────────────────────
    # Helpers (unchanged logic)
    # ──────────────────────────────────────────────────────────

    def _check_endpoint_whitelist(self, method: str, endpoint: str) -> bool:
        for approved in self.approved_endpoints:
            if approved["method"] == method and self._path_matches(approved["path"], endpoint):
                return True
        return False

    def _get_endpoint_config(self, method: str, endpoint: str) -> Dict[str, Any]:
        for approved in self.approved_endpoints:
            if approved["method"] == method and self._path_matches(approved["path"], endpoint):
                return approved
        return {}

    def _path_matches(self, pattern: str, path: str) -> bool:
        if pattern == path:
            return True
        pp = pattern.split("/")
        pa = path.split("/")
        if len(pp) != len(pa):
            return False
        return all(a == "*" or a == b for a, b in zip(pp, pa))

    def _validate_auth_header(self, auth_header: str) -> bool:
        if not auth_header:
            return False
        if auth_header.startswith("Bearer "):
            return len(auth_header[7:]) >= 20
        if auth_header.startswith("Basic "):
            return True
        return False

    def _validate_request_schema(self, method: str, endpoint: str, payload: Dict[str, Any]) -> bool:
        required = {
            "POST /api/transactions": ["amount", "recipient"],
            "POST /api/reports": ["report_type"],
        }
        for f in required.get(f"{method} {endpoint}", []):
            if f not in payload:
                return False
        return True

    def _check_rate_limit(self, endpoint: str) -> bool:
        return True  # Mock — would use Redis in production

    def add_endpoint_to_whitelist(self, method: str, path: str, requires_auth: bool = True):
        ep = {"method": method, "path": path, "requires_auth": requires_auth}
        if ep not in self.approved_endpoints:
            self.approved_endpoints.append(ep)

    def remove_endpoint_from_whitelist(self, method: str, path: str):
        self.approved_endpoints = [
            e for e in self.approved_endpoints
            if not (e["method"] == method and e["path"] == path)
        ]

    def get_whitelist(self) -> List[Dict[str, Any]]:
        return self.approved_endpoints
