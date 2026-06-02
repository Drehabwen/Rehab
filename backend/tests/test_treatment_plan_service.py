import pytest
import json
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

from utils.treatment_plan_service import (
    build_prompt,
    generate_treatment_plan,
    generate_treatment_plan_stream,
    get_assessment_data
)


class TestBuildPrompt:
    """测试提示词构建功能"""
    
    def test_build_prompt_returns_string(self):
        """测试 build_prompt 返回字符串"""
        assessment_data = {
            "patient_id": "test_001",
            "metrics": {"shoulderAngle": 10.5}
        }
        prompt = build_prompt(assessment_data)
        assert isinstance(prompt, str)
        assert len(prompt) > 0
    
    def test_build_prompt_contains_assessment_data(self):
        """测试提示词包含评估数据"""
        assessment_data = {
            "patient_id": "test_001",
            "metrics": {"shoulderAngle": 10.5}
        }
        prompt = build_prompt(assessment_data)
        assert "test_001" in prompt
        assert "shoulderAngle" in prompt
    
    def test_build_prompt_contains_requirements(self):
        """测试提示词包含治疗计划要求"""
        assessment_data = {"patient_id": "test_001"}
        prompt = build_prompt(assessment_data)
        assert "康复计划" in prompt
        assert "热身" in prompt
        assert "Markdown" in prompt
    
    def test_build_prompt_with_empty_data(self):
        """测试空数据构建提示词"""
        prompt = build_prompt({})
        assert isinstance(prompt, str)
        assert "患者评估数据" in prompt
    
    def test_build_prompt_with_complex_data(self):
        """测试复杂数据结构构建提示词"""
        assessment_data = {
            "patient_id": "test_001",
            "metrics": {
                "shoulderAngle": 15.5,
                "hipAngle": 8.2,
                "headDeviation": 12.3
            },
            "issues": [
                {"type": "shoulder_impingement", "severity": "moderate"},
                {"type": "forward_head_posture", "severity": "mild"}
            ],
            "recommendations": ["加强肩部肌肉锻炼", "改善坐姿"]
        }
        prompt = build_prompt(assessment_data)
        assert "shoulder_impingement" in prompt
        assert "加强肩部肌肉锻炼" in prompt


class TestGetAssessmentData:
    """测试获取评估数据功能"""
    
    @pytest.mark.asyncio
    async def test_get_assessment_data_returns_dict(self):
        """测试返回字典格式"""
        result = await get_assessment_data("assessment_001")
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_get_assessment_data_contains_required_fields(self):
        """测试返回数据包含必要字段"""
        result = await get_assessment_data("assessment_001")
        assert "assessment_id" in result
        assert "patient_id" in result
        assert "metrics" in result
        assert "issues" in result
        assert "recommendations" in result
    
    @pytest.mark.asyncio
    async def test_get_assessment_data_contains_metrics(self):
        """测试返回数据包含指标"""
        result = await get_assessment_data("assessment_001")
        metrics = result["metrics"]
        assert "shoulderAngle" in metrics
        assert "hipAngle" in metrics
        assert "headDeviation" in metrics
        assert isinstance(metrics["shoulderAngle"], float)
    
    @pytest.mark.asyncio
    async def test_get_assessment_data_contains_issues(self):
        """测试返回数据包含问题列表"""
        result = await get_assessment_data("assessment_001")
        issues = result["issues"]
        assert isinstance(issues, list)
        assert len(issues) > 0
        assert "type" in issues[0]
        assert "severity" in issues[0]
    
    @pytest.mark.asyncio
    async def test_get_assessment_data_different_ids(self):
        """测试不同评估ID返回不同数据"""
        result1 = await get_assessment_data("assessment_001")
        result2 = await get_assessment_data("assessment_002")
        assert result1["assessment_id"] == "assessment_001"
        assert result2["assessment_id"] == "assessment_002"


