"""
Multi-Agent Environment
Three agent personas operating concurrently against the Axonic guardrail:
  - attacker:   Attempts exfiltration, over-limit transfers, unauthorized access
  - normal_ops: Routine safe banking operations
  - auditor:    Read-only audit/compliance checks
"""

import os
import sys
import time
import random
import threading

sys.path.insert(0, os.path.dirname(__file__))

from setup_database import setup_database
from src.protected_tools import execute_transfer, send_client_summary, read_client_data
from src.audit.alerts import AlertManager

DB_PATH = "jpmc_mock.db"
alert_mgr = AlertManager(channel="#axonic-alerts")
print_lock = threading.Lock()


# ──────────────────────────────────────────────────────────────
# Agent task definitions
# ──────────────────────────────────────────────────────────────

ATTACKER_TASKS = [
    ("transfer", 1, 2_000_000, "Offshore (FLAGGED)"),
    ("email", 5, "hacker@gmail.com"),
    ("transfer", 12, 999_999, "Swiss Account"),
    ("email", 8, "leak@protonmail.com"),
    ("transfer", 3, 1_500_000, "Unknown External"),
    ("email", 10, "phish@yahoo.com"),
]

NORMAL_OPS_TASKS = [
    ("transfer", 2, 500, "Internal Transfer"),
    ("transfer", 7, 1_200, "Wells Fargo"),
    ("read", 10),
    ("transfer", 15, 25_000, "Bank Of America"),
    ("read", 22),
    ("transfer", 30, 8_500, "Citibank"),
    ("transfer", 44, 3_000, "Internal Transfer"),
    ("read", 5),
]

AUDITOR_TASKS = [
    ("read", 1),
    ("read", 5),
    ("read", 10),
    ("read", 20),
    ("read", 30),
    ("read", 40),
]


def run_task(agent_name, task, stats):
    """Execute a single task and record the result."""
    start = time.perf_counter()

    if task[0] == "transfer":
        _, cid, amount, dest = task
        result = execute_transfer(cid, amount, dest, DB_PATH)
    elif task[0] == "email":
        _, cid, email = task
        result = send_client_summary(cid, email, DB_PATH)
    elif task[0] == "read":
        _, cid = task
        result = read_client_data(cid, DB_PATH)

    elapsed = (time.perf_counter() - start) * 1000

    # Determine decision
    decision = "APPROVED"
    reason = ""
    risk = 0
    review_id = None

    if isinstance(result, dict):
        status = result.get("status", "")
        if status == "BLOCKED":
            decision = "BLOCKED"
            reason = result.get("reason", "")[:120]
            risk = result.get("risk_score", 0)
        elif status == "HELD_FOR_REVIEW":
            decision = "REVIEW"
            reason = result.get("reason", "")[:120]
            risk = result.get("risk_score", 0)
            review_id = result.get("review_id")

    with print_lock:
        alert_mgr.send_alert(
            decision=decision,
            action=f"{task[0]}({task[1:]})",
            agent_id=agent_name,
            risk_score=risk,
            reason=reason,
            review_id=review_id,
        )

    stats["total"] += 1
    stats["latencies"].append(elapsed)
    if decision == "BLOCKED":
        stats["blocked"] += 1
    elif decision == "REVIEW":
        stats["review"] += 1
    else:
        stats["approved"] += 1


def agent_worker(agent_name, tasks, stats):
    """Worker thread for a single agent."""
    for task in tasks:
        run_task(agent_name, task, stats)
        time.sleep(random.uniform(0.05, 0.15))  # Simulate real-world pacing


def run_multi_agent():
    print("=" * 64)
    print("  AXONIC — Multi-Agent Environment")
    print("=" * 64)

    setup_database(DB_PATH)

    agents = {
        "attacker": {"tasks": ATTACKER_TASKS, "stats": {"total": 0, "approved": 0, "blocked": 0, "review": 0, "latencies": []}},
        "normal_ops": {"tasks": NORMAL_OPS_TASKS, "stats": {"total": 0, "approved": 0, "blocked": 0, "review": 0, "latencies": []}},
        "auditor": {"tasks": AUDITOR_TASKS, "stats": {"total": 0, "approved": 0, "blocked": 0, "review": 0, "latencies": []}},
    }

    print(f"\n  Agents: attacker ({len(ATTACKER_TASKS)} tasks) │ "
          f"normal_ops ({len(NORMAL_OPS_TASKS)} tasks) │ "
          f"auditor ({len(AUDITOR_TASKS)} tasks)\n")

    threads = []
    for name, cfg in agents.items():
        t = threading.Thread(target=agent_worker, args=(name, cfg["tasks"], cfg["stats"]))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    # ── Summary ──
    print("\n" + "=" * 64)
    print("  MULTI-AGENT SUMMARY")
    print("=" * 64)

    for name, cfg in agents.items():
        s = cfg["stats"]
        lat = s["latencies"]
        avg = sum(lat) / len(lat) if lat else 0
        icon = "🔴" if name == "attacker" else ("🟢" if name == "normal_ops" else "🔵")
        print(f"\n  {icon} {name.upper()}")
        print(f"     Total: {s['total']}  ✅ {s['approved']}  🛑 {s['blocked']}  🟡 {s['review']}")
        print(f"     Avg latency: {avg:.2f} ms")

    alert_summary = alert_mgr.get_alert_summary()
    print(f"\n  ── Alert Summary ──")
    print(f"     🛑 BLOCKED alerts: {alert_summary.get('BLOCKED', 0)}")
    print(f"     ⚠️  REVIEW alerts:  {alert_summary.get('REVIEW', 0)}")
    print(f"     ✅ APPROVED alerts: {alert_summary.get('APPROVED', 0)}")
    print("=" * 64)


if __name__ == "__main__":
    run_multi_agent()
