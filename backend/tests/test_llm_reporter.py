import pytest
from unittest.mock import Mock, patch, MagicMock
from utils.llm_reporter import PostureAgent, posture_agent, generate_posture_report, extract_html


class TestPostureAgent:
    
    def test_posture_agent_init(self):
        agent = PostureAgent()
        assert agent.observations == []
    
    def test_posture_agent_clear(self):
        agent = PostureAgent()
        agent.observations = [{"narration": "test", "stats": {}}]
        agent.clear()
        assert agent.observations == []
    
    def test_analyze_view_single(self):
        agent = PostureAgent()
        narration = "评估视角: front\n- Nose: 平均位置(0.1234, 0.5678, 0.9012), 稳定性(标准差 X:0.0123, Y:0.0234), 移动趋势(斜率 X:0.000123)"
        stats = {"nose": {"mean": {"x": 0.1234, "y": 0.5678, "z": 0.9012}, "std": {"x": 0.0123, "y": 0.0234, "z": 0.0345}, "trend": {"x": 0.000123, "y": 0.000234, "z": 0.000345}}}
        
        result = agent.analyze_view(narration, stats)
        
        assert len(agent.observations) == 1
        assert agent.observations[0]["narration"] == narration
        assert agent.observations[0]["stats"] == stats
        assert "已记录视角数据" in result
        assert "当前累计视角数: 1" in result
    
    def test_analyze_view_multiple(self):
        agent = PostureAgent()
        narration1 = "评估视角: front\n- Nose: test"
        stats1 = {"nose": {"mean": {"x": 0.1, "y": 0.2, "z": 0.3}, "std": {"x": 0.01, "y": 0.02, "z": 0.03}, "trend": {"x": 0.001, "y": 0.002, "z": 0.003}}}
        narration2 = "评估视角: side\n- Left Shoulder: test"
        stats2 = {"left_shoulder": {"mean": {"x": 0.4, "y": 0.5, "z": 0.6}, "std": {"x": 0.04, "y": 0.05, "z": 0.06}, "trend": {"x": 0.004, "y": 0.005, "z": 0.006}}}
        
        agent.analyze_view(narration1, stats1)
        agent.analyze_view(narration2, stats2)
        
        assert len(agent.observations) == 2
        assert agent.observations[0]["narration"] == narration1
        assert agent.observations[1]["narration"] == narration2
    
    @patch('utils.llm_reporter.client')
    def test_generate_final_report_with_client(self, mock_client):
        agent = PostureAgent()
        agent.observations = [
            {
                "narration": "评估视角: front\n- Nose: 平均位置(0.1234, 0.5678, 0.9012), 稳定性(标准差 X:0.0123, Y:0.0234), 移动趋势(斜率 X:0.000123)",
                "stats": {"nose": {"mean": {"x": 0.1234, "y": 0.5678, "z": 0.9012}, "std": {"x": 0.0123, "y": 0.0234, "z": 0.0345}, "trend": {"x": 0.000123, "y": 0.000234, "z": 0.000345}}}
            }
        ]
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "```html\n<div class='test'>Test Report</div>\n```"
        mock_client.chat.completions.create.return_value = mock_response
        
        result = agent.generate_final_report()
        
        assert "<div class='test'>Test Report</div>" in result
        mock_client.chat.completions.create.assert_called_once()
    
    @patch('utils.llm_reporter.client', None)
    def test_generate_final_report_no_client(self):
        agent = PostureAgent()
        result = agent.generate_final_report()
        assert result == "Deepseek API key not found."
    
    @patch('utils.llm_reporter.client')
    def test_generate_final_report_with_error(self, mock_client):
        agent = PostureAgent()
        agent.observations = [{"narration": "test", "stats": {}}]
        
        mock_client.chat.completions.create.side_effect = Exception("API Error")
        
        result = agent.generate_final_report()
        
        assert "生成报告失败" in result
        assert "API Error" in result
    
    @patch('utils.llm_reporter.client')
    def test_generate_final_report_html_extraction(self, mock_client):
        agent = PostureAgent()
        agent.observations = [{"narration": "test", "stats": {}}]
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "```html\n<div class='warning'>⚠️ 本报告由 AI 生成，仅供参考</div>\n```"
        mock_client.chat.completions.create.return_value = mock_response
        
        result = agent.generate_final_report()
        
        assert "<div class='warning'>⚠️ 本报告由 AI 生成，仅供参考</div>" in result
        assert "```html" not in result
    
    @patch('utils.llm_reporter.client')
    def test_generate_final_report_multi_view(self, mock_client):
        agent = PostureAgent()
        agent.observations = [
            {"narration": "评估视角: front\n- Nose: test", "stats": {"nose": {"mean": {"x": 0.1, "y": 0.2, "z": 0.3}, "std": {"x": 0.01, "y": 0.02, "z": 0.03}, "trend": {"x": 0.001, "y": 0.002, "z": 0.003}}}},
            {"narration": "评估视角: side\n- Left Shoulder: test", "stats": {"left_shoulder": {"mean": {"x": 0.4, "y": 0.5, "z": 0.6}, "std": {"x": 0.04, "y": 0.05, "z": 0.06}, "trend": {"x": 0.004, "y": 0.005, "z": 0.006}}}},
            {"narration": "评估视角: back\n- Right Shoulder: test", "stats": {"right_shoulder": {"mean": {"x": 0.7, "y": 0.8, "z": 0.9}, "std": {"x": 0.07, "y": 0.08, "z": 0.09}, "trend": {"x": 0.007, "y": 0.008, "z": 0.009}}}}
        ]
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "```html\n<div>Multi-view Report</div>\n```"
        mock_client.chat.completions.create.return_value = mock_response
        
        result = agent.generate_final_report()
        
        call_args = mock_client.chat.completions.create.call_args
        prompt = call_args[1]["messages"][1]["content"]
        assert "--- 视角 1 数据 ---" in prompt
        assert "--- 视角 2 数据 ---" in prompt
        assert "--- 视角 3 数据 ---" in prompt


