import sqlite3
import json
import asyncio
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from datetime import datetime

app = FastAPI(title="Axonic Compliance API")

# Allow CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "jpmc_mock.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/metrics")
def get_metrics():
    try:
        conn = get_db_connection()
        logs_df = pd.read_sql_query("SELECT * FROM Axonic_Audit_Logs", conn)
        conn.close()
        
        total = len(logs_df)
        if total == 0:
            return {"total": 0, "approved": 0, "blocked": 0, "review": 0, "avg_risk": 0, "compliance_rate": 100}
            
        approved = len(logs_df[logs_df["decision"] == "APPROVED"])
        blocked = len(logs_df[logs_df["decision"] == "BLOCKED"])
        review = len(logs_df[logs_df["decision"] == "REVIEW"])
        
        avg_risk = int(logs_df["risk_score"].mean()) if "risk_score" in logs_df.columns else 0
        compliance_rate = round(((total - blocked) / total) * 100, 1) if total > 0 else 100
        
        return {
            "total": total,
            "approved": approved,
            "blocked": blocked,
            "review": review,
            "avg_risk": avg_risk,
            "compliance_rate": compliance_rate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs")
def get_logs(limit: int = 50):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Axonic_Audit_Logs ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/blocked")
def get_blocked_logs(limit: int = 50):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Axonic_Audit_Logs WHERE decision = 'BLOCKED' ORDER BY id DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pending")
def get_pending_actions(limit: int = 50):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pending_actions ORDER BY timestamp DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        # Parse JSON fields if necessary
        results = []
        for row in rows:
            d = dict(row)
            try:
                d["explanations"] = json.loads(d["explanations"]) if isinstance(d["explanations"], str) else d["explanations"]
            except:
                pass
            results.append(d)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clients")
def get_clients(limit: int = 50):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, account_balance FROM Client_Data LIMIT ?", (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/transactions")
def get_transactions(limit: int = 50):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.id, c.name as client_name, t.amount, 
                   t.destination_account, t.status
            FROM Transactions t
            JOIN Client_Data c ON t.client_id = c.id
            ORDER BY t.id DESC LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/activity")
def get_activity_analytics():
    try:
        conn = get_db_connection()
        logs_df = pd.read_sql_query("SELECT timestamp, decision FROM Axonic_Audit_Logs", conn)
        conn.close()
        
        if logs_df.empty:
            return []
            
        logs_df['datetime'] = pd.to_datetime(logs_df['timestamp'], errors='coerce')
        # Drop rows where datetime parsing failed
        logs_df = logs_df.dropna(subset=['datetime'])
        
        if logs_df.empty:
            return []
            
        # Group by hour
        time_df = logs_df.set_index('datetime').resample('H').size().reset_index(name='Actions')
        # Convert to list of dicts for charting
        result = []
        for _, row in time_df.iterrows():
            result.append({
                "time": row['datetime'].strftime("%H:%M"),
                "actions": int(row['Actions'])
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/rules")
def get_rule_analytics():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT rule_ids_triggered FROM Axonic_Audit_Logs WHERE decision = 'BLOCKED'")
        rows = cursor.fetchall()
        conn.close()
        
        rule_counts = {}
        for row in rows:
            try:
                ids = row["rule_ids_triggered"]
                rules = json.loads(ids) if isinstance(ids, str) else (ids or [])
                for r in rules:
                    rule_counts[r] = rule_counts.get(r, 0) + 1
            except:
                pass
                
        # Convert to list of dicts for frontend charts
        result = [{"rule": k, "count": v} for k, v in rule_counts.items()]
        return sorted(result, key=lambda x: x["count"], reverse=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Auth Endpoints ---

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

@app.post("/api/auth/login")
def login(request: LoginRequest):
    # Mock JWT authentication
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Missing credentials")
    return {"token": "mock-jwt-token-123", "user": {"email": request.email, "role": "admin"}}

@app.post("/api/auth/register")
def register(request: RegisterRequest):
    # Mock registration
    return {"token": "mock-jwt-token-123", "user": {"name": request.name, "email": request.email, "role": "admin"}}

# --- WebSocket for Real-time Live Ops ---

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    last_id = 0
    try:
        # Get the highest ID initially to only send new logs
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(id) as max_id FROM Axonic_Audit_Logs")
        row = cursor.fetchone()
        last_id = row["max_id"] if row and row["max_id"] else 0
        conn.close()

        while True:
            await asyncio.sleep(1) # Poll every second
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM Axonic_Audit_Logs WHERE id > ? ORDER BY id ASC", (last_id,))
            new_logs = cursor.fetchall()
            conn.close()

            if new_logs:
                logs_dicts = [dict(log) for log in new_logs]
                await websocket.send_json({"type": "new_logs", "data": logs_dicts})
                last_id = new_logs[-1]["id"]
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")

# --- Human-in-the-Loop Resolution Endpoints ---
from src.audit.escalation import EscalationManager

@app.post("/api/reviews/{review_id}/approve")
def approve_review(review_id: str):
    try:
        manager = EscalationManager(db_path=DB_PATH)
        res = manager.resolve_action(review_id, "APPROVED")
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reviews/{review_id}/reject")
def reject_review(review_id: str):
    try:
        manager = EscalationManager(db_path=DB_PATH)
        res = manager.resolve_action(review_id, "REJECTED")
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
