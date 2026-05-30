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

# ── Phase 3: 康复师↔家长数据通道 ──

class FamilyLinkPayload(BaseModel):
    """家长用家庭码绑定孩子档案"""
    subject_id: str
    family_code: str

class TreatmentPlanPushPayload(BaseModel):
    """B端康复师推送训练处方"""
    patient_id: str
    patient_name: Optional[str] = None
    session_id: str
    therapist_name: str
    plan_content: str = Field(..., description="Markdown 格式的训练处方内容")

class TreatmentPlanBrief(BaseModel):
    """训练处方摘要（返回给家长端）"""
    plan_id: str
    patient_id: str
    patient_name: Optional[str] = None
    therapist_name: Optional[str] = None
    plan_content: str
    status: str
    created_at: str
    updated_at: Optional[str] = None

class AssessmentPushPayload(BaseModel):
    """B端康复师推送评估摘要（家长友好语言版）"""
    patient_id: str
    patient_name: Optional[str] = None
    session_id: str
    risk_level: str = Field(..., description="none / low / medium / high")
    risk_label: str = Field(..., description="如：轻度脊柱侧弯风险")
    summary_text: str = Field(..., description="家长友好语言的评估摘要")
    concerns: Optional[List[str]] = Field(default=[], description="关注点列表")
    recommendations: Optional[List[str]] = Field(default=[], description="建议列表")

class AssessmentSummaryResponse(BaseModel):
    """评估摘要响应"""
    summary_id: str
    patient_id: str
    patient_name: Optional[str] = None
    session_id: str
    risk_level: str
    risk_label: str
    summary_text: str
    concerns: List[str] = []
    recommendations: List[str] = []
    created_at: str

class TrackingSubmitPayload(BaseModel):
    """C端家长提交每日打卡数据"""
    patient_id: str
    patient_name: Optional[str] = None
    tracking_date: str = Field(..., description="打卡日期 YYYY-MM-DD")
    exercises_completed: Optional[List[Dict[str, Any]]] = Field(default=[], description="完成的训练动作列表")
    total_duration_min: Optional[int] = Field(default=0, description="总训练时长（分钟）")
    symptoms: Optional[Dict[str, Any]] = Field(default={}, description="症状记录")
    notes: Optional[str] = Field(default="", description="备注")

