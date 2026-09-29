"""Run a disposable end-to-end acceptance check for the therapist workbench API.

The script starts the backend with a temporary SQLite database, exercises the
screening intake and family scale loop over HTTP, and removes all test data on
exit. It intentionally uses only Python's standard library.
"""

from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def request_json(
    base_url: str,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    expected_status: int = 200,
) -> Any:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(
        f"{base_url}{path}",
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=10) as response:
            status = response.status
            raw = response.read()
    except HTTPError as exc:
        status = exc.code
        raw = exc.read()

    if status != expected_status:
        detail = raw.decode("utf-8", errors="replace")
        raise AssertionError(
            f"{method} {path}: expected HTTP {expected_status}, got {status}: {detail}"
        )
    return json.loads(raw) if raw else None


def wait_until_ready(base_url: str, process: subprocess.Popen[str]) -> None:
    deadline = time.monotonic() + 30
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Backend stopped before becoming ready.")
        try:
            response = request_json(base_url, "GET", "/ready")
            if response.get("status") == "ready":
                return
        except (AssertionError, URLError, TimeoutError) as exc:
            last_error = exc
        time.sleep(0.25)
    raise RuntimeError(f"Backend did not become ready within 30 seconds: {last_error}")


def run_flow(base_url: str) -> None:
    health = request_json(base_url, "GET", "/health")
    assert health["status"] == "healthy"

    session_id = "release_acceptance_session"
    patient_id = "release_acceptance_patient"
    family_code = "REL001"
    screening = {
        "session_id": session_id,
        "subject": {
            "subject_id": family_code,
            "display_name": "Release Acceptance Student",
            "sex": "female",
            "age": 13,
            "height_cm": 158.0,
            "notes": "synthetic release acceptance data",
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
                "recommendations": ["therapist follow-up"],
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
            "summary": "Screening suggests therapist follow-up.",
            "recommendations": ["therapist review"],
        },
        "llm_analysis": {
            "enhanced_summary": "Follow-up suggested.",
            "suggestions": ["review"],
            "limitations": ["single screening session"],
        },
        "created_at": "2026-08-30T09:00:00Z",
    }
    synced = request_json(base_url, "POST", "/api/integration/sync-screening", screening)
    assert synced["status"] == "success"

    confirmed = request_json(
        base_url,
        "POST",
        f"/api/integration/intake/{session_id}/confirm",
        {
            "action": "create_patient",
            "patient_id": patient_id,
            "patient_code": "KJHT",
            "family_code": family_code,
        },
    )
    assert confirmed["patient_id"] == patient_id
    assert confirmed["family_code"] == family_code

    login = request_json(
        base_url, "POST", "/api/integration/family/login", {"family_code": family_code.lower()}
    )
    assert login["patient_id"] == patient_id

    pushed = request_json(
        base_url,
        "POST",
        "/api/integration/scale/push",
        {
            "patient_id": family_code,
            "patient_name": "Release Acceptance Student",
            "session_id": session_id,
            "scale_id": "SRS-22",
            "therapist_name": "Release Acceptance Therapist",
        },
    )
    task_id = pushed["task_id"]
    assert pushed["patient_id"] == patient_id

    pending = request_json(base_url, "GET", f"/api/integration/scale/pending/{family_code}")
    assert len(pending) == 1 and pending[0]["task_id"] == task_id

    request_json(
        base_url,
        "POST",
        "/api/integration/scale/submit",
        {
            "task_id": task_id,
            "session_id": session_id,
            "patient_id": "wrong_patient",
            "scale_data": {"totalScore": 10},
        },
        expected_status=403,
    )

    request_json(
        base_url,
        "POST",
        "/api/integration/scale/submit",
        {
            "task_id": task_id,
            "session_id": session_id,
            "patient_id": family_code,
            "scale_data": {
                "scaleId": "SRS-22",
                "filledBy": "parent",
                "totalScore": 85,
                "maxScore": 110,
            },
        },
    )

    results = request_json(base_url, "GET", f"/api/integration/scale/results/{session_id}")
    assert len(results) == 1
    assert results[0]["status"] == "completed"
    assert results[0]["scale_data"]["totalScore"] == 85


def main() -> int:
    port = free_port()
    base_url = f"http://127.0.0.1:{port}"
    with tempfile.TemporaryDirectory(prefix="rehab_release_acceptance_") as temp_dir:
        env = os.environ.copy()
        env.update(
            {
                "REHAB_DB_PATH": str(Path(temp_dir) / "acceptance.db"),
                "REHAB_SEED_DEMO_DATA": "false",
                "PYTHONIOENCODING": "utf-8",
            }
        )
        process = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
            ],
            cwd=BACKEND_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        failed = False
        try:
            wait_until_ready(base_url, process)
            run_flow(base_url)
            print("PASS: health, readiness, intake, identity, scale guard, and result flow")
            return 0
        except Exception as exc:
            failed = True
            print(f"FAIL: {exc}", file=sys.stderr)
            return 1
        finally:
            process.terminate()
            try:
                output, _ = process.communicate(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                output, _ = process.communicate(timeout=5)
            if (failed or process.returncode not in (0, -15, 1)) and output:
                print(output, file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
