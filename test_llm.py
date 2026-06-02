"""
测试 LLM API
"""
import os
from dotenv import load_dotenv

# 加载环境变量
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

from openai import OpenAI

api_key = (os.getenv("DEEPSEEK_API_KEY") or os.getenv("VITE_DEEPSEEK_API_KEY") or "").strip()
print(f"API Key: {api_key[:10]}..." if api_key else "No API Key")

client = OpenAI(
    api_key=api_key,
    base_url="https://api.deepseek.com",
    timeout=300.0
)

print("Calling LLM API...")
try:
    response = client.chat.completions.create(
        model="deepseek-v4-flash",
        messages=[
            {"role": "system", "content": "你是一个助手。"},
            {"role": "user", "content": "你好"}
        ],
        temperature=0.4
    )
    print(f"Response type: {type(response)}")
    print(f"Response: {response}")
    print(f"Choices: {response.choices}")
    print(f"Content: {response.choices[0].message.content}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
