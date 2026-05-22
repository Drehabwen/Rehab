import json
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

# Define Pydantic Models for Schema Validation

class SyncSubject(BaseModel):
    subject_id: str
    display_name: str
    sex: str
    age: Optional[int] = None
    height_cm: Optional[float] = None
    notes: Optional[str] = ""

class SyncProtocolResult(BaseModel):
    result_id: str
    protocol: str
    status: str
    capture_quality: str
    metrics: Dict[str, Any]
    findings: List[str]
    risk_flags: List[str]
    recommendations: List[str]
    psi_score: Optional[float] = None
    severity_grades: Optional[Dict[str, str]] = None

class SyncIntegratedReport(BaseModel):
    report_id: str
    title: str
    overall_risk: str
    consistency_level: str
    main_patterns: List[str]
    next_action: str
    summary: str
    recommendations: List[str]

class SyncLlmAnalysis(BaseModel):
    enhanced_summary: Optional[str] = None
    clinical_context: Optional[str] = None
    risk_narrative: Optional[str] = None
    suggestions: List[str] = []
    limitations: List[str] = []

class SyncScreeningPayload(BaseModel):
    session_id: str
    subject: SyncSubject
    protocol_results: List[SyncProtocolResult]
    integrated_report: Optional[SyncIntegratedReport] = None
    llm_analysis: Optional[SyncLlmAnalysis] = None
    created_at: str
    completed_at: Optional[str] = None

# Synced Screening Response Model
class SyncedScreeningBrief(BaseModel):
    session_id: str
    subject_id: str
    subject_display_name: str
    overall_risk: str
    status: str
    created_at: str
    synced_at: str

class SyncedScreeningDetail(SyncedScreeningBrief):
    payload: Dict[str, Any]

class ScalePushPayload(BaseModel):
    patient_id: str
    patient_name: Optional[str] = None
    session_id: str
    scale_id: str
    therapist_name: str

class ScaleSubmitPayload(BaseModel):
    task_id: str
    session_id: str
    scale_data: Dict[str, Any]

