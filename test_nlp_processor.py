import unittest
import json
import os
import sys
from unittest.mock import Mock, patch, MagicMock, call

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from nlp_processor import NLPProcessor, SparkLLM


class TestSparkLLM(unittest.TestCase):
    def setUp(self):
        self.spark = SparkLLM(
            appid="test_appid",
            api_key="test_api_key",
            api_secret="test_api_secret",
            url="wss://test.spark-api.com/v1.1/chat",
            domain="lite"
        )

    def test_create_url(self):
        url = self.spark._create_url()
        
        self.assertIn("wss://test.spark-api.com/v1.1/chat", url)
        self.assertIn("authorization", url)
        self.assertIn("date", url)
        self.assertIn("host", url)

    def test_gen_params(self):
        query = "测试查询"
        params = self.spark._gen_params(query)
        
        self.assertEqual(params["header"]["app_id"], "test_appid")
        self.assertEqual(params["parameter"]["chat"]["domain"], "lite")
        self.assertEqual(len(params["payload"]["message"]["text"]), 1)
        self.assertEqual(params["payload"]["message"]["text"][0]["content"], query)

    @patch('nlp_processor.websocket.WebSocketApp')
    def test_chat_success(self, mock_websocket):
        mock_ws = MagicMock()
        mock_websocket.run_forever.return_value = None
        mock_websocket.return_value = mock_ws
        
        def on_open_side_effect(ws):
            pass
        
        def on_message_side_effect(ws, message):
            data = json.loads(message)
            if data.get("header", {}).get("code") == 0:
                response = {
                    "header": {"code": 0, "message": "success"},
                    "payload": {
                        "choices": {
                            "status": 2,
                            "text": [{"content": "测试响应"}]
                        }
                    }
                }
                ws.on_message(json.dumps(response))
        
        mock_ws.on_open = on_open_side_effect
        mock_ws.on_message = on_message_side_effect
        mock_websocket.return_value = mock_ws
        
        result = self.spark.chat("测试查询")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["content"], "测试响应")

    @patch('nlp_processor.websocket.WebSocketApp')
    def test_chat_error(self, mock_websocket):
        mock_ws = MagicMock()
        mock_ws.run_forever.return_value = None
        mock_websocket.return_value = mock_ws
        
        def on_open_side_effect(ws):
            pass
        
        def on_message_side_effect(ws, message):
            response = {
                "header": {"code": 1, "message": "error"},
                "payload": {"choices": {"status": 2, "text": [{"content": ""}]}}
            }
            ws.on_message(json.dumps(response))
        
        mock_ws.on_open = on_open_side_effect
        mock_ws.on_message = on_message_side_effect
        mock_websocket.return_value = mock_ws
        
        result = self.spark.chat("测试查询")
        
        self.assertFalse(result["success"])
        self.assertIsNotNone(result["error"])


