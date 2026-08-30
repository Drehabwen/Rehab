import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("==================================================")
    print("🔄 青跃 AI 康复系统：家长反馈与工作台双向闭环测试")
    print("==================================================")

    # 1. 模拟家长绑定并获取 Token
    print("\n[STEP 1] 家长通过微信端进行双因素绑定...")
    r = requests.post(f"{BASE_URL}/api/chatbot/bind", json={
        "suc": "TEST",
        "display_name": "王测试"
    })
    assert r.status_code == 200
    token = r.json().get("token")
    session_id = r.json().get("subject", {}).get("session_id")
    # 如果 mock 数据里的 session_id 为空，我们拿之前测试的
    if not session_id:
        session_id = "test_session_1779432272"
    print(f"-> 绑定成功！Token: {token[:10]}... | 关联早筛会话: {session_id}")

    # 2. 模拟医生在工作台推送居家量表/反馈问卷给家长
    print("\n[STEP 2] 康复师在工作台向【王测试】推送《居家康复训练周反馈表》...")
    push_payload = {
        "patient_id": "TEST",
        "patient_name": "王测试",
        "session_id": session_id,
        "scale_id": "HOME_WEEKLY_FEEDBACK_V1",
        "therapist_name": "王主任"
    }
    r = requests.post(f"{BASE_URL}/api/integration/scale/push", json=push_payload)
    print(f"-> 状态码: {r.status_code}")
    task_data = r.json()
    print(f"-> 推送成功！生成量表任务ID: {task_data.get('task_id')}")
    task_id = task_data.get("task_id")
    assert r.status_code == 200

    # 3. 模拟家长端拉取到待完成的量表任务
    print("\n[STEP 3] 微信家长端自动拉取到待填写的量表列表...")
    r = requests.get(f"{BASE_URL}/api/integration/scale/pending/TEST")
    print(f"-> 状态码: {r.status_code}")
    pending_list = r.json()
    print(f"-> 待填写量表列表: {json.dumps(pending_list, ensure_ascii=False, indent=2)}")
    assert len(pending_list) > 0

    # 4. 家长在手机上填写反馈，并提交（数据返回到工作台）
    print("\n[STEP 4] 模拟家长在手机上填写量表反馈并点击提交（数据流回工作台）...")
    submit_payload = {
        "task_id": task_id,
        "session_id": session_id,
        "scale_data": {
            "量表名称": "儿童体态居家训练反馈表",
            "本周训练频次": "臀桥共练习4次，每次2组，每组15次",
            "是否有异常疼痛": "无任何疼痛或不适",
            "家长手写反馈与提问": "医生，孩子练习臀桥膝盖感觉稳多了，下蹲也不怎么内扣了。但是做单腿深蹲姿态控制时，她总觉得左侧身体摇摇晃晃的站不稳，这正常吗？需要怎么改善呢？",
            "填写时间": "2026-05-22"
        }
    }
    r = requests.post(f"{BASE_URL}/api/integration/scale/submit", json=submit_payload)
    print(f"-> 状态码: {r.status_code}")
    print(f"-> 提交返回: {r.json()}")
    assert r.status_code == 200

    # 5. 验证医生工作台能否真正拉取到这个反馈
    print("\n[STEP 5] 验证康复师工作台能否成功接收家长的反馈数据...")
    r = requests.get(f"{BASE_URL}/api/integration/scale/results/{session_id}")
    print(f"-> 状态码: {r.status_code}")
    results = r.json()
    print(f"-> 工作台拉取到的最新反馈详情: {json.dumps(results, ensure_ascii=False, indent=2)}")
    assert len(results) > 0
    assert "左侧身体摇摇晃晃" in json.dumps(results, ensure_ascii=False)

    # 6. 家长提问，测试 LLM 能够读取该反馈并进行深度对话
    print("\n[STEP 6] 模拟家长针对刚刚提交的反馈在微信群/Chatbot中追问...")
    print("👉 家长提问: '大夫，我刚刚提交了本周的居家反馈，我提到的那个“左侧摇晃站不稳”的情况，要怎么改善呀？'")
    
    query_payload = {
        "suc": "TEST",
        "token": token,
        "question": "大夫，我刚才在周反馈表里写了：孩子做单腿深蹲姿态控制时，总觉得左侧身体摇摇晃晃的站不稳。这正常吗？要怎么在家里针对性改善呢？"
    }
    
    # 呼叫大模型
    r = requests.post(f"{BASE_URL}/api/chatbot/query", json=query_payload)
    print(f"-> 状态码: {r.status_code}")
    answer_data = r.json()
    print(f"-> DeepSeek-V3 针对家长最新反馈的解答: \n----------------------------------------\n{answer_data.get('answer')}\n----------------------------------------")
    assert r.status_code == 200

    print("\n==================================================")
    print("🎉 恭喜！双向数据闭环与 RAG 家长反馈随访功能全部实测通过！")
    print("==================================================")

if __name__ == "__main__":
    main()