# Database Helper Function
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rehab_integration.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS synced_screenings (
                session_id TEXT PRIMARY KEY,
                subject_id TEXT NOT NULL,
                subject_display_name TEXT NOT NULL,
                overall_risk TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL,
                synced_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS pending_scales (
                task_id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                patient_name TEXT,
                session_id TEXT NOT NULL,
                scale_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                payload TEXT,
                created_at TEXT NOT NULL,
                submitted_at TEXT
            )
        """)
        conn.commit()
        # Dynamically add patient_name column if it does not exist in old DBs
        try:
            conn.execute("ALTER TABLE pending_scales ADD COLUMN patient_name TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
    finally:
        conn.close()

# Initialize DB on import
init_db()

router = APIRouter(prefix="/api/integration", tags=["integration"])

@router.post("/sync-screening")
async def sync_screening(payload: SyncScreeningPayload):
    """
    Sync a screening session from SquatLab.
    Saves to the local SQLite integration database for B2B Therapist workspace ingestion.
    """
    conn = get_db_connection()
    try:
        # Check if already exists (idempotency check)
        cursor = conn.cursor()
        cursor.execute("SELECT session_id FROM synced_screenings WHERE session_id = ?", (payload.session_id,))
        exists = cursor.fetchone()

        now_str = datetime.now().isoformat()
        payload_json = payload.model_dump_json()

        subject_name = payload.subject.display_name
        overall_risk = payload.integrated_report.overall_risk if payload.integrated_report else "low"

        if exists:
            # Update existing
            cursor.execute("""
                UPDATE synced_screenings
                SET subject_id = ?,
                    subject_display_name = ?,
                    overall_risk = ?,
                    payload = ?,
                    created_at = ?,
                    synced_at = ?
                WHERE session_id = ?
            """, (
                payload.subject.subject_id,
                subject_name,
                overall_risk,
                payload_json,
                payload.created_at,
                now_str,
                payload.session_id
            ))
            action = "updated"
        else:
            # Insert new
            cursor.execute("""
                INSERT INTO synced_screenings (
                    session_id, subject_id, subject_display_name, overall_risk, status, payload, created_at, synced_at
                ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
            """, (
                payload.session_id,
                payload.subject.subject_id,
                subject_name,
                overall_risk,
                payload_json,
                payload.created_at,
                now_str
            ))
            action = "created"

        conn.commit()
        return {"status": "success", "action": action, "session_id": payload.session_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database synchronization failed: {str(e)}")
    finally:
        conn.close()

@router.get("/synced-screenings", response_model=List[SyncedScreeningBrief])
async def list_synced_screenings(status: Optional[str] = None):
    """
    List synced screenings received from SquatLab.
    Optional query parameter: status ('pending' or 'imported')
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if status:
            cursor.execute("""
                SELECT session_id, subject_id, subject_display_name, overall_risk, status, created_at, synced_at
                FROM synced_screenings
                WHERE status = ?
                ORDER BY datetime(synced_at) DESC
            """, (status,))
        else:
            cursor.execute("""
                SELECT session_id, subject_id, subject_display_name, overall_risk, status, created_at, synced_at
                FROM synced_screenings
                ORDER BY datetime(synced_at) DESC
            """)
        
        rows = cursor.fetchall()
        return [
            SyncedScreeningBrief(
                session_id=row["session_id"],
                subject_id=row["subject_id"],
                subject_display_name=row["subject_display_name"],
                overall_risk=row["overall_risk"],
                status=row["status"],
                created_at=row["created_at"],
                synced_at=row["synced_at"]
            )
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query synced screenings: {str(e)}")
    finally:
        conn.close()

@router.get("/synced-screenings/{session_id}", response_model=SyncedScreeningDetail)
async def get_synced_screening_detail(session_id: str):
    """
    Get detailed payload of a specific synced screening record.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT session_id, subject_id, subject_display_name, overall_risk, status, payload, created_at, synced_at
            FROM synced_screenings
            WHERE session_id = ?
        """, (session_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Synced screening record not found")
        
        return SyncedScreeningDetail(
            session_id=row["session_id"],
            subject_id=row["subject_id"],
            subject_display_name=row["subject_display_name"],
            overall_risk=row["overall_risk"],
            status=row["status"],
            created_at=row["created_at"],
            synced_at=row["synced_at"],
            payload=json.loads(row["payload"])
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load details: {str(e)}")
    finally:
        conn.close()

@router.post("/synced-screenings/{session_id}/import")
async def mark_as_imported(session_id: str):
    """
    Mark a synced screening session as imported into clinical records.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT session_id FROM synced_screenings WHERE session_id = ?", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Synced screening record not found")

        cursor.execute("UPDATE synced_screenings SET status = 'imported' WHERE session_id = ?", (session_id,))
        conn.commit()
        return {"status": "success", "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to mark as imported: {str(e)}")
    finally:
        conn.close()

@router.delete("/synced-screenings/{session_id}")
async def delete_synced_screening(session_id: str):
    """
    Delete a synced screening record from the database.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT session_id FROM synced_screenings WHERE session_id = ?", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Synced screening record not found")

        cursor.execute("DELETE FROM synced_screenings WHERE session_id = ?", (session_id,))
        conn.commit()
        return {"status": "success", "session_id": session_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete synced screening: {str(e)}")
    finally:
        conn.close()

@router.post("/scale/push")
async def push_scale_task(payload: ScalePushPayload):
    """
    B2B Workstation pushes a scale to the pending queue.
    """
    import uuid
    conn = get_db_connection()
    try:
        task_id = str(uuid.uuid4())
        now_str = datetime.now().isoformat()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO pending_scales (task_id, patient_id, patient_name, session_id, scale_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
        """, (task_id, payload.patient_id, payload.patient_name, payload.session_id, payload.scale_id, now_str))
        conn.commit()
        return {"status": "success", "task_id": task_id, "scale_id": payload.scale_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to push scale task: {str(e)}")
    finally:
        conn.close()

@router.get("/scale/pending/{patient_id}")
async def get_pending_scales(patient_id: str):
    """
    C-End Chatbot pulls all pending scales for a patient.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT task_id, patient_id, patient_name, session_id, scale_id, status, created_at
            FROM pending_scales
            WHERE (patient_id = ? OR patient_name = ? OR patient_name = (
                SELECT subject_display_name FROM synced_screenings WHERE subject_id = ? LIMIT 1
            )) AND status = 'pending'
            ORDER BY datetime(created_at) DESC
        """, (patient_id, patient_id, patient_id))
        rows = cursor.fetchall()
        return [
            {
                "task_id": row["task_id"],
                "patient_id": row["patient_id"],
                "patient_name": row["patient_name"],
                "session_id": row["session_id"],
                "scale_id": row["scale_id"],
                "status": row["status"],
                "created_at": row["created_at"]
            }
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query pending scales: {str(e)}")
    finally:
        conn.close()

@router.get("/subject/{subject_id}")
async def get_subject_by_id(subject_id: str):
    """
    Query the synced_screenings table by subject_id (which could be the 4-letter code).
    Returns the subject details (name, sex, age, height) so the C-End can automatically populate the profile.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Find the latest synced screening for this subject_id
        cursor.execute("""
            SELECT session_id, subject_id, subject_display_name, payload, created_at
            FROM synced_screenings
            WHERE subject_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 1
        """, (subject_id,))
        row = cursor.fetchone()
        if not row:
            # Check if there is any scale assigned to this patient_id to get patient name
            cursor.execute("""
                SELECT patient_name FROM pending_scales WHERE patient_id = ? LIMIT 1
            """, (subject_id,))
            scale_row = cursor.fetchone()
            if scale_row:
                return {
                    "subject_id": subject_id,
                    "display_name": scale_row["patient_name"],
                    "sex": "unknown",
                    "age": None,
                    "height_cm": None,
                    "from_screening": False,
                    "session_id": None
                }
            raise HTTPException(status_code=404, detail="Subject not found")
        
        payload = json.loads(row["payload"])
        subject = payload.get("subject", {})
        return {
            "subject_id": row["subject_id"],
            "display_name": row["subject_display_name"],
            "sex": subject.get("sex", "unknown"),
            "age": subject.get("age"),
            "height_cm": subject.get("height_cm"),
            "from_screening": True,
            "session_id": row["session_id"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query subject: {str(e)}")
    finally:
        conn.close()

@router.post("/scale/submit")
async def submit_scale(payload: ScaleSubmitPayload):
    """
    C-End Chatbot submits answers and completed scale assessment data.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Verify task exists
        cursor.execute("SELECT task_id FROM pending_scales WHERE task_id = ?", (payload.task_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Scale task not found")

        now_str = datetime.now().isoformat()
        payload_json = json.dumps(payload.scale_data)
        
        cursor.execute("""
            UPDATE pending_scales
            SET status = 'completed',
                payload = ?,
                submitted_at = ?
            WHERE task_id = ?
        """, (payload_json, now_str, payload.task_id))
        conn.commit()
        return {"status": "success", "task_id": payload.task_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit scale: {str(e)}")
    finally:
        conn.close()

@router.get("/scale/results/{session_id}")
async def get_scale_results(session_id: str):
    """
    B-End Workstation polls for completed scale results belonging to a session.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT task_id, patient_id, session_id, scale_id, status, payload, created_at, submitted_at
            FROM pending_scales
            WHERE session_id = ?
            ORDER BY datetime(created_at) DESC
        """, (session_id,))
        rows = cursor.fetchall()
        results = []
        for row in rows:
            scale_data = None
            if row["payload"]:
                try:
                    scale_data = json.loads(row["payload"])
                except Exception:
                    pass
            results.append({
                "task_id": row["task_id"],
                "patient_id": row["patient_id"],
                "session_id": row["session_id"],
                "scale_id": row["scale_id"],
                "status": row["status"],
                "scale_data": scale_data,
                "created_at": row["created_at"],
                "submitted_at": row["submitted_at"]
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get scale results: {str(e)}")
    finally:
        conn.close()
