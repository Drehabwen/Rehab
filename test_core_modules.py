import unittest
import json
import os
import sys
from unittest.mock import Mock, patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from case_structurer import CaseStructurer
from case_manager import CaseManager
from document_generator import DocumentGenerator


class TestCaseStructurer(unittest.TestCase):
    def setUp(self):
        self.structurer = CaseStructurer()

    def test_extract_fields_basic(self):
        transcript = """
        主诉：头痛3天
        现病史：患者3天前无明显诱因出现头痛
        既往史：高血压病史5年
        过敏史：青霉素过敏
        体格检查：T 36.5℃，BP 140/90mmHg
        诊断：高血压病
        治疗：继续降压治疗
        """
        result = self.structurer.structure(transcript)
        
        self.assertEqual(result["chief_complaint"], "头痛3天")
        self.assertIn("高血压", result["past_history"])
        self.assertIn("青霉素", result["allergies"])
        self.assertIn("36.5", result["physical_exam"])
        self.assertEqual(result["diagnosis"], "高血压病")

    def test_extract_gender(self):
        transcript = "患者为男性，45岁"
        result = self.structurer.structure(transcript)
        
        self.assertEqual(result["gender"], "男")
        self.assertEqual(result["age"], 45)

    def test_extract_gender_female(self):
        transcript = "女性患者，30岁"
        result = self.structurer.structure(transcript)
        
        self.assertEqual(result["gender"], "女")
        self.assertEqual(result["age"], 30)

    def test_extract_age_patterns(self):
        test_cases = [
            ("患者50岁", 50),
            ("患者50周岁", 50),
            ("年龄：45", 45),
            ("35岁男性", 35),
        ]
        
        for transcript, expected_age in test_cases:
            result = self.structurer.structure(transcript)
            self.assertEqual(result["age"], expected_age, f"Failed for: {transcript}")

    def test_structure_with_speakers(self):
        speaker_transcripts = [
            {"speaker": "A", "text": "你好，请问哪里不舒服？"},
            {"speaker": "B", "text": "我头痛，已经三天了。"},
            {"speaker": "A", "text": "诊断为上呼吸道感染。"},
        ]
        
        result = self.structurer.structure_with_speakers(speaker_transcripts)
        
        self.assertIn("头痛", result["chief_complaint"])
        self.assertIn("上呼吸道感染", result["diagnosis"])

    def test_empty_transcript(self):
        result = self.structurer.structure("")
        
        self.assertEqual(result["patient_name"], "")
        self.assertEqual(result["gender"], "")
        self.assertEqual(result["age"], 0)

    def test_update_field(self):
        base_case = {
            "patient_name": "",
            "gender": "",
            "age": 0,
            "chief_complaint": "",
            "present_illness": "",
            "past_history": "",
            "allergies": "",
            "physical_exam": "",
            "diagnosis": "",
            "treatment_plan": ""
        }
        
        updated = self.structurer.update_field(base_case, "diagnosis", "高血压病")
        self.assertEqual(updated["diagnosis"], "高血压病")

    def test_get_field_suggestions_gender(self):
        transcript = "患者为男性，有高血压病史"
        suggestions = self.structurer.get_field_suggestions(transcript, "gender")
        
        self.assertIn("男", suggestions)

    def test_get_field_suggestions_age(self):
        transcript = "患者45岁，有高血压病史"
        suggestions = self.structurer.get_field_suggestions(transcript, "age")
        
        self.assertIn(45, suggestions)


