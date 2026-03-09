import pytest
import numpy as np
from utils.math_utils import (
    get_pixel_coords,
    calculate_angle,
    calculate_signed_angle,
    calculate_midpoint,
    calculate_angle_3d,
    calculate_distance,
    calculate_vector,
    normalize_vector,
    dot_product
)


class TestGetPixelCoords:
    """测试坐标转换功能"""
    
    def test_get_pixel_coords_basic(self):
        """测试基本坐标转换"""
        landmark = {"x": 0.5, "y": 0.5}
        result = get_pixel_coords(landmark, 100, 100)
        assert result["x"] == 50.0
        assert result["y"] == 50.0
    
    def test_get_pixel_coords_origin(self):
        """测试原点坐标"""
        landmark = {"x": 0.0, "y": 0.0}
        result = get_pixel_coords(landmark, 100, 100)
        assert result["x"] == 0.0
        assert result["y"] == 0.0
    
    def test_get_pixel_coords_max(self):
        """测试最大坐标"""
        landmark = {"x": 1.0, "y": 1.0}
        result = get_pixel_coords(landmark, 100, 100)
        assert result["x"] == 100.0
        assert result["y"] == 100.0
    
    def test_get_pixel_coords_different_dimensions(self):
        """测试不同尺寸"""
        landmark = {"x": 0.5, "y": 0.5}
        result = get_pixel_coords(landmark, 1920, 1080)
        assert result["x"] == 960.0
        assert result["y"] == 540.0
    
    def test_get_pixel_coords_quarter(self):
        """测试四分之一位置"""
        landmark = {"x": 0.25, "y": 0.75}
        result = get_pixel_coords(landmark, 100, 100)
        assert result["x"] == 25.0
        assert result["y"] == 75.0


class TestCalculateAngle:
    """测试角度计算功能"""
    
    def test_calculate_angle_right_angle(self):
        """测试直角"""
        p1 = {"x": 0, "y": 1}
        p2 = {"x": 0, "y": 0}
        p3 = {"x": 1, "y": 0}
        angle = calculate_angle(p1, p2, p3)
        assert abs(angle - 90.0) < 0.01
    
    def test_calculate_angle_straight_line(self):
        """测试直线（180度）"""
        p1 = {"x": -1, "y": 0}
        p2 = {"x": 0, "y": 0}
        p3 = {"x": 1, "y": 0}
        angle = calculate_angle(p1, p2, p3)
        assert abs(angle - 180.0) < 0.01
    
    def test_calculate_angle_zero(self):
        """测试0度角"""
        p1 = {"x": 1, "y": 0}
        p2 = {"x": 0, "y": 0}
        p3 = {"x": 1, "y": 0}
        angle = calculate_angle(p1, p2, p3)
        assert abs(angle - 0.0) < 0.01
    
    def test_calculate_angle_45_degrees(self):
        """测试45度角"""
        p1 = {"x": 0, "y": 1}
        p2 = {"x": 0, "y": 0}
        p3 = {"x": 1, "y": 1}
        angle = calculate_angle(p1, p2, p3)
        assert abs(angle - 45.0) < 0.01
    
    def test_calculate_angle_same_point(self):
        """测试同一点（边界情况）"""
        p1 = {"x": 0, "y": 0}
        p2 = {"x": 0, "y": 0}
        p3 = {"x": 1, "y": 0}
        angle = calculate_angle(p1, p2, p3)
        assert angle == 0.0


class TestCalculateSignedAngle:
    """测试有符号角度计算"""
    
    def test_calculate_signed_angle_positive(self):
        """测试正角度"""
        p1 = {"x": 0, "y": 1}
        p2 = {"x": 0, "y": 0}
        p3 = {"x": 1, "y": 0}
        angle = calculate_signed_angle(p1, p2, p3)
        assert angle > 0
        assert abs(angle - 90.0) < 0.01
    
    def test_calculate_signed_angle_negative(self):
        """测试负角度"""
        p1 = {"x": 1, "y": 0}
        p2 = {"x": 0, "y": 0}
        p3 = {"x": 0, "y": 1}
        angle = calculate_signed_angle(p1, p2, p3)
        assert angle < 0
        assert abs(angle + 90.0) < 0.01
    
    def test_calculate_signed_angle_zero(self):
        """测试0度"""
        p1 = {"x": 1, "y": 0}
        p2 = {"x": 0, "y": 0}
        p3 = {"x": 1, "y": 0}
        angle = calculate_signed_angle(p1, p2, p3)
        assert abs(angle) < 0.01


