import sqlite3
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

class EscalationManager:
    """
    Manages the escalation pipeline for actions requiring human review.
    Stores pending actions in the jpmc_mock.db SQLite database.
    """
    
    def __init__(self, db_path: str = "jpmc_mock.db"):
        self.db_path = Path(db_path)
        self._init_db()
        
    def _init_db(self):
        """Initialize the SQLite database and create pending_actions table if it doesn't exist."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pending_actions (
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
        
        conn.commit()
        conn.close()
        
    def escalate_action(
        self, 
        audit_id: str, 
        action_type: str,
        payload: Dict[str, Any], 
        context: Dict[str, Any],
        risk_score: int,
        explanations: list
    ) -> str:
        """
        Escalate an action for review.
        
        Returns:
            review_id
        """
        review_id = f"REV-{uuid.uuid4().hex[:8].upper()}"
        timestamp = datetime.now(timezone.utc).isoformat()
        assignee = "compliance_officer"
        status = "PENDING"
        
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO pending_actions 
            (review_id, audit_id, timestamp, assignee, action_type, payload, context, risk_score, explanations, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            review_id,
            audit_id,
            timestamp,
            assignee,
            action_type,
            json.dumps(payload),
            json.dumps(context),
            risk_score,
            json.dumps(explanations),
            status
        ))
        
        conn.commit()
        conn.close()
        
        return review_id

    def resolve_action(self, review_id: str, decision: str, reviewer: str = "compliance_officer") -> Dict[str, Any]:
        """
        Resolve a pending action.
        
        Args:
            review_id: ID of the pending review
            decision: "APPROVED" or "REJECTED"
            reviewer: Name of the reviewer resolving the action
            
        Returns:
            Dict containing status and execution result if approved
        """
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 1. Fetch the pending action
        cursor.execute("SELECT * FROM pending_actions WHERE review_id = ?", (review_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError(f"Review ID {review_id} not found")
            
        pending = dict(row)
        if pending["status"] != "PENDING":
            conn.close()
            return {
                "status": "ALREADY_RESOLVED",
                "message": f"Review {review_id} is already {pending['status']}"
            }
            
        # 2. Update status of the review
        cursor.execute(
            "UPDATE pending_actions SET status = ? WHERE review_id = ?",
            (decision, review_id)
        )
        
        # 3. Update audit log entry
        audit_decision = "APPROVED" if decision == "APPROVED" else "BLOCKED"
        cursor.execute("SELECT * FROM Axonic_Audit_Logs WHERE review_id = ?", (review_id,))
        audit_row = cursor.fetchone()
        
        resolution_msg = f" | Resolved by {reviewer}: {decision}"
        if audit_row:
            new_reason = audit_row["reason"] + resolution_msg
            cursor.execute(
                "UPDATE Axonic_Audit_Logs SET decision = ?, reason = ? WHERE review_id = ?",
                (audit_decision, new_reason, review_id)
            )
        else:
            # Fallback: insert a log if it didn't exist
            cursor.execute('''
                INSERT INTO Axonic_Audit_Logs 
                (timestamp, action_attempted, payload, decision, reason, risk_score, review_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                datetime.now(timezone.utc).isoformat(),
                pending["action_type"],
                pending["payload"],
                audit_decision,
                f"Action resolved by {reviewer}" + resolution_msg,
                pending["risk_score"],
                review_id
            ))
            
        conn.commit()
        conn.close()
        
        # 4. Execute the tool if approved
        execution_result = None
        if decision == "APPROVED":
            try:
                payload = json.loads(pending["payload"])
                func_name = payload.get("function")
                
                if func_name == "execute_transfer":
                    from ..tools import execute_transfer as raw_transfer
                    # Extract args
                    client_id = payload.get("client_id")
                    if client_id is None and payload.get("args"):
                        client_id = payload["args"][0]
                    amount = payload.get("amount")
                    if amount is None and payload.get("args") and len(payload["args"]) >= 2:
                        amount = payload["args"][1]
                    destination = payload.get("destination")
                    if destination is None and payload.get("args") and len(payload["args"]) >= 3:
                        destination = payload["args"][2]
                        
                    execution_result = raw_transfer(
                        client_id=int(client_id),
                        amount=float(amount),
                        destination=str(destination),
                        db_path=str(self.db_path)
                    )
                    
                elif func_name == "send_client_summary":
                    from ..tools import send_client_summary as raw_summary
                    client_id = payload.get("client_id")
                    if client_id is None and payload.get("args"):
                        client_id = payload["args"][0]
                    recipient = payload.get("recipient")
                    if recipient is None and payload.get("args") and len(payload["args"]) >= 2:
                        recipient = payload["args"][1]
                        
                    execution_result = raw_summary(
                        client_id=int(client_id),
                        target_email=str(recipient),
                        db_path=str(self.db_path)
                    )
            except Exception as e:
                execution_result = {"status": "FAILED", "error": f"Resolution execution failed: {str(e)}"}
                
        return {
            "status": "RESOLVED",
            "decision": decision,
            "review_id": review_id,
            "execution_result": execution_result
        }
