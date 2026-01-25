import json
import base64
import hashlib
import hmac
import pyaudio
import threading
import websocket
from datetime import datetime
from urllib.parse import urlencode

APPID = "cb5e1215"
API_KEY = "106669286a50560d9b221790c456e331"
API_SECRET = "YWU4NDQ2N2QxYjlkMzEwZjYxODU5YzVi"

URL = "wss://ws-api.xfyun.cn/v2/iat"

transcript_result = []
transcript_complete = False
full_transcript = ""

def generate_auth_url():
    date = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S GMT')
    signature_origin = f"host: ws-api.xfyun.cn\ndate: {date}\nGET /v2/iat HTTP/1.1"
    signature_sha = hmac.new(API_SECRET.encode('utf-8'), signature_origin.encode('utf-8'), digestmod=hashlib.sha256).digest()
    signature = base64.b64encode(signature_sha).decode('utf-8')
    authorization_origin = f'api_key="{API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature}"'
    authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode('utf-8')
    params = {"authorization": authorization, "date": date, "host": "ws-api.xfyun.cn"}
    return URL + "?" + urlencode(params)

def on_message(ws, message):
    global full_transcript, transcript_complete
    data = json.loads(message)
    if data.get("code") == 0 and data.get("data", {}).get("result"):
        ws_list = data["data"]["result"]["ws"]
        text = "".join([w["cw"][0]["w"] for w in ws_list])
        transcript_result.append(text)
        print(f"📝 {text}", end="", flush=True)
        
        if data["data"]["status"] == 2:
            print()
            print("\n✅ 转录完成!")
            full_transcript = "".join(transcript_result)
            transcript_complete = True

def on_error(ws, error):
    print(f"❌ 错误: {error}")

def on_close(ws, close_status_code, close_msg):
    print("\n🔌 连接已关闭")

def on_open(ws):
    print("✅ 已连接讯飞API")
    
    def send_audio():
        global transcript_result
        p = pyaudio.PyAudio()
        stream = p.open(format=pyaudio.paInt16, channels=1, rate=16000, input=True, frames_per_buffer=1024)
        print("🎙️ 开始录音... (按Ctrl+C停止)")
        
        params = {
            "common": {"app_id": APPID},
            "business": {
                "language": "zh_cn",
                "domain": "medical",
                "accent": "mandarin",
                "vad_eos": 5000,
                "ptc": 1,
                "nunum": 1,
                "speex_size": 60
            },
            "data": {"status": 0, "format": "audio/L16;rate=16000", "encoding": "raw", "audio": ""}
        }
        ws.send(json.dumps(params))
        
        status = 1
        try:
            while ws.sock and ws.sock.connected:
                data = stream.read(1024)
                frame = {
                    "data": {
                        "status": status,
                        "format": "audio/L16;rate=16000",
                        "audio": base64.b64encode(data).decode('utf-8'),
                        "encoding": "raw"
                    }
                }
                ws.send(json.dumps(frame))
        except Exception as e:
            print(f"发送音频异常: {e}")
        finally:
            end_frame = {"data": {"status": 2, "format": "audio/L16;rate=16000", "audio": "", "encoding": "raw"}}
            ws.send(json.dumps(end_frame))
            stream.stop_stream()
            stream.close()
            p.terminate()
            import time
            time.sleep(1)
            ws.close()
    
    threading.Thread(target=send_audio, daemon=True).start()

def record_transcript():
    global transcript_result, full_transcript, transcript_complete
    transcript_result = []
    full_transcript = ""
    transcript_complete = False
    
    print("=== AI 语音转录助手 ===\n")
    auth_url = generate_auth_url()
    ws = websocket.WebSocketApp(auth_url,
                                on_open=on_open,
                                on_message=on_message,
                                on_error=on_error,
                                on_close=on_close)
    ws.run_forever()
    
    return full_transcript

if __name__ == "__main__":
    transcript = record_transcript()
    print("\n=== 转录结果 ===")
    print(transcript)
