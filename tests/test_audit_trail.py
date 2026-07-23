"""
Test Suite: Audit Trail
Tests for immutable audit logging
"""

import sys
import unittest
import json
import tempfile
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from audit.logger import AuditLogger


class TestAuditLogger(unittest.TestCase):
    """Test cases for audit logging."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create temporary log file
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.log')
        self.temp_file.close()
        self.log_path = self.temp_file.name
        
        self.logger = AuditLogger(self.log_path)
    
    def tearDown(self):
        """Clean up test fixtures."""
        Path(self.log_path).unlink(missing_ok=True)
    
    def test_log_entry(self):
        """Test logging an entry."""
        entry = {
            "audit_id": "test-id",
            "timestamp": datetime.utcnow().isoformat(),
            "action_type": "test",
            "decision": "APPROVED"
        }
        
        self.logger.log_entry(entry)
        
        # Verify entry was written
        with open(self.log_path, 'r') as f:
            logged = json.loads(f.read().strip())
        
        self.assertEqual(logged["entry"]["audit_id"], "test-id")
    
    def test_entry_signature(self):
        """Test entry signature creation."""
        entry_json = '{"test": "data"}'
        signature = self.logger._sign_entry(entry_json)
        
        # Signature should be hex string
        self.assertEqual(len(signature), 64)  # SHA256 hex is 64 chars
        self.assertTrue(all(c in '0123456789abcdef' for c in signature))
    
    def test_verify_entry_signature(self):
        """Test entry signature verification."""
        entry_json = '{"test": "data"}'
        signature = self.logger._sign_entry(entry_json)
        
        # Verify correct signature
        self.assertTrue(self.logger._verify_entry_signature(entry_json, signature))
        
        # Reject wrong signature
        wrong_sig = "a" * 64
        self.assertFalse(self.logger._verify_entry_signature(entry_json, wrong_sig))
    
    def test_hash_payload(self):
        """Test payload hashing."""
        payload = {"amount": 1000, "recipient": "account-123"}
        hash1 = self.logger.hash_payload(payload)
        hash2 = self.logger.hash_payload(payload)
        
        # Same payload should produce same hash
        self.assertEqual(hash1, hash2)
        
        # Hash should be SHA256
        self.assertEqual(len(hash1), 64)
    
    def test_verify_integrity_empty_log(self):
        """Test integrity verification of empty log."""
        integrity = self.logger.verify_integrity()
        self.assertTrue(integrity)
    
    def test_verify_integrity_valid_log(self):
        """Test integrity verification of valid log."""
        # Log some entries
        for i in range(3):
            entry = {
                "audit_id": f"test-{i}",
                "timestamp": datetime.utcnow().isoformat(),
                "decision": "APPROVED"
            }
            self.logger.log_entry(entry)
        
        integrity = self.logger.verify_integrity()
        self.assertTrue(integrity)
    
    def test_get_entries_no_filter(self):
        """Test retrieving all entries."""
        # Log some entries
        for i in range(3):
            entry = {
                "audit_id": f"test-{i}",
                "timestamp": datetime.utcnow().isoformat(),
                "decision": "APPROVED"
            }
            self.logger.log_entry(entry)
        
        entries = self.logger.get_entries()
        self.assertEqual(len(entries), 3)
    
    def test_get_entries_filter_decision(self):
        """Test filtering entries by decision."""
        # Log mixed decisions
        for decision in ["APPROVED", "DENIED", "APPROVED"]:
            entry = {
                "audit_id": f"test-{decision}",
                "timestamp": datetime.utcnow().isoformat(),
                "decision": decision
            }
            self.logger.log_entry(entry)
        
        approved = self.logger.get_entries({"decision": "APPROVED"})
        denied = self.logger.get_entries({"decision": "DENIED"})
        
        self.assertEqual(len(approved), 2)
        self.assertEqual(len(denied), 1)
    
    def test_get_entries_filter_action_type(self):
        """Test filtering entries by action type."""
        # Log different action types
        for action in ["write", "delete", "write"]:
            entry = {
                "audit_id": f"test-{action}",
                "timestamp": datetime.utcnow().isoformat(),
                "action_type": action,
                "decision": "APPROVED"
            }
            self.logger.log_entry(entry)
        
        writes = self.logger.get_entries({"action_type": "write"})
        deletes = self.logger.get_entries({"action_type": "delete"})
        
        self.assertEqual(len(writes), 2)
        self.assertEqual(len(deletes), 1)
    
    def test_get_denial_report(self):
        """Test denial report generation."""
        # Log some denials
        for i in range(2):
            entry = {
                "audit_id": f"denied-{i}",
                "timestamp": datetime.utcnow().isoformat(),
                "decision": "DENIED",
                "violations": ["Rule violation"]
            }
            self.logger.log_entry(entry)
        
        report = self.logger.get_denial_report()
        
        self.assertEqual(report["total_denials"], 2)
    
    def test_export_entries(self):
        """Test exporting entries."""
        # Log some entries
        for i in range(2):
            entry = {
                "audit_id": f"test-{i}",
                "timestamp": datetime.utcnow().isoformat(),
                "decision": "APPROVED"
            }
            self.logger.log_entry(entry)
        
        # Export to file
        export_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json')
        export_file.close()
        
        try:
            self.logger.export_entries(export_file.name)
            
            # Verify export
            with open(export_file.name, 'r') as f:
                exported = json.load(f)
            
            self.assertEqual(len(exported), 2)
        finally:
            Path(export_file.name).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
