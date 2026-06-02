"""
backend/seed.py — 开发环境种子数据

Phase 5: 从 chatbotagent/server/seed.ts 迁移到 Rehab Python SQLite。
所有数据统一写入 rehab_integration.db，作为唯一数据源。

关键：种子数据只在对应表为空时插入（幂等，不影响已有数据）。
"""

import sqlite3
import hashlib
import uuid
import secrets
import os
import sys
from datetime import datetime, timedelta

# Windows 兼容：强制 UTF-8 输出
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rehab_integration.db")
FAMILY_CODE_HASH_NAMESPACE = "rehab-family-code:v1:"
FAMILY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPRTUVWXYZ"  # 20字符，无 I/O/Q 防混淆
SHORT_CODE_LENGTH = 4


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_family_code(code: str) -> str:
    return hashlib.sha256(f"{FAMILY_CODE_HASH_NAMESPACE}{code.strip().upper()}".encode("utf-8")).hexdigest()


def generate_patient_id() -> str:
    return f"pat_{uuid.uuid4().hex[:12]}"


def generate_family_code(length: int = 6) -> str:
    return "".join(secrets.choice(FAMILY_CODE_ALPHABET) for _ in range(length))


def generate_short_code() -> str:
    """生成4位大写字母临床短码"""
    return "".join(secrets.choice(SHORT_CODE_ALPHABET) for _ in range(SHORT_CODE_LENGTH))


