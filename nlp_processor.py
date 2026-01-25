import json
import base64
import hashlib
import hmac
import threading
import websocket
import time
from urllib.parse import urlencode
from wsgiref.handlers import format_date_time
from time import mktime
from urllib.parse import urlparse
import ssl

SPARK_APPID = "cb5e1215"
SPARK_API_KEY = "106669286a50560d9b221790c456e331"
SPARK_API_SECRET = "YWU4NDQ2N2QxYjlkMzEwZjYxODU5YzVi"
SPARK_URL = "wss://spark-api.xf-yun.com/v1.1/chat"
SPARK_DOMAIN = "lite"


class SparkLLM:
    def __init__(self, appid, api_key, api_secret, url, domain):
        self.appid = appid
        self.api_key = api_key
        self.api_secret = api_secret
        self.url = url
        self.domain = domain
        
    def _create_url(self):
        host = urlparse(self.url).netloc
        path = urlparse(self.url).path
        # 使用 UTC 时间
        date = format_date_time(time.time())
        
        signature_origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"
        signature_sha = hmac.new(self.api_secret.encode('utf-8'), 
                                signature_origin.encode('utf-8'), 
                                digestmod=hashlib.sha256).digest()
        signature_sha_base64 = base64.b64encode(signature_sha).decode(encoding='utf-8')
        
        authorization_origin = f'api_key="{self.api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature_sha_base64}"'
        authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode(encoding='utf-8')
        
        v = {"authorization": authorization, "date": date, "host": host}
        return self.url + '?' + urlencode(v)
    
    def _gen_params(self, query):
        data = {
            "header": {
                "app_id": self.appid,
                "uid": "1234"
            },
            "parameter": {
                "chat": {
                    "domain": self.domain,
                    "temperature": 0.5,
                    "max_tokens": 4096,
                    "auditing": "default"
                }
            },
            "payload": {
                "message": {
                    "text": [{"role": "user", "content": query}]
                }
            }
        }
        return data
    
    def chat(self, query):
        result = {"content": "", "success": False, "error": None}
        
        def on_message(ws, message):
            data = json.loads(message)
            code = data['header']['code']
            if code != 0:
                result["error"] = f'请求错误: {code}, {data}'
                ws.close()
            else:
                choices = data["payload"]["choices"]
                status = choices["status"]
                content = choices["text"][0]["content"]
                result["content"] += content
                if status == 2:
                    result["success"] = True
                    ws.close()
        
        def on_error(ws, error):
            result["error"] = str(error)
            ws.close()
        
        def on_close(ws, close_status_code, close_msg):
            pass
        
        def on_open(ws):
            data = json.dumps(self._gen_params(query))
            ws.send(data)
        
        ws_url = self._create_url()
        ws = websocket.WebSocketApp(ws_url, on_message=on_message, on_error=on_error, 
                                   on_close=on_close, on_open=on_open)
        ws.run_forever(sslopt={"cert_reqs": ssl.CERT_REQUIRED})
        
        return result


