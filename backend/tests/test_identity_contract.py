import os
import sqlite3
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


TEST_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "rehab_integration_test_identity.db",
)


with patch("routers.integration.DB_PATH", TEST_DB_PATH):
    from main import app
    from routers.integration import init_db


client = TestClient(app)


def fetch_one(query, params=()):
    conn = sqlite3.connect(TEST_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        return conn.execute(query, params).fetchone()
    finally:
        conn.close()


def fetch_family_access_link(patient_id):
    return fetch_one(
        """
        SELECT id, patient_id, code, status, expires_at
        FROM patient_access_links
        WHERE patient_id = ? AND link_type = 'family_code'
        ORDER BY id DESC
        LIMIT 1
        """,
        (patient_id,),
    )


@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)

    with patch("routers.integration.DB_PATH", TEST_DB_PATH):
        init_db()
        yield

    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def screening_payload(session_id="session_identity_1", subject_id="FAM1", display_name="Student A"):
    return {
        "session_id": session_id,
        "subject": {
            "subject_id": subject_id,
            "display_name": display_name,
            "sex": "female",
            "age": 13,
            "height_cm": 158.0,
            "notes": "screening intake",
        },
        "protocol_results": [
            {
                "result_id": f"{session_id}_static",
                "protocol": "static_posture",
                "status": "completed",
                "capture_quality": "good",
                "metrics": {"shoulder_angle": 1.2},
                "findings": ["mild shoulder asymmetry"],
                "risk_flags": ["posture_attention"],
                "recommendations": ["follow up"],
                "psi_score": 88.0,
                "severity_grades": {"coronal": "mild"},
            }
        ],
        "integrated_report": {
            "report_id": f"{session_id}_report",
            "title": "Youth posture screening report",
            "overall_risk": "attention",
            "consistency_level": "single_protocol",
            "main_patterns": ["shoulder asymmetry"],
            "next_action": "professional_evaluation",
            "summary": "Screening suggests follow-up attention.",
            "recommendations": ["therapist review"],
        },
        "llm_analysis": {
            "enhanced_summary": "Follow-up suggested.",
            "suggestions": ["review"],
            "limitations": ["single screening session"],
        },
        "created_at": "2026-05-30T09:00:00Z",
    }


