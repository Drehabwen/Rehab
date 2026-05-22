import os
from openai import OpenAI
from dotenv import load_dotenv

repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(repo_root, ".env"), override=False)
api_key = (os.getenv("DEEPSEEK_API_KEY") or os.getenv("VITE_DEEPSEEK_API_KEY") or "").strip()
print(f"API Key: {api_key[:6]}...")

client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

print("Sending...")
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[{"role": "user", "content": "Hello, respond with 'OK' only."}],
    stream=False
)
print("Response received!")
print(response.choices[0].message.content)
