import json
import os
from datetime import datetime
from typing import Dict, List, Optional


class CaseManager:
    def __init__(self, config: Dict):
        self.cases_dir = config["cases_dir"]
        self.index_file = os.path.join(self.cases_dir, "index.json")
        self._ensure_directories()
        self._load_index()

    def _ensure_directories(self):
        if not os.path.exists(self.cases_dir):
            os.makedirs(self.cases_dir)

    def _load_index(self):
        if os.path.exists(self.index_file):
            with open(self.index_file, "r", encoding="utf-8") as f:
                self.index = json.load(f)
        else:
            self.index = {"cases": []}

    def _save_index(self):
        with open(self.index_file, "w", encoding="utf-8") as f:
            json.dump(self.index, f, ensure_ascii=False, indent=2)

    def _generate_case_id(self) -> str:
        today = datetime.now().strftime("%Y%m%d")
        existing_cases = [c for c in self.index["cases"] if c["case_id"].startswith(today)]
        count = len(existing_cases) + 1
        return f"{today}_{count:03d}"

    def _validate_case(self, case: Dict) -> tuple[bool, str]:
        required_fields = ["case_id", "patient_name", "gender", "age", "visit_date", "chief_complaint", "diagnosis", "treatment_plan"]
        
        for field in required_fields:
            if field not in case or not case[field]:
                return False, f"缺少必填字段: {field}"
        
        if case["gender"] not in ["男", "女"]:
            return False, "性别必须为'男'或'女'"
        
        if not isinstance(case["age"], int) or case["age"] < 0 or case["age"] > 120:
            return False, "年龄必须在0-120之间"
        
        try:
            datetime.strptime(case["visit_date"], "%Y-%m-%d")
        except ValueError:
            return False, "就诊日期格式错误，应为YYYY-MM-DD"
        
        if len(case["patient_name"]) < 2 or len(case["patient_name"]) > 20:
            return False, "患者姓名长度必须在2-20字符之间"
        
        return True, ""

    def save_case(self, case: Dict) -> tuple[bool, str]:
        is_valid, error = self._validate_case(case)
        if not is_valid:
            return False, error
        
        case_file = os.path.join(self.cases_dir, f"{case['case_id']}.json")
        
        with open(case_file, "w", encoding="utf-8") as f:
            json.dump(case, f, ensure_ascii=False, indent=2)
        
        case_entry = {
            "case_id": case["case_id"],
            "patient_name": case["patient_name"],
            "visit_date": case["visit_date"],
            "diagnosis": case["diagnosis"],
            "file_path": case_file
        }
        
        existing_index = next((i for i, c in enumerate(self.index["cases"]) if c["case_id"] == case["case_id"]), None)
        if existing_index is not None:
            self.index["cases"][existing_index] = case_entry
        else:
            self.index["cases"].append(case_entry)
        
        self._save_index()
        return True, case["case_id"]

    def load_case(self, case_id: str) -> Optional[Dict]:
        case_entry = next((c for c in self.index["cases"] if c["case_id"] == case_id), None)
        if not case_entry:
            return None
        
        if os.path.exists(case_entry["file_path"]):
            with open(case_entry["file_path"], "r", encoding="utf-8") as f:
                return json.load(f)
        return None

    def list_cases(self, limit: int = 100) -> List[Dict]:
        return sorted(self.index["cases"], key=lambda x: x["visit_date"], reverse=True)[:limit]

    def delete_case(self, case_id: str) -> bool:
        case_entry = next((c for c in self.index["cases"] if c["case_id"] == case_id), None)
        if not case_entry:
            return False
        
        if os.path.exists(case_entry["file_path"]):
            os.remove(case_entry["file_path"])
        
        self.index["cases"] = [c for c in self.index["cases"] if c["case_id"] != case_id]
        self._save_index()
        return True

    def create_new_case(self, patient_name: str, gender: str, age: int, visit_date: str = None) -> Dict:
        if visit_date is None:
            visit_date = datetime.now().strftime("%Y-%m-%d")
        
        return {
            "case_id": self._generate_case_id(),
            "patient_name": patient_name,
            "gender": gender,
            "age": age,
            "visit_date": visit_date,
            "chief_complaint": "",
            "present_illness": "",
            "past_history": "",
            "allergies": "",
            "physical_exam": "",
            "diagnosis": "",
            "treatment_plan": ""
        }