def confirm_screening(session_id, subject_id, patient_id, display_name="Student A"):
    response = client.post(
        "/api/integration/sync-screening",
        json=screening_payload(session_id=session_id, subject_id=subject_id, display_name=display_name),
    )
    assert response.status_code == 200

    response = client.post(
        f"/api/integration/intake/{session_id}/confirm",
        json={
            "action": "create_patient",
            "patient_id": patient_id,
            "family_code": subject_id,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == patient_id
    assert data["family_code"] == subject_id
    return data


def test_intake_confirm_binds_family_code_to_patient_id_and_guards_scale_submit():
    patient_id = "pat_identity_001"
    family_code = "FAM1"
    session_id = "session_identity_1"
    confirm_screening(session_id, family_code, patient_id)

    login = client.post("/api/integration/family/login", json={"family_code": family_code.lower()})
    assert login.status_code == 200
    login_data = login.json()
    assert login_data["patient_id"] == patient_id
    assert login_data["display_name"] == "Student A"
    assert login_data["session_id"] == session_id

    push = client.post(
        "/api/integration/scale/push",
        json={
            "patient_id": family_code,
            "patient_name": "Student A",
            "session_id": session_id,
            "scale_id": "SRS-22",
            "therapist_name": "Therapist",
        },
    )
    assert push.status_code == 200
    push_data = push.json()
    assert push_data["patient_id"] == patient_id
    task_id = push_data["task_id"]

    pending = client.get(f"/api/integration/scale/pending/{family_code}")
    assert pending.status_code == 200
    pending_data = pending.json()
    assert len(pending_data) == 1
    assert pending_data[0]["patient_id"] == patient_id

    rejected = client.post(
        "/api/integration/scale/submit",
        json={
            "task_id": task_id,
            "session_id": session_id,
            "patient_id": "pat_wrong_999",
            "scale_data": {"score": 10},
        },
    )
    assert rejected.status_code == 403

    submitted = client.post(
        "/api/integration/scale/submit",
        json={
            "task_id": task_id,
            "session_id": session_id,
            "patient_id": family_code,
            "scale_data": {"score": 10},
        },
    )
    assert submitted.status_code == 200


def test_full_closed_loop_data_flow_from_screening_to_c_end_and_back():
    patient_id = "pat_flow_001"
    family_code = "FLOW1"
    display_name = "Flow Student"
    session_1 = "session_flow_1"
    session_2 = "session_flow_2"

    first_payload = screening_payload(session_id=session_1, subject_id=family_code, display_name=display_name)
    first_payload["created_at"] = "2026-05-31T09:00:00Z"

    sync_1 = client.post("/api/integration/sync-screening", json=first_payload)
    assert sync_1.status_code == 200
    assert sync_1.json()["action"] == "created"

    pending = client.get("/api/integration/synced-screenings?status=pending")
    assert pending.status_code == 200
    pending_rows = pending.json()
    assert len(pending_rows) == 1
    assert pending_rows[0]["session_id"] == session_1
    assert pending_rows[0]["patient_id"] is None

    confirm = client.post(
        f"/api/integration/intake/{session_1}/confirm",
        json={
            "action": "create_patient",
            "patient_id": patient_id,
            "family_code": family_code,
            "family_code_expires_at": "2099-01-01T00:00:00",
        },
    )
    assert confirm.status_code == 200
    assert confirm.json()["patient_id"] == patient_id
    assert confirm.json()["family_code"] == family_code

    patient_row = fetch_one("SELECT patient_id, display_name FROM patients WHERE patient_id = ?", (patient_id,))
    assert patient_row["display_name"] == display_name

    alias_row = fetch_one(
        """
        SELECT patient_id FROM patient_aliases
        WHERE source_system = 'early_screening'
          AND alias_type = 'subject_id'
          AND alias_value = ?
        """,
        (family_code,),
    )
    assert alias_row["patient_id"] == patient_id

    access_row = fetch_one(
        """
        SELECT patient_id, code, status, expires_at FROM patient_access_links
        WHERE link_type = 'family_code' AND patient_id = ?
        """,
        (patient_id,),
    )
    assert access_row["patient_id"] == patient_id
    assert access_row["code"] != family_code
    assert len(access_row["code"]) == 64
    assert access_row["status"] == "active"
    assert access_row["expires_at"] == "2099-01-01T00:00:00"

    first_detail = client.get(f"/api/integration/synced-screenings/{session_1}")
    assert first_detail.status_code == 200
    assert first_detail.json()["status"] == "imported"
    assert first_detail.json()["patient_id"] == patient_id

    second_payload = screening_payload(session_id=session_2, subject_id=family_code, display_name=display_name)
    second_payload["created_at"] = "2026-05-31T10:00:00Z"
    second_payload["protocol_results"][0]["metrics"] = {
        "shoulder_angle": 2.5,
        "pelvic_tilt": 1.1,
    }
    sync_2 = client.post("/api/integration/sync-screening", json=second_payload)
    assert sync_2.status_code == 200

    second_detail = client.get(f"/api/integration/synced-screenings/{session_2}")
    assert second_detail.status_code == 200
    assert second_detail.json()["patient_id"] == patient_id

    subject_lookup = client.get(f"/api/integration/subject/{family_code}")
    assert subject_lookup.status_code == 200
    assert subject_lookup.json()["patient_id"] == patient_id
    assert subject_lookup.json()["session_id"] == session_2

    trends = client.get(f"/api/integration/subject/{family_code}/trends")
    assert trends.status_code == 200
    assert [row["session_id"] for row in trends.json()] == [session_1, session_2]
    assert trends.json()[1]["metrics"]["shoulder_angle"] == 2.5

    login = client.post("/api/integration/family/login", json={"family_code": family_code.lower()})
    assert login.status_code == 200
    login_data = login.json()
    assert login_data["patient_id"] == patient_id
    assert login_data["session_id"] == session_2
    assert set(login_data["allowed_features"]) >= {"report", "scale", "plan", "tracking"}

    scale_push = client.post(
        "/api/integration/scale/push",
        json={
            "patient_id": family_code,
            "patient_name": display_name,
            "session_id": session_2,
            "scale_id": "SRS-22",
            "therapist_name": "Therapist Flow",
        },
    )
    assert scale_push.status_code == 200
    scale_task_id = scale_push.json()["task_id"]
    assert scale_push.json()["patient_id"] == patient_id

    pending_scales = client.get(f"/api/integration/scale/pending/{patient_id}")
    assert pending_scales.status_code == 200
    assert len(pending_scales.json()) == 1
    assert pending_scales.json()[0]["task_id"] == scale_task_id

    scale_submit = client.post(
        "/api/integration/scale/submit",
        json={
            "task_id": scale_task_id,
            "session_id": session_2,
            "patient_id": family_code,
            "scale_data": {
                "scaleId": "SRS-22",
                "totalScore": 88,
                "dimensions": {"function": 4.0},
            },
        },
    )
    assert scale_submit.status_code == 200

    pending_after_submit = client.get(f"/api/integration/scale/pending/{family_code}")
    assert pending_after_submit.status_code == 200
    assert pending_after_submit.json() == []

    scale_results = client.get(f"/api/integration/scale/results/{session_2}")
    assert scale_results.status_code == 200
    assert len(scale_results.json()) == 1
    assert scale_results.json()[0]["patient_id"] == patient_id
    assert scale_results.json()[0]["status"] == "completed"
    assert scale_results.json()[0]["scale_data"]["totalScore"] == 88

    old_session_results = client.get(f"/api/integration/scale/results/{session_1}")
    assert old_session_results.status_code == 200
    assert old_session_results.json() == []

    plan_1 = client.post(
        "/api/integration/plan/push",
        json={
            "patient_id": family_code,
            "patient_name": display_name,
            "session_id": session_2,
            "therapist_name": "Therapist Flow",
            "plan_content": "Plan v1",
        },
    )
    assert plan_1.status_code == 200

    plan_2 = client.post(
        "/api/integration/plan/push",
        json={
            "patient_id": patient_id,
            "patient_name": display_name,
            "session_id": session_2,
            "therapist_name": "Therapist Flow",
            "plan_content": "Plan v2",
        },
    )
    assert plan_2.status_code == 200

    active_plans = client.get(f"/api/integration/plan/pending/{family_code}")
    assert active_plans.status_code == 200
    assert len(active_plans.json()) == 1
    assert active_plans.json()[0]["patient_id"] == patient_id
    assert active_plans.json()[0]["plan_content"] == "Plan v2"

    assessment = client.post(
        "/api/integration/assessment/push",
        json={
            "patient_id": family_code,
            "patient_name": display_name,
            "session_id": session_2,
            "risk_level": "medium",
            "risk_label": "posture follow-up",
            "summary_text": "Needs follow-up screening review.",
            "concerns": ["shoulder asymmetry"],
            "recommendations": ["review in two weeks"],
        },
    )
    assert assessment.status_code == 200

    assessment_summary = client.get(f"/api/integration/assessment/summary/{family_code}")
    assert assessment_summary.status_code == 200
    assert assessment_summary.json()["patient_id"] == patient_id
    assert assessment_summary.json()["risk_level"] == "medium"

    tracking_1 = client.post(
        "/api/integration/tracking/submit",
        json={
            "patient_id": family_code,
            "patient_name": display_name,
            "tracking_date": "2026-05-31",
            "exercises_completed": [{"id": "stretch", "done": True}],
            "total_duration_min": 20,
            "symptoms": {"pain": 2},
            "notes": "first check-in",
        },
    )
    assert tracking_1.status_code == 200
    assert tracking_1.json()["action"] == "created"

    tracking_2 = client.post(
        "/api/integration/tracking/submit",
        json={
            "patient_id": patient_id,
            "patient_name": display_name,
            "tracking_date": "2026-05-31",
            "exercises_completed": [{"id": "stretch", "done": True}, {"id": "core", "done": True}],
            "total_duration_min": 35,
            "symptoms": {"pain": 1},
            "notes": "updated check-in",
        },
    )
    assert tracking_2.status_code == 200
    assert tracking_2.json()["action"] == "updated"

    tracking_history = client.get(f"/api/integration/tracking/{family_code}?days=36500")
    assert tracking_history.status_code == 200
    assert len(tracking_history.json()) == 1
    assert tracking_history.json()[0]["patient_id"] == patient_id
    assert tracking_history.json()[0]["total_duration_min"] == 35
    assert tracking_history.json()[0]["notes"] == "updated check-in"

    assert client.get(f"/api/integration/plan/pending/{display_name}").json() == []
    assert client.get(f"/api/integration/assessment/summary/{display_name}").json() is None
    assert client.get(f"/api/integration/tracking/{display_name}?days=36500").json() == []


def test_c_end_plan_summary_and_tracking_query_by_patient_id_not_name():
    patient_id = "pat_identity_002"
    family_code = "FAM2"
    session_id = "session_identity_2"
    display_name = "Student B"
    confirm_screening(session_id, family_code, patient_id, display_name=display_name)

    plan = client.post(
        "/api/integration/plan/push",
        json={
            "patient_id": family_code,
            "patient_name": display_name,
            "session_id": session_id,
            "therapist_name": "Therapist",
            "plan_content": "Daily training plan",
        },
    )
    assert plan.status_code == 200
    assert plan.json()["patient_id"] == patient_id

    plan_by_code = client.get(f"/api/integration/plan/pending/{family_code}")
    assert plan_by_code.status_code == 200
    assert len(plan_by_code.json()) == 1
    assert plan_by_code.json()[0]["patient_id"] == patient_id

    plan_by_name = client.get(f"/api/integration/plan/pending/{display_name}")
    assert plan_by_name.status_code == 200
    assert plan_by_name.json() == []

    summary = client.post(
        "/api/integration/assessment/push",
        json={
            "patient_id": family_code,
            "patient_name": display_name,
            "session_id": session_id,
            "risk_level": "low",
            "risk_label": "posture attention",
            "summary_text": "Continue monitoring and training.",
            "concerns": ["posture"],
            "recommendations": ["training"],
        },
    )
    assert summary.status_code == 200
    assert summary.json()["patient_id"] == patient_id

    summary_by_code = client.get(f"/api/integration/assessment/summary/{family_code}")
    assert summary_by_code.status_code == 200
    assert summary_by_code.json()["patient_id"] == patient_id

    summary_by_name = client.get(f"/api/integration/assessment/summary/{display_name}")
    assert summary_by_name.status_code == 200
    assert summary_by_name.json() is None

    tracking = client.post(
        "/api/integration/tracking/submit",
        json={
            "patient_id": family_code,
            "patient_name": display_name,
            "tracking_date": "2026-05-30",
            "exercises_completed": [{"id": "ex1", "done": True}],
            "total_duration_min": 20,
            "symptoms": {"pain": 1},
            "notes": "ok",
        },
    )
    assert tracking.status_code == 200

    tracking_by_code = client.get(f"/api/integration/tracking/{family_code}?days=7")
    assert tracking_by_code.status_code == 200
    assert len(tracking_by_code.json()) == 1
    assert tracking_by_code.json()[0]["patient_id"] == patient_id

    tracking_by_name = client.get(f"/api/integration/tracking/{display_name}?days=7")
    assert tracking_by_name.status_code == 200
    assert tracking_by_name.json() == []


def test_family_login_rejects_revoked_and_expired_access_links():
    patient_id = "pat_identity_003"
    family_code = "FAM3"
    session_id = "session_identity_3"
    confirm_screening(session_id, family_code, patient_id, display_name="Student C")
    access_row = fetch_family_access_link(patient_id)
    assert access_row["code"] != family_code
    assert len(access_row["code"]) == 64

    conn = sqlite3.connect(TEST_DB_PATH)
    try:
        conn.execute(
            """
            UPDATE patient_access_links
            SET status = 'revoked'
            WHERE link_type = 'family_code' AND patient_id = ?
            """,
            (patient_id,),
        )
        conn.commit()
    finally:
        conn.close()

    revoked = client.post("/api/integration/family/login", json={"family_code": family_code})
    assert revoked.status_code == 404

    conn = sqlite3.connect(TEST_DB_PATH)
    try:
        conn.execute(
            """
            UPDATE patient_access_links
            SET status = 'active', expires_at = '2020-01-01T00:00:00'
            WHERE link_type = 'family_code' AND patient_id = ?
            """,
            (patient_id,),
        )
        conn.commit()
    finally:
        conn.close()

    expired = client.post("/api/integration/family/login", json={"family_code": family_code})
    assert expired.status_code == 404

    conn = sqlite3.connect(TEST_DB_PATH)
    try:
        conn.execute(
            """
            UPDATE patient_access_links
            SET expires_at = '2099-01-01T00:00:00'
            WHERE link_type = 'family_code' AND patient_id = ?
            """,
            (patient_id,),
        )
        conn.commit()
    finally:
        conn.close()

    active = client.post("/api/integration/family/login", json={"family_code": family_code})
    assert active.status_code == 200
    assert active.json()["patient_id"] == patient_id


def test_family_access_management_rotates_without_exposing_stored_hashes():
    patient_id = "pat_identity_004"
    family_code = "FAM4"
    session_id = "session_identity_4"
    confirm_screening(session_id, family_code, patient_id, display_name="Student D")

    initial_link = fetch_family_access_link(patient_id)
    assert initial_link["code"] != family_code
    assert len(initial_link["code"]) == 64

    access_list = client.get(f"/api/integration/family/access/{patient_id}")
    assert access_list.status_code == 200
    access_data = access_list.json()
    assert len(access_data) == 1
    assert "code" not in access_data[0]
    assert access_data[0]["status"] == "active"
    assert access_data[0]["is_expired"] is False

    rotate = client.post(
        f"/api/integration/family/access/{patient_id}/rotate",
        json={
            "family_code": "FAM44",
            "expires_at": "2099-01-01T00:00:00",
            "linked_to": "Student D",
        },
    )
    assert rotate.status_code == 200
    rotate_data = rotate.json()
    assert rotate_data["family_code"] == "FAM44"
    assert "code" not in rotate_data

    old_login = client.post("/api/integration/family/login", json={"family_code": family_code})
    assert old_login.status_code == 404

    new_login = client.post("/api/integration/family/login", json={"family_code": "fam44"})
    assert new_login.status_code == 200
    assert new_login.json()["patient_id"] == patient_id

    rotated_link = fetch_family_access_link(patient_id)
    assert rotated_link["code"] != "FAM44"
    assert len(rotated_link["code"]) == 64
    assert rotated_link["expires_at"] == "2099-01-01T00:00:00"

    revoked_rows = client.get(f"/api/integration/family/access/{patient_id}").json()
    assert [row["status"] for row in revoked_rows] == ["active", "revoked"]

    extended = client.post(
        f"/api/integration/family/access-link/{rotated_link['id']}/extend",
        json={"expires_at": "2099-12-31T23:59:59"},
    )
    assert extended.status_code == 200
    assert extended.json()["expires_at"] == "2099-12-31T23:59:59"

    revoked = client.post(f"/api/integration/family/access-link/{rotated_link['id']}/revoke")
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"

    blocked_login = client.post("/api/integration/family/login", json={"family_code": "FAM44"})
    assert blocked_login.status_code == 404


def test_plaintext_family_access_links_are_migrated_to_hashes():
    patient_id = "pat_identity_005"
    family_code = "PLAIN5"

    conn = sqlite3.connect(TEST_DB_PATH)
    try:
        now = "2026-05-31T00:00:00"
        conn.execute(
            """
            INSERT INTO patients (patient_id, display_name, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (patient_id, "Plain Student", now, now),
        )
        conn.execute(
            """
            INSERT INTO patient_access_links (
                patient_id, link_type, code, status, linked_to, created_at, expires_at
            ) VALUES (?, 'family_code', ?, 'active', ?, ?, NULL)
            """,
            (patient_id, family_code, "Plain Student", now),
        )
        conn.commit()
    finally:
        conn.close()

    with patch("routers.integration.DB_PATH", TEST_DB_PATH):
        init_db()

    migrated = fetch_family_access_link(patient_id)
    assert migrated["code"] != family_code
    assert len(migrated["code"]) == 64

    login = client.post("/api/integration/family/login", json={"family_code": family_code.lower()})
    assert login.status_code == 200
    assert login.json()["patient_id"] == patient_id
