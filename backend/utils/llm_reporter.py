import os
import json
import logging
import re
from typing import Dict, Any, List, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Deepseek client (OpenAI compatible)
client = None
api_key = os.getenv("DEEPSEEK_API_KEY")
if api_key:
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com",
        timeout=120.0
    )

class PostureAgent:
    """
    Manages the LLM-based posture analysis with memory retention across views.
    """
    def __init__(self):
        self.observations = [] # Stores narrations and stats from previous views

    def clear(self):
        self.observations = []

    def analyze_view(self, narration: str, stats: Dict[str, Any]) -> str:
        """
        Feeds a single view's data to the LLM, keeping context of previous views.
        Returns a critical observation for the current view.
        """
        self.observations.append({
            "narration": narration,
            "stats": stats
        })
        
        # In a real "agent" flow, we might call the LLM here to get a per-view thought.
        # For now, we'll collect them all for the final summary to save tokens and simplify.
        return f"已记录视角数据，当前累计视角数: {len(self.observations)}"

    def generate_final_report(self) -> str:
        """
        Generates the holistic final report based on all accumulated observations.
        """
        if not client:
            return "Deepseek API key not found."

        history_context = ""
        for i, obs in enumerate(self.observations):
            history_context += f"\n--- 视角 {i+1} 数据 ---\n{obs['narration']}\n"

        prompt = f"""
        你是一位极其挑剔且专业的康复评估专家。你正在对一位患者进行多视角（正面、侧面、背面）的体态汇总分析。
        
        ### 历史观测记录 (数值与自然语言描述)
        {history_context}
        
        ### 时序稳定性参考标准（仅作参考，不要死板套用）：
        - 标准差 < 0.05cm：高度稳定（可视为习惯性体态）
        - 标准差 0.05~0.15cm：轻度波动（可能是疲劳/不稳）
        - 标准差 > 0.15cm：明显不稳（数据可信度低，建议谨慎解读）
        
        ### 置信度评分标准：
        - A级（95%以上）：数值稳定，多视角一致，推理链完整
        - B级（70-95%）：数值较稳定，存在轻微矛盾，推理链较完整
        - C级（50-70%）：数值波动，存在明显矛盾，推理链不完整
        - D级（<50%）：数据质量差，建议重拍
        
        ### 你的任务：
        1. **交叉校验 (Critical Analysis)**：
           - 严禁盲目信任单一视角。
           - 寻找不同视角之间的矛盾点（例如：正面看肩膀平衡，背面看却明显倾斜）。
           - 识别代偿模式（例如：为了纠正头前倾而产生的胸椎过度后突）。
        
        2. **深度生物力学推导**：
           - 不要只描述现象，要推导出根本原因（Root Cause）。
           - 结合时序稳定性指标（标准差、斜率），判断该体态是习惯性的还是由于疲劳/不稳导致的动态代偿。
        
        3. **生成结构化 Markdown 报告**（必须严格遵循以下结构）：
           - 使用标准 Markdown 语法。
           - 【顶部警告栏】：使用引用块（>）或者明显的加粗框，内容为「> **⚠️ 风险提示**：本报告由 AI 生成，仅供参考，不构成医疗诊断或治疗建议。如有不适，请及时就医。」
           - 【原始数据 vs 专家推论对比】：使用表格（Table）展示【项目】、【原始数值】、【LLM 推理】、【结论权重】。
           - 【交叉矛盾点汇总】：使用无序列表列出所有视角之间的矛盾。
           - 【核心代偿分析】：深度分析代偿机制和根本原因。
           - 【康复方案】：提供 3-4 个高度针对性的康复方案（有序列表）。
           - 【总结建议】：总结置信度和总体判断。
        
        ### 推理链可视化强制格式（Markdown）：
        对于每个关键发现，必须按以下格式输出：
        - **项目**：XXX
        - **原始数值**：XXX cm（标准差：XXX cm，斜率：XXX）
        - **LLM 推理**：因为YYY原因，判断这是ZZZ类型的问题
        - **结论权重**：高/中/低（说明理由）
        - **置信度**：A/B/C/D（说明理由）
        
        ### 强制要求：
        - 保持批判性，不要给出千篇一律的建议。
        - 必须包含具体的数值引用以增强说服力。
        - 严禁直接给出结论而省略推理过程。
        - 只返回 Markdown 内容，不要任何额外解释。
        """

        try:
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一个具有批判性思维的医疗专家。你的目标是揭示体态问题背后的深层代偿逻辑，而非简单描述。你必须严格遵循推理链可视化的要求，展示从原始数值到最终结论的完整推导过程。严禁省略推理步骤或降低数值的重要性。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4
            )
            
            raw_content = response.choices[0].message.content
            print("\n" + "="*50)
            print("--- RAW LLM RESPONSE START ---")
            print(raw_content)
            print("--- RAW LLM RESPONSE END ---")
            print("="*50 + "\n", flush=True)
            
            logger.info(f"DeepSeek Response length: {len(raw_content)}")
            return extract_markdown(raw_content)
        except Exception as e:
            logger.error(f"Error in generate_final_report: {e}")
            return f"生成报告失败: {str(e)}"

# Global instance for the session (simplified)
posture_agent = PostureAgent()

def extract_markdown(text: str) -> str:
    """Extracts markdown content from LLM response, removing triple backticks if present."""
    if not text:
        return ""
        
    # Try to find content within ```markdown ... ```
    md_match = re.search(r'```markdown\s*(.*?)\s*```', text, re.DOTALL | re.IGNORECASE)
    if md_match:
        return md_match.group(1).strip()
    # Try to find content within generic ``` ... ```
    generic_match = re.search(r'```\s*(.*?)\s*```', text, re.DOTALL)
    if generic_match:
        return generic_match.group(1).strip()
    
    return text.strip()

def generate_posture_report(analysis_data: Dict[str, Any]) -> str:
    """
    Compatibility wrapper for existing calls.
    Now uses the PostureAgent to generate a report.
    """
    # If it's a batch/stepped request, it usually comes with multiple frames.
    # We should clear the agent and feed it everything.
    posture_agent.clear()
    
    # In the new flow, analysis_data might contain the narration and stats directly.
    # Or it might be the old format. Let's handle both.
    
    if "frames" in analysis_data:
        # New stepped flow
        try:
            from backend.utils.narrator import process_time_series
        except ImportError:
            from utils.narrator import process_time_series # Fallback for different contexts
            
        for frame in analysis_data["frames"]:
            # frame is a dict from model_dump()
            res = process_time_series(frame["view"], frame["timeSeriesLandmarks"])
            posture_agent.analyze_view(res["narration"], res["stats"])
    else:
        # Single view or fallback
        narration = analysis_data.get("narration", "未知视角描述")
        stats = analysis_data.get("stats", {})
        posture_agent.analyze_view(narration, stats)
        
    return posture_agent.generate_final_report()
