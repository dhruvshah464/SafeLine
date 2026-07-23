"""
Immutable Audit Trail Logger
Blockchain-style hash-chained logs with cryptographic signing and tamper detection.
"""

import json
import hashlib
import hmac
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional


class AuditLogger:
    """
    Maintains immutable audit trail of all compliance decisions.
    Uses hash-chaining (each entry references the hash of the previous entry),
    HMAC signatures for per-entry integrity, and a full chain verification method.
    """

    AUDIT_SECRET = os.environ.get(
        "SAFELINE_AUDIT_SECRET",
        "safeline-audit-secret-do-not-use-in-prod"
    )
    GENESIS_HASH = "0" * 64  # Genesis block prev_hash

    def __init__(self, log_path: str):
        """
        Initialize audit logger.

        Args:
            log_path: Path to audit trail log file
        """
        self.log_path = Path(log_path)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

        if not self.log_path.exists():
            self.log_path.touch()

        self._in_memory_cache: List[Dict[str, Any]] = []
        self._log_index = 0
        self._prev_hash = self.GENESIS_HASH

        # Rebuild state from existing log
        self._rebuild_chain_state()

    # ──────────────────────────────────────────────────────────
    # Core write
    # ──────────────────────────────────────────────────────────

    def log_entry(self, entry: Dict[str, Any]) -> str:
        """
        Log an audit entry with hash-chain linking and HMAC signature.

        Args:
            entry: Audit entry to log

        Returns:
            Audit ID of logged entry
        """
        if "audit_id" not in entry:
            entry["audit_id"] = ""
        if "timestamp" not in entry:
            entry["timestamp"] = datetime.utcnow().isoformat()

        self._log_index += 1

        entry_json = json.dumps(entry, sort_keys=True)
        signature = self._sign_entry(entry_json)

        # Hash chain: hash(prev_hash + current_entry)
        chain_input = f"{self._prev_hash}{entry_json}"
        current_hash = hashlib.sha256(chain_input.encode()).hexdigest()

        log_record = {
            "log_index": self._log_index,
            "prev_hash": self._prev_hash,
            "entry": entry,
            "signature": signature,
            "hash": current_hash,
            "log_timestamp": datetime.utcnow().isoformat(),
        }

        with open(self.log_path, "a") as f:
            f.write(json.dumps(log_record) + "\n")

        self._prev_hash = current_hash
        self._in_memory_cache.append(log_record)

        return entry.get("audit_id", "")

    # ──────────────────────────────────────────────────────────
    # Hashing helpers
    # ──────────────────────────────────────────────────────────

    def hash_payload(self, payload: Dict[str, Any]) -> str:
        """Create SHA256 hash of payload for immutable reference."""
        payload_json = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(payload_json.encode()).hexdigest()

    def _sign_entry(self, entry_json: str) -> str:
        """Create HMAC-SHA256 signature for an entry."""
        return hmac.new(
            self.AUDIT_SECRET.encode(),
            entry_json.encode(),
            hashlib.sha256,
        ).hexdigest()

    def _verify_entry_signature(self, entry_json: str, signature: str) -> bool:
        """Verify HMAC signature of an audit entry."""
        expected = self._sign_entry(entry_json)
        return hmac.compare_digest(expected, signature)

    # ──────────────────────────────────────────────────────────
    # Chain rebuild (on startup)
    # ──────────────────────────────────────────────────────────

    def _rebuild_chain_state(self):
        """Replay the log file to restore log_index and prev_hash."""
        if not self.log_path.exists():
            return
        with open(self.log_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    self._log_index = record.get("log_index", self._log_index)
                    self._prev_hash = record.get("hash", self._prev_hash)
                    self._in_memory_cache.append(record)
                except json.JSONDecodeError:
                    continue

    # ──────────────────────────────────────────────────────────
    # Integrity verification
    # ──────────────────────────────────────────────────────────

    def verify_integrity(self) -> bool:
        """
        Walk the full hash chain and verify every entry.
        Returns True only if the entire chain is intact:
          1. Each entry's HMAC signature is valid.
          2. Each entry's hash == sha256(prev_hash + entry_json).
          3. Each entry's prev_hash matches the previous entry's hash.
          4. log_index is strictly sequential.
        """
        try:
            if not self.log_path.exists():
                return True

            expected_prev = self.GENESIS_HASH
            expected_index = 1

            with open(self.log_path, "r") as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        record = json.loads(line)
                    except json.JSONDecodeError:
                        print(f"[INTEGRITY] Malformed JSON at line {line_num}")
                        return False

                    # Required fields
                    for field in ("log_index", "prev_hash", "entry", "signature", "hash"):
                        if field not in record:
                            print(f"[INTEGRITY] Missing '{field}' at line {line_num}")
                            return False

                    # Sequential index
                    if record["log_index"] != expected_index:
                        print(f"[INTEGRITY] Index gap at line {line_num}: "
                              f"expected {expected_index}, got {record['log_index']}")
                        return False

                    # Chain link
                    if record["prev_hash"] != expected_prev:
                        print(f"[INTEGRITY] Broken chain at line {line_num}")
                        return False

                    # HMAC signature
                    entry_json = json.dumps(record["entry"], sort_keys=True)
                    if not self._verify_entry_signature(entry_json, record["signature"]):
                        print(f"[INTEGRITY] Bad signature at line {line_num}")
                        return False

                    # Hash verification
                    chain_input = f"{record['prev_hash']}{entry_json}"
                    expected_hash = hashlib.sha256(chain_input.encode()).hexdigest()
                    if record["hash"] != expected_hash:
                        print(f"[INTEGRITY] Hash mismatch at line {line_num}")
                        return False

                    expected_prev = record["hash"]
                    expected_index += 1

            return True

        except Exception as e:
            print(f"[INTEGRITY] Error: {e}")
            return False

    # ──────────────────────────────────────────────────────────
    # Read helpers
    # ──────────────────────────────────────────────────────────

    def get_entries(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Retrieve audit entries with optional filtering."""
        entries = []
        try:
            if not self.log_path.exists():
                return entries
            with open(self.log_path, "r") as f:
                for line in f:
                    try:
                        record = json.loads(line)
                        entry = record.get("entry", {})
                        if self._matches_filters(entry, filters):
                            entries.append(entry)
                    except json.JSONDecodeError:
                        continue
            return entries
        except Exception as e:
            print(f"Error reading audit entries: {e}")
            return entries

    def _matches_filters(self, entry: Dict[str, Any], filters: Optional[Dict[str, Any]]) -> bool:
        """Check if entry matches filter criteria."""
        if not filters:
            return True
        if "decision" in filters and entry.get("decision") != filters["decision"]:
            return False
        if "action_type" in filters and entry.get("action_type") != filters["action_type"]:
            return False
        if "user" in filters and entry.get("requester") != filters["user"]:
            return False
        if "date_range" in filters:
            start, end = filters["date_range"]
            ts = entry.get("timestamp", "")
            if not (start <= ts <= end):
                return False
        return True

    # ──────────────────────────────────────────────────────────
    # Reports
    # ──────────────────────────────────────────────────────────

    def get_denial_report(self) -> Dict[str, Any]:
        """Generate report of all denied actions."""
        denied = self.get_entries({"decision": "DENIED"})
        violations_summary: Dict[str, int] = {}
        actions_by_type: Dict[str, int] = {}
        for entry in denied:
            for v in entry.get("violations", []):
                violations_summary[v] = violations_summary.get(v, 0) + 1
            a = entry.get("action_type", "unknown")
            actions_by_type[a] = actions_by_type.get(a, 0) + 1
        return {
            "total_denials": len(denied),
            "violations_summary": violations_summary,
            "denials_by_action_type": actions_by_type,
            "entries": denied,
        }

    def get_compliance_statistics(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Get compliance statistics for a date range."""
        entries = self.get_entries({"date_range": (start_date, end_date)})
        approved = sum(1 for e in entries if e.get("decision") == "APPROVED")
        denied = sum(1 for e in entries if e.get("decision") == "DENIED")
        total = len(entries)
        avg = sum(e.get("compliance_score", 1) for e in entries) / max(1, total)
        return {
            "period": {"start": start_date, "end": end_date},
            "total_actions": total,
            "approved": approved,
            "denied": denied,
            "approval_rate": approved / max(1, total),
            "average_compliance_score": avg,
            "integrity_verified": self.verify_integrity(),
        }

    def export_entries(self, output_path: str, filters: Optional[Dict[str, Any]] = None):
        """Export audit entries to file."""
        entries = self.get_entries(filters)
        with open(output_path, "w") as f:
            f.write(json.dumps(entries, indent=2))

    def clear_log(self):
        """Clear the audit log file (DANGEROUS — use with caution)."""
        self.log_path.unlink(missing_ok=True)
        self.log_path.touch()
        self._in_memory_cache = []
        self._log_index = 0
        self._prev_hash = self.GENESIS_HASH
