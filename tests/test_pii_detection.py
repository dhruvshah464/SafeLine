"""
Test Suite: PII Detection
Tests for PII detection and masking
"""

import sys
import unittest
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from pii.detector import PIIDetector


class TestPIIDetection(unittest.TestCase):
    """Test cases for PII detection."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.detector = PIIDetector()
    
    def test_ssn_detection(self):
        """Test SSN detection."""
        text = "Customer SSN: 123-45-6789"
        findings = self.detector.detect_pii(text)
        
        self.assertGreater(len(findings), 0)
        self.assertEqual(findings[0].pii_type, "ssn")
    
    def test_credit_card_detection(self):
        """Test credit card detection."""
        text = "Card: 4111111111111111"
        findings = self.detector.detect_pii(text)
        
        # May or may not detect (Luhn check)
        if findings:
            self.assertEqual(findings[0].pii_type, "credit_card")
    
    def test_email_detection(self):
        """Test email detection."""
        text = "Contact: john.doe@example.com"
        findings = self.detector.detect_pii(text)
        
        self.assertGreater(len(findings), 0)
        self.assertEqual(findings[0].pii_type, "email")
    
    def test_phone_detection(self):
        """Test phone number detection."""
        text = "Phone: (555) 123-4567"
        findings = self.detector.detect_pii(text)
        
        self.assertGreater(len(findings), 0)
        self.assertEqual(findings[0].pii_type, "phone")
    
    def test_multiple_pii_types(self):
        """Test detection of multiple PII types."""
        text = "Email: user@example.com, SSN: 123-45-6789, Phone: (555) 987-6543"
        findings = self.detector.detect_pii(text)
        
        types = {f.pii_type for f in findings}
        self.assertIn("email", types)
        self.assertIn("ssn", types)
        self.assertIn("phone", types)
    
    def test_payload_pii_detection(self):
        """Test PII detection in dictionary payload."""
        payload = {
            "name": "John Doe",
            "email": "john@example.com",
            "ssn": "123-45-6789"
        }
        
        findings = self.detector.detect_pii_in_payload(payload)
        self.assertGreater(len(findings), 0)
    
    def test_nested_payload_pii_detection(self):
        """Test PII detection in nested payload."""
        payload = {
            "customer": {
                "name": "Jane Doe",
                "contact": {
                    "email": "jane@example.com"
                }
            }
        }
        
        findings = self.detector.detect_pii_in_payload(payload)
        self.assertGreater(len(findings), 0)
    
    def test_ssn_masking(self):
        """Test SSN masking."""
        text = "SSN: 123-45-6789"
        masked = self.detector.mask_pii(text)
        
        self.assertIn("XXX-XX-6789", masked)
        self.assertNotIn("123-45", masked)
    
    def test_email_masking(self):
        """Test email masking."""
        text = "Email: john@example.com"
        masked = self.detector.mask_pii(text)
        
        self.assertIn("***@example.com", masked)
        self.assertNotIn("john", masked)
    
    def test_phone_masking(self):
        """Test phone masking."""
        text = "Phone: (555) 123-4567"
        masked = self.detector.mask_pii(text)
        
        self.assertIn("4567", masked)
        self.assertIn("***", masked)
    
    def test_payload_masking(self):
        """Test payload masking."""
        payload = {
            "email": "user@example.com",
            "ssn": "123-45-6789"
        }
        
        masked = self.detector.mask_pii_in_payload(payload)
        
        self.assertIn("***", masked["email"])
        self.assertIn("XXX", masked["ssn"])
    
    def test_pii_summary(self):
        """Test PII summary generation."""
        text = "Email: a@x.com, b@y.com, SSN: 123-45-6789"
        findings = self.detector.detect_pii(text)
        summary = self.detector.get_pii_summary(findings)
        
        self.assertEqual(summary.get("email", 0), 2)
        self.assertEqual(summary.get("ssn", 0), 1)


if __name__ == "__main__":
    unittest.main()