class TestCaseManager(unittest.TestCase):
    def setUp(self):
        self.test_config = {
            "hospital_name": "测试医院",
            "doctor_name": "测试医生",
            "cases_dir": "./test_cases",
            "exports_dir": "./test_exports"
        }
        self.case_manager = CaseManager(self.test_config)
        
        self.test_case = {
            "case_id": "20260125_001",
            "patient_name": "张三",
            "gender": "男",
            "age": 45,
            "visit_date": "2026-01-25",
            "chief_complaint": "头痛3天",
            "present_illness": "患者3天前无明显诱因出现头痛",
            "past_history": "高血压病史5年",
            "allergies": "青霉素过敏",
            "physical_exam": "T 36.5℃，BP 140/90mmHg",
            "diagnosis": "高血压病",
            "treatment_plan": "继续降压治疗"
        }

    def tearDown(self):
        import shutil
        if os.path.exists("./test_cases"):
            shutil.rmtree("./test_cases")
        if os.path.exists("./test_exports"):
            shutil.rmtree("./test_exports")

    def test_create_new_case(self):
        new_case = self.case_manager.create_new_case("李四", "女", 30)
        
        self.assertEqual(new_case["patient_name"], "李四")
        self.assertEqual(new_case["gender"], "女")
        self.assertEqual(new_case["age"], 30)
        self.assertIsNotNone(new_case["case_id"])
        self.assertIsNotNone(new_case["visit_date"])

    def test_save_case(self):
        success, result = self.case_manager.save_case(self.test_case)
        
        self.assertTrue(success)
        self.assertIn("成功", result)
        
        case_file = os.path.join("./test_cases", f"{self.test_case['case_id']}.json")
        self.assertTrue(os.path.exists(case_file))

    def test_load_case(self):
        self.case_manager.save_case(self.test_case)
        
        loaded_case = self.case_manager.load_case(self.test_case["case_id"])
        
        self.assertEqual(loaded_case["patient_name"], self.test_case["patient_name"])
        self.assertEqual(loaded_case["diagnosis"], self.test_case["diagnosis"])

    def test_delete_case(self):
        self.case_manager.save_case(self.test_case)
        
        success = self.case_manager.delete_case(self.test_case["case_id"])
        
        self.assertTrue(success)
        
        case_file = os.path.join("./test_cases", f"{self.test_case['case_id']}.json")
        self.assertFalse(os.path.exists(case_file))

    def test_list_cases(self):
        self.case_manager.save_case(self.test_case)
        
        cases = self.case_manager.list_cases()
        
        self.assertGreater(len(cases), 0)
        self.assertEqual(cases[0]["case_id"], self.test_case["case_id"])

    def test_search_cases(self):
        self.case_manager.save_case(self.test_case)
        
        cases = self.case_manager.list_cases()
        
        self.assertGreater(len(cases), 0)
        self.assertEqual(cases[0]["patient_name"], "张三")

    def test_validate_case_success(self):
        is_valid, message = self.case_manager._validate_case(self.test_case)
        
        self.assertTrue(is_valid)
        self.assertEqual(message, "")

    def test_validate_case_missing_field(self):
        invalid_case = self.test_case.copy()
        invalid_case["patient_name"] = ""
        
        is_valid, message = self.case_manager._validate_case(invalid_case)
        
        self.assertFalse(is_valid)
        self.assertIn("患者姓名", message)

    def test_validate_case_invalid_gender(self):
        invalid_case = self.test_case.copy()
        invalid_case["gender"] = "未知"
        
        is_valid, message = self.case_manager._validate_case(invalid_case)
        
        self.assertFalse(is_valid)
        self.assertIn("性别", message)

    def test_validate_case_invalid_age(self):
        invalid_case = self.test_case.copy()
        invalid_case["age"] = 150
        
        is_valid, message = self.case_manager._validate_case(invalid_case)
        
        self.assertFalse(is_valid)
        self.assertIn("年龄", message)


