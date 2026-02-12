import os
import json
import logging
from typing import Dict, Any
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
        base_url="https://api.deepseek.com"
    )

def generate_posture_report(analysis_data: Dict[str, Any]) -> str:
    """
    Generates an HTML posture assessment report using Deepseek LLM.
    """
    if not client:
        logger.warning("Deepseek API key not found. Returning mock report.")
        return get_mock_report(analysis_data)

    try:
        view_map = {"front": "正视图", "side": "侧视图", "back": "背视图"}
        view_name = view_map.get(analysis_data.get("view", "front"), "未知视图")
        
        prompt = f"""
        你是一位专业的康复理疗师和人体工学专家。请根据以下 2 秒时序采集的体态评估数据，生成一份专业的 HTML 格式评估报告。
        
        评估视图: {view_name}
        采集时长: {analysis_data.get('duration')}ms
        帧数: {analysis_data.get('frameCount')}
        
        关键指标 (平均值):
        {json.dumps(analysis_data.get('averages'), indent=2, ensure_ascii=False)}
        
        稳定性指标:
        {json.dumps(analysis_data.get('stability'), indent=2, ensure_ascii=False)}
        
        要求：
        1. 使用纯 HTML 和内置 CSS (或者使用 Tailwind CDN)。
        2. 包含一个清晰的结论：体态是否稳定，有哪些潜在风险。
        3. 报告应包含：标题、用户信息摘要、稳定性分析、各维度详细评估、康复建议。
        4. 风格要现代、专业、易读（类似医疗机构的电子报告）。
        5. 请直接返回 HTML 代码，不要包含 Markdown 的包裹符号。
        6. 可以在报告中引用 Chart.js 来绘制稳定性趋势（假设你有一组模拟的趋势数据）。
        """

        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一个专业的医疗体态分析助手，擅长生成精美的 HTML 报告。"},
                {"role": "user", "content": prompt}
            ],
            stream=False
        )

        html_content = response.choices[0].message.content
        # Strip markdown code blocks if present
        if html_content.startswith("```html"):
            html_content = html_content[7:]
        if html_content.endswith("```"):
            html_content = html_content[:-3]
        
        return html_content.strip()

    except Exception as e:
        logger.error(f"Error generating LLM report: {e}")
        return get_mock_report(analysis_data)

def get_mock_report(data: Dict[str, Any]) -> str:
    """Fallback mock report when LLM fails or API key is missing."""
    return f"""
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h1 style="color: #2563eb;">体态评估报告 (预览版)</h1>
        <p>视图: {data.get('view')}</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <h3 style="margin-top: 0;">稳定性分析</h3>
            <p>重心偏移: {data.get('stability', {}).get('maxDeviation', 0):.2f}</p>
            <p>晃动面积: {data.get('stability', {}).get('swayArea', 0):.2f}</p>
        </div>
        <div style="margin-top: 20px; color: #64748b; font-size: 0.9em;">
            注：此报告为系统自动生成的预览版。配置 Deepseek API 后可获得 AI 深度分析。
        </div>
    </div>
    """
