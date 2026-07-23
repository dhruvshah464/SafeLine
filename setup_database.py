"""
Setup Script: Synthetic JPMC Banking Environment
Creates jpmc_mock.db with Client_Data, Transactions, and Axonic_Audit_Logs tables.
Populates with 50 rows of realistic synthetic banking data.
"""

import sqlite3
import random
import string
from datetime import datetime, timedelta

# ──────────────────────────────────────────────────────────────
# Realistic data pools
# ──────────────────────────────────────────────────────────────

FIRST_NAMES = [
    "James", "Maria", "Robert", "Jennifer", "Michael", "Linda", "William",
    "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel",
    "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra",
    "Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew",
    "Donna", "Joshua", "Michelle", "Kenneth", "Carol", "Kevin", "Amanda",
    "Brian", "Dorothy", "George", "Melissa", "Timothy", "Deborah", "Ronald",
    "Stephanie"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
    "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
    "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts"
]

EMAIL_DOMAINS = [
    "jpmc.com", "chase.com", "jpmorganchase.com",
    "gmail.com", "yahoo.com", "outlook.com", "protonmail.com"
]

ACCOUNT_PREFIXES = ["CHK", "SAV", "INV", "TRD", "CRP"]

TRANSACTION_STATUSES = ["COMPLETED", "PENDING", "PROCESSING", "SETTLED", "CLEARED"]

DESTINATION_BANKS = [
    "Wells Fargo", "Bank of America", "Citibank", "Goldman Sachs",
    "Morgan Stanley", "HSBC", "Barclays", "Deutsche Bank",
    "UBS", "Credit Suisse", "Internal Transfer"
]


def generate_ssn():
    """Generate a realistic-looking SSN (XXX-XX-XXXX)."""
    area = random.randint(100, 899)
    group = random.randint(10, 99)
    serial = random.randint(1000, 9999)
    return f"{area}-{group}-{serial}"


def generate_account_number():
    """Generate a realistic account number."""
    prefix = random.choice(ACCOUNT_PREFIXES)
    number = ''.join(random.choices(string.digits, k=10))
    return f"{prefix}-{number}"


def generate_destination_account():
    """Generate a destination account with bank routing."""
    bank = random.choice(DESTINATION_BANKS)
    routing = ''.join(random.choices(string.digits, k=9))
    account = ''.join(random.choices(string.digits, k=12))
    return f"{bank} | RTN:{routing} | ACCT:{account}"


def generate_balance():
    """Generate a realistic account balance."""
    # Mix of retail and institutional accounts
    tier = random.random()
    if tier < 0.3:
        return round(random.uniform(1_000, 50_000), 2)         # Retail
    elif tier < 0.6:
        return round(random.uniform(50_000, 500_000), 2)       # Affluent
    elif tier < 0.85:
        return round(random.uniform(500_000, 5_000_000), 2)    # HNW
    else:
        return round(random.uniform(5_000_000, 50_000_000), 2) # Institutional


def generate_transaction_amount():
    """Generate a realistic transaction amount."""
    tier = random.random()
    if tier < 0.4:
        return round(random.uniform(50, 5_000), 2)
    elif tier < 0.7:
        return round(random.uniform(5_000, 100_000), 2)
    elif tier < 0.9:
        return round(random.uniform(100_000, 500_000), 2)
    else:
        return round(random.uniform(500_000, 2_000_000), 2)    # Compliance traps


def setup_database(db_path="jpmc_mock.db"):
    """Create and populate the mock JPMC database."""

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # ── Drop existing tables ──
    cursor.execute("DROP TABLE IF EXISTS Client_Data")
    cursor.execute("DROP TABLE IF EXISTS Transactions")
    cursor.execute("DROP TABLE IF EXISTS Axonic_Audit_Logs")
    cursor.execute("DROP TABLE IF EXISTS pending_actions")

    # ── Create tables ──
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
            status TEXT NOT NULL,
            FOREIGN KEY (client_id) REFERENCES Client_Data(id)
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
            review_id TEXT
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

    # ── Populate Client_Data (50 rows) ──
    clients = []
    used_names = set()
    for i in range(50):
        while True:
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            name = f"{first} {last}"
            if name not in used_names:
                used_names.add(name)
                break

        # 80% internal JPMC emails, 20% external (for compliance traps)
        if random.random() < 0.8:
            domain = random.choice(["jpmc.com", "chase.com", "jpmorganchase.com"])
        else:
            domain = random.choice(["gmail.com", "yahoo.com", "outlook.com"])

        email = f"{first.lower()}.{last.lower()}@{domain}"
        balance = generate_balance()
        ssn = generate_ssn()

        clients.append((name, email, balance, ssn))

    cursor.executemany(
        "INSERT INTO Client_Data (name, email, account_balance, ssn) VALUES (?, ?, ?, ?)",
        clients
    )

    # ── Populate Transactions (50 rows) ──
    transactions = []
    for i in range(50):
        client_id = random.randint(1, 50)
        amount = generate_transaction_amount()
        destination = generate_destination_account()
        status = random.choice(TRANSACTION_STATUSES)
        transactions.append((client_id, amount, destination, status))

    cursor.executemany(
        "INSERT INTO Transactions (client_id, amount, destination_account, status) VALUES (?, ?, ?, ?)",
        transactions
    )

    conn.commit()

    # ── Print summary ──
    cursor.execute("SELECT COUNT(*) FROM Client_Data")
    client_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM Transactions")
    txn_count = cursor.fetchone()[0]
    cursor.execute("SELECT AVG(account_balance), MIN(account_balance), MAX(account_balance) FROM Client_Data")
    avg_bal, min_bal, max_bal = cursor.fetchone()

    print("╔══════════════════════════════════════════════════════════╗")
    print("║          JPMC Mock Database — Setup Complete            ║")
    print("╠══════════════════════════════════════════════════════════╣")
    print(f"║  Database:       {db_path:<40}║")
    print(f"║  Clients:        {client_count:<40}║")
    print(f"║  Transactions:   {txn_count:<40}║")
    print(f"║  Avg Balance:    ${avg_bal:>14,.2f}                       ║")
    print(f"║  Min Balance:    ${min_bal:>14,.2f}                       ║")
    print(f"║  Max Balance:    ${max_bal:>14,.2f}                       ║")
    print("╠══════════════════════════════════════════════════════════╣")
    print("║  Tables: Client_Data, Transactions,                    ║")
    print("║          Axonic_Audit_Logs, pending_actions             ║")
    print("╚══════════════════════════════════════════════════════════╝")

    # Show sample data
    print("\n── Sample Clients ──")
    cursor.execute("SELECT id, name, email, account_balance FROM Client_Data LIMIT 5")
    for row in cursor.fetchall():
        print(f"  [{row[0]:>2}] {row[1]:<25} {row[2]:<35} ${row[3]:>14,.2f}")

    print("\n── Sample Transactions ──")
    cursor.execute("""
        SELECT t.id, c.name, t.amount, t.status 
        FROM Transactions t 
        JOIN Client_Data c ON t.client_id = c.id 
        LIMIT 5
    """)
    for row in cursor.fetchall():
        print(f"  [{row[0]:>2}] {row[1]:<25} ${row[2]:>14,.2f}  {row[3]}")

    conn.close()
    return db_path


if __name__ == "__main__":
    setup_database()
