"""
PII Detection Engine
Detects and masks Personally Identifiable Information
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple


@dataclass
class PIIFinding:
    """Represents a PII detection finding"""
    pii_type: str
    value: str
    location: str
    confidence: float


class PIIPatterns:
    """Regular expressions for PII detection"""
    
    # SSN: XXX-XX-XXXX format
    SSN_PATTERN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
    
    # Credit Card: 4111-1111-1111-1111 format (major card patterns)
    CREDIT_CARD_PATTERN = re.compile(
        r"\b(?:4[0-9]{12}(?:[0-9]{3})?|"  # Visa
        r"5[1-5][0-9]{14}|"  # Mastercard
        r"3[47][0-9]{13}|"  # American Express
        r"3(?:0[0-5]|[68][0-9])[0-9]{11})\b"  # Diners, Discover
    )
    
    # Email addresses
    EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
    
    # US Phone numbers: (XXX) XXX-XXXX or XXX-XXX-XXXX
    PHONE_PATTERN = re.compile(
        r"\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b"
    )
    
    # Account Numbers: 10-16 digit sequences
    ACCOUNT_NUMBER_PATTERN = re.compile(r"\b\d{10,16}\b")
    
    # Bank Routing Numbers: 9 digits
    ROUTING_NUMBER_PATTERN = re.compile(r"\b\d{9}\b")


class PIIDetector:
    """
    Detects and masks PII in data.
    Supports SSN, credit card, email, phone, account numbers.
    """
    
    def __init__(self):
        """Initialize PII detector."""
        self.patterns = self._compile_patterns()
    
    def _compile_patterns(self) -> Dict[str, Tuple[re.Pattern, str]]:
        """Compile all PII detection patterns."""
        return {
            "ssn": (PIIPatterns.SSN_PATTERN, "Social Security Number"),
            "credit_card": (PIIPatterns.CREDIT_CARD_PATTERN, "Credit Card"),
            "email": (PIIPatterns.EMAIL_PATTERN, "Email Address"),
            "phone": (PIIPatterns.PHONE_PATTERN, "Phone Number"),
            "account_number": (PIIPatterns.ACCOUNT_NUMBER_PATTERN, "Account Number"),
            "routing_number": (PIIPatterns.ROUTING_NUMBER_PATTERN, "Routing Number")
        }
    
    def detect_pii(self, text: str) -> List[PIIFinding]:
        """
        Detect all PII in text.
        
        Args:
            text: Text to scan for PII
        
        Returns:
            List of PII findings
        """
        if not isinstance(text, str):
            return []
        
        findings = []
        
        for pii_type, (pattern, description) in self.patterns.items():
            matches = pattern.finditer(text)
            for match in matches:
                # Skip false positives
                if self._is_false_positive(pii_type, match.group()):
                    continue
                
                findings.append(PIIFinding(
                    pii_type=pii_type,
                    value=match.group(),
                    location=f"Position {match.start()}-{match.end()}",
                    confidence=0.95
                ))
        
        return findings
    
    def detect_pii_in_payload(self, payload: Dict[str, Any]) -> List[PIIFinding]:
        """
        Detect PII in a dictionary payload.
        Recursively scans all string values.
        
        Args:
            payload: Dictionary to scan
        
        Returns:
            List of all PII findings
        """
        findings = []
        
        def scan_value(value: Any, path: str = ""):
            if isinstance(value, str):
                pii_in_string = self.detect_pii(value)
                for finding in pii_in_string:
                    finding.location = f"{path}: {finding.location}"
                    findings.append(finding)
            elif isinstance(value, dict):
                for k, v in value.items():
                    scan_value(v, f"{path}.{k}" if path else k)
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    scan_value(item, f"{path}[{i}]")
        
        scan_value(payload)
        return findings
    
    def mask_pii(self, text: str, mask_char: str = "X") -> str:
        """
        Mask all PII in text.
        
        Args:
            text: Text to mask
            mask_char: Character to use for masking
        
        Returns:
            Text with PII masked
        """
        if not isinstance(text, str):
            return text
        
        result = text
        
        # Mask SSN: 123-45-6789 -> XXX-XX-6789
        result = re.sub(
            r"\b\d{3}-\d{2}-(\d{4})\b",
            lambda m: f"XXX-XX-{m.group(1)}",
            result
        )
        
        # Mask credit card: 4111111111111111 -> 4111****11111111
        result = re.sub(
            r"\b(\d{4})\d{8}(\d{4})\b",
            lambda m: f"{m.group(1)}****{m.group(2)}",
            result
        )
        
        # Mask email: user@example.com -> u***@example.com
        result = re.sub(
            r"\b([A-Za-z0-9._%+-]{1})([A-Za-z0-9._%+-]*)@",
            lambda m: f"{m.group(1)}***@",
            result
        )
        
        # Mask phone: (123) 456-7890 -> (***) ***-7890
        result = re.sub(
            r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?(\d{4})",
            lambda m: f"(***) ***-{m.group(1)}",
            result
        )
        
        return result
    
    def mask_pii_in_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mask PII in a dictionary payload.
        Recursively masks all string values.
        
        Args:
            payload: Dictionary to mask
        
        Returns:
            Dictionary with PII masked
        """
        if isinstance(payload, dict):
            return {k: self.mask_pii_in_payload(v) for k, v in payload.items()}
        elif isinstance(payload, list):
            return [self.mask_pii_in_payload(item) for item in payload]
        elif isinstance(payload, str):
            return self.mask_pii(payload)
        else:
            return payload
    
    def _is_false_positive(self, pii_type: str, value: str) -> bool:
        """
        Check if detected PII is likely a false positive.
        
        Args:
            pii_type: Type of PII detected
            value: The detected value
        
        Returns:
            True if likely false positive
        """
        if pii_type == "ssn":
            # Exclude test SSN 123-45-6789
            if value == "123-45-6789":
                return False  # Still flag it as test data
            # Exclude all-same-digit SSNs
            digits = value.replace("-", "")
            if len(set(digits)) == 1:
                return True
        
        elif pii_type == "credit_card":
            # Basic Luhn check - if fails, likely false positive
            if not self._luhn_check(value):
                return True
        
        elif pii_type == "routing_number":
            # Routing numbers have checksum, but we'll accept more false positives here
            return False
        
        return False
    
    def _luhn_check(self, card_number: str) -> bool:
        """Validate credit card using Luhn algorithm."""
        digits = [int(d) for d in card_number if d.isdigit()]
        checksum = 0
        
        for i, digit in enumerate(reversed(digits)):
            if i % 2 == 1:
                digit *= 2
                if digit > 9:
                    digit -= 9
            checksum += digit
        
        return checksum % 10 == 0
    
    def get_pii_summary(self, findings: List[PIIFinding]) -> Dict[str, int]:
        """
        Get count of each PII type found.
        
        Args:
            findings: List of PII findings
        
        Returns:
            Dictionary with counts by PII type
        """
        summary = {}
        for finding in findings:
            pii_type = finding.pii_type
            summary[pii_type] = summary.get(pii_type, 0) + 1
        
        return summary
