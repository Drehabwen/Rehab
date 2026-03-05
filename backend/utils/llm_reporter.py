import os
import json
import logging
import re
import statistics
from typing import Dict, Any, List, Optional

# 加载环境变量
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(dotenv_path):
    from dotenv import load_dotenv
    load_dotenv(dotenv_path)

from openai import OpenAI

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
        timeout=300.0  # Increased timeout to 5 minutes
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

    def generate_final_report(self, assessment_type: str = "standard") -> str:
        """
        Generates holistic final report based on all accumulated observations.
        
        Args:
            assessment_type: 'standard' for full 3-view analysis, 'quick' for single-view screening
        """
        print(f"[generate_final_report] Starting with assessment_type: {assessment_type}", flush=True)
        print(f"[generate_final_report] Observations count: {len(self.observations)}", flush=True)
        
        if not client:
            print("[generate_final_report] ERROR: No client available", flush=True)
            return "API链接失败：未找到Deepseek API密钥"

        history_context = ""
        for i, obs in enumerate(self.observations):
            history_context += f"\n--- 视角 {i+1} 数据 ---\n{obs['narration']}\n"

        # Adjust prompt based on assessment type
        if assessment_type == "quick":
            assessment_context = """
            ### 评估类型：快速评估（单视角筛查）
            - 本评估仅基于单视角（正面）数据
            - 适合快速筛查和初步检查
            - 建议进行完整评估以获得更准确的诊断
            """
        else:
            assessment_context = """
            ### 评估类型：标准评估（三视角完整评估）
            - 本评估基于正面、侧面、背面三视角数据
            - 提供全面、准确的体态分析
            - 适合需要详细诊断的场景
            """

        prompt = f"""
        你好，作为一位专业的康复评估专家，我需要你对以下体态评估数据进行分析并生成一份深度报告。
        
        {assessment_context}
        
        ### 评估数据
        {history_context}
        
        ### 参考标准（供你参考，不必机械套用）：
        - 标准差 < 0.05cm：高度稳定（可视为习惯性体态）
        - 标准差 0.05~0.15cm：轻度波动（可能是疲劳/不稳）
        - 标准差 > 0.15cm：明显不稳（数据可信度低，建议谨慎解读）
        
        ### 置信度评分标准：
        - A级（95%以上）：数值稳定，多视角一致，推理链完整
        - B级（70-95%）：数值较稳定，存在轻微矛盾，推理链较完整
        - C级（50-70%）：数值波动，存在明显矛盾，推理链不完整
        - D级（<50%）：数据质量差，建议重拍
        
        ### 请你完成以下任务：
        1. **全面分析**：
           - 综合考虑所有视角的数据，不要只依赖单一视角。
           - 找出不同视角之间的潜在矛盾点。
           - 识别可能存在的代偿模式。
        
        2. **深度分析**：
           - 不仅要描述现象，还要分析可能的根本原因。
           - 结合稳定性指标，判断体态问题是习惯性的还是临时性的。
        
        3. **生成报告**：
           - 使用自然、易懂的语言，避免生硬的专业术语。
           - 结构清晰，层次分明，让读者容易理解。
           - 包含以下内容：
             - 顶部风险提示（使用引用块）
             - 原始数据与专家分析的对比（表格形式）
             - 不同视角的矛盾点汇总
             - 代偿机制和根本原因分析
             - 3-4个针对性的康复建议
             - 总体评估和建议
        
        ### 推理过程建议：
        对于每个关键发现，建议你按照以下思路分析：
        - 观察到的现象
        - 可能的原因
        - 影响和风险
        - 建议的干预措施
        
        请用自然、专业的语言完成这份报告，确保内容既科学严谨又易于理解。
        """

        try:
            print(f"[generate_final_report] Calling LLM API...", flush=True)
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一位经验丰富、专业且富有同理心的康复评估专家。你擅长用通俗易懂的语言解释复杂的体态问题，同时保持科学严谨性。你的目标是帮助患者理解他们的体态状况，提供个性化的康复建议，而不是机械地输出诊断结果。你会根据具体情况灵活调整语言风格，确保输出自然流畅，避免生硬的专业术语堆砌。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,  # 提高温度以增加输出的多样性和自然度
                timeout=300
            )
            print(f"[generate_final_report] LLM API call completed", flush=True)
            
            # Debug: Print raw response
            print(f"[generate_final_report] Raw response type: {type(response)}", flush=True)
            
            # Check response structure - safely
            try:
                print(f"[generate_final_report] Response has choices: {hasattr(response, 'choices')}", flush=True)
                if hasattr(response, 'choices'):
                    print(f"[generate_final_report] Choices count: {len(response.choices) if response.choices else 0}", flush=True)
                    if response.choices and len(response.choices) > 0:
                        print(f"[generate_final_report] First choice type: {type(response.choices[0])}", flush=True)
                        if hasattr(response.choices[0], 'message'):
                            print(f"[generate_final_report] Message type: {type(response.choices[0].message)}", flush=True)
                            if hasattr(response.choices[0].message, 'content'):
                                raw_content = response.choices[0].message.content
                                print(f"[generate_final_report] Content length: {len(raw_content) if raw_content else 0}", flush=True)
                            else:
                                print(f"[generate_final_report] ERROR: No content attribute", flush=True)
                                return "生成报告失败：LLM 返回无内容"
                        else:
                            print(f"[generate_final_report] ERROR: No message attribute", flush=True)
                            return "生成报告失败：LLM 返回无消息"
                    else:
                        print(f"[generate_final_report] ERROR: No choices", flush=True)
                        return "生成报告失败：LLM 返回空响应"
                else:
                    print(f"[generate_final_report] ERROR: No choices attribute", flush=True)
                    return "生成报告失败：LLM 返回格式错误"
            except Exception as access_error:
                print(f"[generate_final_report] ERROR accessing response: {access_error}", flush=True)
                import traceback
                traceback.print_exc()
                return f"生成报告失败：访问响应出错 - {str(access_error)}"
            
            if not raw_content:
                print(f"[generate_final_report] ERROR: Empty content in message", flush=True)
                return "生成报告失败：LLM 返回空内容"
            
            print("\n" + "="*50)
            print("--- RAW LLM RESPONSE START ---")
            print(raw_content[:500])
            print("--- RAW LLM RESPONSE END ---")
            print("="*50 + "\n", flush=True)
            
            logger.info(f"DeepSeek Response length: {len(raw_content)}")
            markdown = extract_markdown(raw_content)
            if markdown.strip():
                print(f"[generate_final_report] Returning markdown: {len(markdown)} chars", flush=True)
                return markdown
            fallback = raw_content.strip() if raw_content else ""
            print(f"[generate_final_report] Returning fallback: {len(fallback)} chars", flush=True)
            return fallback if fallback else "生成报告失败：LLM 返回空内容"
        except Exception as e:
            logger.error(f"Error in generate_final_report: {e}")
            print(f"[generate_final_report] ERROR: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return f"生成报告失败: {str(e)}"
        finally:
            print(f"[generate_final_report] Function completed", flush=True)

    async def generate_final_report_stream(self, assessment_type: str = "standard", websocket=None):
        """
        Stream version of generate_final_report for real-time LLM output.
        Yields chunks of markdown content as they are received from the LLM.
        
        Args:
            assessment_type: 'standard' for full analysis, 'quick' for single-view
            websocket: WebSocket connection for streaming chunks
        """
        global client
        
        if not self.observations:
            yield "⚠️ 未检测到体态数据，请重新进行姿态采集"
            return
        
        if not client:
            yield "API 链接失败：未找到 Deepseek API 密钥"
            return
        
        # Build prompt from observations
        prompt_parts = ["你好，作为一位专业的康复评估专家，我需要你基于以下体态评估数据生成一份深度分析报告：\n"]
        for i, obs in enumerate(self.observations, 1):
            prompt_parts.append(f"\n【视角 {i}】\n{obs['narration']}")
        
        prompt = "\n".join(prompt_parts)
        
        try:
            print(f"[generate_final_report_stream] Calling LLM API with streaming...", flush=True)
            
            # Call LLM with streaming enabled
            stream = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一位经验丰富、专业且富有同理心的康复评估专家。你擅长用通俗易懂的语言解释复杂的体态问题，同时保持科学严谨性。你的目标是帮助患者理解他们的体态状况，提供个性化的康复建议，而不是机械地输出诊断结果。你会根据具体情况灵活调整语言风格，确保输出自然流畅，避免生硬的专业术语堆砌。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,  # 提高温度以增加输出的多样性和自然度
                stream=True,  # Enable streaming
                timeout=300
            )
            
            full_content = ""
            chunk_count = 0
            
            # Process stream chunks
            for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        content = delta.content
                        full_content += content
                        chunk_count += 1
                        
                        # Send chunk via WebSocket if available
                        if websocket:
                            try:
                                await websocket.send_json({
                                    "type": "DEEP_REPORT_STREAM",
                                    "content": content,
                                    "chunkIndex": chunk_count
                                })
                            except Exception as send_error:
                                print(f"[generate_final_report_stream] WebSocket send error: {send_error}", flush=True)
                                # Continue streaming even if WebSocket fails
            
            print(f"[generate_final_report_stream] Stream completed. Total chunks: {chunk_count}, Content length: {len(full_content)}", flush=True)
            
            # Process final content
            if full_content:
                print("\n" + "="*50)
                print("--- RAW STREAMED CONTENT START ---")
                print(full_content[:500])
                print("--- RAW STREAMED CONTENT END ---")
                print("="*50 + "\n", flush=True)
                
                logger.info(f"Streamed Response length: {len(full_content)}")
                markdown = extract_markdown(full_content)
                
                if markdown.strip():
                    print(f"[generate_final_report_stream] Returning markdown: {len(markdown)} chars", flush=True)
                    yield markdown
                    return
                
                fallback = full_content.strip()
                print(f"[generate_final_report_stream] Returning fallback: {len(fallback)} chars", flush=True)
                yield fallback if fallback else "生成报告失败：LLM 返回空内容"
            else:
                print(f"[generate_final_report_stream] ERROR: Empty content received", flush=True)
                yield "生成报告失败：LLM 返回空内容"
                
        except Exception as e:
            logger.error(f"Error in generate_final_report_stream: {e}")
            print(f"[generate_final_report_stream] ERROR: {e}", flush=True)
            import traceback
            traceback.print_exc()
            yield f"生成报告失败：{str(e)}"
        finally:
            print(f"[generate_final_report_stream] Function completed", flush=True)

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