def seed_all():
    conn = get_db_connection()
    try:
        now = datetime.now()
        now_str = now.isoformat()

        # ── 测试患者 1: 小明 ──
        patient_1_id = "P00001"
        family_code_1 = "ABC123"

        # ── 测试患者 2: 小红 ──
        patient_2_id = "P00002"
        family_code_2 = "XYZ789"

        # ═══ 1. Patients 表 ═══
        existing = conn.execute("SELECT COUNT(*) as cnt FROM patients").fetchone()
        if existing["cnt"] == 0:
            print("[Seed] Inserting test patients...")
            short_code_1 = generate_short_code()
            short_code_2 = generate_short_code()
            conn.execute(
                """
                INSERT INTO patients (patient_id, short_code, display_name, sex, age, height_cm, notes, suc, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (patient_1_id, short_code_1, "小明", "male", 9, 135, "测试患者 - 中度脊柱侧弯风险", None, now_str, now_str),
            )
            conn.execute(
                """
                INSERT INTO patients (patient_id, short_code, display_name, sex, age, height_cm, notes, suc, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (patient_2_id, short_code_2, "小红", "female", 12, 152, "测试患者 - 轻度姿态异常", None, now_str, now_str),
            )
            conn.commit()
            print(f"  ✅ 患者: 小明 (P00001, {short_code_1}), 小红 (P00002, {short_code_2})")
        else:
            print("[Seed] Patients table already has data — skipped")

        # ═══ 2. Family Access Links ═══
        existing = conn.execute(
            "SELECT COUNT(*) as cnt FROM patient_access_links WHERE link_type = 'family_code'"
        ).fetchone()
        if existing["cnt"] == 0:
            print("[Seed] Inserting family access links...")
            conn.execute(
                """
                INSERT INTO patient_access_links (patient_id, link_type, code, status, linked_to, created_at, expires_at)
                VALUES (?, 'family_code', ?, 'active', ?, ?, ?)
                """,
                (patient_1_id, hash_family_code(family_code_1), "小明", now_str, None),
            )
            conn.execute(
                """
                INSERT INTO patient_access_links (patient_id, link_type, code, status, linked_to, created_at, expires_at)
                VALUES (?, 'family_code', ?, 'active', ?, ?, ?)
                """,
                (patient_2_id, hash_family_code(family_code_2), "小红", now_str, None),
            )
            conn.commit()
            print(f"  ✅ 家庭码: ABC123 → 小明, XYZ789 → 小红 (SHA-256 哈希存储)")
        else:
            print("[Seed] Family access links already exist — skipped")

        # ═══ 3. Assessment Summaries ═══
        existing = conn.execute("SELECT COUNT(*) as cnt FROM assessment_summaries").fetchone()
        if existing["cnt"] == 0:
            print("[Seed] Inserting assessment summaries...")
            import json
            conn.execute(
                """
                INSERT INTO assessment_summaries (
                    summary_id, patient_id, patient_name, session_id,
                    risk_level, risk_label, summary_text,
                    concerns, recommendations, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"seed_summary_{uuid.uuid4().hex[:8]}",
                    patient_1_id,
                    "小明",
                    f"session_{patient_1_id}_eval_001",
                    "medium",
                    "中度脊柱侧弯风险",
                    "经专业评估，孩子目前存在轻中度胸段脊柱侧弯（Cobb角约18°），伴轻度体态倾斜。建议立即开始支具干预和特定运动康复训练，每3个月复查脊柱全长X光片。当前正值生长发育高峰期，需密切关注侧弯进展速度。",
                    json.dumps([
                        "胸段右侧凸 Cobb角约18°",
                        "双肩不等高（右肩低于左肩约1.5cm）",
                        "Adam前屈试验可见右侧肋骨隆起",
                        "正值生长发育高峰期（9岁，Risser 0级）",
                    ]),
                    json.dumps([
                        "每日佩戴脊柱侧弯矫形支具 ≥ 16小时",
                        "每日完成特定脊柱侧弯体操训练（Schroth方法），每次30-45分钟",
                        "每3个月复查脊柱全长X光片，评估Cobb角变化",
                        "注意坐姿和站姿，避免长时间低头看电子产品",
                        "如出现疼痛、麻木或外观明显变化，及时复诊",
                    ]),
                    (now - timedelta(days=5)).isoformat(),
                ),
            )
            # 小红的评估
            conn.execute(
                """
                INSERT INTO assessment_summaries (
                    summary_id, patient_id, patient_name, session_id,
                    risk_level, risk_label, summary_text,
                    concerns, recommendations, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"seed_summary_{uuid.uuid4().hex[:8]}",
                    patient_2_id,
                    "小红",
                    f"session_{patient_2_id}_eval_001",
                    "low",
                    "轻度姿态异常",
                    "筛查显示轻微姿态不对称，未发现明显脊柱侧弯。建议保持良好姿势习惯，定期随访观察。",
                    json.dumps(["轻度双肩不等高", "日常姿势不良"]),
                    json.dumps(["每日做姿态矫正操10分钟", "3个月后随访复查"]),
                    (now - timedelta(days=9)).isoformat(),
                ),
            )
            conn.commit()
            print(f"  ✅ 评估摘要: 2 条 (小明-中度, 小红-轻度)")
        else:
            print("[Seed] Assessment summaries already exist — skipped")

        # ═══ 4. Treatment Plans ═══
        existing = conn.execute("SELECT COUNT(*) as cnt FROM treatment_plans").fetchone()
        if existing["cnt"] == 0:
            print("[Seed] Inserting treatment plans...")
            plan_content = """# 小明个人化脊柱侧弯康复训练方案

## 训练原则
- Schroth 三维脊柱侧弯矫正体操
- 重点矫正胸段右侧凸
- 配合旋转呼吸训练
- 每天坚持，循序渐进

## 热身（5分钟）
- 猫牛式：缓慢进行，配合呼吸，10次
- 骨盆前后倾：激活核心肌群，10次
- 肩胛骨回缩：改善驼背姿势，10次

## 核心训练（15分钟）
- 侧平板支撑（右侧）：增强右侧核心力量，3组×30秒
- 死虫式：核心稳定训练，3组×10次
- Schroth旋转呼吸：在矫正位进行深呼吸，5分钟
- 坐姿脊柱伸展：用泡沫轴辅助，2分钟

## 拉伸放松（10分钟）
- 右侧胸椎凹侧拉伸：针对性拉伸缩短肌肉，3组×30秒
- 胸肌拉伸：改善前侧紧张，2组×30秒
- 腘绳肌拉伸：改善骨盆位置，2组×30秒
- 儿童式放松：结束放松，2分钟

## 注意事项
1. 训练时穿着舒适运动服
2. 训练前确保支具已取下
3. 如出现疼痛立即停止，联系康复师
4. 每天记录训练完成情况"""
            conn.execute(
                """
                INSERT INTO treatment_plans (
                    plan_id, patient_id, patient_name, session_id,
                    therapist_name, plan_content, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"seed_plan_{uuid.uuid4().hex[:8]}",
                    patient_1_id,
                    "小明",
                    f"session_{patient_1_id}_plan_001",
                    "李康复师",
                    plan_content,
                    "active",
                    (now - timedelta(days=4)).isoformat(),
                    None,
                ),
            )
            conn.commit()
            print(f"  ✅ 训练处方: 1 条 (小明 - 脊柱侧弯康复方案)")
        else:
            print("[Seed] Treatment plans already exist — skipped")

        # ═══ 5. Scale Tasks ═══
        existing = conn.execute("SELECT COUNT(*) as cnt FROM pending_scales").fetchone()
        if existing["cnt"] == 0:
            print("[Seed] Inserting scale tasks...")
            conn.execute(
                """
                INSERT INTO pending_scales (
                    task_id, patient_id, patient_name, session_id,
                    scale_id, status, created_at, submitted_at
                ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
                """,
                (
                    f"seed_scale_{uuid.uuid4().hex[:8]}",
                    patient_1_id,
                    "小明",
                    f"session_{patient_1_id}_scale_001",
                    "SRS-22",
                    (now - timedelta(days=1)).isoformat(),
                    None,
                ),
            )
            conn.commit()
            print(f"  ✅ 量表任务: 1 条 (小明 - SRS-22)")
        else:
            print("[Seed] Scale tasks already exist — skipped")

        # ═══ 6. Daily Tracking ═══
        existing = conn.execute("SELECT COUNT(*) as cnt FROM daily_tracking").fetchone()
        if existing["cnt"] == 0:
            print("[Seed] Inserting daily tracking records (7 days)...")
            import json
            for i in range(6, -1, -1):
                date = now - timedelta(days=i)
                date_str = date.strftime("%Y-%m-%d")
                completed = i != 1  # 昨天没做训练
                pain_level = (i % 3) + 1 if completed else 4

                exercises = [{"name": "康复训练", "duration": 35, "completed": True}] if completed else []
                duration = 35 if completed else 0
                symptoms = {
                    "pain_level": pain_level,
                    "pain_location": "背部右侧" if pain_level > 0 else "",
                    "abnormal_symptoms": ["训练后轻微酸痛"] if i == 0 else [],
                    "mood": 4 if completed else 3,
                }
                notes = "今天训练完成得不错，孩子配合度提高" if completed else "今天因为学校活动没有完成训练"

                conn.execute(
                    """
                    INSERT INTO daily_tracking (
                        patient_id, patient_name, tracking_date,
                        exercises_completed, total_duration_min,
                        symptoms, notes, submitted_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        patient_1_id,
                        "小明",
                        date_str,
                        json.dumps(exercises),
                        duration,
                        json.dumps(symptoms),
                        notes,
                        date.isoformat(),
                    ),
                )
            conn.commit()
            print(f"  ✅ 每日打卡: 7 条 (小明 - 近7天)")
        else:
            print("[Seed] Daily tracking already exists — skipped")

        print("\n[Seed] All seed data ready! ✅")

    except Exception as e:
        conn.rollback()
        print(f"[Seed] ERROR: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    seed_all()
