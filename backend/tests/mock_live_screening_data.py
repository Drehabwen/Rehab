import os
import json
import sqlite3
from datetime import datetime

# Define path to the live active database
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rehab_integration.db")

print(f"[*] Target Database Path: {DB_PATH}")

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
        conn.commit()
        print("[+] Table 'synced_screenings' is initialized/verified.")
    finally:
        conn.close()

def inject_mock_data():
    conn = get_db_connection()
    
    # 3 High-fidelity Children screening records
    records = [
        # Record 1: Lu Yihang (High Risk)
        {
            "session_id": "session_live_luyihang_001",
            "subject_id": "sub_lu_9918",
            "subject_display_name": "陆以航",
            "overall_risk": "high",
            "status": "pending",
            "created_at": "2026-05-21T09:15:00Z",
            "payload": {
                "session_id": "session_live_luyihang_001",
                "subject": {
                    "subject_id": "sub_lu_9918",
                    "display_name": "陆以航",
                    "sex": "male",
                    "age": 13,
                    "height_cm": 162.0,
                    "notes": "学校体育课筛查：Adams前屈背部右侧有明显肋陵隆起，怀疑特发性侧弯。"
                },
                "protocol_results": [
                    {
                        "result_id": "res_static_lu_01",
                        "protocol": "static_posture",
                        "status": "completed",
                        "capture_quality": "excellent",
                        "metrics": {
                            "shoulder_angle": 1.9, 
                            "pelvic_tilt": 1.3,
                            "head_deviation_cm": 1.5,
                            "body_plumb_deviation_deg": 2.1
                        },
                        "findings": [
                            "高低肩偏离显著：右肩高左肩低 (1.9度)", 
                            "骨盆倾斜：左倾 (1.3度)",
                            "头部力线右倾 (1.5cm)"
                        ],
                        "risk_flags": ["shoulder_asymmetry", "pelvic_asymmetry"],
                        "recommendations": ["临床静态体态深度三维触诊与摄像评估"],
                        "psi_score": 78.5,
                        "severity_grades": {"coronal": "mild", "sagittal": "normal"}
                    },
                    {
                        "result_id": "res_adams_lu_02",
                        "protocol": "adams_forward_bend",
                        "status": "completed",
                        "capture_quality": "excellent",
                        "metrics": {
                            "rib_hump_angle_atr": 7.5,
                            "hump_width_mm": 16.0,
                            "asymmetry_ratio": 1.48
                        },
                        "findings": [
                            "Adams 前屈试验呈阳性",
                            "胸段右侧有显著肋骨隆起 (剃刀背征)",
                            "躯干旋转角 ATR 测定值为 7.5度 (已超过 5度 临床医学转诊临界值)"
                        ],
                        "risk_flags": ["positive_significant", "rib_hump_detected"],
                        "recommendations": ["必须前往专科康复医院拍摄 EOS/X光片 确诊侧弯Cobb角"],
                        "psi_score": 62.0,
                        "severity_grades": {"coronal": "moderate", "sagittal": "normal"}
                    },
                    {
                        "result_id": "res_squat_lu_03",
                        "protocol": "dynamic_squat",
                        "status": "completed",
                        "capture_quality": "good",
                        "metrics": {
                            "knees_valgus_angle": 8.5,
                            "pelvic_translation_cm": 2.2,
                            "trunk_sway_deg": 3.8
                        },
                        "findings": [
                            "下蹲时双膝内扣 (Knee Valgus) 显著",
                            "重心偏斜：骨盆明显向左移动以代偿右侧侧弯受限 (2.2cm)",
                            "躯干代偿性向右晃动以维持平衡"
                        ],
                        "risk_flags": ["knee_valgus", "pelvic_sway"],
                        "recommendations": ["禁止进行大负重非对称训练，专注于核心肌群对称激活"],
                        "psi_score": 71.0,
                        "severity_grades": {"coronal": "mild", "sagittal": "normal"}
                    }
                ],
                "integrated_report": {
                    "report_id": "rep_lu_001",
                    "title": "陆以航青少年脊柱侧弯三联早筛综合报告",
                    "overall_risk": "high",
                    "consistency_level": "triple_protocol",
                    "main_patterns": ["特发性脊柱胸右凸 (疑似)", "高低肩 (右高)", "动态深蹲重心左移代偿"],
                    "next_action": "clinical_referral",
                    "summary": "受试者在静态姿态、Adams前屈、以及动态深蹲多协议测试中均表现出高度一致的非对称特征。Adams前屈测试ATR高达7.5度，合并右侧明显剃刀背凸起，高度怀疑胸椎右凸型特发性侧弯。",
                    "recommendations": [
                        "建议立即转诊前往三甲康复科或专业脊柱侧弯矫正中心",
                        "拍摄全脊柱正侧位X光，测定准确的Cobb角",
                        "暂缓进行单侧负重运动，由物理治疗师定制对称拉伸与施罗特(Schroth)体操方案"
                    ]
                },
                "llm_analysis": {
                    "enhanced_summary": "AI 整合会商意见：陆以航同学表现出高度一致的脊柱右凸病理性代偿表现。静态倾斜、Adams旋转、深蹲逃避路线三项证据链完美吻合，提示其为真阳性结构性侧弯风险级别，非简单的功能性姿态不良。",
                    "clinical_context": "结合13岁处于青春期第二发育高峰，病情可能在未来6-12个月内快速进展，必须立即进行硬性支具筛配干预。",
                    "risk_narrative": "脊柱侧弯进展风险：极高。若在当前骨骼快速生长期不进行合理力学干预，Cobb角可能迅速加深超过30度。",
                    "suggestions": [
                        "进行施罗特侧弯矫正治疗 (每周2-3次)",
                        "佩戴 3D 打印定制矫形硬性支具",
                        "拉伸右侧胸段凹侧肌肉，强化左侧被动拉长肌群"
                    ],
                    "limitations": [
                        "本筛查数据非临床放射学影像诊断，确诊须以站立位全脊柱拼接X线片为准"
                    ]
                },
                "created_at": "2026-05-21T09:15:00Z"
            }
        },
        
        # Record 2: Zeng Zitong (Attention/Moderate Risk)
        {
            "session_id": "session_live_zengzitong_002",
            "subject_id": "sub_zeng_8817",
            "subject_display_name": "曾梓童",
            "overall_risk": "attention",
            "status": "pending",
            "created_at": "2026-05-21T09:30:00Z",
            "payload": {
                "session_id": "session_live_zengzitong_002",
                "subject": {
                    "subject_id": "sub_zeng_8817",
                    "display_name": "曾梓童",
                    "sex": "female",
                    "age": 10,
                    "height_cm": 142.5,
                    "notes": "学校普查：静态坐姿歪斜，轻微高低肩，无明显背痛表现。"
                },
                "protocol_results": [
                    {
                        "result_id": "res_static_zeng_01",
                        "protocol": "static_posture",
                        "status": "completed",
                        "capture_quality": "excellent",
                        "metrics": {
                            "shoulder_angle": 1.1, 
                            "pelvic_tilt": 0.5,
                            "head_deviation_cm": 0.8
                        },
                        "findings": [
                            "轻微高低肩：左肩高右肩低 (1.1度)", 
                            "骨盆基本对称 (倾斜仅 0.5度)"
                        ],
                        "risk_flags": ["shoulder_asymmetry"],
                        "recommendations": ["纠正书写坐姿，加强双肩抗阻训练"],
                        "psi_score": 88.0,
                        "severity_grades": {"coronal": "mild", "sagittal": "normal"}
                    },
                    {
                        "result_id": "res_adams_zeng_02",
                        "protocol": "adams_forward_bend",
                        "status": "completed",
                        "capture_quality": "good",
                        "metrics": {
                            "rib_hump_angle_atr": 3.2,
                            "hump_width_mm": 5.0,
                            "asymmetry_ratio": 1.12
                        },
                        "findings": [
                            "Adams 前屈试验呈轻微不对称怀疑",
                            "腰段左侧有极其轻微肌肉隆起",
                            "ATR 测定值为 3.2度 (低于 5度 临床转诊阀值，处于观察窗口)"
                        ],
                        "risk_flags": ["positive_suspect"],
                        "recommendations": ["暂不需就医拍摄X光，每3个月进行一次小柱AI自助复测监控"],
                        "psi_score": 85.0,
                        "severity_grades": {"coronal": "normal", "sagittal": "normal"}
                    }
                ],
                "integrated_report": {
                    "report_id": "rep_zeng_002",
                    "title": "曾梓童青少年脊柱侧弯双联筛查综合报告",
                    "overall_risk": "attention",
                    "consistency_level": "single_protocol",
                    "main_patterns": ["姿势性高低肩 (左高)", "功能性胸腰段侧弯表现 (轻微)"],
                    "next_action": "observation_and_posture_correction",
                    "summary": "受试者有轻微左高低肩以及Adams轻度不对称(ATR 3.2度)。骨骼骨盆基本稳定对称，目前高度怀疑是由于写作业习惯歪斜、长期单肩背包导致的功能性姿态不良，而非突发结构性侧弯。",
                    "recommendations": [
                        "纠正日常写作业和看电视的不良力学姿势",
                        "更换为符合人体工学的减压双肩书包",
                        "在家长监督下使用小柱助手每天进行 5 分钟姿势调整拉伸体操"
                    ]
                },
                "llm_analysis": {
                    "enhanced_summary": "AI 会商意见：曾梓童小朋友目前侧弯指数处于临界观察期 (ATR 3.2度)。好消息是其深蹲和骨盆力线保持良好，高度倾向于姿态代偿。需提早纠正，防止骨骼成形后转变为器质性问题。",
                    "clinical_context": "写字歪头、喜欢跷二郎腿可能是主要诱因，建议在书桌前配备姿态纠正挡板。",
                    "risk_narrative": "良性姿态不对称。进展风险低，但依从性差则有恶化趋势。",
                    "suggestions": [
                        "双手吊单杠悬垂 (每天 30秒 x 3组) 拉长脊柱",
                        "使用双脚对称靠墙站立贴墙练习 (每天 5分钟)",
                        "加强核心肌群稳定度"
                    ],
                    "limitations": [
                        "建议3个月后重新筛查以动态对比变化"
                    ]
                },
                "created_at": "2026-05-21T09:30:00Z"
            }
        },
        
        # Record 3: Chen Yifan (Low Risk)
        {
            "session_id": "session_live_chenyifan_003",
            "subject_id": "sub_chen_7716",
            "subject_display_name": "陈亦凡",
            "overall_risk": "low",
            "status": "pending",
            "created_at": "2026-05-21T09:45:00Z",
            "payload": {
                "session_id": "session_live_chenyifan_003",
                "subject": {
                    "subject_id": "sub_chen_7716",
                    "display_name": "陈亦凡",
                    "sex": "male",
                    "age": 15,
                    "height_cm": 172.0,
                    "notes": "体校选拔常模评定：体格健壮，体态匀称。"
                },
                "protocol_results": [
                    {
                        "result_id": "res_static_chen_01",
                        "protocol": "static_posture",
                        "status": "completed",
                        "capture_quality": "excellent",
                        "metrics": {
                            "shoulder_angle": 0.2, 
                            "pelvic_tilt": 0.1,
                            "head_deviation_cm": 0.2
                        },
                        "findings": [
                            "双肩高度完美对称 (偏离仅 0.2度)", 
                            "骨盆水平面力线完全水平 (偏离 0.1度)"
                        ],
                        "risk_flags": [],
                        "recommendations": ["维持良好运动习惯"],
                        "psi_score": 98.5,
                        "severity_grades": {"coronal": "normal", "sagittal": "normal"}
                    },
                    {
                        "result_id": "res_adams_chen_02",
                        "protocol": "adams_forward_bend",
                        "status": "completed",
                        "capture_quality": "excellent",
                        "metrics": {
                            "rib_hump_angle_atr": 0.5,
                            "hump_width_mm": 0.0,
                            "asymmetry_ratio": 1.0
                        },
                        "findings": [
                            "Adams 前屈试验阴性：脊柱力线完美居中",
                            "背部两侧对称，未检测到任何肋骨隆起与剃刀背体征",
                            "ATR 测定值为 0.5度 (完美在生理安全范围之内)"
                        ],
                        "risk_flags": [],
                        "recommendations": ["无脊柱侧弯异常表现，无需任何干预措施"],
                        "psi_score": 99.0,
                        "severity_grades": {"coronal": "normal", "sagittal": "normal"}
                    }
                ],
                "integrated_report": {
                    "report_id": "rep_chen_003",
                    "title": "陈亦凡青少年脊柱侧弯完美体态筛查报告",
                    "overall_risk": "low",
                    "consistency_level": "symmetrical",
                    "main_patterns": ["脊柱两侧完美对称", "骨盆稳定平衡"],
                    "next_action": "routine_check_yearly",
                    "summary": "受试者各项姿态力线极其标准，Adams前屈与静态表现完美对称，深蹲动作轨迹平顺，脊柱侧弯综合筛查评定为安全级别(Low Risk)。",
                    "recommendations": [
                        "建议每年参与学校定期例行体态筛查即可",
                        "继续保持打篮球和全身抗阻力对称性体能锻炼习惯"
                    ]
                },
                "llm_analysis": {
                    "enhanced_summary": "AI 会商意见：陈亦凡同学骨骼发育极佳，肌肉对称性良好。脊柱生理曲度完好，目前没有任何需要临床注意的不良倾向，表现超越了95%同龄人群常模水平。",
                    "clinical_context": "无功能性代偿，骨盆与肩膀力线高度平直，运动素质优秀。",
                    "risk_narrative": "零侧弯恶化风险。发育表现健康。",
                    "suggestions": [
                        "继续进行全身对称性拉伸与有氧运动",
                        "维持正确的日常站姿与坐姿"
                    ],
                    "limitations": []
                },
                "created_at": "2026-05-21T09:45:00Z"
            }
        }
    ]

    inserted_count = 0
    updated_count = 0
    
    for rec in records:
        session_id = rec["session_id"]
        subject_id = rec["subject_id"]
        subject_display_name = rec["subject_display_name"]
        overall_risk = rec["overall_risk"]
        status = rec["status"]
        payload_str = json.dumps(rec["payload"])
        created_at = rec["created_at"]
        synced_at = datetime.utcnow().isoformat() + "Z"
        
        # Check if record already exists
        cursor = conn.execute("SELECT session_id FROM synced_screenings WHERE session_id = ?", (session_id,))
        exists = cursor.fetchone()
        
        if exists:
            conn.execute("""
                UPDATE synced_screenings 
                SET subject_id = ?, subject_display_name = ?, overall_risk = ?, status = ?, payload = ?, synced_at = ?
                WHERE session_id = ?
            """, (subject_id, subject_display_name, overall_risk, status, payload_str, synced_at, session_id))
            updated_count += 1
        else:
            conn.execute("""
                INSERT INTO synced_screenings (session_id, subject_id, subject_display_name, overall_risk, status, payload, created_at, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (session_id, subject_id, subject_display_name, overall_risk, status, payload_str, created_at, synced_at))
            inserted_count += 1
            
    conn.commit()
    conn.close()
    
    print(f"[+] Mock Injection Completed: {inserted_count} record(s) inserted, {updated_count} record(s) updated.")

if __name__ == "__main__":
    init_db()
    inject_mock_data()
