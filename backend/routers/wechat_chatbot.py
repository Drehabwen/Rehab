import json
import sqlite3
import os
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
from routers.integration import get_db_connection

# Initialize router
router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

class ChatbotBindRequest(BaseModel):
    suc: str
    display_name: str

class ChatbotBindResponse(BaseModel):
    status: str
    token: str
    subject: Dict[str, Any]

class ChatbotQueryRequest(BaseModel):
    suc: str
    question: str
    token: str

class ChatbotQueryResponse(BaseModel):
    status: str
    answer: str

def _get_api_key() -> str:
    api_key = (os.getenv("DEEPSEEK_API_KEY") or os.getenv("VITE_DEEPSEEK_API_KEY") or "").strip()
    return api_key

@router.post("/bind", response_model=ChatbotBindResponse)
async def bind_subject(req: ChatbotBindRequest):
    """
    Secure double-factor binding endpoint for the parent chatbot.
    Verifies SUC code + exact Subject Display Name (child's name).
    Returns a secure stateless token and the child's profile on success.
    """
    suc = req.suc.strip().upper()
    display_name = req.display_name.strip()

    if not suc or not display_name:
        raise HTTPException(status_code=400, detail="编码(SUC)和受试者姓名不能为空")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT session_id, subject_id, subject_display_name, payload, created_at
            FROM synced_screenings
            WHERE subject_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 1
        """, (suc,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404, 
                detail="未找到该受试者的早筛档案，请确认编码输入是否正确"
            )

        db_display_name = row["subject_display_name"].strip()
        # Compare names case-insensitively and ignore internal whitespaces for user friendliness
        if db_display_name.lower().replace(" ", "") != display_name.lower().replace(" ", ""):
            raise HTTPException(
                status_code=403, 
                detail="身份二次校验失败：受试者姓名与登记的不匹配"
            )

        # Generate a stateless, secure verification token
        token_src = f"{suc}:{db_display_name}:qy_chatbot_secret_2026"
        token = hashlib.sha256(token_src.encode("utf-8")).hexdigest()

        try:
            payload_dict = json.loads(row["payload"])
        except Exception:
            payload_dict = {}

        subject_data = payload_dict.get("subject", {})
        sex = subject_data.get("sex", "unknown")
        age = subject_data.get("age")
        height_cm = subject_data.get("height_cm")
        notes = subject_data.get("notes", "")

        return ChatbotBindResponse(
            status="success",
            token=token,
            subject={
                "subject_id": row["subject_id"],
                "display_name": db_display_name,
                "sex": sex,
                "age": age,
                "height_cm": height_cm,
                "notes": notes
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"绑定操作失败: {str(e)}")
    finally:
        conn.close()

@router.post("/query", response_model=ChatbotQueryResponse)
async def query_chatbot(req: ChatbotQueryRequest):
    """
    RAG-driven chatbot inquiry endpoint.
    Retrieves child's screening metrics, findings, and clinical reports,
    injects them into context, and calls DeepSeek LLM to generate empathetic,
    parent-friendly, and medically grounded answers.
    """
    suc = req.suc.strip().upper()
    token = req.token.strip()
    question = req.question.strip()

    if not suc or not token or not question:
        raise HTTPException(status_code=400, detail="参数缺失：SUC, token, question 均为必填项")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT subject_display_name, payload
            FROM synced_screenings
            WHERE subject_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 1
        """, (suc,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="未找到该受试者的早筛档案")

        db_display_name = row["subject_display_name"].strip()
        # Verify stateless token to prevent unauthorized access
        expected_token = hashlib.sha256(f"{suc}:{db_display_name}:qy_chatbot_secret_2026".encode("utf-8")).hexdigest()
        if token != expected_token:
            raise HTTPException(status_code=403, detail="身份认证失败，请重新绑定后再行咨询")

        try:
            payload_dict = json.loads(row["payload"])
        except Exception:
            payload_dict = {}

        # 1. Build RAG Context String
        subject_data = payload_dict.get("subject", {})
        sex = subject_data.get("sex", "未知")
        age = subject_data.get("age", "未知")
        height_cm = subject_data.get("height_cm", "未知")

        context_parts = []
        context_parts.append("### 【受试者基本信息】")
        context_parts.append(f"- 统一编码 (SUC): {suc}")
        context_parts.append(f"- 姓名/代号: {db_display_name}")
        context_parts.append(f"- 性别: {sex}")
        context_parts.append(f"- 年龄: {age}岁")
        context_parts.append(f"- 身高: {height_cm}cm")

        # Extract integrated report
        integrated_report = payload_dict.get("integrated_report") or {}
        context_parts.append("\n### 【早筛整体结论与建议】")
        context_parts.append(f"- 整体评估风险级别: {integrated_report.get('overall_risk', '未知')}")
        context_parts.append(f"- 筛查综合总结: {integrated_report.get('summary', '暂无汇总信息')}")
        recs = integrated_report.get("recommendations", [])
        if recs:
            context_parts.append("- 康复建议:")
            for rec in recs:
                context_parts.append(f"  * {rec}")

        # Extract protocol results
        protocol_results = payload_dict.get("protocol_results") or []
        all_findings = []
        all_recs = []
        if protocol_results:
            context_parts.append("\n### 【筛查项目详细异常与指标】")
            for pr in protocol_results:
                protocol_name = pr.get("protocol", "常规体态筛查")
                context_parts.append(f"- 筛查项目: {protocol_name}")
                metrics = pr.get("metrics") or {}
                if metrics:
                    context_parts.append("  * 测量指标:")
                    for k, v in metrics.items():
                        context_parts.append(f"    - {k}: {v}")
                findings = pr.get("findings") or []
                if findings:
                    context_parts.append("  * 发现的问题/异常:")
                    for f in findings:
                        context_parts.append(f"    - {f}")
                        all_findings.append(f)
                recs = pr.get("recommendations") or []
                if recs:
                    context_parts.append("  * 动作建议:")
                    for r in recs:
                        context_parts.append(f"    - {r}")
                        all_recs.append(r)

        # Check for completed scales
        cursor.execute("""
            SELECT scale_id, payload, submitted_at
            FROM pending_scales
            WHERE (patient_id = ? OR patient_name = ?) AND status = 'completed'
            ORDER BY datetime(submitted_at) DESC
        """, (suc, db_display_name))
        scale_rows = cursor.fetchall()
        if scale_rows:
            context_parts.append("\n### 【已提交的专业康复量表与反馈】")
            for sr in scale_rows:
                scale_id = sr["scale_id"]
                submitted_at = sr["submitted_at"]
                try:
                    scale_data = json.loads(sr["payload"])
                except Exception:
                    scale_data = {}
                context_parts.append(f"- 量表编号: {scale_id} (提交时间: {submitted_at})")
                if scale_data:
                    for k, v in scale_data.items():
                        context_parts.append(f"  * {k}: {v}")

        context_str = "\n".join(context_parts)

        # 2. Get API key and call DeepSeek
        api_key = _get_api_key()
        if not api_key:
            # High-fidelity rule-based fallback if no LLM key is configured
            findings_str = "、".join(all_findings) if all_findings else "无明显异常"
            recs_str = "、".join(all_recs) if all_recs else "保持良好的日常坐姿与运动习惯"
            fallback_answer = (
                f"【系统提示：已通过安全双因素认证。未检测到 DeepSeek 大模型密钥，以下为基于早筛指标的智能康复助手自动回复】\n\n"
                f"您好！我是青跃 AI 智能康复小助手。很高兴为您服务！\n\n"
                f"根据系统记录，**{db_display_name}** 在早筛中的整体风险评估为：**【{integrated_report.get('overall_risk', '未知')}】**。\n"
                f"主要检测到的体态情况为：{findings_str}。\n\n"
                f"针对这些体态特征，我们建议的居家训练和康复方案如下：\n"
                f"1. **指导动作**：{recs_str}。\n"
                f"2. **频次建议**：建议每天练习1-2组，每组持续进行10-15次，过程中要注意保持呼吸顺畅，切勿憋气。\n"
                f"3. **安全须知**：康复是一个循序渐进的过程。如果在练习过程中孩子感到任何关节针刺样疼痛或拉伤不适，请**立刻停止训练**，并建议到线下专业康复工作站联系王主任或主治物理治疗师进行面对面进一步排查。\n\n"
                f"家长别太焦虑，孩子正处于骨骼与肌肉发育的黄金塑形期，只要坚持科学锻炼，一定会取得很好的纠正效果！我们一起加油！"
            )
            return ChatbotQueryResponse(status="success", answer=fallback_answer)

        # Build prompts
        system_content = """你是一位温柔、耐心且专业的青跃 AI 智能康复专家。你的任务是帮助家长解答关于孩子体态筛查结果、评估指标、动作训练要领以及居家康复方面的咨询。

为了确保安全与准确性，你必须遵循以下绝对准则：
1. **基于真实数据回答**：你必须【严格基于以下提供的受试者专属筛查数据和康复背景信息】进行回答。如果用户询问的指标、问题在背景数据中不存在，或者与当前受试者无关，你应当温和地向家长说明当前档案中没有记录该项，不要凭空捏造数据或病情。
2. **通俗易懂与 parent-friendly 语气**：家长的情绪通常比较焦虑。你的语言风格必须极其通俗易懂，温暖、鼓励性强，多使用正向反馈（例如“别太担心”、“我们一起加油”、“小明做得很棒”）。严禁使用过于冰冷、恐怖或深奥的医学术语吓唬家长。
3. **安全防线与就医建议**：如果在咨询过程中，家长描述了严重的临床红旗症状（如“持续性刺痛”、“红肿”、“活动严重受限”等），或者大模型推理出的某些指标存在较高风险，必须强烈且温柔地建议家长「及时前往线下医院或专业康复工作站，接受王主任或专业治疗师的面对面详查，不要盲目居家自行训练」。
4. **具体动作指导**：当家长询问具体康复动作（如“臀桥”、“侧卧蚌式开合”）时，应详细拆解动作要领、呼气吸气配合、常见错误动作，并辅以鼓励和叮嘱，如果背景数据中含有标准训练频次（如“每天2组，每组15次”），请予以明确强调。
"""

        user_content = f"""【受试者专属背景数据与指标】：
{context_str}

【家长当前的提问】：
"{question}"

请为家长提供专业、温暖、充满关怀的个性化答复。"""

        client = AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com")
        
        response = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": user_content}
            ],
            temperature=0.5,
            max_tokens=1500
        )
        answer = response.choices[0].message.content or "抱歉，我未能生成合适的回答，请稍后再试。"
        return ChatbotQueryResponse(status="success", answer=answer)

    except HTTPException:
        raise
    except Exception as e:
        # Graceful fallback answer on API network failure
        findings_str = "、".join(all_findings) if ('all_findings' in locals() and all_findings) else "未检出明显异常"
        recs_str = "、".join(all_recs) if ('all_recs' in locals() and all_recs) else "规范作息与日常运动"
        fallback_answer = (
            f"【系统提示：大模型服务网络超时，以下为您自动生成基于早筛指标的安全答疑】\n\n"
            f"家长您好！抱歉刚刚网络有点塞车。根据我们系统记录到的 **{db_display_name}** 体态早筛指标：\n"
            f"- 检测体态情况：{findings_str}\n"
            f"- 推荐练习动作：{recs_str}\n\n"
            f"对于您的咨询（“{question}”），我们特别提醒：\n"
            f"建议以低负荷动作开始，以不产生任何关节疼痛为宜。每次训练动作如臀桥、蚌式开合等，均需注重骨盆稳定，配合缓慢匀速的呼吸。\n"
            f"若您对上述问题还有更多深度的医学疑虑，建议在门诊复诊时，与线下物理治疗师进行面对面沟通确认。如果出现持续不适，请千万先暂停训练并及时就医检查。"
        )
        return ChatbotQueryResponse(status="success", answer=fallback_answer)
    finally:
        conn.close()
