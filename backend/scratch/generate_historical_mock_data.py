import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rehab_integration.db")

def make_payload(session_id, date_str, left_valgus, right_valgus, atr, psi, risk, summary):
    return {
        "session_id": session_id,
        "subject": {
            "subject_id": "TEST",
            "display_name": "王测试",
            "sex": "female",
            "age": 9,
            "height_cm": 134.5,
            "notes": "受试者下蹲有明显双侧内扣，且Adams前屈躯干有轻微不对称"
        },
        "protocol_results": [
            {
                "result_id": f"{session_id}_res_01",
                "protocol": "squat_screening",
                "status": "completed",
                "capture_quality": "excellent",
                "psi_score": psi,
                "metrics": {
                    "left_knee_valgus_deg": left_valgus,
                    "right_knee_valgus_deg": right_valgus,
                    "psi_score": psi
                },
                "findings": ["双膝动力性外翻" if left_valgus > 8 else "双膝下蹲轨迹基本正常", "下蹲中段稳定度一般" if psi < 0.85 else "下蹲稳定度极佳"],
                "risk_flags": (["knee_valgus_left", "knee_valgus_right"] if left_valgus > 8 else []),
                "recommendations": ["臀大肌强化(臀桥)", "单腿深蹲姿态控制"]
            },
            {
                "result_id": f"{session_id}_res_02",
                "protocol": "adams_forward_bend",
                "status": "completed",
                "capture_quality": "excellent",
                "metrics": {
                    "atr_angle_deg": atr
                },
                "findings": ["躯干左侧轻度剃刀背" if atr > 5 else "脊柱对称性良好"],
                "risk_flags": (["scoliosis_risk_mild"] if atr > 4 else []),
                "recommendations": ["贴墙站立姿态训练", "脊柱侧向平衡拉伸"]
            }
        ],
        "integrated_report": {
            "report_id": f"{session_id}_rep",
            "title": f"第 {session_id[-1]} 周康复进度评估报告",
            "overall_risk": risk,
            "consistency_level": "consistent",
            "main_patterns": ["双膝动力性外翻改善中" if left_valgus > 6 else "双膝动力轨迹正常"],
            "next_action": "clinical_followup" if risk != "low" else "home_maintenance",
            "summary": summary,
            "recommendations": ["继续目前的居家训练方案", "下周复筛"]
        },
        "created_at": date_str
    }

def main():
    print(f"Connecting to database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Clean up existing test sessions for SUC "TEST"
    cursor.execute("DELETE FROM synced_screenings WHERE subject_id = 'TEST'")
    print("Cleaned up old TEST screening records.")
    
    # 4 Weeks history
    data_points = [
        # Week 1: Initial screening. Severe knee valgus, high scoliosis ATR.
        ("SESS_WEEK_01_TEST", "2026-05-01T14:30:00Z", 15.6, 13.8, 6.5, 0.72, "high", 
         "初次早筛结果显示，患儿双膝在深蹲时存在严重的动力性内扣外翻，左侧15.6°，右侧13.8°，骨盆中段失稳明显（PSI 0.72）。Adams前屈躯干旋转角（ATR）为6.5°，存在轻度剃刀背倾向。"),
         
        # Week 2: Moderate improvement after bridge extensions.
        ("SESS_WEEK_02_TEST", "2026-05-08T14:30:00Z", 12.5, 10.2, 5.0, 0.81, "attention", 
         "第二周复筛，经居家臀大肌强化与姿势控制训练，双膝动力性内扣有所改善，左侧12.5°，右侧10.2°，失稳程度减轻（PSI 0.81）。Adams前屈ATR降至5.0°。"),
         
        # Week 3: Continuing gains, knee valgus gets close to normal.
        ("SESS_WEEK_03_TEST", "2026-05-15T14:30:00Z", 9.2, 8.1, 4.2, 0.88, "attention", 
         "第三周复筛，患儿下蹲控制力持续增强，双膝外翻角度进一步收窄至左侧9.2°，右侧8.1°。躯干对称度改善明显，Adams前屈ATR已降至4.2°。"),
         
        # Week 4: Today! Very close to normal alignment (< 7 degrees).
        ("SESS_WEEK_04_TEST", "2026-05-22T14:30:00Z", 6.5, 5.4, 2.8, 0.94, "low", 
         "第四周（今日）复筛，下蹲动力学表现基本恢复正常，双膝动力外翻左侧6.5°，右侧5.4°，双侧轨迹对称（PSI 0.94）。Adams前屈ATR为2.8°，躯干对称性已完全达标，脊柱侧弯预警警报解除。")
    ]
    
    now_str = datetime.now().isoformat()
    for session_id, date_str, left_valgus, right_valgus, atr, psi, risk, summary in data_points:
        payload = make_payload(session_id, date_str, left_valgus, right_valgus, atr, psi, risk, summary)
        payload_json = json.dumps(payload, ensure_ascii=False)
        
        cursor.execute("""
            INSERT INTO synced_screenings (
                session_id, subject_id, subject_display_name, overall_risk, status, payload, created_at, synced_at
            ) VALUES (?, 'TEST', '王测试', ?, 'pending', ?, ?, ?)
        """, (session_id, risk, payload_json, date_str, now_str))
        print(f"Inserted: {session_id} | Date: {date_str} | Left Valgus: {left_valgus}° | Right Valgus: {right_valgus}° | ATR: {atr}° | PSI: {psi}")
        
    conn.commit()
    conn.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    main()