def summarize_time_series(time_series: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
    metric_values: Dict[str, List[float]] = {}
    for item in time_series:
        metrics = item.get("metrics") if isinstance(item, dict) else None
        if not isinstance(metrics, dict):
            metrics = item if isinstance(item, dict) else {}
        for key, value in metrics.items():
            if key in ("timestamp", "view"):
                continue
            if isinstance(value, (int, float)):
                metric_values.setdefault(key, []).append(float(value))
    summary: Dict[str, Dict[str, float]] = {}
    for key, values in metric_values.items():
        if not values:
            continue
        mean = sum(values) / len(values)
        sd = statistics.pstdev(values) if len(values) > 1 else 0.0
        summary[key] = {
            "mean": mean,
            "min": min(values),
            "max": max(values),
            "sd": sd
        }
    return summary

def build_narration(view: str, summary: Dict[str, Any]) -> str:
    lines = [f"评估视角: {view}"]
    duration = summary.get("duration")
    frame_count = summary.get("frameCount")
    if isinstance(duration, (int, float)):
        lines.append(f"采样时长: {duration:.0f}ms")
    if isinstance(frame_count, (int, float)):
        lines.append(f"采样帧数: {int(frame_count)}")
    averages = summary.get("averages") or {}
    if isinstance(averages, dict) and averages:
        lines.append("均值指标:")
        for key, value in averages.items():
            if isinstance(value, (int, float)):
                lines.append(f"- {key}: {value:.4f}")
    stability = summary.get("stability") or {}
    if isinstance(stability, dict) and stability:
        lines.append("稳定性指标:")
        for key, value in stability.items():
            if isinstance(value, (int, float)):
                lines.append(f"- {key}: {value:.4f}")
    time_series_summary = summary.get("timeSeriesSummary") or {}
    if isinstance(time_series_summary, dict) and time_series_summary:
        lines.append("时序统计:")
        for key, stats in time_series_summary.items():
            if not isinstance(stats, dict):
                continue
            mean = stats.get("mean")
            sd = stats.get("sd")
            min_v = stats.get("min")
            max_v = stats.get("max")
            if all(isinstance(v, (int, float)) for v in [mean, sd, min_v, max_v]):
                lines.append(f"- {key}: mean={mean:.4f}, sd={sd:.4f}, min={min_v:.4f}, max={max_v:.4f}")
    return "\n".join(lines)

def generate_posture_report(analysis_data: Dict[str, Any], assessment_type: str = "standard") -> str:
    """
    Compatibility wrapper for existing calls.
    Now uses PostureAgent to generate a report.
    
    Args:
        analysis_data: Dictionary containing frames or other analysis data
        assessment_type: 'standard' for full 3-view analysis, 'quick' for single-view screening
    """
    # If assessment_type is in analysis_data, use it
    if isinstance(analysis_data, dict) and "assessment_type" in analysis_data:
        assessment_type = analysis_data.pop("assessment_type")
        print(f"[generate_posture_report] Using assessment_type from data: {assessment_type}", flush=True)
    
    # If it's a batch/stepped request, it usually comes with multiple frames.
    # We should clear the agent and feed it everything.
    posture_agent.clear()
    
    # In new flow, analysis_data might contain narration and stats directly.
    # Or it might be old format. Let's handle both.
    
    if "frames" in analysis_data:
        # New stepped flow
        try:
            from backend.utils.narrator import process_time_series
        except ImportError:
            from utils.narrator import process_time_series # Fallback for different contexts
        
        import traceback
        for frame in analysis_data["frames"]:
            try:
                # frame is a dict from model_dump()
                print(f"[generate_posture_report] Processing frame for view: {frame.get('view', 'unknown')}", flush=True)
                print(f"[generate_posture_report] timeSeriesLandmarks count: {len(frame.get('timeSeriesLandmarks', []))}", flush=True)
                res = process_time_series(frame["view"], frame["timeSeriesLandmarks"])
                print(f"[generate_posture_report] process_time_series completed, narration length: {len(res.get('narration', ''))}", flush=True)
                posture_agent.analyze_view(res["narration"], res["stats"])
            except Exception as e:
                print(f"[generate_posture_report] Error processing frame: {e}", flush=True)
                traceback.print_exc()
                # Continue with next frame instead of failing completely
                continue
    else:
        view = analysis_data.get("view", "unknown")
        averages = analysis_data.get("averages") or {}
        stability = analysis_data.get("stability") or {}
        time_series = analysis_data.get("timeSeries") or []
        time_series_summary = summarize_time_series(time_series if isinstance(time_series, list) else [])
        summary_stats = {
            "view": view,
            "duration": analysis_data.get("duration"),
            "frameCount": analysis_data.get("frameCount") or (len(time_series) if isinstance(time_series, list) else None),
            "averages": averages,
            "stability": stability,
            "timeSeriesSummary": time_series_summary
        }
        narration = build_narration(view, summary_stats)
        posture_agent.analyze_view(narration, summary_stats)
    
    print(f"[generate_posture_report] Calling generate_final_report with assessment_type: {assessment_type}", flush=True)
    result = posture_agent.generate_final_report(assessment_type)
    print(f"[generate_posture_report] generate_final_report returned: {len(result)} chars", flush=True)
    return result
