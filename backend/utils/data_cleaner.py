import numpy as np
from typing import List, Dict, Any, Optional
from models import Landmark

SCOPE_ALGORITHMS = {
    "full": "moving_average",
    "upper": "trimmed_mean",
    "lower": "median"
}

ALGORITHM_PARAMS = {
    "moving_average": {"window_size": 5},
    "trimmed_mean": {"trim_percent": 10},
    "median": {}
}

def clean_timeseries(
    time_series_landmarks: List[List[Landmark]],
    scope: str = "full"
) -> List[Landmark]:
    if not time_series_landmarks or len(time_series_landmarks) == 0:
        return []
    
    if len(time_series_landmarks) == 1:
        return time_series_landmarks[0]
    
    algorithm = SCOPE_ALGORITHMS.get(scope, "moving_average")
    
    if algorithm == "moving_average":
        return _moving_average(time_series_landmarks)
    elif algorithm == "trimmed_mean":
        return _trimmed_mean(time_series_landmarks)
    elif algorithm == "median":
        return _median(time_series_landmarks)
    else:
        return _moving_average(time_series_landmarks)

def _moving_average(time_series: List[List[Landmark]]) -> List[Landmark]:
    window_size = ALGORITHM_PARAMS["moving_average"]["window_size"]
    n_frames = len(time_series)
    n_landmarks = len(time_series[0]) if time_series else 0
    
    if n_landmarks == 0:
        return []
    
    result = []
    half_window = window_size // 2
    
    for i in range(n_landmarks):
        landmark_values = []
        for frame in time_series:
            if i < len(frame):
                lm = frame[i]
                landmark_values.append([lm.x, lm.y, lm.z])
        
        if not landmark_values:
            result.append(Landmark(x=0, y=0, z=0, visibility=0))
            continue
        
        landmark_array = np.array(landmark_values)
        
        smoothed = []
        for j in range(len(landmark_array)):
            start = max(0, j - half_window)
            end = min(len(landmark_array), j + half_window + 1)
            window = landmark_array[start:end]
            smoothed.append(np.mean(window, axis=0))
        
        avg = np.mean(landmark_array, axis=0)
        result.append(Landmark(
            x=float(avg[0]),
            y=float(avg[1]),
            z=float(avg[2]),
            visibility=1.0
        ))
    
    return result

def _trimmed_mean(time_series: List[List[Landmark]]) -> List[Landmark]:
    trim_percent = ALGORITHM_PARAMS["trimmed_mean"]["trim_percent"]
    n_landmarks = len(time_series[0]) if time_series else 0
    
    if n_landmarks == 0:
        return []
    
    result = []
    
    for i in range(n_landmarks):
        landmark_values = []
        for frame in time_series:
            if i < len(frame):
                lm = frame[i]
                landmark_values.append([lm.x, lm.y, lm.z])
        
        if not landmark_values:
            result.append(Landmark(x=0, y=0, z=0, visibility=0))
            continue
        
        landmark_array = np.array(landmark_values)
        
        n = len(landmark_array)
        trim_count = int(n * trim_percent / 100)
        
        if trim_count > 0 and n > trim_count * 2:
            sorted_arr = np.sort(landmark_array, axis=0)
            trimmed = sorted_arr[trim_count:-trim_count]
            avg = np.mean(trimmed, axis=0)
        else:
            avg = np.mean(landmark_array, axis=0)
        
        result.append(Landmark(
            x=float(avg[0]),
            y=float(avg[1]),
            z=float(avg[2]),
            visibility=1.0
        ))
    
    return result

def _median(time_series: List[List[Landmark]]) -> List[Landmark]:
    n_landmarks = len(time_series[0]) if time_series else 0
    
    if n_landmarks == 0:
        return []
    
    result = []
    
    for i in range(n_landmarks):
        landmark_values = []
        for frame in time_series:
            if i < len(frame):
                lm = frame[i]
                landmark_values.append([lm.x, lm.y, lm.z])
        
        if not landmark_values:
            result.append(Landmark(x=0, y=0, z=0, visibility=0))
            continue
        
        landmark_array = np.array(landmark_values)
        median_val = np.median(landmark_array, axis=0)
        
        result.append(Landmark(
            x=float(median_val[0]),
            y=float(median_val[1]),
            z=float(median_val[2]),
            visibility=1.0
        ))
    
    return result

def get_algorithm_info(scope: str) -> Dict[str, Any]:
    algorithm = SCOPE_ALGORITHMS.get(scope, "moving_average")
    return {
        "scope": scope,
        "algorithm": algorithm,
        "params": ALGORITHM_PARAMS.get(algorithm, {}),
        "description": _get_algorithm_description(algorithm)
    }

def _get_algorithm_description(algorithm: str) -> str:
    descriptions = {
        "moving_average": "移动平均 - 平滑处理，消除随机抖动",
        "trimmed_mean": "去极值平均 - 去掉最大值和最小值，减少异常干扰",
        "median": "中位数 - 对异常值鲁棒，适合站立不稳的情况"
    }
    return descriptions.get(algorithm, "")
