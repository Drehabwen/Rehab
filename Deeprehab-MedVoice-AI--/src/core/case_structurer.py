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
            
            latest = vision3_data.get("latest_saved")
            if latest:
                vision_desc += f"- 历史保存记录日期: {latest.get('date', '未知')}\n"

        if mode == "soap":
            prompt = f"""你是一位极其专业的全科医生和康复专家。请根据以下原始转录文本和 Vision3 体态评估数据，完成 SOAP 格式的病历构建。

【SOAP 结构要求】
1. **S (Subjective) 主观资料**：描述患者的主诉、现病史、既往史、症状表现及患者的主观感受。
2. **O (Objective) 客观检查**：描述体格检查结果、影像学检查及【Vision3 体态评估参考数据】中的量化指标。
3. **A (Assessment) 评估诊断**：结合主客观资料，给出初步诊断、功能评估及康复分级。
4. **P (Plan) 治疗计划**：制定后续的治疗方案、康复训练建议及随访计划。

【跨维度推理要求】
- **AI 建议**：分析【Vision3 数据】与患者主诉之间的关联（例如：主诉腰痛，体态数据显示腰椎前屈受限，AI 应指出这种一致性并提出康复重点）。

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
            prompt = f"""你是一位极其专业的全科医生和医疗速记员。请根据以下原始转录文本，完成对话还原与病历结构化。

【第一部分：对话还原要求】
1. **角色标注**：精准识别说话人：[医生]、[患者]、[家属]。
2. **术语修正**：将口语化的表达修正为医学专业词汇。
3. **内容提炼**：去除冗余口癖，保持逻辑连贯。

【第二部分：病历结构化要求】
从对话中提取并总结以下标准字段：
- 主诉：患者就诊的最主要症状及持续时间。
- 现病史：起病情况、症状特点、病情演变。
- 既往史：既往疾病、手术史、过敏史。
- 体格检查：生命体征及专科检查结果。
- 诊断：初步诊断或临床印象。
- 处理意见：治疗方案、检查计划或生活建议。

【第三部分：临床建议】
- AI 建议：给出 2-3 条简明扼要的临床处理建议。

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
    "现病史": "...",
    "既往史": "...",
    "体格检查": "...",
    "诊断": "...",
    "处理意见": "...",
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
