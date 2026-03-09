import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from fastapi.testclient import TestClient

# 导入 main 应用
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)


class TestTreatmentPlanIntegration:
    """治疗计划生成功能的集成测试"""
    
    def test_health_check(self):
        """测试健康检查端点"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_generate_plan_endpoint(self):
        """测试治疗计划生成端点"""
        # Mock 治疗计划服务
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "## 治疗计划\n\n第一周..."
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            response = client.post(
                "/api/treatment-plan/generate",
                json={
                    "patientId": "patient_001",
                    "assessmentId": "assessment_001",
                    "createdBy": "therapist_001"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "content" in data
            assert data["patientId"] == "patient_001"
            assert data["assessmentId"] == "assessment_001"
            assert data["createdBy"] == "therapist_001"
    
    def test_generate_plan_endpoint_error(self):
        """测试治疗计划生成端点错误处理"""
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                side_effect=Exception("API Error")
            )
            
            response = client.post(
                "/api/treatment-plan/generate",
                json={
                    "patientId": "patient_001",
                    "assessmentId": "assessment_001",
                    "createdBy": "therapist_001"
                }
            )
            
            assert response.status_code == 500
            assert "生成治疗计划失败" in response.json()["detail"]
    
    def test_generate_plan_stream_endpoint(self):
        """测试流式治疗计划生成端点"""
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
            
            with client.stream(
                "POST",
                "/api/treatment-plan/generate/stream",
                json={
                    "patientId": "patient_001",
                    "assessmentId": "assessment_001",
                    "createdBy": "therapist_001"
                }
            ) as response:
                assert response.status_code == 200
                content = b"".join(response.iter_content()).decode()
                assert "治疗" in content
                assert "计划" in content
    
    def test_generate_plan_invalid_request(self):
        """测试无效请求处理"""
        response = client.post(
            "/api/treatment-plan/generate",
            json={
                # 缺少必要字段
                "patientId": "patient_001"
            }
        )
        
        assert response.status_code == 422  # 验证错误
    
    def test_generate_plan_empty_request(self):
        """测试空请求处理"""
        response = client.post(
            "/api/treatment-plan/generate",
            json={}
        )
        
        assert response.status_code == 422


class TestEndToEndWorkflow:
    """端到端工作流测试"""
    
    @pytest.mark.asyncio
    async def test_complete_workflow(self):
        """测试完整的治疗计划生成工作流"""
        # 1. 模拟评估数据
        assessment_id = "assessment_001"
        patient_id = "patient_001"
        
        # 2. Mock LLM 响应
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = """
## 患者康复治疗计划

### 问题分析
- 肩部撞击综合征（中度）
- 头部前伸姿势（轻度）

### 康复目标
4周内改善肩部活动度，纠正头前伸姿势

### 训练计划
#### 第一周
- 热身：颈部环绕 5分钟
- 主要训练：肩部外展练习 20分钟
- 放松：颈部拉伸 5分钟

#### 第二周
- 增加肩部力量训练
- 继续保持颈部拉伸

### 注意事项
- 避免过度训练
- 如有疼痛立即停止
"""
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            # 3. 调用 API 生成治疗计划
            response = client.post(
                "/api/treatment-plan/generate",
                json={
                    "patientId": patient_id,
                    "assessmentId": assessment_id,
                    "createdBy": "therapist_001"
                }
            )
            
            # 4. 验证响应
            assert response.status_code == 200
            data = response.json()
            
            # 5. 验证数据结构
            assert data["patientId"] == patient_id
            assert data["assessmentId"] == assessment_id
            assert data["version"] == 1
            assert data["isCurrent"] == True
            assert "content" in data
            assert "createdAt" in data
            assert "updatedAt" in data
            
            # 6. 验证内容
            content = data["content"]
            assert "问题分析" in content
            assert "康复目标" in content
            assert "训练计划" in content
            assert "注意事项" in content
    
    @pytest.mark.asyncio
    async def test_streaming_workflow(self):
        """测试流式治疗计划生成工作流"""
        assessment_id = "assessment_002"
        patient_id = "patient_002"
        
        # 模拟流式响应
        chunks = ["## ", "治疗", "计划", "\n\n", "第一周", "训练"]
        
        async def mock_stream():
            for chunk in chunks:
                mock_chunk = Mock()
                mock_chunk.choices = [Mock()]
                mock_chunk.choices[0].delta.content = chunk
                yield mock_chunk
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())
            
            # 调用流式 API
            received_chunks = []
            with client.stream(
                "POST",
                "/api/treatment-plan/generate/stream",
                json={
                    "patientId": patient_id,
                    "assessmentId": assessment_id,
                    "createdBy": "therapist_001"
                }
            ) as response:
                assert response.status_code == 200
                
                for chunk in response.iter_content():
                    received_chunks.append(chunk.decode())
            
            # 验证接收到的数据
            full_content = "".join(received_chunks)
            assert "## 治疗计划" in full_content
            assert "第一周训练" in full_content


class TestErrorScenarios:
    """错误场景测试"""
    
    def test_api_timeout(self):
        """测试 API 超时处理"""
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(
                side_effect=TimeoutError("Request timeout")
            )
            
            response = client.post(
                "/api/treatment-plan/generate",
                json={
                    "patientId": "patient_001",
                    "assessmentId": "assessment_001",
                    "createdBy": "therapist_001"
                }
            )
            
            assert response.status_code == 500
    
    def test_invalid_assessment_id(self):
        """测试无效评估 ID"""
        # 即使评估 ID 无效，也应该返回模拟数据
        response = client.post(
            "/api/treatment-plan/generate",
            json={
                "patientId": "patient_001",
                "assessmentId": "invalid_id",
                "createdBy": "therapist_001"
            }
        )
        
        # 由于我们 mock 了 LLM，应该返回 200
        # 实际实现中可能需要根据评估 ID 验证
        assert response.status_code in [200, 404]
    
    def test_malformed_json_request(self):
        """测试格式错误的 JSON 请求"""
        response = client.post(
            "/api/treatment-plan/generate",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422


class TestPerformance:
    """性能测试"""
    
    def test_response_time(self):
        """测试响应时间"""
        import time
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "治疗计划内容"
        
        with patch('utils.treatment_plan_service.client') as mock_client:
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            start_time = time.time()
            response = client.post(
                "/api/treatment-plan/generate",
                json={
                    "patientId": "patient_001",
                    "assessmentId": "assessment_001",
                    "createdBy": "therapist_001"
                }
            )
            end_time = time.time()
            
            assert response.status_code == 200
            # 响应时间应该小于 5 秒（包括 mock 延迟）
            assert end_time - start_time < 5.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