class NLPProcessor:
    def __init__(self):
        self.spark = SparkLLM(SPARK_APPID, SPARK_API_KEY, SPARK_API_SECRET, SPARK_URL, SPARK_DOMAIN)
    
    def separate_speakers(self, transcript):
        prompt = f"""你是一个医疗对话分析专家。请分析以下医患对话，区分医生和患者说的话，并输出为结构化JSON格式。

要求：
1. 识别每句话是医生说的还是患者说的
2. 将同一人的连续话语合并
3. 输出为JSON数组，每个元素包含speaker（"医生"或"患者"）和text字段

对话内容：
{transcript}

请直接输出JSON，不要有任何其他说明文字。格式如下：
[
    {{"speaker": "医生", "text": "你好，请问哪里不舒服？"}},
    {{"speaker": "患者", "text": "我头痛，已经三天了"}},
    {{"speaker": "医生", "text": "有没有发热？"}}
]"""
        
        result = self.spark.chat(prompt)
        if result["success"]:
            try:
                json_str = result["content"].strip()
                if json_str.startswith("```json"):
                    json_str = json_str[7:]
                if json_str.startswith("```"):
                    json_str = json_str[3:]
                if json_str.endswith("```"):
                    json_str = json_str[:-3]
                json_str = json_str.strip()
                
                speaker_dialogues = json.loads(json_str)
                return speaker_dialogues
            except json.JSONDecodeError as e:
                print(f"解析JSON失败: {e}")
                print(f"原始内容: {result['content']}")
                return []
        else:
            print(f"调用星火API失败: {result['error']}")
            return []
    
    def structure_case(self, speaker_dialogues):
        prompt = f"""你是一位资深的医疗病历书写专家，具有丰富的临床经验。请根据以下医患对话，提取并改写为符合医学文书规范的标准化病例信息。

【重要要求】
1. 专业术语准确性：确保所有医疗术语准确无误，如"上呼吸道感染"、"高血压病"等
2. 医学文书规范：将口语化表达转换为正式的医学文书语言
3. 信息完整性：不遗漏任何关键医疗信息，包括症状、体征、检查结果等
4. 过滤无关信息：彻底删除与病情诊断、治疗方案无关的寒暄、客套话
5. 时间顺序：现病史应按时间顺序描述，体现疾病发展过程
6. 量化描述：尽可能使用量化指标，如"体温38.5℃"、"血压140/90mmHg"

【对话内容】
{json.dumps(speaker_dialogues, ensure_ascii=False, indent=2)}

【字段提取与改写要求】

1. patient_name（患者姓名）：提取患者姓名，如未提及则为空字符串

2. gender（性别）："男"或"女"，根据对话判断，无法确定则为空字符串

3. age（年龄）：整数，提取患者年龄，无法确定则为0

4. chief_complaint（主诉）：
   - 提取患者就诊的主要原因
   - 格式：症状+持续时间，如"发热3天"、"头痛伴恶心2天"
   - 使用专业术语，如"发热"而非"发烧"

5. present_illness（现病史）：
   - 按时间顺序描述疾病的发生、发展、演变过程
   - 包括起病情况、主要症状特点、伴随症状、诊治经过等
   - 改写示例：
     * 口语："我昨天开始发烧，有点咳嗽，吃了点药也没好"
     * 医学文书："患者1天前无明显诱因出现发热，体温最高达38.5℃，伴咳嗽，自服退热药物后症状未缓解"

6. past_history（既往史）：
   - 既往疾病史、手术史、外伤史等
   - 如"高血压病史5年"、"2年前行阑尾切除术"

7. allergies（过敏史）：
   - 药物过敏史、食物过敏史等
   - 明确过敏物质及反应，如"青霉素过敏（皮疹）"

8. physical_exam（体格检查）：
   - 生命体征（体温、脉搏、呼吸、血压）
   - 各系统检查阳性体征
   - 使用标准检查术语和量化指标

9. diagnosis（诊断）：
   - 明确的诊断名称，使用ICD标准术语
   - 如"上呼吸道感染"、"高血压病（2级，中危组）"

10. treatment_plan（治疗建议）：
    - 具体的治疗方案，包括药物治疗、非药物治疗等
    - 药物应注明用法用量，如"阿莫西林0.5g，每日3次，口服"
    - 包括注意事项和随访建议

【输出格式】
请直接输出JSON，不要有任何其他说明文字。格式如下：
{{
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
}}"""
        
        result = self.spark.chat(prompt)
        if result["success"]:
            try:
                json_str = result["content"].strip()
                if json_str.startswith("```json"):
                    json_str = json_str[7:]
                if json_str.startswith("```"):
                    json_str = json_str[3:]
                if json_str.endswith("```"):
                    json_str = json_str[:-3]
                json_str = json_str.strip()
                
                case_data = json.loads(json_str)
                return case_data
            except json.JSONDecodeError as e:
                print(f"解析JSON失败: {e}")
                print(f"原始内容: {result['content']}")
                return {}
        else:
            print(f"调用星火API失败: {result['error']}")
            return {}
    
    def process_transcript(self, transcript):
        speaker_dialogues = self.separate_speakers(transcript)
        if not speaker_dialogues:
            return {"speaker_dialogues": [], "case": {}}
        
        case_data = self.structure_case(speaker_dialogues)
        
        return {
            "speaker_dialogues": speaker_dialogues,
            "case": case_data
        }
    
    def generate_medical_record(self, case_data, config):
        prompt = f"""你是一位资深的医疗病历书写专家。请根据以下病例信息，生成一份符合医学文书规范的完整病历。

【病例信息】
患者姓名：{case_data.get('patient_name', '')}
性别：{case_data.get('gender', '')}
年龄：{case_data.get('age', '')}岁
主诉：{case_data.get('chief_complaint', '')}
现病史：{case_data.get('present_illness', '')}
既往史：{case_data.get('past_history', '')}
过敏史：{case_data.get('allergies', '')}
体格检查：{case_data.get('physical_exam', '')}
诊断：{case_data.get('diagnosis', '')}
治疗建议：{case_data.get('treatment_plan', '')}

【医院信息】
医院名称：{config.get('hospital_name', '')}
医生姓名：{config.get('doctor_name', '')}

【病历格式要求】
1. 使用标准病历格式，包括以下部分：
   - 一般情况（姓名、性别、年龄）
   - 主诉
   - 现病史
   - 既往史
   - 过敏史
   - 体格检查
   - 诊断
   - 治疗建议

2. 语言要求：
   - 使用正式的医学文书语言
   - 专业术语准确无误
   - 描述简洁明了，逻辑清晰
   - 量化指标准确

3. 格式要求：
   - 每个部分使用小标题
   - 使用医学文书的标准表述
   - 适当分段，层次分明

【输出格式】
请直接输出完整的病历文本，不要有任何其他说明文字或JSON格式。"""
        
        result = self.spark.chat(prompt)
        if result["success"]:
            return result["content"].strip()
        else:
            print(f"调用星火API失败: {result['error']}")
            return ""
    
    def format_speaker_dialogues(self, speaker_dialogues):
        formatted = []
        for item in speaker_dialogues:
            speaker = item.get("speaker", "未知")
            text = item.get("text", "")
            formatted.append(f"{speaker}：{text}")
        return "\n".join(formatted)


if __name__ == "__main__":
    processor = NLPProcessor()
    
    test_transcript = "医生：你好，请问哪里不舒服？患者：我头痛，已经三天了。医生：有没有发热？患者：有点低烧。医生：先给你检查一下。患者：好的。医生：体温38度，咽喉充血，诊断为上呼吸道感染，给你开点消炎药。"
    
    print("=== 测试角色区分 ===")
    speaker_dialogues = processor.separate_speakers(test_transcript)
    print(json.dumps(speaker_dialogues, ensure_ascii=False, indent=2))
    
    print("\n=== 测试病例结构化 ===")
    case_data = processor.structure_case(speaker_dialogues)
    print(json.dumps(case_data, ensure_ascii=False, indent=2))
    
    print("\n=== 完整处理流程 ===")
    result = processor.process_transcript(test_transcript)
    print("角色区分结果：")
    print(processor.format_speaker_dialogues(result["speaker_dialogues"]))
    print("\n结构化病例：")
    print(json.dumps(result["case"], ensure_ascii=False, indent=2))