class TestDocumentGenerator(unittest.TestCase):
    def setUp(self):
        self.test_config = {
            "hospital_name": "测试医院",
            "doctor_name": "测试医生",
            "cases_dir": "./test_cases",
            "exports_dir": "./test_exports"
        }
        self.generator = DocumentGenerator(self.test_config)
        
        self.test_case = {
            "case_id": "20260125_001",
            "patient_name": "张三",
            "gender": "男",
            "age": 45,
            "visit_date": "2026-01-25",
            "chief_complaint": "头痛3天",
            "present_illness": "患者3天前无明显诱因出现头痛",
            "past_history": "高血压病史5年",
            "allergies": "青霉素过敏",
            "physical_exam": "T 36.5℃，BP 140/90mmHg",
            "diagnosis": "高血压病",
            "treatment_plan": "继续降压治疗"
        }

    def tearDown(self):
        import shutil
        if os.path.exists("./test_cases"):
            shutil.rmtree("./test_cases")
        if os.path.exists("./test_exports"):
            shutil.rmtree("./test_exports")

    def test_generate_word(self):
        filepath = self.generator.generate_word(self.test_case)
        
        self.assertTrue(os.path.exists(filepath))
        self.assertIn("20260125_001", filepath)
        self.assertIn("张三", filepath)

    def test_generate_word_content(self):
        filepath = self.generator.generate_word(self.test_case)
        
        from docx import Document
        doc = Document(filepath)
        
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        
        self.assertIn("张三", text)
        self.assertIn("头痛3天", text)
        self.assertIn("高血压病", text)
        self.assertIn("测试医院", text)

    def test_setup_document_styles(self):
        from docx import Document
        doc = Document()
        
        self.generator._setup_document_styles(doc)
        
        self.assertIsNotNone(doc.styles['Normal'].font.name)
        self.assertEqual(doc.styles['Normal'].font.size.pt, 12)

    def test_add_header(self):
        from docx import Document
        doc = Document()
        
        self.generator._add_header(doc)
        
        text = doc.paragraphs[0].text
        self.assertIn("测试医院", text)


class TestIntegration(unittest.TestCase):
    def setUp(self):
        self.test_config = {
            "hospital_name": "测试医院",
            "doctor_name": "测试医生",
            "cases_dir": "./test_cases",
            "exports_dir": "./test_exports"
        }
        self.case_manager = CaseManager(self.test_config)
        self.structurer = CaseStructurer()
        self.generator = DocumentGenerator(self.test_config)

    def tearDown(self):
        import shutil
        if os.path.exists("./test_cases"):
            shutil.rmtree("./test_cases")
        if os.path.exists("./test_exports"):
            shutil.rmtree("./test_exports")

    def test_full_workflow(self):
        transcript = """
        主诉：头痛3天
        现病史：患者3天前无明显诱因出现头痛，伴恶心
        既往史：高血压病史5年
        过敏史：青霉素过敏
        体格检查：T 36.5℃，BP 140/90mmHg
        诊断：高血压病
        治疗：继续降压治疗，监测血压
        """
        
        structured_case = self.structurer.structure(transcript)
        
        self.assertEqual(structured_case["chief_complaint"], "头痛3天")
        self.assertIn("高血压", structured_case["past_history"])
        self.assertIn("青霉素", structured_case["allergies"])
        self.assertEqual(structured_case["diagnosis"], "高血压病")
        
        success, result = self.case_manager.save_case(structured_case)
        self.assertTrue(success)
        
        filepath = self.generator.generate_word(structured_case)
        self.assertTrue(os.path.exists(filepath))
        
        from docx import Document
        doc = Document(filepath)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        
        self.assertIn("张三", text)
        self.assertIn("高血压病", text)
        self.assertIn("测试医院", text)

    def test_multiple_cases_workflow(self):
        cases = [
            {
                "patient_name": "张三", "gender": "男", "age": 45,
                "chief_complaint": "头痛3天", "diagnosis": "高血压病",
                "treatment_plan": "降压治疗"
            },
            {
                "patient_name": "李四", "gender": "女", "age": 30,
                "chief_complaint": "发热1天", "diagnosis": "上呼吸道感染",
                "treatment_plan": "抗感染治疗"
            }
        ]
        
        saved_cases = []
        for case_data in cases:
            new_case = self.case_manager.create_new_case(
                case_data["patient_name"],
                case_data["gender"],
                case_data["age"]
            )
            new_case.update(case_data)
            success, _ = self.case_manager.save_case(new_case)
            if success:
                saved_cases.append(new_case)
        
        self.assertEqual(len(saved_cases), 2)
        
        all_cases = self.case_manager.list_cases()
        self.assertEqual(len(all_cases), 2)
        
        for case in saved_cases:
            filepath = self.generator.generate_word(case)
            self.assertTrue(os.path.exists(filepath))


def run_tests():
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    suite.addTests(loader.loadTestsFromTestCase(TestCaseStructurer))
    suite.addTests(loader.loadTestsFromTestCase(TestCaseManager))
    suite.addTests(loader.loadTestsFromTestCase(TestDocumentGenerator))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "="*70)
    print("测试结果汇总")
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
