import json
import sqlite3
import os
import uuid
import hashlib
import secrets
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

# Phase 6: 统一翻译层
from translation import get_translation_service, PatientContext

logger = logging.getLogger(__name__)

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
    patient_id: Optional[str] = None
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
    patient_id: Optional[str] = None
    scale_data: Dict[str, Any]

class IntakeConfirmPayload(BaseModel):
    action: str = Field(..., description="create_patient or link_existing_patient")
    patient_id: Optional[str] = None
    patient_code: Optional[str] = None
    short_code: Optional[str] = None
    family_code: Optional[str] = None
    family_code_expires_at: Optional[str] = None
    suc: Optional[str] = None

class FamilyLoginPayload(BaseModel):
    family_code: str

class PatientEnsurePayload(BaseModel):
    """Idempotent patient upsert from B-end — ensures patient exists in Python DB."""
    patient_id: str
    patient_code: Optional[str] = None
    display_name: Optional[str] = None
    sex: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    notes: Optional[str] = None
    short_code: Optional[str] = None  # 前端可预生成短码，留空则后端自动生成

class FamilyAccessRotatePayload(BaseModel):
    family_code: Optional[str] = None
    expires_at: Optional[str] = None
    linked_to: Optional[str] = None

class FamilyAccessExtendPayload(BaseModel):
    expires_at: Optional[str] = None

class PlanStatusUpdatePayload(BaseModel):
    """Phase 5: 处方状态更新"""
    status: str = Field(..., description="pending / acknowledged / in_progress / completed")

# ── Phase 3: 康复师↔家长数据通道 ──

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
    translated_plan_content: Optional[str] = None  # Phase 6: 家长友好版
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
    translated_summary_text: Optional[str] = None  # Phase 6: 家长友好版
    concerns: List[str] = []
    recommendations: List[str] = []
    created_at: str

class ParentReportSubmitPayload(BaseModel):
    """Parent-side self-screening/report result submitted back to therapist workspace."""
    patient_id: str
    patient_name: Optional[str] = None
    session_id: Optional[str] = None
    report_type: str = "self_screening"
    risk_level: str = "none"
    risk_label: str = ""
    summary_text: str = ""
    recommendation: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    source: str = "parent"

class ParentReportResponse(BaseModel):
    report_id: str
    patient_id: str
    patient_name: Optional[str] = None
    session_id: str
    report_type: str
    risk_level: str
    risk_label: str
    summary_text: str
    recommendation: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    source: str
    submitted_at: str

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
FAMILY_CODE_HASH_NAMESPACE = "rehab-family-code:v1:"
FAMILY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

# 临床短码：4位大写字母，用于康复师日常标识患者（白板、叫号、记录）
# 与家长码分离——短码是公开的内部索引，家长码是私密的登录凭证
SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPRTUVWXYZ"  # 20字符，无 I/O/Q 防混淆
SHORT_CODE_LENGTH = 4

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def normalize_code(value: Optional[str]) -> str:
    return (value or "").strip().upper()

def hash_family_code(value: Optional[str]) -> str:
    code = normalize_code(value)
    if not code:
        return ""
    return hashlib.sha256(f"{FAMILY_CODE_HASH_NAMESPACE}{code}".encode("utf-8")).hexdigest()

def is_family_code_hash(value: Optional[str]) -> bool:
    text = (value or "").strip().lower()
    return len(text) == 64 and all(char in "0123456789abcdef" for char in text)

def generate_family_code(length: int = 6) -> str:
    return "".join(secrets.choice(FAMILY_CODE_ALPHABET) for _ in range(length))

def generate_short_code() -> str:
    """生成4位大写字母临床短码（20^4 ≈ 16万种组合）"""
    return "".join(secrets.choice(SHORT_CODE_ALPHABET) for _ in range(SHORT_CODE_LENGTH))

def normalize_patient_code(value: Optional[str]) -> Optional[str]:
    code = normalize_code(value)
    if len(code) != SHORT_CODE_LENGTH:
        return None
    if any(char not in SHORT_CODE_ALPHABET for char in code):
        return None
    return code

def generate_patient_id() -> str:
    return f"pat_{uuid.uuid4().hex[:12]}"