class TestExtractHtml:
    
    def test_extract_html_with_html_block(self):
        text = "```html\n<div class='test'>Content</div>\n```"
        result = extract_html(text)
        assert result == "<div class='test'>Content</div>"
    
    def test_extract_html_with_generic_block(self):
        text = "```\n<div class='test'>Content</div>\n```"
        result = extract_html(text)
        assert result == "<div class='test'>Content</div>"
    
    def test_extract_html_no_block(self):
        text = "<div class='test'>Content</div>"
        result = extract_html(text)
        assert result == "<div class='test'>Content</div>"
    
    def test_extract_html_multiple_blocks(self):
        text = "```html\n<div class='first'>First</div>\n```\nSome text\n```html\n<div class='second'>Second</div>\n```"
        result = extract_html(text)
        assert result == "<div class='first'>First</div>"
    
    def test_extract_html_plain_text(self):
        text = "Just some plain text"
        result = extract_html(text)
        assert result == "Just some plain text"
    
    def test_extract_html_case_insensitive(self):
        text = "```HTML\n<div class='test'>Content</div>\n```"
        result = extract_html(text)
        assert result == "<div class='test'>Content</div>"
    
    def test_extract_html_with_extra_whitespace(self):
        text = "```html  \n  <div class='test'>Content</div>  \n  ```"
        result = extract_html(text)
        assert result == "<div class='test'>Content</div>"
    
    def test_extract_html_generic_without_html(self):
        text = "```\nJust text, no HTML\n```"
        result = extract_html(text)
        assert result == "```\nJust text, no HTML\n```"


class TestGeneratePostureReport:
    
    @patch('utils.llm_reporter.posture_agent')
    def test_generate_posture_report_new_flow(self, mock_agent):
        analysis_data = {
            "frames": [
                {
                    "view": "front",
                    "timeSeriesLandmarks": [
                        [{"x": 0.5, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
                        for _ in range(30)
                    ]
                }
            ]
        }
        
        mock_agent.generate_final_report.return_value = "<div>Report</div>"
        
        result = generate_posture_report(analysis_data)
        
        mock_agent.clear.assert_called_once()
        mock_agent.generate_final_report.assert_called_once()
        assert result == "<div>Report</div>"
    
    @patch('utils.llm_reporter.posture_agent')
    def test_generate_posture_report_old_flow(self, mock_agent):
        analysis_data = {
            "narration": "评估视角: front\n- Nose: test",
            "stats": {"nose": {"mean": {"x": 0.1, "y": 0.2, "z": 0.3}, "std": {"x": 0.01, "y": 0.02, "z": 0.03}, "trend": {"x": 0.001, "y": 0.002, "z": 0.003}}}
        }
        
        mock_agent.generate_final_report.return_value = "<div>Report</div>"
        
        result = generate_posture_report(analysis_data)
        
        mock_agent.clear.assert_called_once()
        mock_agent.analyze_view.assert_called_once_with(analysis_data["narration"], analysis_data["stats"])
        mock_agent.generate_final_report.assert_called_once()
        assert result == "<div>Report</div>"
    
    @patch('utils.llm_reporter.posture_agent')
    def test_generate_posture_report_multi_view_new_flow(self, mock_agent):
        analysis_data = {
            "frames": [
                {
                    "view": "front",
                    "timeSeriesLandmarks": [
                        [{"x": 0.5, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
                        for _ in range(30)
                    ]
                },
                {
                    "view": "side",
                    "timeSeriesLandmarks": [
                        [{"x": 0.5, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
                        for _ in range(30)
                    ]
                }
            ]
        }
        
        mock_agent.generate_final_report.return_value = "<div>Multi-view Report</div>"
        
        result = generate_posture_report(analysis_data)
        
        mock_agent.clear.assert_called_once()
        assert mock_agent.analyze_view.call_count == 2
        mock_agent.generate_final_report.assert_called_once()
        assert result == "<div>Multi-view Report</div>"
    
    @patch('utils.llm_reporter.posture_agent')
    def test_generate_posture_report_empty_frames(self, mock_agent):
        analysis_data = {
            "frames": []
        }
        
        mock_agent.generate_final_report.return_value = "<div>Empty Report</div>"
        
        result = generate_posture_report(analysis_data)
        
        mock_agent.clear.assert_called_once()
        mock_agent.analyze_view.assert_not_called()
        mock_agent.generate_final_report.assert_called_once()
        assert result == "<div>Empty Report</div>"


class TestGlobalPostureAgent:
    
    @patch('utils.llm_reporter.posture_agent')
    def test_global_instance_exists(self, mock_agent):
        from utils.llm_reporter import posture_agent as agent
        assert agent is not None
