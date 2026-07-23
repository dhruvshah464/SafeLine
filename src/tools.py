"""
OpenClaw Agent Tools — Vulnerable Base Tools
These functions perform CRUD operations against jpmc_mock.db.
NO safety checks are applied here — the @axonic_guardrail decorator handles that.
"""

import sqlite3
import json
from typing import Dict, Any, Optional


DB_PATH = "jpmc_mock.db"


def read_client_data(client_id: int, db_path: str = DB_PATH) -> Dict[str, Any]:
    """
    Read client data from the database.
    
    Args:
        client_id: The client's ID
        db_path: Path to the SQLite database
    
    Returns:
        Dictionary with client information
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM Client_Data WHERE id = ?", (client_id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return {"error": f"Client {client_id} not found"}

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "account_balance": row["account_balance"],
        "ssn": row["ssn"]
    }


def execute_transfer(
    client_id: int,
    amount: float,
    destination: str,
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """
    Execute a financial transfer for a client.
    
    Args:
        client_id: The client's ID
        amount: Transfer amount in USD
        destination: Destination account identifier
        db_path: Path to the SQLite database
    
    Returns:
        Dictionary with transfer result
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Verify client exists
    cursor.execute("SELECT * FROM Client_Data WHERE id = ?", (client_id,))
    client = cursor.fetchone()
    if client is None:
        conn.close()
        return {"error": f"Client {client_id} not found", "status": "FAILED"}

    # Check sufficient balance
    if client["account_balance"] < amount:
        conn.close()
        return {
            "error": "Insufficient funds",
            "available": client["account_balance"],
            "requested": amount,
            "status": "FAILED"
        }

    # Execute the transfer
    new_balance = client["account_balance"] - amount
    cursor.execute(
        "UPDATE Client_Data SET account_balance = ? WHERE id = ?",
        (new_balance, client_id)
    )
    cursor.execute(
        "INSERT INTO Transactions (client_id, amount, destination_account, status) VALUES (?, ?, ?, ?)",
        (client_id, amount, destination, "COMPLETED")
    )

    conn.commit()
    txn_id = cursor.lastrowid
    conn.close()

    return {
        "status": "COMPLETED",
        "transaction_id": txn_id,
        "client_id": client_id,
        "client_name": client["name"],
        "amount": amount,
        "destination": destination,
        "previous_balance": client["account_balance"],
        "new_balance": new_balance
    }


def send_client_summary(
    client_id: int,
    target_email: str,
    db_path: str = DB_PATH
) -> Dict[str, Any]:
    """
    Send a client's account summary to an email address.
    In production this would send an actual email — here it simulates the action.
    
    Args:
        client_id: The client's ID
        target_email: Email address to send the summary to
        db_path: Path to the SQLite database
    
    Returns:
        Dictionary with email send result
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get client data
    cursor.execute("SELECT * FROM Client_Data WHERE id = ?", (client_id,))
    client = cursor.fetchone()
    if client is None:
        conn.close()
        return {"error": f"Client {client_id} not found", "status": "FAILED"}

    # Get recent transactions
    cursor.execute(
        "SELECT * FROM Transactions WHERE client_id = ? ORDER BY id DESC LIMIT 5",
        (client_id,)
    )
    transactions = [dict(row) for row in cursor.fetchall()]
    conn.close()

    # Build summary (this is the sensitive payload)
    summary = {
        "client_name": client["name"],
        "client_email": client["email"],
        "account_balance": client["account_balance"],
        "ssn": client["ssn"],  # ⚠️ PII leak — guardrail should catch this
        "recent_transactions": transactions
    }

    return {
        "status": "SENT",
        "recipient": target_email,
        "client_id": client_id,
        "summary_preview": {
            "name": client["name"],
            "balance": f"${client['account_balance']:,.2f}",
            "transaction_count": len(transactions)
        }
    }
