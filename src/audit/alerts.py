"""
Slack-style Alert Simulation
Prints formatted real-time alerts for BLOCKED and REVIEW events.
In production, would POST to Slack webhook.
"""

from datetime import datetime
from typing import Dict, Any, Optional


# ANSI color codes for terminal output
class Colors:
    RED = "\033[91m"
    YELLOW = "\033[93m"
    GREEN = "\033[92m"
    BLUE = "\033[94m"
    GOLD = "\033[33m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


class AlertManager:
    """
    Simulates Slack-style real-time alerts for compliance events.
    """

    def __init__(self, channel: str = "#axonic-alerts"):
        self.channel = channel
        self.alert_history = []

    def send_alert(
        self,
        decision: str,
        action: str,
        agent_id: str = "unknown",
        risk_score: int = 0,
        reason: str = "",
        review_id: Optional[str] = None,
    ):
        """Send a formatted alert."""
        ts = datetime.utcnow().strftime("%H:%M:%S")
        alert = {
            "timestamp": ts,
            "decision": decision,
            "action": action,
            "agent_id": agent_id,
            "risk_score": risk_score,
            "reason": reason,
            "review_id": review_id,
        }
        self.alert_history.append(alert)
        self._print_alert(alert)

    def _print_alert(self, alert: Dict[str, Any]):
        decision = alert["decision"]
        ts = alert["timestamp"]
        action = alert["action"]
        agent = alert["agent_id"]
        risk = alert["risk_score"]
        reason = alert["reason"][:120]

        if decision == "BLOCKED":
            icon = "🚨"
            color = Colors.RED
            label = "BLOCKED"
        elif decision == "REVIEW":
            icon = "⚠️ "
            color = Colors.YELLOW
            label = "REVIEW"
        else:
            icon = "✅"
            color = Colors.GREEN
            label = "APPROVED"

        rid = alert.get("review_id")
        rid_str = f" │ {rid}" if rid else ""

        print(
            f"  {color}{Colors.BOLD}{icon} [{self.channel}] {label}{Colors.RESET}"
            f" │ {ts} │ agent:{agent} │ risk:{risk}{rid_str}"
        )
        if decision != "APPROVED":
            print(f"  {Colors.DIM}   └─ {reason}{Colors.RESET}")

    def get_alert_summary(self) -> Dict[str, int]:
        counts = {"BLOCKED": 0, "REVIEW": 0, "APPROVED": 0}
        for a in self.alert_history:
            d = a.get("decision", "APPROVED")
            counts[d] = counts.get(d, 0) + 1
        return counts
