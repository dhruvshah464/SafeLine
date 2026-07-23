"""
Data Classification Layer
Dynamically classifies data fields and enforces access rules by classification level.
Levels: PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED
"""

from enum import IntEnum
from typing import Dict, Any, List, Tuple


class ClassificationLevel(IntEnum):
    """Data classification levels, ordered by sensitivity."""
    PUBLIC = 0
    INTERNAL = 1
    CONFIDENTIAL = 2
    RESTRICTED = 3


# Human-readable labels
LEVEL_LABELS = {
    ClassificationLevel.PUBLIC: "PUBLIC",
    ClassificationLevel.INTERNAL: "INTERNAL",
    ClassificationLevel.CONFIDENTIAL: "CONFIDENTIAL",
    ClassificationLevel.RESTRICTED: "RESTRICTED",
}

# Role hierarchy (higher = more privilege)
ROLE_PRIVILEGE = {
    "intern": 0,
    "auditor": 1,
    "trader": 2,
    "analyst": 3,
    "manager": 4,
    "compliance_officer": 5,
    "admin": 6,
}

# Default field → classification mapping
DEFAULT_FIELD_MAP: Dict[str, ClassificationLevel] = {
    "ssn": ClassificationLevel.RESTRICTED,
    "social_security": ClassificationLevel.RESTRICTED,
    "credit_card": ClassificationLevel.RESTRICTED,
    "account_number": ClassificationLevel.CONFIDENTIAL,
    "routing_number": ClassificationLevel.CONFIDENTIAL,
    "account_balance": ClassificationLevel.CONFIDENTIAL,
    "salary": ClassificationLevel.CONFIDENTIAL,
    "email": ClassificationLevel.INTERNAL,
    "phone": ClassificationLevel.INTERNAL,
    "name": ClassificationLevel.INTERNAL,
    "address": ClassificationLevel.INTERNAL,
    "transaction_id": ClassificationLevel.PUBLIC,
    "status": ClassificationLevel.PUBLIC,
    "timestamp": ClassificationLevel.PUBLIC,
}

# Keywords that bump classification when found in values
SENSITIVE_KEYWORDS = {
    ClassificationLevel.RESTRICTED: [
        "ssn", "social security", "credit card", "secret", "password"
    ],
    ClassificationLevel.CONFIDENTIAL: [
        "account", "balance", "salary", "routing"
    ],
}


class DataClassifier:
    """
    Classifies data fields and enforces access control by classification.
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        dc = self.config.get("data_classification", {})
        raw = dc.get("field_classifications", {})
        self.field_map = self._build_field_map(raw)
        self.rules = dc.get("classification_rules", {})

    def _build_field_map(self, raw: Dict[str, str]) -> Dict[str, ClassificationLevel]:
        mapping = dict(DEFAULT_FIELD_MAP)
        level_lookup = {v: k for k, v in LEVEL_LABELS.items()}
        for field, level_str in raw.items():
            lvl = level_lookup.get(level_str.upper())
            if lvl is not None:
                mapping[field.lower()] = lvl
        return mapping

    # ────────────────────────────────────────────────────────
    # Classification
    # ────────────────────────────────────────────────────────

    def classify_field(self, field_name: str) -> ClassificationLevel:
        """Return classification for a known field name."""
        return self.field_map.get(field_name.lower(), ClassificationLevel.INTERNAL)

    def classify_payload(self, payload: Dict[str, Any]) -> Dict[str, str]:
        """Classify every top-level field in a payload."""
        result = {}
        for key in payload:
            lvl = self.classify_field(key)
            # Also scan value for sensitive keywords
            val_lvl = self._classify_value(payload[key])
            final = max(lvl, val_lvl)
            result[key] = LEVEL_LABELS[final]
        return result

    def get_max_classification(self, payload: Dict[str, Any]) -> ClassificationLevel:
        """Return the highest classification found in a payload."""
        classifications = self.classify_payload(payload)
        level_lookup = {v: k for k, v in LEVEL_LABELS.items()}
        levels = [level_lookup.get(v, ClassificationLevel.PUBLIC) for v in classifications.values()]
        return max(levels) if levels else ClassificationLevel.PUBLIC

    def _classify_value(self, value: Any) -> ClassificationLevel:
        """Scan a value for sensitive keywords to bump classification."""
        if not isinstance(value, str):
            return ClassificationLevel.PUBLIC
        lower = value.lower()
        for level in sorted(SENSITIVE_KEYWORDS.keys(), reverse=True):
            for kw in SENSITIVE_KEYWORDS[level]:
                if kw in lower:
                    return level
        return ClassificationLevel.PUBLIC

    # ────────────────────────────────────────────────────────
    # Access control
    # ────────────────────────────────────────────────────────

    def check_access(
        self,
        payload: Dict[str, Any],
        user_role: str,
        is_external: bool = False,
    ) -> Tuple[bool, List[str], int]:
        """
        Check if a role can access the data in a payload.

        Returns:
            (allowed, violations, risk_contribution)
        """
        violations: List[str] = []
        risk = 0
        max_level = self.get_max_classification(payload)
        role_priv = ROLE_PRIVILEGE.get(user_role, 0)

        # RESTRICTED data
        if max_level == ClassificationLevel.RESTRICTED:
            if role_priv < ROLE_PRIVILEGE.get("compliance_officer", 5):
                violations.append(
                    f"Role '{user_role}' cannot access RESTRICTED data"
                )
                risk = 100
            if is_external:
                violations.append("RESTRICTED data cannot be sent externally")
                risk = 100

        # CONFIDENTIAL data
        elif max_level == ClassificationLevel.CONFIDENTIAL:
            if role_priv < ROLE_PRIVILEGE.get("analyst", 3):
                violations.append(
                    f"Role '{user_role}' cannot access CONFIDENTIAL data"
                )
                risk = 80
            if is_external:
                violations.append(
                    "CONFIDENTIAL data requires approval for external access"
                )
                risk = max(risk, 70)

        # INTERNAL data
        elif max_level == ClassificationLevel.INTERNAL:
            if is_external:
                violations.append("INTERNAL data should not be sent externally")
                risk = max(risk, 40)

        return len(violations) == 0, violations, risk
