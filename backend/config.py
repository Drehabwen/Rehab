# 全局配置文件

class Config:
    # WebSocket 配置
    WEBSOCKET_URL = 'ws://localhost:8000/ws/analyze'
    
    # 视频配置
    DEFAULT_VIDEO_WIDTH = 640
    DEFAULT_VIDEO_HEIGHT = 480
    
    # 分析配置
    ANALYSIS_TIMEOUT = 60000  # 60秒
    CONFIDENCE_THRESHOLD = 0.5
    
    # 姿态分析阈值
    POSTURE_THRESHOLDS = {
        # 头前倾阈值
        'head_forward': {
            'moderate': 0.25,
            'severe': 0.45
        },
        # 圆肩/含胸阈值
        'shoulder_rounded': {
            'mild': 0.15
        },
        # 头部侧倾阈值
        'head_tilt': {
            'mild': 0.03,
            'moderate': 0.08
        },
        # 高低肩阈值
        'uneven_shoulders': {
            'mild': 0.03,
            'moderate': 0.08
        },
        # 骨盆侧倾阈值
        'uneven_hips': {
            'mild': 0.03,
            'moderate': 0.08
        },
        # 身体中线偏移阈值
        'midline_shift': {
            'moderate': 0.08
        }
    }

# 创建全局配置实例
config = Config()
