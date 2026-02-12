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
        
        时序趋势数据 (用于绘图):
        {json.dumps(analysis_data.get('timeSeries'), indent=2, ensure_ascii=False)}
        
        报告要求：
        1. 结构与样式：
           - 使用纯 HTML 和内置 CSS (支持 Tailwind CDN)。
           - **必须包含一个或多个趋势图表**。请使用以下特殊的占位符 DIV 语法，前端会自动将其替换为交互式图表：
             `<div class="rehab-chart" data-type="sway" data-title="重心偏移趋势" data-key="swayOffset" data-unit="mm" data-color="#3b82f6"></div>`
           - 可用的 data-key 包括：
             - `swayOffset`: 重心偏移量 (通用)
             - `shoulderAngle`: 双肩倾斜角 (正面/背面)
             - `hipAngle`: 骨盆倾斜角 (正面/背面)
             - `headDeviation`: 头部侧偏 (正面/背面)
             - `headForward`: 头部前倾 (侧面)
             - `shoulderRounded`: 圆肩程度 (侧面)
           - data-type 可选: `sway` (带阴影面积图), `angle` (折线图)。
        2. 内容深度：
           - 结论部分：基于稳定性指标（SD, Max Deviation, Velocity）给出明确的平衡等级评估。
           - 风险预警：识别潜在的肌肉失衡或关节压力风险。
           - 康复建议：提供 2-3 个针对性的拉伸或强化动作建议。
        3. 语言：必须使用中文。
        4. 禁用：不要在 HTML 中包含任何 <script> 标签，图表渲染由前端占位符处理。
        5. 输出格式：
           - 直接返回 <html> 标签内的完整代码，不要包含任何 Markdown 包裹符。
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
