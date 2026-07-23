"""
Test Suite: API Validation
Tests for API endpoint validation
"""

import sys
import unittest
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from api_validator.validator import APIValidator


class TestAPIValidator(unittest.TestCase):
    """Test cases for API validation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = {
            "approved_endpoints": [
                {"method": "GET", "path": "/api/transactions", "requires_auth": True},
                {"method": "POST", "path": "/api/transactions", "requires_auth": True},
                {"method": "GET", "path": "/api/accounts", "requires_auth": True}
            ]
        }
        self.validator = APIValidator(self.config)
    
    def test_endpoint_whitelist_allowed(self):
        """Test allowed endpoint in whitelist."""
        result = self.validator.validate_api_call({
            "http_method": "GET",
            "api_endpoint": "/api/transactions",
            "authorization": "Bearer token12345678901234567890"
        })
        
        self.assertTrue(result.approved)
    
    def test_endpoint_whitelist_denied(self):
        """Test endpoint not in whitelist."""
        result = self.validator.validate_api_call({
            "http_method": "GET",
            "api_endpoint": "/api/restricted",
            "authorization": "Bearer token12345678901234567890"
        })
        
        self.assertFalse(result.approved)
    
    def test_missing_auth(self):
        """Test request without required auth."""
        result = self.validator.validate_api_call({
            "http_method": "GET",
            "api_endpoint": "/api/transactions"
        })
        
        self.assertFalse(result.approved)
    
    def test_invalid_auth_token(self):
        """Test invalid authentication token."""
        result = self.validator.validate_api_call({
            "http_method": "GET",
            "api_endpoint": "/api/transactions",
            "authorization": "Bearer short"
        })
        
        self.assertFalse(result.approved)
    
    def test_valid_auth_token(self):
        """Test valid authentication token."""
        result = self.validator.validate_api_call({
            "http_method": "GET",
            "api_endpoint": "/api/transactions",
            "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        })
        
        self.assertTrue(result.approved)
    
    def test_path_matching_exact(self):
        """Test exact path matching."""
        self.assertTrue(self.validator._path_matches("/api/transactions", "/api/transactions"))
        self.assertFalse(self.validator._path_matches("/api/transactions", "/api/accounts"))
    
    def test_path_matching_wildcard(self):
        """Test wildcard path matching."""
        self.assertTrue(self.validator._path_matches("/api/*/details", "/api/users/details"))
        self.assertTrue(self.validator._path_matches("/api/*/details", "/api/accounts/details"))
        self.assertFalse(self.validator._path_matches("/api/*/details", "/api/users/info"))
    
    def test_add_endpoint_to_whitelist(self):
        """Test adding endpoint to whitelist."""
        self.validator.add_endpoint_to_whitelist("POST", "/api/custom", True)
        
        result = self.validator.validate_api_call({
            "http_method": "POST",
            "api_endpoint": "/api/custom",
            "authorization": "Bearer token12345678901234567890"
        })
        
        self.assertTrue(result.approved)
    
    def test_remove_endpoint_from_whitelist(self):
        """Test removing endpoint from whitelist."""
        self.validator.remove_endpoint_from_whitelist("GET", "/api/transactions")
        
        result = self.validator.validate_api_call({
            "http_method": "GET",
            "api_endpoint": "/api/transactions",
            "authorization": "Bearer token12345678901234567890"
        })
        
        self.assertFalse(result.approved)
    
    def test_get_whitelist(self):
        """Test retrieving whitelist."""
        whitelist = self.validator.get_whitelist()
        
        self.assertGreater(len(whitelist), 0)
        self.assertEqual(whitelist[0]["method"], "GET")


if __name__ == "__main__":
    unittest.main()