class TestCalculateMidpoint:
    """测试中点计算"""
    
    def test_calculate_midpoint_basic(self):
        """测试基本中点计算"""
        p1 = {"x": 0, "y": 0}
        p2 = {"x": 2, "y": 2}
        result = calculate_midpoint(p1, p2)
        assert result["x"] == 1.0
        assert result["y"] == 1.0
    
    def test_calculate_midpoint_same_point(self):
        """测试同一点"""
        p1 = {"x": 5, "y": 5}
        p2 = {"x": 5, "y": 5}
        result = calculate_midpoint(p1, p2)
        assert result["x"] == 5.0
        assert result["y"] == 5.0
    
    def test_calculate_midpoint_negative(self):
        """测试负坐标"""
        p1 = {"x": -2, "y": -2}
        p2 = {"x": 2, "y": 2}
        result = calculate_midpoint(p1, p2)
        assert result["x"] == 0.0
        assert result["y"] == 0.0


class TestCalculateDistance:
    """测试距离计算"""
    
    def test_calculate_distance_basic(self):
        """测试基本距离"""
        p1 = {"x": 0, "y": 0}
        p2 = {"x": 3, "y": 4}
        distance = calculate_distance(p1, p2)
        assert abs(distance - 5.0) < 0.01
    
    def test_calculate_distance_same_point(self):
        """测试同一点距离"""
        p1 = {"x": 1, "y": 1}
        p2 = {"x": 1, "y": 1}
        distance = calculate_distance(p1, p2)
        assert distance == 0.0
    
    def test_calculate_distance_horizontal(self):
        """测试水平距离"""
        p1 = {"x": 0, "y": 0}
        p2 = {"x": 5, "y": 0}
        distance = calculate_distance(p1, p2)
        assert abs(distance - 5.0) < 0.01


class TestVectorOperations:
    """测试向量操作"""
    
    def test_calculate_vector(self):
        """测试向量计算"""
        p1 = {"x": 1, "y": 2}
        p2 = {"x": 4, "y": 6}
        vector = calculate_vector(p1, p2)
        assert vector["x"] == 3.0
        assert vector["y"] == 4.0
    
    def test_normalize_vector_basic(self):
        """测试向量归一化"""
        vector = {"x": 3, "y": 4}
        normalized = normalize_vector(vector)
        assert abs(normalized["x"] - 0.6) < 0.01
        assert abs(normalized["y"] - 0.8) < 0.01
    
    def test_normalize_vector_zero(self):
        """测试零向量"""
        vector = {"x": 0, "y": 0}
        normalized = normalize_vector(vector)
        assert normalized["x"] == 0.0
        assert normalized["y"] == 0.0
    
    def test_dot_product(self):
        """测试点积"""
        v1 = {"x": 1, "y": 0}
        v2 = {"x": 0, "y": 1}
        result = dot_product(v1, v2)
        assert result == 0.0
    
    def test_dot_product_parallel(self):
        """测试平行向量点积"""
        v1 = {"x": 1, "y": 0}
        v2 = {"x": 1, "y": 0}
        result = dot_product(v1, v2)
        assert result == 1.0


class TestCalculateAngle3D:
    """测试3D角度计算"""
    
    def test_calculate_angle_3d_right_angle(self):
        """测试3D直角"""
        v1 = {"x": 1, "y": 0, "z": 0}
        v2 = {"x": 0, "y": 1, "z": 0}
        angle = calculate_angle_3d(v1, v2)
        assert abs(angle - 90.0) < 0.01
    
    def test_calculate_angle_3d_parallel(self):
        """测试3D平行向量"""
        v1 = {"x": 1, "y": 0, "z": 0}
        v2 = {"x": 1, "y": 0, "z": 0}
        angle = calculate_angle_3d(v1, v2)
        assert abs(angle - 0.0) < 0.01
    
    def test_calculate_angle_3d_opposite(self):
        """测试3D反向向量"""
        v1 = {"x": 1, "y": 0, "z": 0}
        v2 = {"x": -1, "y": 0, "z": 0}
        angle = calculate_angle_3d(v1, v2)
        assert abs(angle - 180.0) < 0.01


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