class TrackingRecordResponse(BaseModel):
    """每日追踪记录响应"""
    id: int
    patient_id: str
    patient_name: Optional[str] = None
    tracking_date: str
    exercises_completed: List[Dict[str, Any]] = []
    total_duration_min: Optional[int] = 0
    symptoms: Optional[Dict[str, Any]] = {}
    notes: Optional[str] = ""
    submitted_at: str

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
        # Phase 3: 康复师↔家长数据通道 新表
        conn.execute("""
            CREATE TABLE IF NOT EXISTS family_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_id TEXT NOT NULL,
                family_code TEXT NOT NULL,
                linked_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS treatment_plans (
                plan_id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                patient_name TEXT,
                session_id TEXT NOT NULL,
                therapist_name TEXT,
                plan_content TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS assessment_summaries (
                summary_id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                patient_name TEXT,
                session_id TEXT NOT NULL,
                risk_level TEXT,
                risk_label TEXT,
                summary_text TEXT NOT NULL,
                concerns TEXT DEFAULT '[]',
                recommendations TEXT DEFAULT '[]',
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS daily_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                patient_name TEXT,
                tracking_date TEXT NOT NULL,
                exercises_completed TEXT DEFAULT '[]',
                total_duration_min INTEGER DEFAULT 0,
                symptoms TEXT DEFAULT '{}',
                notes TEXT DEFAULT '',
                submitted_at TEXT NOT NULL
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

@router.get("/subject/{subject_id}/trends")
async def get_subject_trends(subject_id: str):
    """
    Get historic trend data from all synced screenings for a subject.
    This parses the dynamic joint angles and Adams bend metrics from payload protocol results.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT session_id, payload, created_at
            FROM synced_screenings
            WHERE subject_id = ?
            ORDER BY datetime(created_at) ASC
        """, (subject_id,))
        rows = cursor.fetchall()
        
        trends = []
        for row in rows:
            try:
                payload = json.loads(row["payload"])
                metrics = {}
                
                # Extract metrics from each protocol result
                for res in payload.get("protocol_results", []):
                    if res.get("status") == "completed" and res.get("metrics"):
                        m_data = res["metrics"]
                        if res["protocol"] == "static_posture":
                            for k, v in m_data.items():
                                if isinstance(v, (int, float)):
                                    metrics[k] = v
                        elif res["protocol"] == "squat_screening":
                            if "left_knee_valgus_deg" in m_data:
                                metrics["leftKneeValgus"] = m_data["left_knee_valgus_deg"]
                            if "right_knee_valgus_deg" in m_data:
                                metrics["rightKneeValgus"] = m_data["right_knee_valgus_deg"]
                            if "psi_score" in m_data:
                                metrics["stabilityScore"] = m_data["psi_score"] * 100
                            elif res.get("psi_score") is not None:
                                metrics["stabilityScore"] = res["psi_score"] * 100
                        elif res["protocol"] == "adams_forward_bend":
                            if "atr_angle_deg" in m_data:
                                metrics["atrAngle"] = m_data["atr_angle_deg"]
                
                # Parse date nicely
                date_str = row["created_at"]
                if "T" in date_str:
                    date_str = date_str.split("T")[0]
                else:
                    date_str = date_str[:10]
                    
                trends.append({
                    "session_id": row["session_id"],
                    "created_at": row["created_at"],
                    "date": date_str,
                    "metrics": metrics
                })
            except Exception as e:
                print(f"Error parsing screening trend payload: {e}")
                continue
                
        return trends
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query subject trends: {str(e)}")
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

# ── Phase 3: 康复师↔家长数据通道 新增端点 ──

# ═══ 3.1 家庭码绑定 ═══

@router.post("/subject/link")
async def link_family_code(payload: FamilyLinkPayload):
    """
    C端家长用康复师给的家庭码绑定孩子档案。
    记录绑定关系，后续可通过 subject_id 查询关联的家庭码。
    """
    conn = get_db_connection()
    try:
        # 验证 subject_id 存在（在 synced_screenings 或 pending_scales 中）
        cursor = conn.cursor()
        cursor.execute(
            "SELECT subject_id FROM synced_screenings WHERE subject_id = ? LIMIT 1",
            (payload.subject_id,),
        )
        screening_row = cursor.fetchone()

        if not screening_row:
            cursor.execute(
                "SELECT patient_id FROM pending_scales WHERE patient_id = ? LIMIT 1",
                (payload.subject_id,),
            )
            scale_row = cursor.fetchone()
            if not scale_row:
                raise HTTPException(
                    status_code=404,
                    detail="未找到该家庭码对应的档案，请确认家庭码是否正确",
                )

        now_str = datetime.now().isoformat()
        cursor.execute(
            """
            INSERT INTO family_links (subject_id, family_code, linked_at)
            VALUES (?, ?, ?)
            """,
            (payload.subject_id, payload.family_code, now_str),
        )
        conn.commit()
        return {
            "status": "success",
            "subject_id": payload.subject_id,
            "linked_at": now_str,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Family link failed: {str(e)}")
    finally:
        conn.close()


# ═══ 3.2 训练处方推送 + 拉取 ═══

@router.post("/plan/push")
async def push_treatment_plan(payload: TreatmentPlanPushPayload):
    """
    B端康复师推送训练处方到家长端。
    创建新的训练处方记录，同时将同一患者的旧处方标记为 archived。
    """
    import uuid

    conn = get_db_connection()
    try:
        plan_id = str(uuid.uuid4())
        now_str = datetime.now().isoformat()

        cursor = conn.cursor()

        # 将该患者之前的 active 处方归档
        cursor.execute(
            """
            UPDATE treatment_plans
            SET status = 'archived', updated_at = ?
            WHERE patient_id = ? AND status = 'active'
            """,
            (now_str, payload.patient_id),
        )

        cursor.execute(
            """
            INSERT INTO treatment_plans (
                plan_id, patient_id, patient_name, session_id,
                therapist_name, plan_content, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (
                plan_id,
                payload.patient_id,
                payload.patient_name,
                payload.session_id,
                payload.therapist_name,
                payload.plan_content,
                now_str,
                now_str,
            ),
        )
        conn.commit()
        return {
            "status": "success",
            "plan_id": plan_id,
            "patient_id": payload.patient_id,
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to push treatment plan: {str(e)}")
    finally:
        conn.close()


@router.get("/plan/pending/{patient_id}", response_model=List[TreatmentPlanBrief])
async def get_pending_plans(patient_id: str):
    """
    C端家长拉取康复师推送的训练处方。
    返回所有 active 状态的处方（通常只有1个），按创建时间倒序。
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # 优先按 patient_id 查询；也按 patient_name 回退
        cursor.execute(
            """
            SELECT plan_id, patient_id, patient_name, therapist_name,
                   plan_content, status, created_at, updated_at
            FROM treatment_plans
            WHERE (patient_id = ? OR patient_name = ?)
              AND status = 'active'
            ORDER BY datetime(created_at) DESC
            """,
            (patient_id, patient_id),
        )
        rows = cursor.fetchall()
        return [
            TreatmentPlanBrief(
                plan_id=row["plan_id"],
                patient_id=row["patient_id"],
                patient_name=row["patient_name"],
                therapist_name=row["therapist_name"],
                plan_content=row["plan_content"],
                status=row["status"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query treatment plans: {str(e)}")
    finally:
        conn.close()


# ═══ 3.3 评估摘要推送 + 拉取 ═══

@router.post("/assessment/push")
async def push_assessment_summary(payload: AssessmentPushPayload):
    """
    B端康复师推送评估摘要（家长友好语言版）。
    每次推送创建新记录，保留历史评估记录。
    """
    import uuid

    conn = get_db_connection()
    try:
        summary_id = str(uuid.uuid4())
        now_str = datetime.now().isoformat()

        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO assessment_summaries (
                summary_id, patient_id, patient_name, session_id,
                risk_level, risk_label, summary_text,
                concerns, recommendations, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                summary_id,
                payload.patient_id,
                payload.patient_name,
                payload.session_id,
                payload.risk_level,
                payload.risk_label,
                payload.summary_text,
                json.dumps(payload.concerns or []),
                json.dumps(payload.recommendations or []),
                now_str,
            ),
        )
        conn.commit()
        return {
            "status": "success",
            "summary_id": summary_id,
            "patient_id": payload.patient_id,
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to push assessment summary: {str(e)}")
    finally:
        conn.close()


@router.get("/assessment/summary/{patient_id}", response_model=Optional[AssessmentSummaryResponse])
async def get_assessment_summary(patient_id: str):
    """
    C端家长拉取康复师最新评估摘要。
    返回最近一条评估记录，无记录时返回 null。
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT summary_id, patient_id, patient_name, session_id,
                   risk_level, risk_label, summary_text,
                   concerns, recommendations, created_at
            FROM assessment_summaries
            WHERE patient_id = ? OR patient_name = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 1
            """,
            (patient_id, patient_id),
        )
        row = cursor.fetchone()
        if not row:
            return None

        return AssessmentSummaryResponse(
            summary_id=row["summary_id"],
            patient_id=row["patient_id"],
            patient_name=row["patient_name"],
            session_id=row["session_id"],
            risk_level=row["risk_level"] or "none",
            risk_label=row["risk_label"] or "",
            summary_text=row["summary_text"],
            concerns=json.loads(row["concerns"] or "[]"),
            recommendations=json.loads(row["recommendations"] or "[]"),
            created_at=row["created_at"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query assessment summary: {str(e)}")
    finally:
        conn.close()


# ═══ 3.4 打卡数据上行 + 查询 ═══

@router.post("/tracking/submit")
async def submit_daily_tracking(payload: TrackingSubmitPayload):
    """
    C端家长提交每日打卡数据（训练完成情况 + 症状记录）。
    同一天同一患者多次提交时更新记录（upsert 语义）。
    """
    conn = get_db_connection()
    try:
        now_str = datetime.now().isoformat()
        cursor = conn.cursor()

        # 检查当天是否已有记录（upsert）
        cursor.execute(
            """
            SELECT id FROM daily_tracking
            WHERE patient_id = ? AND tracking_date = ?
            LIMIT 1
            """,
            (payload.patient_id, payload.tracking_date),
        )
        existing = cursor.fetchone()

        exercises_json = json.dumps(payload.exercises_completed or [])
        symptoms_json = json.dumps(payload.symptoms or {})

        if existing:
            cursor.execute(
                """
                UPDATE daily_tracking
                SET patient_name = ?,
                    exercises_completed = ?,
                    total_duration_min = ?,
                    symptoms = ?,
                    notes = ?,
                    submitted_at = ?
                WHERE id = ?
                """,
                (
                    payload.patient_name,
                    exercises_json,
                    payload.total_duration_min,
                    symptoms_json,
                    payload.notes,
                    now_str,
                    existing["id"],
                ),
            )
            action = "updated"
            record_id = existing["id"]
        else:
            cursor.execute(
                """
                INSERT INTO daily_tracking (
                    patient_id, patient_name, tracking_date,
                    exercises_completed, total_duration_min,
                    symptoms, notes, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.patient_id,
                    payload.patient_name,
                    payload.tracking_date,
                    exercises_json,
                    payload.total_duration_min,
                    symptoms_json,
                    payload.notes,
                    now_str,
                ),
            )
            action = "created"
            record_id = cursor.lastrowid

        conn.commit()
        return {
            "status": "success",
            "action": action,
            "id": record_id,
            "tracking_date": payload.tracking_date,
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit tracking data: {str(e)}")
    finally:
        conn.close()


@router.get("/tracking/{patient_id}", response_model=List[TrackingRecordResponse])
async def get_tracking_history(
    patient_id: str,
    days: Optional[int] = 30,
):
    """
    C端家长查询历史打卡记录。
    默认返回最近 30 天的数据。
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        from datetime import timedelta

        since_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

        cursor.execute(
            """
            SELECT id, patient_id, patient_name, tracking_date,
                   exercises_completed, total_duration_min,
                   symptoms, notes, submitted_at
            FROM daily_tracking
            WHERE (patient_id = ? OR patient_name = ?)
              AND tracking_date >= ?
            ORDER BY tracking_date DESC
            """,
            (patient_id, patient_id, since_date),
        )
        rows = cursor.fetchall()
        return [
            TrackingRecordResponse(
                id=row["id"],
                patient_id=row["patient_id"],
                patient_name=row["patient_name"],
                tracking_date=row["tracking_date"],
                exercises_completed=json.loads(row["exercises_completed"] or "[]"),
                total_duration_min=row["total_duration_min"],
                symptoms=json.loads(row["symptoms"] or "{}"),
                notes=row["notes"] or "",
                submitted_at=row["submitted_at"],
            )
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query tracking history: {str(e)}")
    finally:
        conn.close()
