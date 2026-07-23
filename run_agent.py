"""
OpenClaw Agent Runner
Processes task_queue.json through the Axonic guardrail layer.
"""
import json
import sys
import os
import re

sys.path.insert(0, os.path.dirname(__file__))
from setup_database import setup_database
from src.protected_tools import execute_transfer, send_client_summary, read_client_data

DB_PATH = "jpmc_mock.db"


def parse_task(task_text):
    """Parse natural language task into function call."""
    text = task_text.lower()

    # Transfer pattern
    m = re.search(r'transfer \$?([\d,]+)', text)
    client_m = re.search(r'client (\d+)', text)
    if m and client_m:
        amount = float(m.group(1).replace(',', ''))
        cid = int(client_m.group(1))
        dest = "Internal Transfer"
        for bank in ["wells fargo", "bank of america", "citibank",
                      "goldman sachs", "morgan stanley"]:
            if bank in text:
                dest = bank.title()
                break
        if "offshore" in text or "swiss" in text:
            dest = "Offshore Account (FLAGGED)"
        return ("transfer", cid, amount, dest)

    # Email / send pattern
    if "email" in text or "send" in text:
        client_m = re.search(r'client (\d+)', text)
        email_m = re.search(r'to\s+([\w.+-]+@[\w.-]+)', text)
        if client_m:
            cid = int(client_m.group(1))
            email = email_m.group(1) if email_m else "unknown@jpmc.com"
            return ("email", cid, email)

    # Read pattern
    if "read" in text or "details" in text:
        client_m = re.search(r'client (\d+)', text)
        if client_m:
            return ("read", int(client_m.group(1)))

    return None


def run_queue():
    """Run all tasks from the queue."""
    print("=" * 64)
    print("  AXONIC GUARDRAIL — Agent Task Queue Runner")
    print("=" * 64)

    # Setup DB
    print("\n[1/3] Setting up database...")
    setup_database(DB_PATH)

    # Load tasks
    print("\n[2/3] Loading task queue...")
    with open("task_queue.json") as f:
        tasks = json.load(f)["tasks"]
    print(f"       {len(tasks)} tasks loaded\n")

    # Process
    print("[3/3] Processing tasks...\n")
    stats = {"approved": 0, "blocked": 0, "review": 0, "error": 0}

    for task in tasks:
        tid = task["id"]
        text = task["task"]
        ttype = task["type"]
        label = "🟢 SAFE" if ttype == "safe" else "🔴 TRAP"

        print(f"─── Task {tid:>2} │ {label} ───")
        print(f"  \"{text}\"")

        parsed = parse_task(text)
        if not parsed:
            print("  ⚠️  Could not parse task\n")
            stats["error"] += 1
            continue

        if parsed[0] == "transfer":
            _, cid, amount, dest = parsed
            result = execute_transfer(cid, amount, dest, DB_PATH)
        elif parsed[0] == "email":
            _, cid, email = parsed
            result = send_client_summary(cid, email, DB_PATH)
        elif parsed[0] == "read":
            _, cid = parsed
            result = read_client_data(cid, DB_PATH)
            print(f"  ✅ APPROVED  │ read_client_data  │ risk: 0")

        # Track stats
        if isinstance(result, dict):
            s = result.get("status", "")
            if s == "BLOCKED":
                stats["blocked"] += 1
            elif s == "HELD_FOR_REVIEW":
                stats["review"] += 1
            else:
                stats["approved"] += 1
        else:
            stats["approved"] += 1

        print()

    # Summary
    print("=" * 64)
    print("  EXECUTION SUMMARY")
    print("=" * 64)
    print(f"  ✅ Approved:  {stats['approved']}")
    print(f"  🛑 Blocked:   {stats['blocked']}")
    print(f"  🟡 Review:    {stats['review']}")
    print(f"  ⚠️  Errors:    {stats['error']}")
    print("=" * 64)


if __name__ == "__main__":
    run_queue()