def add_column_if_missing(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        conn.commit()
    except sqlite3.OperationalError:
        pass

def upsert_patient_identity(
    conn: sqlite3.Connection,
    patient_id: str,
    display_name: Optional[str] = None,
    sex: Optional[str] = None,
    age: Optional[int] = None,
    height_cm: Optional[float] = None,
    notes: Optional[str] = None,
    suc: Optional[str] = None,
    short_code: Optional[str] = None,
) -> None:
    now_str = datetime.now().isoformat()
    short_code = normalize_patient_code(short_code)
    existing = conn.execute(
        "SELECT patient_id, short_code FROM patients WHERE patient_id = ?",
        (patient_id,),
    ).fetchone()
    if existing:
        if short_code and not existing["short_code"]:
            conflict = conn.execute(
                "SELECT patient_id FROM patients WHERE short_code = ? AND patient_id <> ? LIMIT 1",
                (short_code, patient_id),
            ).fetchone()
            if conflict:
                short_code = None
        # 更新时不覆盖已有 short_code（短码终身不变）
        conn.execute(
            """
            UPDATE patients
            SET short_code = COALESCE(short_code, ?),
                display_name = COALESCE(?, display_name),
                sex = COALESCE(?, sex),
                age = COALESCE(?, age),
                height_cm = COALESCE(?, height_cm),
                notes = COALESCE(?, notes),
                suc = COALESCE(?, suc),
                updated_at = ?
            WHERE patient_id = ?
            """,
            (short_code, display_name, sex, age, height_cm, notes, suc, now_str, patient_id),
        )
        return

    # 新建患者：如果没有提供 short_code，自动生成唯一短码
    if short_code:
        conflict = conn.execute(
            "SELECT patient_id FROM patients WHERE short_code = ? LIMIT 1",
            (short_code,),
        ).fetchone()
        if conflict:
            short_code = None
    if not short_code:
        for _ in range(8):
            candidate = generate_short_code()
            existing_code = conn.execute(
                "SELECT patient_id FROM patients WHERE short_code = ? LIMIT 1",
                (candidate,),
            ).fetchone()
            if not existing_code:
                short_code = candidate
                break
        if not short_code:
            short_code = generate_short_code()  # 极小概率碰撞时仍使用

    conn.execute(
        """
        INSERT INTO patients (
            patient_id, short_code, display_name, sex, age, height_cm, notes, suc, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (patient_id, short_code, display_name, sex, age, height_cm, notes, suc, now_str, now_str),
    )

def upsert_patient_alias(
    conn: sqlite3.Connection,
    patient_id: str,
    source_system: str,
    alias_type: str,
    alias_value: Optional[str],
    verified: bool = True,
) -> None:
    alias = normalize_code(alias_value) if alias_type in {"subject_id", "suc"} else (alias_value or "").strip()
    if not alias:
        return
    now_str = datetime.now().isoformat()
    existing = conn.execute(
        """
        SELECT id FROM patient_aliases
        WHERE source_system = ? AND alias_type = ? AND alias_value = ?
        """,
        (source_system, alias_type, alias),
    ).fetchone()
    if existing:
        conn.execute(
            """
            UPDATE patient_aliases
            SET patient_id = ?, verified = ?, created_at = ?
            WHERE id = ?
            """,
            (patient_id, 1 if verified else 0, now_str, existing["id"]),
        )
    else:
        conn.execute(
            """
            INSERT INTO patient_aliases (
                patient_id, source_system, alias_type, alias_value, verified, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (patient_id, source_system, alias_type, alias, 1 if verified else 0, now_str),
        )

def upsert_family_access_link(
    conn: sqlite3.Connection,
    patient_id: str,
    family_code: Optional[str],
    linked_to: Optional[str] = None,
    expires_at: Optional[str] = None,
) -> Optional[str]:
    code = normalize_code(family_code)
    if not code:
        return None
    code_hash = hash_family_code(code)
    now_str = datetime.now().isoformat()
    existing = conn.execute(
        """
        SELECT id, patient_id FROM patient_access_links
        WHERE link_type = 'family_code' AND code = ?
        """,
        (code_hash,),
    ).fetchone()
    if existing:
        if existing["patient_id"] != patient_id:
            raise HTTPException(status_code=409, detail="family_code is already assigned to another patient")
        conn.execute(
            """
            UPDATE patient_access_links
            SET patient_id = ?, status = 'active', linked_to = ?, created_at = ?, expires_at = ?
            WHERE id = ?
            """,
            (patient_id, linked_to, now_str, expires_at, existing["id"]),
        )
    else:
        conn.execute(
            """
            INSERT INTO patient_access_links (
                patient_id, link_type, code, status, linked_to, created_at, expires_at
            ) VALUES (?, 'family_code', ?, 'active', ?, ?, ?)
            """,
            (patient_id, code_hash, linked_to, now_str, expires_at),
        )
    return code

def migrate_family_access_code_hashes(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        """
        SELECT id, code
        FROM patient_access_links
        WHERE link_type = 'family_code'
        """
    ).fetchall()
    for row in rows:
        raw_code = row["code"]
        if not raw_code or is_family_code_hash(raw_code):
            continue
        code_hash = hash_family_code(raw_code)
        try:
            conn.execute(
                "UPDATE patient_access_links SET code = ? WHERE id = ?",
                (code_hash, row["id"]),
            )
        except sqlite3.IntegrityError:
            replacement = hashlib.sha256(
                f"{FAMILY_CODE_HASH_NAMESPACE}duplicate:{row['id']}:{normalize_code(raw_code)}".encode("utf-8")
            ).hexdigest()
            conn.execute(
                """
                UPDATE patient_access_links
                SET code = ?, status = 'revoked'
                WHERE id = ?
                """,
                (replacement, row["id"]),
            )

def family_access_is_expired(expires_at: Optional[str]) -> bool:
    if not expires_at:
        return False
    try:
        expires = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        now = datetime.now(expires.tzinfo) if expires.tzinfo else datetime.now()
        return expires <= now
    except ValueError:
        return expires_at <= datetime.now().isoformat()

def family_access_response(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "patient_id": row["patient_id"],
        "link_type": row["link_type"],
        "status": row["status"],
        "linked_to": row["linked_to"],
        "created_at": row["created_at"],
        "expires_at": row["expires_at"],
        "is_expired": family_access_is_expired(row["expires_at"]),
    }

def resolve_patient_id(conn: sqlite3.Connection, identity: Optional[str]) -> Optional[str]:
    value = (identity or "").strip()
    if not value:
        return None
    direct = conn.execute(
        "SELECT patient_id FROM patients WHERE patient_id = ?",
        (value,),
    ).fetchone()
    if direct:
        return direct["patient_id"]

    code = normalize_patient_code(value)
    if code:
        by_code = conn.execute(
            "SELECT patient_id FROM patients WHERE short_code = ?",
            (code,),
        ).fetchone()
        if by_code:
            return by_code["patient_id"]

    upper_value = normalize_code(value)
    alias = conn.execute(
        """
        SELECT patient_id FROM patient_aliases
        WHERE alias_value = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (upper_value,),
    ).fetchone()
    if alias:
        return alias["patient_id"]
    return None

def screening_subject_payload(row: sqlite3.Row) -> Dict[str, Any]:
    payload = json.loads(row["payload"])
    return payload.get("subject", {})

def init_db():
    conn = get_db_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS synced_screenings (
                session_id TEXT PRIMARY KEY,
                subject_id TEXT NOT NULL,
                subject_display_name TEXT NOT NULL,
                patient_id TEXT,
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
            CREATE TABLE IF NOT EXISTS patients (
                patient_id TEXT PRIMARY KEY,
                short_code TEXT UNIQUE,
                display_name TEXT,
                sex TEXT,
                age INTEGER,
                height_cm REAL,
                notes TEXT,
                suc TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS patient_aliases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                source_system TEXT NOT NULL,
                alias_type TEXT NOT NULL,
                alias_value TEXT NOT NULL,
                verified INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                UNIQUE(source_system, alias_type, alias_value)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS patient_access_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                link_type TEXT NOT NULL,
                code TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                linked_to TEXT,
                created_at TEXT NOT NULL,
                expires_at TEXT,
                UNIQUE(link_type, code)
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
            CREATE TABLE IF NOT EXISTS parent_reports (
                report_id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                patient_name TEXT,
                session_id TEXT NOT NULL,
                report_type TEXT DEFAULT 'self_screening',
                risk_level TEXT DEFAULT 'none',
                risk_label TEXT DEFAULT '',
                summary_text TEXT DEFAULT '',
                recommendation TEXT,
                payload TEXT DEFAULT '{}',
                source TEXT DEFAULT 'parent',
                submitted_at TEXT NOT NULL
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
        add_column_if_missing(conn, "pending_scales", "patient_name", "TEXT")
        add_column_if_missing(conn, "synced_screenings", "patient_id", "TEXT")
        add_column_if_missing(conn, "patients", "short_code", "TEXT")
        # 短码唯一索引（仅在新表上创建，已存在的表通过 add_column_if_missing 保证存在即可）
        try:
            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_short_code ON patients(short_code)")
        except sqlite3.OperationalError:
            pass
        # Phase 6: Translation layer — cache table + translated columns
        conn.execute("""
            CREATE TABLE IF NOT EXISTS translation_cache (
                cache_key TEXT PRIMARY KEY,
                source_type TEXT NOT NULL,
                original_content TEXT NOT NULL,
                translated_content TEXT NOT NULL,
                source TEXT DEFAULT 'llm',
                generated_at TEXT NOT NULL
            )
        """)
        add_column_if_missing(conn, "treatment_plans", "translated_plan_content", "TEXT")
        add_column_if_missing(conn, "pending_scales", "translated_scale_content", "TEXT")
        add_column_if_missing(conn, "assessment_summaries", "translated_summary_text", "TEXT")
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_parent_reports_patient_session_type
            ON parent_reports(patient_id, session_id, report_type)
        """)

        migrate_family_access_code_hashes(conn)
        conn.commit()
    finally:
        conn.close()

# Initialize DB on import
init_db()

# Phase 5: 种子数据（首次启动自动插入，幂等）
try:
    from seed import seed_all
    seed_all()
except Exception as e:
    print(f"[Seed] Warning: seed data migration skipped ({e})")

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
        patient_id = resolve_patient_id(conn, payload.subject.subject_id)

        if exists:
            # Update existing
            cursor.execute("""
                UPDATE synced_screenings
                SET subject_id = ?,
                    subject_display_name = ?,
                    patient_id = ?,
                    overall_risk = ?,
                    payload = ?,
                    created_at = ?,
                    synced_at = ?
                WHERE session_id = ?
            """, (
                payload.subject.subject_id,
                subject_name,
                patient_id,
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
                    session_id, subject_id, subject_display_name, patient_id, overall_risk, status, payload, created_at, synced_at
                ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
            """, (
                payload.session_id,
                payload.subject.subject_id,
                subject_name,
                patient_id,
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
                SELECT session_id, subject_id, subject_display_name, patient_id, overall_risk, status, created_at, synced_at
                FROM synced_screenings
                WHERE status = ?
                ORDER BY datetime(synced_at) DESC
            """, (status,))
        else:
            cursor.execute("""
                SELECT session_id, subject_id, subject_display_name, patient_id, overall_risk, status, created_at, synced_at
                FROM synced_screenings
                ORDER BY datetime(synced_at) DESC
            """)
        
        rows = cursor.fetchall()
        return [
            SyncedScreeningBrief(
                session_id=row["session_id"],
                subject_id=row["subject_id"],
                subject_display_name=row["subject_display_name"],
                patient_id=row["patient_id"],
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
            SELECT session_id, subject_id, subject_display_name, patient_id, overall_risk, status, payload, created_at, synced_at
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
            patient_id=row["patient_id"],
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

@router.post("/intake/{session_id}/confirm")
async def confirm_screening_intake(session_id: str, payload: IntakeConfirmPayload):
    """
    Confirm a pending screening intake and bind its source subject_id to a canonical patient_id.
    This is the identity-contract path for B-end create/link actions.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT session_id, subject_id, subject_display_name, payload
            FROM synced_screenings
            WHERE session_id = ?
        """, (session_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Synced screening record not found")

        action = payload.action.strip()
        if action not in {"create_patient", "link_existing_patient"}:
            raise HTTPException(status_code=400, detail="action must be create_patient or link_existing_patient")

        if action == "link_existing_patient" and not payload.patient_id:
            raise HTTPException(status_code=400, detail="patient_id is required when linking an existing patient")

        patient_id = payload.patient_id or resolve_patient_id(conn, row["subject_id"]) or generate_patient_id()
        subject = screening_subject_payload(row)
        display_name = subject.get("display_name") or row["subject_display_name"]
        subject_id = row["subject_id"]
        suc = payload.suc or (subject_id if normalize_code(subject_id).startswith("QY-") else None)
        requested_patient_code = payload.patient_code or payload.short_code

        upsert_patient_identity(
            conn,
            patient_id=patient_id,
            display_name=display_name,
            sex=subject.get("sex"),
            age=subject.get("age"),
            height_cm=subject.get("height_cm"),
            notes=subject.get("notes"),
            suc=suc,
            short_code=requested_patient_code,
        )
        patient_row = conn.execute(
            "SELECT short_code FROM patients WHERE patient_id = ?",
            (patient_id,),
        ).fetchone()
        patient_code = patient_row["short_code"] if patient_row else None
        upsert_patient_alias(
            conn,
            patient_id=patient_id,
            source_system="early_screening",
            alias_type="subject_id",
            alias_value=subject_id,
        )
        if suc:
            upsert_patient_alias(
                conn,
                patient_id=patient_id,
                source_system="rehab_main",
                alias_type="suc",
                alias_value=suc,
            )

        family_code = normalize_code(payload.family_code)
        candidate_code = normalize_code(subject_id)
        if not family_code and 4 <= len(candidate_code) <= 6 and candidate_code.isalnum():
            family_code = candidate_code
        # 自动生成：如果以上条件都不满足，生成随机家庭码
        if not family_code:
            for _ in range(8):
                candidate = generate_family_code()
                code_hash = hash_family_code(candidate)
                exists = conn.execute(
                    "SELECT id FROM patient_access_links WHERE link_type = 'family_code' AND code = ? LIMIT 1",
                    (code_hash,),
                ).fetchone()
                if not exists:
                    family_code = candidate
                    break
            if not family_code:
                family_code = generate_family_code()  # 极小概率碰撞时仍尝试
        linked_family_code = upsert_family_access_link(
            conn,
            patient_id=patient_id,
            family_code=family_code,
            linked_to=display_name,
            expires_at=payload.family_code_expires_at,
        )

        cursor.execute("""
            UPDATE synced_screenings
            SET patient_id = ?, status = 'imported'
            WHERE session_id = ?
        """, (patient_id, session_id))
        conn.commit()
        return {
            "status": "success",
            "session_id": session_id,
            "patient_id": patient_id,
            "patient_code": patient_code,
            "short_code": patient_code,
            "subject_id": subject_id,
            "family_code": linked_family_code,
            "alias_created": True,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to confirm intake identity: {str(e)}")
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
        patient_id = resolve_patient_id(conn, payload.patient_id) or payload.patient_id
        cursor = conn.cursor()
        upsert_patient_identity(
            conn,
            patient_id=patient_id,
            display_name=payload.patient_name,
        )
        cursor.execute("""
            INSERT INTO pending_scales (task_id, patient_id, patient_name, session_id, scale_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
        """, (task_id, patient_id, payload.patient_name, payload.session_id, payload.scale_id, now_str))

        # Phase 6: 翻译量表 → 家长友好说明
        translated_scale_content: Optional[str] = None
        try:
            svc = get_translation_service()
            patient_age = None
            patient_sex = None
            patient_row = conn.execute(
                "SELECT age, sex FROM patients WHERE patient_id = ?",
                (patient_id,),
            ).fetchone()
            if patient_row:
                patient_age = patient_row["age"]
                patient_sex = patient_row["sex"]
            patient_ctx = PatientContext(
                display_name=payload.patient_name or "",
                age=patient_age,
                sex=patient_sex,
            )
            result = svc.translate("scale", payload.scale_id, patient_ctx)
            if result.structured_output:
                translated_scale_content = json.dumps(result.structured_output, ensure_ascii=False)
                cursor.execute(
                    "UPDATE pending_scales SET translated_scale_content = ? WHERE task_id = ?",
                    (translated_scale_content, task_id),
                )
                logger.info("Scale translation success for %s (source=%s)", task_id, result.source)
        except Exception as exc:
            logger.warning("Scale translation skipped for %s: %s", task_id, exc)

        conn.commit()
        return {
            "status": "success",
            "task_id": task_id,
            "scale_id": payload.scale_id,
            "patient_id": patient_id,
            "translated": bool(translated_scale_content),
        }
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
        canonical_patient_id = resolve_patient_id(conn, patient_id) or patient_id
        cursor.execute("""
            SELECT task_id, patient_id, patient_name, session_id, scale_id, status,
                   translated_scale_content, created_at
            FROM pending_scales
            WHERE patient_id = ? AND status = 'pending'
            ORDER BY datetime(created_at) DESC
        """, (canonical_patient_id,))
        rows = cursor.fetchall()
        return [
            {
                "task_id": row["task_id"],
                "patient_id": row["patient_id"],
                "patient_name": row["patient_name"],
                "session_id": row["session_id"],
                "scale_id": row["scale_id"],
                "status": row["status"],
                "translated_scale_content": row["translated_scale_content"],
                "created_at": row["created_at"],
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
        canonical_patient_id = resolve_patient_id(conn, subject_id)
        # Find the latest synced screening for this subject_id
        cursor.execute("""
            SELECT session_id, subject_id, subject_display_name, patient_id, payload, created_at
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
                    "patient_id": canonical_patient_id or subject_id,
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
            "patient_id": canonical_patient_id or row["patient_id"],
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
        cursor.execute("SELECT task_id, patient_id FROM pending_scales WHERE task_id = ?", (payload.task_id,))
        task_row = cursor.fetchone()
        if not task_row:
            raise HTTPException(status_code=404, detail="Scale task not found")
        if payload.patient_id:
            submitted_patient_id = resolve_patient_id(conn, payload.patient_id) or payload.patient_id
            if submitted_patient_id != task_row["patient_id"]:
                raise HTTPException(status_code=403, detail="Scale task does not belong to this patient_id")

        now_str = datetime.now().isoformat()
        payload_json = json.dumps(payload.scale_data, ensure_ascii=False)
        
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

def scale_result_response(row: sqlite3.Row) -> Dict[str, Any]:
    scale_data = None
    if row["payload"]:
        try:
            scale_data = json.loads(row["payload"])
        except Exception:
            pass
    return {
        "task_id": row["task_id"],
        "patient_id": row["patient_id"],
        "session_id": row["session_id"],
        "scale_id": row["scale_id"],
        "status": row["status"],
        "scale_data": scale_data,
        "created_at": row["created_at"],
        "submitted_at": row["submitted_at"],
    }


@router.get("/scale/results/by-patient/{patient_id}")
async def get_scale_results_by_patient(patient_id: str, status: Optional[str] = None, limit: int = 50):
    """
    B-End Workstation retrieves parent-submitted scale tasks by canonical patient.
    This is recoverable after page refresh or therapist context switches.
    """
    conn = get_db_connection()
    try:
        resolved_patient_id = resolve_patient_id(conn, patient_id)
        if not resolved_patient_id:
            return []

        normalized_status = (status or "").strip().lower()
        params: List[Any] = [resolved_patient_id]
        where = "patient_id = ?"
        if normalized_status in {"pending", "completed"}:
            where += " AND status = ?"
            params.append(normalized_status)

        safe_limit = max(1, min(int(limit or 50), 200))
        params.append(safe_limit)

        cursor = conn.cursor()
        cursor.execute(f"""
            SELECT task_id, patient_id, session_id, scale_id, status, payload, created_at, submitted_at
            FROM pending_scales
            WHERE {where}
            ORDER BY datetime(COALESCE(submitted_at, created_at)) DESC
            LIMIT ?
        """, tuple(params))
        return [scale_result_response(row) for row in cursor.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get patient scale results: {str(e)}")
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
        return [scale_result_response(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get scale results: {str(e)}")
    finally:
        conn.close()

# ── Phase 3: 康复师↔家长数据通道 新增端点 ──

# ═══ 3.1 家庭码绑定 ═══

@router.post("/family/login")
async def family_login(payload: FamilyLoginPayload):
    """
    Resolve a family access code into the canonical patient_id used by C-end routes.
    """
    code = normalize_code(payload.family_code)
    if not code:
        raise HTTPException(status_code=400, detail="family_code is required")
    code_hash = hash_family_code(code)
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT l.patient_id, p.display_name, p.sex, p.age, p.height_cm, p.notes, p.short_code
            FROM patient_access_links l
            LEFT JOIN patients p ON p.patient_id = l.patient_id
            WHERE l.link_type = 'family_code'
              AND l.code = ?
              AND l.status = 'active'
              AND (l.expires_at IS NULL OR datetime(l.expires_at) > datetime('now'))
            ORDER BY l.id DESC
            LIMIT 1
        """, (code_hash,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Family code not found, inactive, or expired")

        cursor.execute("""
            SELECT session_id
            FROM synced_screenings
            WHERE patient_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 1
        """, (row["patient_id"],))
        latest_session = cursor.fetchone()
        return {
            "patient_id": row["patient_id"],
            "patient_code": row["short_code"],
            "short_code": row["short_code"],
            "display_name": row["display_name"],
            "sex": row["sex"] or "unknown",
            "age": row["age"],
            "height_cm": row["height_cm"],
            "notes": row["notes"],
            "session_id": latest_session["session_id"] if latest_session else None,
            "allowed_features": ["report", "scale", "plan", "tracking"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Family login failed: {str(e)}")
    finally:
        conn.close()

@router.post("/patient/ensure")
async def ensure_patient(payload: PatientEnsurePayload):
    """
    Idempotent patient identity upsert from B-end.
    Ensures patient exists in Python DB regardless of creation source
    (manual, screening, import, etc.) so family-code flows always work.
    """
    conn = get_db_connection()
    try:
        patient_id = payload.patient_id or generate_patient_id()
        upsert_patient_identity(
            conn,
            patient_id=patient_id,
            display_name=payload.display_name,
            sex=payload.sex,
            age=payload.age,
            height_cm=payload.height_cm,
            notes=payload.notes,
            short_code=payload.patient_code or payload.short_code,
        )
        # 读回 short_code（新生成或已有）
        row = conn.execute(
            "SELECT short_code FROM patients WHERE patient_id = ?",
            (patient_id,),
        ).fetchone()
        conn.commit()
        return {
            "status": "ok",
            "patient_id": patient_id,
            "patient_code": row["short_code"] if row else None,
            "short_code": row["short_code"] if row else None,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to ensure patient: {str(e)}")
    finally:
        conn.close()

@router.get("/family/access/{patient_id}")
async def list_family_access_links(patient_id: str):
    """
    List family-code access links for B-end management without exposing stored hashes.
    """
    conn = get_db_connection()
    try:
        resolved_patient_id = resolve_patient_id(conn, patient_id)
        if not resolved_patient_id:
            raise HTTPException(status_code=404, detail="Patient not found")
        rows = conn.execute(
            """
            SELECT id, patient_id, link_type, status, linked_to, created_at, expires_at
            FROM patient_access_links
            WHERE patient_id = ? AND link_type = 'family_code'
            ORDER BY id DESC
            """,
            (resolved_patient_id,),
        ).fetchall()
        return [family_access_response(row) for row in rows]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list family access links: {str(e)}")
    finally:
        conn.close()

@router.post("/family/access/{patient_id}/rotate")
async def rotate_family_access_link(patient_id: str, payload: FamilyAccessRotatePayload):
    """
    Revoke existing active family-code links and issue a new raw code once to B-end.
    """
    conn = get_db_connection()
    try:
        resolved_patient_id = resolve_patient_id(conn, patient_id)
        if not resolved_patient_id:
            raise HTTPException(status_code=404, detail="Patient not found")

        code = normalize_code(payload.family_code)
        if not code:
            for _ in range(8):
                candidate = generate_family_code()
                exists = conn.execute(
                    """
                    SELECT id FROM patient_access_links
                    WHERE link_type = 'family_code' AND code = ?
                    LIMIT 1
                    """,
                    (hash_family_code(candidate),),
                ).fetchone()
                if not exists:
                    code = candidate
                    break
        if not code:
            raise HTTPException(status_code=500, detail="Failed to generate a unique family code")

        now_str = datetime.now().isoformat()
        conn.execute(
            """
            UPDATE patient_access_links
            SET status = 'revoked'
            WHERE patient_id = ? AND link_type = 'family_code' AND status = 'active'
            """,
            (resolved_patient_id,),
        )
        upsert_family_access_link(
            conn,
            patient_id=resolved_patient_id,
            family_code=code,
            linked_to=payload.linked_to,
            expires_at=payload.expires_at,
        )
        row = conn.execute(
            """
            SELECT id, patient_id, link_type, status, linked_to, created_at, expires_at
            FROM patient_access_links
            WHERE patient_id = ? AND link_type = 'family_code' AND code = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (resolved_patient_id, hash_family_code(code)),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Family access link was not created")
        conn.commit()
        return {
            **family_access_response(row),
            "family_code": code,
            "rotated_at": now_str,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to rotate family access link: {str(e)}")
    finally:
        conn.close()

@router.post("/family/access-link/{link_id}/revoke")
async def revoke_family_access_link(link_id: int):
    """
    Revoke one family-code access link.
    """
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT id, patient_id, link_type, status, linked_to, created_at, expires_at
            FROM patient_access_links
            WHERE id = ? AND link_type = 'family_code'
            """,
            (link_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Family access link not found")

        conn.execute(
            "UPDATE patient_access_links SET status = 'revoked' WHERE id = ?",
            (link_id,),
        )
        conn.commit()
        updated = conn.execute(
            """
            SELECT id, patient_id, link_type, status, linked_to, created_at, expires_at
            FROM patient_access_links
            WHERE id = ?
            """,
            (link_id,),
        ).fetchone()
        return family_access_response(updated)
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to revoke family access link: {str(e)}")
    finally:
        conn.close()

@router.post("/family/access-link/{link_id}/extend")
async def extend_family_access_link(link_id: int, payload: FamilyAccessExtendPayload):
    """
    Extend one family-code access link and reactivate it if it was only expired.
    """
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT id, patient_id, link_type, status, linked_to, created_at, expires_at
            FROM patient_access_links
            WHERE id = ? AND link_type = 'family_code'
            """,
            (link_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Family access link not found")
        new_status = "active" if row["status"] != "revoked" else row["status"]
        conn.execute(
            """
            UPDATE patient_access_links
            SET expires_at = ?, status = ?
            WHERE id = ?
            """,
            (payload.expires_at, new_status, link_id),
        )
        conn.commit()
        updated = conn.execute(
            """
            SELECT id, patient_id, link_type, status, linked_to, created_at, expires_at
            FROM patient_access_links
            WHERE id = ?
            """,
            (link_id,),
        ).fetchone()
        return family_access_response(updated)
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to extend family access link: {str(e)}")
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
        patient_id = resolve_patient_id(conn, payload.patient_id) or payload.patient_id

        cursor = conn.cursor()
        upsert_patient_identity(
            conn,
            patient_id=patient_id,
            display_name=payload.patient_name,
        )

        # 将该患者之前的 active 处方归档
        cursor.execute(
            """
            UPDATE treatment_plans
            SET status = 'archived', updated_at = ?
            WHERE patient_id = ? AND status = 'active'
            """,
            (now_str, patient_id),
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
                patient_id,
                payload.patient_name,
                payload.session_id,
                payload.therapist_name,
                payload.plan_content,
                now_str,
                now_str,
            ),
        )

        # Phase 6: 翻译训练处方 → 家长友好版
        translated_plan_content: Optional[str] = None
        try:
            svc = get_translation_service()
            patient_age = None
            patient_sex = None
            patient_row = conn.execute(
                "SELECT age, sex FROM patients WHERE patient_id = ?",
                (patient_id,),
            ).fetchone()
            if patient_row:
                patient_age = patient_row["age"]
                patient_sex = patient_row["sex"]
            patient_ctx = PatientContext(
                display_name=payload.patient_name or "",
                age=patient_age,
                sex=patient_sex,
            )
            result = svc.translate("plan", payload.plan_content, patient_ctx)
            if result.structured_output:
                translated_plan_content = json.dumps(result.structured_output, ensure_ascii=False)
                cursor.execute(
                    "UPDATE treatment_plans SET translated_plan_content = ? WHERE plan_id = ?",
                    (translated_plan_content, plan_id),
                )
                logger.info("Plan translation success for %s (source=%s)", plan_id, result.source)
        except Exception as exc:
            logger.warning("Plan translation skipped for %s: %s", plan_id, exc)

        conn.commit()
        return {
            "status": "success",
            "plan_id": plan_id,
            "patient_id": patient_id,
            "translated": bool(translated_plan_content),
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
        canonical_patient_id = resolve_patient_id(conn, patient_id) or patient_id
        cursor.execute(
            """
            SELECT plan_id, patient_id, patient_name, therapist_name,
                   plan_content, translated_plan_content, status, created_at, updated_at
            FROM treatment_plans
            WHERE patient_id = ?
              AND status = 'active'
            ORDER BY datetime(created_at) DESC
            """,
            (canonical_patient_id,),
        )
        rows = cursor.fetchall()
        return [
            TreatmentPlanBrief(
                plan_id=row["plan_id"],
                patient_id=row["patient_id"],
                patient_name=row["patient_name"],
                therapist_name=row["therapist_name"],
                plan_content=row["plan_content"],
                translated_plan_content=row["translated_plan_content"],
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


@router.patch("/plan/{plan_id}/status")
async def update_plan_status(plan_id: str, payload: PlanStatusUpdatePayload):
    """
    更新训练处方状态（如 pending → acknowledged → in_progress → completed）。
    Phase 5: 从 chatbotagent Node 迁移到 Python 统一数据后端。
    """
    conn = get_db_connection()
    try:
        new_status = payload.status
        row = conn.execute(
            "SELECT plan_id FROM treatment_plans WHERE plan_id = ?",
            (plan_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Plan not found")
        now_str = datetime.now().isoformat()
        conn.execute(
            "UPDATE treatment_plans SET status = ?, updated_at = ? WHERE plan_id = ?",
            (new_status, now_str, plan_id),
        )
        conn.commit()
        return {"status": "success", "plan_id": plan_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update plan status: {str(e)}")
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
        patient_id = resolve_patient_id(conn, payload.patient_id) or payload.patient_id

        cursor = conn.cursor()
        upsert_patient_identity(
            conn,
            patient_id=patient_id,
            display_name=payload.patient_name,
        )
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
                patient_id,
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

        # Phase 6: 翻译评估摘要 → 家长友好版
        translated_summary_text: Optional[str] = None
        try:
            svc = get_translation_service()
            patient_age = None
            patient_sex = None
            patient_row = conn.execute(
                "SELECT age, sex FROM patients WHERE patient_id = ?",
                (patient_id,),
            ).fetchone()
            if patient_row:
                patient_age = patient_row["age"]
                patient_sex = patient_row["sex"]
            patient_ctx = PatientContext(
                display_name=payload.patient_name or "",
                age=patient_age,
                sex=patient_sex,
            )
            result = svc.translate("assessment", payload.summary_text, patient_ctx)
            if result.structured_output:
                translated_summary_text = json.dumps(result.structured_output, ensure_ascii=False)
                cursor.execute(
                    "UPDATE assessment_summaries SET translated_summary_text = ? WHERE summary_id = ?",
                    (translated_summary_text, summary_id),
                )
                logger.info("Assessment translation success for %s (source=%s)", summary_id, result.source)
        except Exception as exc:
            logger.warning("Assessment translation skipped for %s: %s", summary_id, exc)

        conn.commit()
        return {
            "status": "success",
            "summary_id": summary_id,
            "patient_id": patient_id,
            "translated": bool(translated_summary_text),
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
        canonical_patient_id = resolve_patient_id(conn, patient_id) or patient_id
        cursor.execute(
            """
            SELECT summary_id, patient_id, patient_name, session_id,
                   risk_level, risk_label, summary_text, translated_summary_text,
                   concerns, recommendations, created_at
            FROM assessment_summaries
            WHERE patient_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 1
            """,
            (canonical_patient_id,),
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
            translated_summary_text=row["translated_summary_text"],
            concerns=json.loads(row["concerns"] or "[]"),
            recommendations=json.loads(row["recommendations"] or "[]"),
            created_at=row["created_at"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query assessment summary: {str(e)}")
    finally:
        conn.close()


@router.get("/assessment/history/{patient_id}")
async def get_assessment_history(patient_id: str):
    """
    获取患者所有历史评估记录（按创建时间倒序）。
    Phase 5: 从 chatbotagent Node 迁移到 Python 统一数据后端。
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        canonical_patient_id = resolve_patient_id(conn, patient_id) or patient_id
        cursor.execute(
            """
            SELECT summary_id, patient_id, patient_name, session_id,
                   risk_level, risk_label, summary_text, translated_summary_text,
                   concerns, recommendations, created_at
            FROM assessment_summaries
            WHERE patient_id = ?
            ORDER BY datetime(created_at) DESC
            """,
            (canonical_patient_id,),
        )
        rows = cursor.fetchall()
        return [
            {
                "summary_id": row["summary_id"],
                "patient_id": row["patient_id"],
                "patient_name": row["patient_name"],
                "session_id": row["session_id"],
                "risk_level": row["risk_level"] or "none",
                "risk_label": row["risk_label"] or "",
                "summary_text": row["summary_text"],
                "translated_summary_text": row["translated_summary_text"],
                "concerns": json.loads(row["concerns"] or "[]"),
                "recommendations": json.loads(row["recommendations"] or "[]"),
                "created_at": row["created_at"],
            }
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query assessment history: {str(e)}")
    finally:
        conn.close()


def parent_report_response(row: sqlite3.Row) -> Dict[str, Any]:
    payload: Dict[str, Any] = {}
    if row["payload"]:
        try:
            payload = json.loads(row["payload"])
        except Exception:
            payload = {}
    return {
        "report_id": row["report_id"],
        "patient_id": row["patient_id"],
        "patient_name": row["patient_name"],
        "session_id": row["session_id"],
        "report_type": row["report_type"],
        "risk_level": row["risk_level"] or "none",
        "risk_label": row["risk_label"] or "",
        "summary_text": row["summary_text"] or "",
        "recommendation": row["recommendation"],
        "payload": payload,
        "source": row["source"] or "parent",
        "submitted_at": row["submitted_at"],
    }


@router.post("/parent-report/submit")
async def submit_parent_report(payload: ParentReportSubmitPayload):
    """
    C-End parent submits self-screening/report evidence back to the therapist workspace.
    Kept separate from therapist-authored assessment_summaries.
    """
    conn = get_db_connection()
    try:
        patient_id = resolve_patient_id(conn, payload.patient_id)
        if not patient_id:
            raise HTTPException(status_code=404, detail="Patient not found for parent report")

        session_id = (payload.session_id or "").strip()
        if not session_id:
            latest_session = conn.execute(
                """
                SELECT session_id
                FROM synced_screenings
                WHERE patient_id = ?
                ORDER BY datetime(created_at) DESC
                LIMIT 1
                """,
                (patient_id,),
            ).fetchone()
            session_id = latest_session["session_id"] if latest_session else f"parent_{patient_id}"

        now_str = datetime.now().isoformat()
        report_type = (payload.report_type or "self_screening").strip() or "self_screening"
        payload_json = json.dumps(payload.payload or {}, ensure_ascii=False)

        existing = conn.execute(
            """
            SELECT report_id
            FROM parent_reports
            WHERE patient_id = ? AND session_id = ? AND report_type = ?
            ORDER BY datetime(submitted_at) DESC
            LIMIT 1
            """,
            (patient_id, session_id, report_type),
        ).fetchone()

        if existing:
            report_id = existing["report_id"]
            conn.execute(
                """
                UPDATE parent_reports
                SET patient_name = ?,
                    risk_level = ?,
                    risk_label = ?,
                    summary_text = ?,
                    recommendation = ?,
                    payload = ?,
                    source = ?,
                    submitted_at = ?
                WHERE report_id = ?
                """,
                (
                    payload.patient_name,
                    payload.risk_level,
                    payload.risk_label,
                    payload.summary_text,
                    payload.recommendation,
                    payload_json,
                    payload.source or "parent",
                    now_str,
                    report_id,
                ),
            )
        else:
            report_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO parent_reports (
                    report_id, patient_id, patient_name, session_id, report_type,
                    risk_level, risk_label, summary_text, recommendation,
                    payload, source, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report_id,
                    patient_id,
                    payload.patient_name,
                    session_id,
                    report_type,
                    payload.risk_level,
                    payload.risk_label,
                    payload.summary_text,
                    payload.recommendation,
                    payload_json,
                    payload.source or "parent",
                    now_str,
                ),
            )

        conn.commit()
        row = conn.execute(
            """
            SELECT report_id, patient_id, patient_name, session_id, report_type,
                   risk_level, risk_label, summary_text, recommendation,
                   payload, source, submitted_at
            FROM parent_reports
            WHERE report_id = ?
            """,
            (report_id,),
        ).fetchone()
        return parent_report_response(row)
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit parent report: {str(e)}")
    finally:
        conn.close()


@router.get("/parent-report/{patient_id}", response_model=List[ParentReportResponse])
async def get_parent_reports(patient_id: str, limit: int = 20):
    """
    B-End therapist workspace retrieves parent-submitted reports by canonical patient.
    """
    conn = get_db_connection()
    try:
        canonical_patient_id = resolve_patient_id(conn, patient_id)
        if not canonical_patient_id:
            return []

        safe_limit = max(1, min(int(limit or 20), 100))
        rows = conn.execute(
            """
            SELECT report_id, patient_id, patient_name, session_id, report_type,
                   risk_level, risk_label, summary_text, recommendation,
                   payload, source, submitted_at
            FROM parent_reports
            WHERE patient_id = ?
            ORDER BY datetime(submitted_at) DESC
            LIMIT ?
            """,
            (canonical_patient_id, safe_limit),
        ).fetchall()
        return [parent_report_response(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query parent reports: {str(e)}")
    finally:
        conn.close()


@router.get("/assessment/search")
async def search_assessment_by_name(name: str):
    """
    按患者姓名模糊搜索评估记录。
    Phase 5: 供 chatbotagent Node 内部调用，替代原 JSON DB 的 includes 查询。
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT summary_id, patient_id, patient_name, session_id,
                   risk_level, risk_label, summary_text, translated_summary_text,
                   concerns, recommendations, created_at
            FROM assessment_summaries
            WHERE patient_name LIKE ?
            ORDER BY datetime(created_at) DESC
            """,
            (f"%{name}%",),
        )
        rows = cursor.fetchall()
        return [
            {
                "summary_id": row["summary_id"],
                "patient_id": row["patient_id"],
                "patient_name": row["patient_name"],
                "session_id": row["session_id"],
                "risk_level": row["risk_level"] or "none",
                "risk_label": row["risk_label"] or "",
                "summary_text": row["summary_text"],
                "translated_summary_text": row["translated_summary_text"],
                "concerns": json.loads(row["concerns"] or "[]"),
                "recommendations": json.loads(row["recommendations"] or "[]"),
                "created_at": row["created_at"],
            }
            for row in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search assessments: {str(e)}")
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
        patient_id = resolve_patient_id(conn, payload.patient_id) or payload.patient_id
        upsert_patient_identity(
            conn,
            patient_id=patient_id,
            display_name=payload.patient_name,
        )

        # 检查当天是否已有记录（upsert）
        cursor.execute(
            """
            SELECT id FROM daily_tracking
            WHERE patient_id = ? AND tracking_date = ?
            LIMIT 1
            """,
            (patient_id, payload.tracking_date),
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
                    patient_id,
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
        canonical_patient_id = resolve_patient_id(conn, patient_id) or patient_id

        cursor.execute(
            """
            SELECT id, patient_id, patient_name, tracking_date,
                   exercises_completed, total_duration_min,
                   symptoms, notes, submitted_at
            FROM daily_tracking
            WHERE patient_id = ?
              AND tracking_date >= ?
            ORDER BY tracking_date DESC
            """,
            (canonical_patient_id, since_date),
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


# ═══ 3.5 提醒系统：按时间间隔提醒康复师下达量表/处方/评估 ═══

# 建议推送间隔（天）
RECOMMENDED_INTERVALS: Dict[str, int] = {
    "SRS-22": 90,     # 每3个月
    "ODI": 60,        # 每2个月
    "VAS": 14,        # 每2周
    "MBI": 60,        # 每2个月
    "HAM-A": 28,      # 每4周
    "Berg": 60,       # 每2个月（专业评定，但提醒频率不变）
    "MMT": 30,        # 每月
    "MAS": 30,        # 每月
}

PLAN_RECOMMENDED_INTERVAL_DAYS = 28     # 训练处方每4周更新
ASSESSMENT_RECOMMENDED_INTERVAL_DAYS = 3  # 评估后3天内应推送摘要


class ReminderItem(BaseModel):
    """单条提醒"""
    item_type: str          # "scale" | "plan" | "assessment"
    item_id: str            # scale_id / "treatment_plan" / "assessment_summary"
    item_label: str         # 显示名称
    status: str             # "ok" | "due_soon" | "overdue" | "missing"
    days_since_last: Optional[int] = None  # 距上次推送天数
    recommended_interval: int              # 建议间隔天数
    last_push_at: Optional[str] = None     # 上次推送时间 ISO
    patient_id: str
    patient_name: Optional[str] = None


class PatientRemindersResponse(BaseModel):
    """单个患者的提醒汇总"""
    patient_id: str
    patient_name: Optional[str] = None
    items: List[ReminderItem] = []
    overdue_count: int = 0
    due_soon_count: int = 0


def _compute_reminder_status(
    last_push_at: Optional[str],
    interval_days: int,
) -> tuple[str, Optional[int]]:
    """根据距上次推送的天数计算提醒状态。

    Returns:
        (status, days_since): status 为 "ok"/"due_soon"/"overdue"/"missing"
    """
    if not last_push_at:
        return ("missing", None)

    try:
        last_dt = datetime.fromisoformat(last_push_at)
    except (ValueError, TypeError):
        return ("missing", None)

    days_since = (datetime.now() - last_dt).days

    if days_since >= interval_days:
        return ("overdue", days_since)
    elif days_since >= interval_days * 0.7:
        return ("due_soon", days_since)
    else:
        return ("ok", days_since)


@router.get("/reminders/{patient_id}", response_model=PatientRemindersResponse)
async def get_patient_reminders(patient_id: str):
    """获取单个患者的推送提醒状态。"""
    conn = get_db_connection()
    try:
        canonical_pid = resolve_patient_id(conn, patient_id) or patient_id

        # 获取患者姓名
        patient_row = conn.execute(
            "SELECT display_name FROM patients WHERE patient_id = ?",
            (canonical_pid,),
        ).fetchone()
        patient_name = patient_row["display_name"] if patient_row else None

        items: List[ReminderItem] = []

        # ── 1. 各量表最后推送时间 ──
        for scale_id, interval in RECOMMENDED_INTERVALS.items():
            row = conn.execute(
                """
                SELECT scale_id, created_at
                FROM pending_scales
                WHERE patient_id = ? AND scale_id = ?
                ORDER BY datetime(created_at) DESC
                LIMIT 1
                """,
                (canonical_pid, scale_id),
            ).fetchone()

            last_push = row["created_at"] if row else None
            status, days_since = _compute_reminder_status(last_push, interval)

            items.append(ReminderItem(
                item_type="scale",
                item_id=scale_id,
                item_label=f"{scale_id} 量表",
                status=status,
                days_since_last=days_since,
                recommended_interval=interval,
                last_push_at=last_push,
                patient_id=canonical_pid,
                patient_name=patient_name,
            ))

        # ── 2. 训练处方最后推送时间 ──
        plan_row = conn.execute(
            """
            SELECT plan_id, created_at
            FROM treatment_plans
            WHERE patient_id = ? AND status = 'active'
            ORDER BY datetime(created_at) DESC
            LIMIT 1
            """,
            (canonical_pid,),
        ).fetchone()

        plan_last_push = plan_row["created_at"] if plan_row else None
        plan_status, plan_days = _compute_reminder_status(plan_last_push, PLAN_RECOMMENDED_INTERVAL_DAYS)

        items.append(ReminderItem(
            item_type="plan",
            item_id="treatment_plan",
            item_label="运动处方",
            status=plan_status,
            days_since_last=plan_days,
            recommended_interval=PLAN_RECOMMENDED_INTERVAL_DAYS,
            last_push_at=plan_last_push,
            patient_id=canonical_pid,
            patient_name=patient_name,
        ))

        # ── 3. 评估摘要最后推送时间 ──
        ast_row = conn.execute(
            """
            SELECT summary_id, created_at
            FROM assessment_summaries
            WHERE patient_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 1
            """,
            (canonical_pid,),
        ).fetchone()

        ast_last_push = ast_row["created_at"] if ast_row else None
        ast_status, ast_days = _compute_reminder_status(ast_last_push, ASSESSMENT_RECOMMENDED_INTERVAL_DAYS)

        items.append(ReminderItem(
            item_type="assessment",
            item_id="assessment_summary",
            item_label="评估摘要",
            status=ast_status,
            days_since_last=ast_days,
            recommended_interval=ASSESSMENT_RECOMMENDED_INTERVAL_DAYS,
            last_push_at=ast_last_push,
            patient_id=canonical_pid,
            patient_name=patient_name,
        ))

        overdue_count = sum(1 for it in items if it.status == "overdue")
        due_soon_count = sum(1 for it in items if it.status == "due_soon")

        return PatientRemindersResponse(
            patient_id=canonical_pid,
            patient_name=patient_name,
            items=items,
            overdue_count=overdue_count,
            due_soon_count=due_soon_count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute reminders: {str(e)}")
    finally:
        conn.close()


@router.get("/reminders")
async def get_all_reminders():
    """获取所有患者的推送提醒汇总（用于仪表盘聚合卡片）。"""
    conn = get_db_connection()
    try:
        # 获取所有有推送记录的患者
        patient_rows = conn.execute(
            "SELECT DISTINCT patient_id, display_name FROM patients"
        ).fetchall()

        all_reminders: List[PatientRemindersResponse] = []
        total_overdue = 0
        total_due_soon = 0

        for prow in patient_rows:
            pid = prow["patient_id"]
            pname = prow["display_name"]

            items: List[ReminderItem] = []

            # 量表
            for scale_id, interval in RECOMMENDED_INTERVALS.items():
                row = conn.execute(
                    """
                    SELECT created_at FROM pending_scales
                    WHERE patient_id = ? AND scale_id = ?
                    ORDER BY datetime(created_at) DESC LIMIT 1
                    """,
                    (pid, scale_id),
                ).fetchone()
                last_push = row["created_at"] if row else None
                status, days_since = _compute_reminder_status(last_push, interval)
                items.append(ReminderItem(
                    item_type="scale", item_id=scale_id,
                    item_label=f"{scale_id} 量表", status=status,
                    days_since_last=days_since, recommended_interval=interval,
                    last_push_at=last_push, patient_id=pid, patient_name=pname,
                ))

            # 处方
            plan_row = conn.execute(
                "SELECT created_at FROM treatment_plans WHERE patient_id = ? AND status = 'active' ORDER BY datetime(created_at) DESC LIMIT 1",
                (pid,),
            ).fetchone()
            plan_last = plan_row["created_at"] if plan_row else None
            p_status, p_days = _compute_reminder_status(plan_last, PLAN_RECOMMENDED_INTERVAL_DAYS)
            items.append(ReminderItem(
                item_type="plan", item_id="treatment_plan", item_label="运动处方",
                status=p_status, days_since_last=p_days,
                recommended_interval=PLAN_RECOMMENDED_INTERVAL_DAYS,
                last_push_at=plan_last, patient_id=pid, patient_name=pname,
            ))

            # 评估
            ast_row = conn.execute(
                "SELECT created_at FROM assessment_summaries WHERE patient_id = ? ORDER BY datetime(created_at) DESC LIMIT 1",
                (pid,),
            ).fetchone()
            ast_last = ast_row["created_at"] if ast_row else None
            a_status, a_days = _compute_reminder_status(ast_last, ASSESSMENT_RECOMMENDED_INTERVAL_DAYS)
            items.append(ReminderItem(
                item_type="assessment", item_id="assessment_summary", item_label="评估摘要",
                status=a_status, days_since_last=a_days,
                recommended_interval=ASSESSMENT_RECOMMENDED_INTERVAL_DAYS,
                last_push_at=ast_last, patient_id=pid, patient_name=pname,
            ))

            overdue = sum(1 for it in items if it.status == "overdue")
            due_soon = sum(1 for it in items if it.status == "due_soon")
            total_overdue += overdue
            total_due_soon += due_soon

            # 只返回有提醒的患者（overdue 或 due_soon）
            if overdue > 0 or due_soon > 0:
                all_reminders.append(PatientRemindersResponse(
                    patient_id=pid, patient_name=pname, items=items,
                    overdue_count=overdue, due_soon_count=due_soon,
                ))

        return {
            "total_overdue": total_overdue,
            "total_due_soon": total_due_soon,
            "patients": all_reminders,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute all reminders: {str(e)}")
    finally:
        conn.close()
