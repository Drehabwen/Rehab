import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("==================================================")
    print("🚀 青跃 AI 康复项目：API E2E 真实可用性测试启动")
    print("==================================================")
    
    # 1. 验证 Health 接口
    print("\n[STEP 1] 正在请求系统健康状况接口...")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"-> 状态码: {r.status_code}")
        print(f"-> 返回数据: {json.dumps(r.json(), ensure_ascii=False, indent=2)}")
    except Exception as e:
        print(f"❌ 无法连接到服务，请确保 uvicorn 正在 localhost:8000 运行: {e}")
        return

    # 2. 模拟从早筛端同步一条新的受试者记录
    print("\n[STEP 2] 模拟从早筛端(SquatLab)一键同步数据到工作站...")
    test_session_id = f"test_session_{int(time.time())}"
    sync_payload = {
        "session_id": test_session_id,
        "subject": {
            "subject_id": "TEST",
            "display_name": "王测试",
            "sex": "female",
            "age": 9,
            "height_cm": 134.5,
            "notes": "受试者下蹲有明显双侧内扣"
        },
        "protocol_results": [
            {
                "result_id": "test_protocol_res_001",
                "protocol": "squat_screening",
                "status": "completed",
                "capture_quality": "excellent",
                "metrics": {
                    "left_knee_valgus_deg": 12.5,
                    "right_knee_valgus_deg": 10.2
                },
                "findings": ["双膝动力性外翻", "下蹲中段骨盆轻微后倾"],
                "risk_flags": ["knee_valgus_left", "knee_valgus_right"],
                "recommendations": ["臀大肌强化(臀桥)", "单腿深蹲姿态控制"]
            }
        ],
        "integrated_report": {
            "report_id": "test_report_001",
            "title": "测试综合评估报告",
            "overall_risk": "attention",
            "consistency_level": "consistent",
            "main_patterns": ["双膝动力性内扣"],
            "next_action": "clinical_followup",
            "summary": "测试君双膝在深蹲时存在动力性内扣，可能存在臀中肌无力，建议居家训练纠正。",
            "recommendations": ["建议每日做2组臀桥训练", "建议线下临床工作站王主任复筛"]
        },
        "created_at": "2026-05-22T14:30:00Z"
    }

    r = requests.post(f"{BASE_URL}/api/integration/sync-screening", json=sync_payload)
    print(f"-> 状态码: {r.status_code}")
    print(f"-> 同步返回: {r.json()}")
    assert r.status_code == 200
    assert r.json().get("status") == "success"

    # 3. 验证 SUC 查询接口
    print("\n[STEP 3] 校验 SUC 查询是否能正确调出受试者档案信息...")
    r = requests.get(f"{BASE_URL}/api/integration/subject/TEST")
    print(f"-> 状态码: {r.status_code}")
    print(f"-> 返回档案信息: {json.dumps(r.json(), ensure_ascii=False, indent=2)}")
    assert r.status_code == 200
    assert r.json().get("display_name") == "王测试"

    # 4. 验证 Chatbot 双因素绑定与越权拦截
    print("\n[STEP 4] 验证家长端微信 Chatbot 双因素绑定校验...")
    
    # 4.1 恶意碰撞测试（故意输错名字）
    print("  * 4.1 故意输入错误的姓名拦截测试...")
    r = requests.post(f"{BASE_URL}/api/chatbot/bind", json={
        "suc": "TEST",
        "display_name": "王大锤"
    })
    print(f"    -> 状态码: {r.status_code} (期望: 403)")
    print(f"    -> 拦截返回: {r.json().get('detail')}")
    assert r.status_code == 403

    # 4.2 正常绑定测试（忽略两端空格）
    print("  * 4.2 输入正确的受试者姓名绑定测试...")
    r = requests.post(f"{BASE_URL}/api/chatbot/bind", json={
        "suc": "TEST",
        "display_name": "  王测试  "
    })
    print(f"    -> 状态码: {r.status_code} (期望: 200)")
    data = r.json()
    print(f"    -> 绑定成功返回: {json.dumps(data, ensure_ascii=False, indent=2)}")
    assert r.status_code == 200
    assert data.get("status") == "success"
    token = data.get("token")

    # 5. 验证 Chatbot 咨询问答 (RAG 或 Fallback 安全路线)
    print("\n[STEP 5] 验证家长端微信 Chatbot 深度咨询问答 API...")
    
    # 5.1 模拟恶意 Token 拦截测试
    print("  * 5.1 篡改 Token 提问拦截测试...")
    r = requests.post(f"{BASE_URL}/api/chatbot/query", json={
        "suc": "TEST",
        "token": "bad_token_value_abc",
        "question": "王测试该怎么训练？"
    })
    print(f"    -> 状态码: {r.status_code} (期望: 403)")
    print(f"    -> 拦截返回: {r.json().get('detail')}")
    assert r.status_code == 403

    # 5.2 正常 Token 提问测试
    print("  * 5.2 正常合规提问测试...")
    r = requests.post(f"{BASE_URL}/api/chatbot/query", json={
        "suc": "TEST",
        "token": token,
        "question": "我的孩子王测试为什么下蹲会有内扣？有什么具体的训练建议？"
    })
    print(f"    -> 状态码: {r.status_code}")
    answer_data = r.json()
    print(f"    -> AI 解答反馈: \n----------------------------------------\n{answer_data.get('answer')}\n----------------------------------------")
    assert r.status_code == 200
    assert answer_data.get("status") == "success"

    print("\n==================================================")
    print("🎉 恭喜！API 完美贯通，E2E 链路全部测试通过率 100%！")
    print("==================================================")

if __name__ == "__main__":
    main()
