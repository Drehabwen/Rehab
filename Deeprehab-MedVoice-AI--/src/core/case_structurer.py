import json
import re

class CaseStructurer:
    def __init__(self, nlp_processor):
        self.nlp = nlp_processor

    def _clean_json_content(self, content, is_list=False):
        """
        更强力的 JSON 清理工具，处理各种 LLM 常见的干扰内容
        """
        if not content:
            return "[]" if is_list else "{}"
            
        json_str = content.strip()
        
        # 1. 移除 Markdown 代码块标记
        json_str = re.sub(r'```(?:json)?\s*', '', json_str)
        json_str = re.sub(r'\s*```', '', json_str)
        
        # 2. 移除可能的头部文字解释 (例如 "这是你要的 JSON:")
        start_char = "[" if is_list else "{"
        end_char = "]" if is_list else "}"
        
        start_idx = json_str.find(start_char)
        end_idx = json_str.rfind(end_char)
        
        if start_idx != -1 and end_idx != -1:
            json_str = json_str[start_idx:end_idx+1]
        
        # 3. 处理常见的 JSON 语法错误 (如尾随逗号)
        # 移除对象或数组最后一个元素后的逗号
        json_str = re.sub(r',\s*([\]}])', r'\1', json_str)
            
        return json_str

    def analyze_and_structure(self, input_data, vision3_data=None, mode="standard"):
        """
        合并步骤：一键完成角色分析与病历结构化
        """
        if not input_data:
            return [], {}
            
        # 准备 Vision3 体态评估数据描述
        vision_desc = ""
        if vision3_data:
            active = vision3_data.get("active", [])
            vision_desc = "\n【Vision3 体态评估参考数据】\n"
            for item in active:
                vision_desc += f"- {item.get('side', '') or ''}{item.get('joint', '')}{item.get('direction', '')}: 最大角度 {item.get('maxAngle', 0)}°, 当前角度 {item.get('currentAngle', 0)}°\n"
            
            # 添加疲劳监测指标
            metrics = vision3_data.get("metrics", {})
            if metrics:
                if "jitterIndex" in metrics:
                    vision_desc += f"- 抖动指数 (Jitter Index): {metrics['jitterIndex']}\n"
                if "stabilityScore" in metrics:
                    vision_desc += f"- 稳定性得分 (Stability Score): {metrics['stabilityScore']}\n"

            latest = vision3_data.get("latest_saved")
            if latest:
                vision_desc += f"- 历史保存记录日期: {latest.get('date', '未知')}\n"

        robust_rules = """
【抗噪与纠错规则（必须执行）】
1. 输入是原始流式转写，可能包含口误、重复字、语气词、环境噪音词、错别字、英文碎片。
2. 优先依据上下文做术语纠错与语义修复：例如“腰放松不了”可归一为“腰背部紧张”；明显谐音词需校正为最可能的医学/训练术语。
3. 无法确认的片段不要臆造，保留原词并在该字段后补“（待确认）”。
4. 允许信息不完整，但禁止编造病史、检查数值、诊断结论。
5. 输出必须可直接用于后续结构化入库，字段尽量填充；无信息时填“未提及”。
6. 输出必须是纯 JSON，不得包含解释、前后缀、Markdown 代码块。
"""

        if mode == "fatigue":
            prompt = f"""你是一位专业的运动表现教练和康复专家。请根据以下原始转录文本和 Vision3 稳定性评估数据，完成运动员疲劳风险评估报告。
{robust_rules}

【评估要求】
1. **主观疲劳感知 (RPE)**：从转录文本中识别 RPE 分值（0-10 分，0为无感，10为力竭）。
2. **身体状态描述**：识别关键词如“酸”、“胀”、“痛”、“无力”、“发抖”、“呼吸促”等，并标注受影响部位。
3. **视觉稳定性参考**：结合【Vision3 数据】中的抖动指数 (Jitter) 和稳定性得分 (Stability Score) 进行交叉验证。
4. **疲劳风险等级**：
   - 正常：RPE < 5 且 稳定性 > 0.8
   - 轻度疲劳：RPE 5-7 或 稳定性 0.6-0.8
   - 高风险：RPE > 7 或 稳定性 < 0.6 或 出现明显代偿动作（如“背疼”、“膝盖抖”）
5. **恢复建议**：针对性给出拉伸、补水、营养或停止训练的建议。

【输入数据】
{vision_desc}

【原始转录】
{input_data}

【输出格式要求】
必须输出严格的 JSON 对象，禁止包含任何说明文字，结构如下：
{{
  "analyzed_dialogue": [
    {{"speaker": "角色", "text": "提炼后的内容"}}
  ],
  "fatigue_report": {{
    "rpe_score": "数字 (0-10)",
    "subjective_feelings": ["酸", "胀", ...],
    "affected_areas": ["大腿", "核心", ...],
    "fatigue_level": "正常/轻度疲劳/高风险",
    "risk_assessment": "基于视觉数据和主观描述的详细分析...",
    "recovery_plan": ["建议1", "建议2", ...]
  }}
}}
"""
        elif mode == "soap":
            prompt = f"""你是一位专业的运动表现教练和康复专家。请根据以下原始转录文本和 Vision3 体态评估数据，完成 SOAP 格式的运动员表现记录。
{robust_rules}

【SOAP 结构要求】
1. **S (Subjective) 主观资料**：描述运动员的主诉、训练背景、伤病史、症状表现及运动员的主观感受（如 RPE 评分）。
2. **O (Objective) 客观检查**：描述身体素质评估结果、功能性动作筛查及【Vision3 体态评估参考数据】中的量化指标。
3. **A (Assessment) 表现分析**：结合主客观资料，给出功能评估、竞技状态分析及疲劳风险等级。
4. **P (Plan) 训练计划**：制定后续的训练调整建议、恢复方案及监控计划。

【跨维度推理要求】
- **AI 建议**：分析【Vision3 数据】与运动员主诉之间的关联（例如：主诉下腰部发紧，体态数据显示核心稳定性下降，AI 应指出这种一致性并提出针对性的激活或放松建议）。

【输入数据】
{vision_desc}

【原始转录】
{input_data}

【输出格式要求】
必须输出严格的 JSON 对象，禁止包含任何说明文字，结构如下：
{{
  "analyzed_dialogue": [
    {{"speaker": "角色", "text": "提炼后的内容"}}
  ],
  "structured_case": {{
    "S": "...",
    "O": "...",
    "A": "...",
    "P": "...",
    "ai_suggestions": "跨维度推理建议..."
  }}
}}
"""
        else:
            prompt = f"""你是一位专业的运动表现教练和速记员。请根据以下原始转录文本，完成对话还原与训练监控记录结构化。
{robust_rules}

【第一部分：对话还原要求】
1. **角色标注**：精准识别说话人：[教练]、[运动员]、[保障人员]。
2. **术语修正**：将口语化的表达修正为运动科学专业词汇。
3. **内容提炼**：去除冗余口癖，保持逻辑连贯。

【第二部分：结构化要求】
从对话中提取并总结以下标准字段：
- 主诉：运动员当前的最主要反馈（如疲劳、疼痛、僵硬）及持续时间。
- 训练背景：近期训练负荷、伤病史、竞技状态。
- 历史表现：过往测试数据、技术动作特点。
- 身体素质评估：功能性测试结果及专项体能表现。
- 表现分析：当前的竞技状态评估或动作质量评价。
- 训练调整建议：后续的训练方案调整、恢复计划或专项练习建议。

【第三部分：专家建议】
- AI 建议：给出 2-3 条简明扼要的训练或恢复处理建议。

【原始转录】
{input_data}

【输出格式要求】
必须输出严格的 JSON 对象，结构如下：
{{
  "analyzed_dialogue": [
    {{"speaker": "角色", "text": "提炼后的内容"}}
  ],
  "structured_case": {{
    "主诉": "...",
    "训练背景": "...",
    "历史表现": "...",
    "身体素质评估": "...",
    "表现分析": "...",
    "训练调整建议": "...",
    "ai_suggestions": "AI 建议内容..."
  }}
}}
"""
        
        print(f"DEBUG: 正在进行一键式 AI 角色分析与病历结构化 (Mode: {mode})...")
        result = self.nlp.model_pro.chat(prompt)
        
        if result["success"]:
            content = result["content"]
            try:
                json_str = self._clean_json_content(content, is_list=False)
                data = json.loads(json_str)
                if mode == "fatigue":
                    return data.get("analyzed_dialogue", []), data.get("fatigue_report", {})
                return data.get("analyzed_dialogue", []), data.get("structured_case", {})
            except Exception as e:
                print(f"DEBUG: 综合分析解析失败: {e}")
                return [], {}
        return [], {}

    def analyze_dialogue(self, input_data):
        """
        保留旧接口以兼容测试，底层调用新合并逻辑
        """
        dialogue, _ = self.analyze_and_structure(input_data)
        return dialogue

    def structure(self, dialogue_list):
        """
        保留旧接口以兼容测试，由于合并逻辑需要原始文本，此接口单独调用时会较慢
        """
        # 如果传入的是列表，说明是旧流程调用
        if isinstance(dialogue_list, list):
            dialogue_text = "\n".join([f"{d['speaker']}: {d['text']}" for d in dialogue_list])
            _, structured = self.analyze_and_structure(dialogue_text)
            return structured
        return {}

    def generate_report(self, case_data, config):
        """
        根据病例数据生成正式的医疗报告/病历文书
        """
        hospital = config.get("hospital_name", "XX医院")
        doctor = config.get("doctor_name", "王医生")
        
        prompt = f"""你是一位资深的医疗病历书写专家。请根据以下提取的病例数据，生成一份正式、规范、专业的入院/门诊记录。
【医院名称】：{hospital}
【医生姓名】：{doctor}
【病例数据】：
{json.dumps(case_data, ensure_ascii=False, indent=2)}

【要求】：
1. 语言要医学化、专业化。
2. 包含医院名称、基本信息、主诉、现病史、既往史、查体、诊断、处理意见等标准板块。
3. 排版工整，直接输出正文内容。
4. 使用 Markdown 格式。"""
        
        print("DEBUG: 正在生成正式报告...")
        result = self.nlp.model_pro.chat(prompt)
        if result["success"]:
            return result["content"].strip()
        else:
            print(f"DEBUG: 报告生成失败: {result.get('error', '未知错误')}")
            return ""
