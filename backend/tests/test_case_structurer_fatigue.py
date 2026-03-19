import os
import sys

import importlib.util

# Add both Rehab-V3.1 and MedVoice-AI to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MEDVOICE_DIR = os.path.join(PROJECT_ROOT, "Deeprehab-MedVoice-AI--")
CASE_STRUCTURER_PATH = os.path.join(MEDVOICE_DIR, "src", "core", "case_structurer.py")

spec = importlib.util.spec_from_file_location("case_structurer", CASE_STRUCTURER_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
CaseStructurer = module.CaseStructurer

class MockNLP:
    def chat(self, prompt):
        return {"success": True, "content": "```json\n{\"analyzed_dialogue\": [], \"fatigue_report\": {}}\n```", "prompt": prompt}

def test_fatigue_prompt_vision_data():
    nlp = MockNLP()
    structurer = CaseStructurer(nlp)
    
    vision_data = {
        "metrics": {
            "jitterIndex": 0.045,
            "stabilityScore": 0.65
        }
    }
    
    # We need to capture the prompt. Since CaseStructurer calls self.nlp.model_pro.chat,
    # let's mock model_pro.
    class MockModelPro:
        def chat(self, prompt):
            self.last_prompt = prompt
            return {"success": True, "content": "{\"analyzed_dialogue\": [], \"fatigue_report\": {}}"}
            
    structurer.nlp.model_pro = MockModelPro()
    
    structurer.analyze_and_structure("I feel very tired", vision3_data=vision_data, mode="fatigue")
    
    prompt = structurer.nlp.model_pro.last_prompt
    print("Prompt Check:")
    assert "抖动指数 (Jitter Index): 0.045" in prompt
    assert "稳定性得分 (Stability Score): 0.65" in prompt
    print("CaseStructurer fatigue prompt check passed!")

if __name__ == "__main__":
    try:
        test_fatigue_prompt_vision_data()
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
