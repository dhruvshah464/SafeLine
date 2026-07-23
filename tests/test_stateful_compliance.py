"""
Test Suite: Stateful Compliance & Interactive HITL Resolution
Tests for daily aggregate transaction limits, action velocity limits, and human-in-the-loop resolutions.
"""

import sys
import os
import unittest
import sqlite3
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone

# Add parent of src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.compliance.engine import ComplianceEngine, Decision
from src.audit.escalation import EscalationManager
from src.guardrail import ComplianceGuardrail


class TestStatefulCompliance(unittest.TestCase):
    """Test cases for stateful compliance checking and review resolution."""
    
    def setUp(self):
        """Set up dynamic test database and tables."""
        self.db_path = "test_temp_guardrail.db"
        self.config = {
            "compliance_rules": {
                "max_transaction_amount": 500000,
                "max_daily_transfers": 1000000, # $1M daily limit for test
                "max_transactions_per_minute": 3, # 3 actions per minute for test
                "pii_sensitivity_level": "high"
            }
        }
        
        # Init DB
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Drop tables
        cursor.execute("DROP TABLE IF EXISTS Axonic_Audit_Logs")
        cursor.execute("DROP TABLE IF EXISTS pending_actions")
        cursor.execute("DROP TABLE IF EXISTS Client_Data")
        cursor.execute("DROP TABLE IF EXISTS Transactions")
        
        # Create tables
        cursor.execute('''
            CREATE TABLE Client_Data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                account_balance REAL NOT NULL,
                ssn TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE Transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                destination_account TEXT NOT NULL,
                status TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE Axonic_Audit_Logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                action_attempted TEXT NOT NULL,
                payload TEXT NOT NULL,
                decision TEXT NOT NULL,
                reason TEXT NOT NULL,
                risk_score INTEGER DEFAULT 0,
                rule_ids_triggered TEXT DEFAULT '[]',
                review_id TEXT,
                requester TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE pending_actions (
                review_id TEXT PRIMARY KEY,
                audit_id TEXT,
                timestamp TEXT,
                assignee TEXT,
                action_type TEXT,
                payload TEXT,
                context TEXT,
                risk_score INTEGER,
                explanations TEXT,
                status TEXT
            )
        ''')
        
        # Insert mock client
        cursor.execute(
            "INSERT INTO Client_Data (id, name, email, account_balance, ssn) VALUES (?, ?, ?, ?, ?)",
            (1, "Test Client", "test@jpmc.com", 2000000.0, "999-99-9999")
        )
        
        conn.commit()
        conn.close()
        
        self.engine = ComplianceEngine(self.config, db_path=self.db_path)
        self.escalation = EscalationManager(db_path=self.db_path)
        
    def tearDown(self):
        """Clean up temporary test database."""
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
            
    def test_daily_aggregate_pass(self):
        """Test daily aggregate check when below the limit."""
        # Query aggregate on empty DB
        payload = {"client_id": 1, "amount": 100000}
        context = {"user": "trader@jpmc.com", "user_role": "analyst"}
        
        result = self.engine._check_daily_aggregate(payload, context)
        self.assertTrue(result.passed)
        self.assertEqual(len(result.violations), 0)
        
    def test_daily_aggregate_warning_and_fail(self):
        """Test daily aggregate check warning and violation triggers."""
        # Insert a transaction log from 2 hours ago ($850,000 approved)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO Axonic_Audit_Logs 
            (timestamp, action_attempted, payload, decision, reason, requester)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
            "execute_transfer",
            json.dumps({"client_id": 1, "amount": 850000}),
            "APPROVED",
            "Initial transfer",
            "trader@jpmc.com"
        ))
        conn.commit()
        conn.close()
        
        # Test 1: Extra transaction of $50k triggers warning (>80%)
        payload = {"client_id": 1, "amount": 50000}
        context = {"user": "trader@jpmc.com", "user_role": "analyst"}
        result = self.engine._check_daily_aggregate(payload, context)
        self.assertTrue(result.passed)
        self.assertGreater(len(result.warnings), 0)
        self.assertIn("TXN_DAILY_LIMIT_WARNING", result.rule_ids_triggered)
        
        # Test 2: Extra transaction of $200k triggers violation (>100% of $1M limit)
        payload = {"client_id": 1, "amount": 200000}
        result = self.engine._check_daily_aggregate(payload, context)
        self.assertFalse(result.passed)
        self.assertGreater(len(result.violations), 0)
        self.assertIn("TXN_DAILY_LIMIT_EXCEEDED", result.rule_ids_triggered)
        
    def test_velocity_limit_check(self):
        """Test transaction velocity limits over a 60s sliding window."""
        context = {"user": "trader@jpmc.com", "user_role": "analyst"}
        payload = {"client_id": 1, "amount": 10000}
        
        # Perform 2 checks, both should pass (count is 0, then 1)
        result1 = self.engine._check_velocity(payload, context)
        self.assertTrue(result1.passed)
        
        # Insert 3 logs into audit log for this user in the last 10 seconds
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        for i in range(3):
            cursor.execute('''
                INSERT INTO Axonic_Audit_Logs 
                (timestamp, action_attempted, payload, decision, reason, requester)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                (datetime.now(timezone.utc) - timedelta(seconds=5 * i)).isoformat(),
                "execute_transfer",
                json.dumps(payload),
                "APPROVED",
                "Mock action",
                "trader@jpmc.com"
            ))
        conn.commit()
        conn.close()
        
        # 4th action from the same user should block (limit is 3)
        result2 = self.engine._check_velocity(payload, context)
        self.assertFalse(result2.passed)
        self.assertIn("VELOCITY_LIMIT_EXCEEDED", result2.rule_ids_triggered)
        
        # Action from another user should pass
        result3 = self.engine._check_velocity(payload, {"user": "another_trader@jpmc.com"})
        self.assertTrue(result3.passed)
        
    def test_review_resolution_approval(self):
        """Test resolving review as APPROVED executes tool and updates DB."""
        payload = {"function": "execute_transfer", "client_id": 1, "amount": 150000, "destination": "Citibank"}
        context = {"user": "trader@jpmc.com", "user_role": "analyst"}
        
        # 1. Escalate action
        review_id = self.escalation.escalate_action(
            audit_id="test-audit-id",
            action_type="database_write",
            payload=payload,
            context=context,
            risk_score=65,
            explanations=["Manual review required"]
        )
        
        # Verify pending action row is created with status PENDING
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pending_actions WHERE review_id = ?", (review_id,))
        pending_row = dict(cursor.fetchone())
        self.assertEqual(pending_row["status"], "PENDING")
        conn.close()
        
        # 2. Resolve review as APPROVED
        res = self.escalation.resolve_action(review_id, "APPROVED")
        self.assertEqual(res["status"], "RESOLVED")
        self.assertEqual(res["decision"], "APPROVED")
        self.assertEqual(res["execution_result"]["status"], "COMPLETED")
        
        # 3. Verify database updates
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verify pending_actions status updated
        cursor.execute("SELECT * FROM pending_actions WHERE review_id = ?", (review_id,))
        pending_row = dict(cursor.fetchone())
        self.assertEqual(pending_row["status"], "APPROVED")
        
        # Verify Axonic_Audit_Logs updated to APPROVED and reason appended
        cursor.execute("SELECT * FROM Axonic_Audit_Logs WHERE review_id = ?", (review_id,))
        audit_row = dict(cursor.fetchone())
        self.assertEqual(audit_row["decision"], "APPROVED")
        self.assertIn("Resolved by compliance_officer: APPROVED", audit_row["reason"])
        
        # Verify Client_Data balance was deducted (2,000,000 - 150,000 = 1,850,000)
        cursor.execute("SELECT * FROM Client_Data WHERE id = 1")
        client = dict(cursor.fetchone())
        self.assertEqual(client["account_balance"], 1850000.0)
        
        conn.close()

    def test_review_resolution_rejection(self):
        """Test resolving review as REJECTED blocks action and updates DB."""
        payload = {"function": "execute_transfer", "client_id": 1, "amount": 150000, "destination": "Citibank"}
        context = {"user": "trader@jpmc.com", "user_role": "analyst"}
        
        # 1. Escalate action
        review_id = self.escalation.escalate_action(
            audit_id="test-audit-id",
            action_type="database_write",
            payload=payload,
            context=context,
            risk_score=65,
            explanations=["Manual review required"]
        )
        
        # 2. Resolve review as REJECTED
        res = self.escalation.resolve_action(review_id, "REJECTED")
        self.assertEqual(res["status"], "RESOLVED")
        self.assertEqual(res["decision"], "REJECTED")
        self.assertIsNone(res.get("execution_result"))
        
        # 3. Verify database updates
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Verify pending_actions status updated to REJECTED
        cursor.execute("SELECT * FROM pending_actions WHERE review_id = ?", (review_id,))
        pending_row = dict(cursor.fetchone())
        self.assertEqual(pending_row["status"], "REJECTED")
        
        # Verify Axonic_Audit_Logs updated to BLOCKED
        cursor.execute("SELECT * FROM Axonic_Audit_Logs WHERE review_id = ?", (review_id,))
        audit_row = dict(cursor.fetchone())
        self.assertEqual(audit_row["decision"], "BLOCKED")
        
        # Verify balance remains unchanged (2,000,000)
        cursor.execute("SELECT * FROM Client_Data WHERE id = 1")
        client = dict(cursor.fetchone())
        self.assertEqual(client["account_balance"], 2000000.0)
        
        conn.close()


if __name__ == "__main__":
    unittest.main()