class TestNLPProcessor(unittest.TestCase):
    def setUp(self):
        self.processor = NLPProcessor()

    @patch('nlp_processor.websocket.WebSocketApp')
    def test_separate_speakers_success(self, mock_websocket):
        mock_ws = MagicMock()
        mock_ws.run_forever.return_value = None
        mock_websocket.return_value = mock_ws
        
        test_transcript = "医生：你好，请问哪里不舒服？患者：我头痛，已经三天了。医生：有没有发热？"
        
        expected_response = [
            {"speaker": "医生", "text": "你好，请问哪里不舒服？"},
            {"speaker": "患者", "text": "我头痛，已经三天了。"},
            {"speaker": "医生", "text": "有没有发热？"}
        ]
        
        def on_open_side_effect(ws):
            pass
        
        def on_message_side_effect(ws, message):
            data = json.loads(message)
            if data.get("header", {}).get("code") == 0:
                response = {
                    "header": {"code": 0, "message": "success"},
                    "payload": {
                        "choices": {
                            "status": 2,
                            "text": [{"content": json.dumps(expected_response, ensure_ascii=False)}]
                        }
                    }
                }
                ws.on_message(json.dumps(response))
        
        mock_ws.on_open = on_open_side_effect
        mock_ws.on_message = on_message_side_effect
        mock_websocket.return_value = mock_ws
        
        result = self.processor.separate_speakers(test_transcript)
        
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0]["speaker"], "医生")
        self.assertEqual(result[1]["speaker"], "患者")

    @patch('nlp_processor.websocket.WebSocketApp')
    def test_separate_speakers_error(self, mock_websocket):
        mock_ws = MagicMock()
        mock_ws.run_forever.return_value = None
        mock_websocket.return_value = mock_ws
        
        def on_open_side_effect(ws):
            pass
        
        def on_message_side_effect(ws, message):
            response = {
                "header": {"code": 1, "message": "error"},
                "payload": {"choices": {"status": 2, "text": [{"content": ""}]}}
            }
            ws.on_message(json.dumps(response))
        
        mock_ws.on_open = on_open_side_effect
        mock_ws.on_message = on_message_side_effect
        mock_websocket.return_value = mock_ws
        
        result = self.processor.separate_speakers("测试")
        
        self.assertEqual(len(result), 0)

    @patch('nlp_processor.websocket.WebSocketApp')
    def test_structure_case_success(self, mock_websocket):
        mock_ws = MagicMock()
        mock_ws.run_forever.return_value = None
        mock_websocket.return_value = mock_ws
        
        speaker_dialogues = [
            {"speaker": "医生", "text": "你好，请问哪里不舒服？"},
            {"speaker": "患者", "text": "我头痛，已经三天了。"}
        ]
        
        expected_case = {
            "patient_name": "张三",
            "gender": "男",
            "age": 45,
            "chief_complaint": "头痛3天",
            "present_illness": "患者3天前无明显诱因出现头痛",
            "past_history": "",
            "allergies": "",
            "physical_exam": "",
            "diagnosis": "头痛",
            "treatment_plan": ""
        }
        
        def on_open_side_effect(ws):
            pass
        
        def on_message_side_effect(ws, message):
            data = json.loads(message)
            if data.get("header", {}).get("code") == 0:
                response = {
                    "header": {"code": 0, "message": "success"},
                    "payload": {
                        "choices": {
                            "status": 2,
                            "text": [{"content": json.dumps(expected_case, ensure_ascii=False)}]
                        }
                    }
                }
                ws.on_message(json.dumps(response))
        
        mock_ws.on_open = on_open_side_effect
        mock_ws.on_message = on_message_side_effect
        mock_websocket.return_value = mock_ws
        
        result = self.processor.structure_case(speaker_dialogues)
        
        self.assertIn("patient_name", result)
        self.assertIn("chief_complaint", result)
        self.assertIn("diagnosis", result)

    @patch('nlp_processor.websocket.WebSocketApp')
    def test_structure_case_error(self, mock_websocket):
        mock_ws = MagicMock()
        mock_ws.run_forever.return_value = None
        mock_websocket.return_value = mock_ws
        
        def on_open_side_effect(ws):
            pass
        
        def on_message_side_effect(ws, message):
            response = {
                "header": {"code": 1, "message": "error"},
                "payload": {"choices": {"status": 2, "text": [{"content": ""}]}}
            }
            ws.on_message(json.dumps(response))
        
        mock_ws.on_open = on_open_side_effect
        mock_ws.on_message = on_message_side_effect
        mock_websocket.return_value = mock_ws
        
        result = self.processor.structure_case([])
        
        self.assertEqual(result, {})

    @patch('nlp_processor.websocket.WebSocketApp')
    def test_process_transcript_full(self, mock_websocket):
        mock_ws = MagicMock()
        mock_ws.run_forever.return_value = None
        mock_websocket.return_value = mock_ws
        
        test_transcript = "医生：你好，请问哪里不舒服？患者：我头痛，已经三天了。"
        
        speaker_dialogues = [
            {"speaker": "医生", "text": "你好，请问哪里不舒服？"},
            {"speaker": "患者", "text": "我头痛，已经三天了。"}
        ]
        
        case_data = {
            "patient_name": "",
            "gender": "",
            "age": 0,
            "chief_complaint": "头痛3天",
            "present_illness": "",
            "past_history": "",
            "allergies": "",
            "physical_exam": "",
            "diagnosis": "头痛",
            "treatment_plan": ""
        }
        
        call_count = [0]
        
        def on_open_side_effect(ws):
            pass
        
        def on_message_side_effect(ws, message):
            call_count[0] += 1
            if call_count[0] == 1:
                response = {
                    "header": {"code": 0, "message": "success"},
                    "payload": {
                        "choices": {
                            "status": 2,
                            "text": [{"content": json.dumps(speaker_dialogues, ensure_ascii=False)}]
                        }
                    }
                }
            else:
                response = {
                    "header": {"code": 0, "message": "success"},
                    "payload": {
                        "choices": {
                            "status": 2,
                            "text": [{"content": json.dumps(case_data, ensure_ascii=False)}]
                        }
                    }
                }
            ws.on_message(json.dumps(response))
        
        mock_ws.on_open = on_open_side_effect
        mock_ws.on_message = on_message_side_effect
        mock_websocket.return_value = mock_ws
        
        result = self.processor.process_transcript(test_transcript)
        
        self.assertIn("speaker_dialogues", result)
        self.assertIn("case", result)
        self.assertEqual(len(result["speaker_dialogues"]), 2)
        self.assertEqual(result["case"]["diagnosis"], "头痛")

    @patch('nlp_processor.websocket.WebSocketApp')
    def test_generate_medical_record(self, mock_websocket):
        mock_ws = MagicMock()
        mock_ws.run_forever.return_value = None
        mock_websocket.return_value = mock_ws
        
        case_data = {
            "patient_name": "张三",
            "gender": "男",
            "age": 45,
            "chief_complaint": "头痛3天",
            "present_illness": "患者3天前无明显诱因出现头痛",
            "past_history": "高血压病史5年",
            "allergies": "青霉素过敏",
            "physical_exam": "T 36.5℃，BP 140/90mmHg",
            "diagnosis": "高血压病",
            "treatment_plan": "继续降压治疗"
        }
        
        config = {
            "hospital_name": "测试医院",
            "doctor_name": "测试医生"
        }
        
        expected_record = """一般情况
姓名：张三
性别：男
年龄：45岁

主诉
头痛3天

现病史
患者3天前无明显诱因出现头痛

既往史
高血压病史5年

过敏史
青霉素过敏

体格检查
T 36.5℃，BP 140/90mmHg

诊断
高血压病

治疗建议
继续降压治疗"""
        
        def on_open_side_effect(ws):
            pass
        
        def on_message_side_effect(ws, message):
            data = json.loads(message)
            if data.get("header", {}).get("code") == 0:
                response = {
                    "header": {"code": 0, "message": "success"},
                    "payload": {
                        "choices": {
                            "status": 2,
                            "text": [{"content": expected_record}]
                        }
                    }
                }
                ws.on_message(json.dumps(response))
        
        mock_ws.on_open = on_open_side_effect
        mock_ws.on_message = on_message_side_effect
        mock_websocket.return_value = mock_ws
        
        result = self.processor.generate_medical_record(case_data, config)
        
        self.assertIn("张三", result)
        self.assertIn("头痛3天", result)
        self.assertIn("高血压病", result)
        self.assertIn("测试医院", result)

    def test_format_speaker_dialogues(self):
        speaker_dialogues = [
            {"speaker": "医生", "text": "你好，请问哪里不舒服？"},
            {"speaker": "患者", "text": "我头痛，已经三天了。"}
        ]
        
        formatted = self.processor.format_speaker_dialogues(speaker_dialogues)
        
        self.assertIn("医生：你好，请问哪里不舒服？", formatted)
        self.assertIn("患者：我头痛，已经三天了。", formatted)

    def test_format_speaker_dialogues_empty(self):
        formatted = self.processor.format_speaker_dialogues([])
        
        self.assertEqual(formatted, "")

    @patch('nlp_processor.websocket.WebSocketApp')
    def test_json_parsing_with_code_blocks(self, mock_websocket):
        mock_ws = MagicMock()
        mock_ws.run_forever.return_value = None
        mock_websocket.return_value = mock_ws
        
        test_transcript = "医生：你好"
        
        expected_response = [
            {"speaker": "医生", "text": "你好"}
        ]
        
        json_with_code_blocks = f"```json\n{json.dumps(expected_response, ensure_ascii=False)}\n```"
        
        def on_open_side_effect(ws):
            pass
        
        def on_message_side_effect(ws, message):
            data = json.loads(message)
            if data.get("header", {}).get("code") == 0:
                response = {
                    "header": {"code": 0, "message": "success"},
                    "payload": {
                        "choices": {
                            "status": 2,
                            "text": [{"content": json_with_code_blocks}]
                        }
                    }
                }
                ws.on_message(json.dumps(response))
        
        mock_ws.on_open = on_open_side_effect
        mock_ws.on_message = on_message_side_effect
        mock_websocket.return_value = mock_ws
        
        result = self.processor.separate_speakers(test_transcript)
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["speaker"], "医生")


def run_tests():
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    suite.addTests(loader.loadTestsFromTestCase(TestSparkLLM))
    suite.addTests(loader.loadTestsFromTestCase(TestNLPProcessor))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "="*70)
    print("NLP处理测试结果汇总")
    print("="*70)
    print(f"运行测试: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    print("="*70)
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