class TestGenerateTreatmentPlan:
    """测试治疗计划生成功能"""
    
    @pytest.mark.asyncio
    async def test_generate_treatment_plan_returns_string(self):
        """测试返回字符串"""
        assessment_data = {"patient_id": "test_001"}
        
        # Mock DeepSeek 客户端
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "治疗计划内容"
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await generate_treatment_plan(assessment_data)
            assert isinstance(result, str)
            assert result == "治疗计划内容"
    
    @pytest.mark.asyncio
    async def test_generate_treatment_plan_calls_api_with_correct_params(self):
        """测试调用API参数正确"""
        assessment_data = {"patient_id": "test_001"}
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "治疗计划"
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            await generate_treatment_plan(assessment_data)
            
            # 验证调用参数
            call_args = mock_client.chat.completions.create.call_args
            assert call_args[1]["model"] == "deepseek-v4-flash"
            assert call_args[1]["temperature"] == 0.7
            assert "messages" in call_args[1]
    
    @pytest.mark.asyncio
    async def test_generate_treatment_plan_handles_empty_response(self):
        """测试处理空响应"""
        assessment_data = {"patient_id": "test_001"}
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = None
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await generate_treatment_plan(assessment_data)
            assert result == ""
    
    @pytest.mark.asyncio
    async def test_generate_treatment_plan_handles_api_error(self):
        """测试处理API错误"""
        assessment_data = {"patient_id": "test_001"}
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(side_effect=Exception("API Error"))
            
            with pytest.raises(Exception) as exc_info:
                await generate_treatment_plan(assessment_data)
            assert "API Error" in str(exc_info.value)


class TestGenerateTreatmentPlanStream:
    """测试流式治疗计划生成功能"""
    
    @pytest.mark.asyncio
    async def test_generate_treatment_plan_stream_yields_chunks(self):
        """测试流式生成返回数据块"""
        assessment_data = {"patient_id": "test_001"}
        
        # Mock 流式响应
        mock_chunk1 = Mock()
        mock_chunk1.choices = [Mock()]
        mock_chunk1.choices[0].delta.content = "治疗"
        
        mock_chunk2 = Mock()
        mock_chunk2.choices = [Mock()]
        mock_chunk2.choices[0].delta.content = "计划"
        
        async def mock_stream():
            yield mock_chunk1
            yield mock_chunk2
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())
            
            chunks = []
            async for chunk in generate_treatment_plan_stream(assessment_data):
                chunks.append(chunk)
            
            assert len(chunks) == 2
            assert chunks[0] == "治疗"
            assert chunks[1] == "计划"
    
    @pytest.mark.asyncio
    async def test_generate_treatment_plan_stream_calls_api_with_stream_param(self):
        """测试流式调用API参数正确"""
        assessment_data = {"patient_id": "test_001"}
        
        mock_chunk = Mock()
        mock_chunk.choices = [Mock()]
        mock_chunk.choices[0].delta.content = "test"
        
        async def mock_stream():
            yield mock_chunk
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())
            
            async for _ in generate_treatment_plan_stream(assessment_data):
                pass
            
            # 验证调用参数
            call_args = mock_client.chat.completions.create.call_args
            assert call_args[1]["stream"] == True
    
    @pytest.mark.asyncio
    async def test_generate_treatment_plan_stream_skips_empty_chunks(self):
        """测试跳过空数据块"""
        assessment_data = {"patient_id": "test_001"}
        
        mock_chunk1 = Mock()
        mock_chunk1.choices = [Mock()]
        mock_chunk1.choices[0].delta.content = "治疗"
        
        mock_chunk2 = Mock()
        mock_chunk2.choices = [Mock()]
        mock_chunk2.choices[0].delta.content = None  # 空内容
        
        mock_chunk3 = Mock()
        mock_chunk3.choices = [Mock()]
        mock_chunk3.choices[0].delta.content = "计划"
        
        async def mock_stream():
            yield mock_chunk1
            yield mock_chunk2
            yield mock_chunk3
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())
            
            chunks = []
            async for chunk in generate_treatment_plan_stream(assessment_data):
                chunks.append(chunk)
            
            assert len(chunks) == 2
            assert "治疗" in chunks
            assert "计划" in chunks
    
    @pytest.mark.asyncio
    async def test_generate_treatment_plan_stream_handles_api_error(self):
        """测试流式处理API错误"""
        assessment_data = {"patient_id": "test_001"}
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(side_effect=Exception("Stream Error"))
            
            with pytest.raises(Exception) as exc_info:
                async for _ in generate_treatment_plan_stream(assessment_data):
                    pass
            assert "Stream Error" in str(exc_info.value)


class TestIntegration:
    """集成测试"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_flow(self):
        """测试端到端流程"""
        # 1. 获取评估数据
        assessment_data = await get_assessment_data("test_assessment")
        assert assessment_data is not None
        
        # 2. 构建提示词
        prompt = build_prompt(assessment_data)
        assert "康复计划" in prompt
        
        # 3. Mock LLM 响应
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "## 治疗计划\n\n1. 第一周..."
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            # 4. 生成治疗计划
            result = await generate_treatment_plan(assessment_data)
            assert "治疗计划" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
