"""
Test Suite: Compliance Engine
Tests for compliance rules validation
"""

import sys
import unittest
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from compliance.engine import ComplianceEngine, JPMCRules


class TestComplianceEngine(unittest.TestCase):
    """Test cases for compliance engine."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = {
            "compliance_rules": {
                "max_transaction_amount": 1000000,
                "max_daily_transfers": 5000000,
                "restricted_endpoints": [
                    "DELETE /api/users",
                    "PATCH /api/ledger"
                ]
            }
        }
        self.engine = ComplianceEngine(self.config)
    
    def test_transaction_amount_check_pass(self):
        """Test valid transaction amount."""
        result = self.engine._check_transaction_amount({"amount": 500000})
        self.assertTrue(result.passed)
        self.assertEqual(len(result.violations), 0)
    
    def test_transaction_amount_check_fail(self):
        """Test transaction exceeding limit."""
        result = self.engine._check_transaction_amount({"amount": 2000000})
        self.assertFalse(result.passed)
        self.assertGreater(len(result.violations), 0)
    
    def test_transaction_amount_warning(self):
        """Test transaction near limit."""
        result = self.engine._check_transaction_amount({"amount": 850000})
        self.assertTrue(result.passed)
        self.assertGreater(len(result.warnings), 0)
    
    def test_restricted_endpoint_check(self):
        """Test restricted endpoint detection."""
        result = self.engine._check_restricted_endpoints(
            {"api_endpoint": "DELETE /api/users"}
        )
        self.assertFalse(result.passed)
        self.assertGreater(len(result.violations), 0)
    
    def test_allowed_endpoint_check(self):
        """Test allowed endpoint passes."""
        result = self.engine._check_restricted_endpoints(
            {"api_endpoint": "GET /api/users"}
        )
        self.assertTrue(result.passed)
    
    def test_restricted_methods(self):
        """Test restricted HTTP methods."""
        result = self.engine._check_restricted_methods(
            {"http_method": "DELETE", "api_endpoint": "/api/accounts"}
        )
        self.assertFalse(result.passed)
    
    def test_rbac_valid_role(self):
        """Test valid user role."""
        result = self.engine._check_rbac(
            "database_write",
            {"user_role": "analyst"}
        )
        self.assertTrue(result.passed)
    
    def test_rbac_invalid_role(self):
        """Test invalid user role."""
        result = self.engine._check_rbac(
            "ledger_access",
            {"user_role": "intern"}
        )
        self.assertFalse(result.passed)
    
    def test_email_send_external_sensitive(self):
        """Test email send with sensitive content to external."""
        result = self.engine._check_email_send({
            "recipient": "external@example.com",
            "subject": "Confidential Information",
            "body": "This is confidential"
        })
        self.assertFalse(result.passed)
    
    def test_email_send_internal_sensitive(self):
        """Test email send with sensitive content to internal."""
        result = self.engine._check_email_send({
            "recipient": "internal@jpmc.com",
            "subject": "Confidential Information",
            "body": "This is confidential"
        })
        self.assertTrue(result.passed)
    
    def test_full_rules_check_pass(self):
        """Test full compliance check that passes."""
        result = self.engine.check_rules(
            action_type="database_write",
            payload={"amount": 500000},
            context={"user_role": "analyst"}
        )
        self.assertTrue(result.passed)
    
    def test_full_rules_check_fail(self):
        """Test full compliance check that fails."""
        result = self.engine.check_rules(
            action_type="database_write",
            payload={"amount": 2000000},
            context={"user_role": "analyst"}
        )
        self.assertFalse(result.passed)


class TestJPMCRules(unittest.TestCase):
    """Test JPMC rule constants."""
    
    def test_max_single_transaction(self):
        """Test max single transaction constant."""
        self.assertEqual(JPMCRules.MAX_SINGLE_TRANSACTION, 1_000_000)
    
    def test_max_daily_transfers(self):
        """Test max daily transfers constant."""
        self.assertEqual(JPMCRules.MAX_DAILY_TRANSFERS, 5_000_000)
    
    def test_restricted_endpoints(self):
        """Test restricted endpoints list."""
        self.assertIn("DELETE /api/users", JPMCRules.RESTRICTED_ENDPOINTS)
        self.assertIn("PATCH /api/ledger", JPMCRules.RESTRICTED_ENDPOINTS)


if __name__ == "__main__":
    unittest.main()
