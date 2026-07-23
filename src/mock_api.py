"""
Mock Stripe-like Payment API
Simulates a real-world payment gateway for the Axonic guardrail to protect.
"""

import uuid
import random
from datetime import datetime
from typing import Dict, Any, Optional


class MockStripeAPI:
    """
    Simulates Stripe-like payment endpoints.
    All calls go through the Axonic guardrail before execution.
    """

    def __init__(self):
        self.payments = {}
        self.balance = 10_000_000.00  # $10M starting balance

    def charge(
        self,
        amount: float,
        currency: str = "usd",
        source: str = "tok_visa",
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """POST /api/payments/charge"""
        payment_id = f"ch_{uuid.uuid4().hex[:16]}"
        self.balance -= amount
        payment = {
            "id": payment_id,
            "object": "charge",
            "amount": amount,
            "currency": currency,
            "source": source,
            "description": description,
            "status": "succeeded",
            "created": int(datetime.utcnow().timestamp()),
            "metadata": metadata or {},
        }
        self.payments[payment_id] = payment
        return payment

    def refund(
        self,
        charge_id: str,
        amount: Optional[float] = None,
        reason: str = "requested_by_customer",
    ) -> Dict[str, Any]:
        """POST /api/payments/refund"""
        original = self.payments.get(charge_id)
        if not original:
            return {"error": {"type": "invalid_request", "message": f"No such charge: {charge_id}"}}

        refund_amount = amount or original["amount"]
        self.balance += refund_amount
        refund_id = f"re_{uuid.uuid4().hex[:16]}"
        return {
            "id": refund_id,
            "object": "refund",
            "amount": refund_amount,
            "charge": charge_id,
            "reason": reason,
            "status": "succeeded",
            "created": int(datetime.utcnow().timestamp()),
        }

    def get_balance(self) -> Dict[str, Any]:
        """GET /api/payments/balance"""
        return {
            "object": "balance",
            "available": [{"amount": self.balance, "currency": "usd"}],
            "pending": [{"amount": random.uniform(1000, 50000), "currency": "usd"}],
        }

    def list_charges(self, limit: int = 10) -> Dict[str, Any]:
        """GET /api/payments/charges"""
        charges = list(self.payments.values())[-limit:]
        return {
            "object": "list",
            "data": charges,
            "has_more": len(self.payments) > limit,
            "total_count": len(self.payments),
        }
