import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TreatmentPlanViewer } from '../TreatmentPlanViewer';
import { useTreatmentPlanStore } from '../../../store/useTreatmentPlanStore';

// Mock store
vi.mock('../../../store/useTreatmentPlanStore');

// Mock marked
vi.mock('marked', () => ({
  parse: vi.fn((content: string) => `<div>${content}</div>`),
}));

describe('TreatmentPlanViewer', () => {
  const mockGeneratePlan = vi.fn();
  const mockClearContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 默认 mock 返回值
    vi.mocked(useTreatmentPlanStore).mockReturnValue({
      currentContent: '',
      isGenerating: false,
      error: null,
      generatePlan: mockGeneratePlan,
      clearContent: mockClearContent,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初始渲染', () => {
    it('应该正确渲染组件', () => {
      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      expect(screen.getByText('治疗计划生成')).toBeInTheDocument();
      expect(screen.getByText('生成治疗计划')).toBeInTheDocument();
    });

    it('应该显示提示信息', () => {
      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      expect(screen.getByText('点击上方按钮生成治疗计划')).toBeInTheDocument();
    });

    it('应该渲染内容区域', () => {
      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      expect(screen.getByText('治疗计划内容')).toBeInTheDocument();
    });
  });

  describe('生成治疗计划', () => {
    it('点击按钮应该调用 generatePlan', async () => {
      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      const button = screen.getByText('生成治疗计划');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockClearContent).toHaveBeenCalled();
        expect(mockGeneratePlan).toHaveBeenCalledWith('assessment_001', 'patient_001');
      });
    });

    it('生成时应该显示加载状态', () => {
      vi.mocked(useTreatmentPlanStore).mockReturnValue({
        currentContent: '',
        isGenerating: true,
        error: null,
        generatePlan: mockGeneratePlan,
        clearContent: mockClearContent,
      });

      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      expect(screen.getByText('生成中...')).toBeInTheDocument();
      expect(screen.getByText('正在生成...')).toBeInTheDocument();
    });

    it('生成时按钮应该被禁用', () => {
      vi.mocked(useTreatmentPlanStore).mockReturnValue({
        currentContent: '',
        isGenerating: true,
        error: null,
        generatePlan: mockGeneratePlan,
        clearContent: mockClearContent,
      });

      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      const button = screen.getByText('生成中...');
      expect(button).toBeDisabled();
    });
  });

  describe('显示内容', () => {
    it('应该显示生成的内容', () => {
      vi.mocked(useTreatmentPlanStore).mockReturnValue({
        currentContent: '## 第一周训练计划',
        isGenerating: false,
        error: null,
        generatePlan: mockGeneratePlan,
        clearContent: mockClearContent,
      });

      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      // 内容应该被 marked.parse 处理
      expect(document.querySelector('.p-4')).toBeInTheDocument();
    });

    it('有内容时应该显示清除按钮', () => {
      vi.mocked(useTreatmentPlanStore).mockReturnValue({
        currentContent: '治疗计划内容',
        isGenerating: false,
        error: null,
        generatePlan: mockGeneratePlan,
        clearContent: mockClearContent,
      });

      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      expect(screen.getByText('清除内容')).toBeInTheDocument();
    });

    it('点击清除按钮应该调用 clearContent', () => {
      vi.mocked(useTreatmentPlanStore).mockReturnValue({
        currentContent: '治疗计划内容',
        isGenerating: false,
        error: null,
        generatePlan: mockGeneratePlan,
        clearContent: mockClearContent,
      });

      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      const button = screen.getByText('清除内容');
      fireEvent.click(button);
      
      expect(mockClearContent).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该显示错误信息', () => {
      vi.mocked(useTreatmentPlanStore).mockReturnValue({
        currentContent: '',
        isGenerating: false,
        error: '生成失败：API 错误',
        generatePlan: mockGeneratePlan,
        clearContent: mockClearContent,
      });

      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      expect(screen.getByText('生成失败：API 错误')).toBeInTheDocument();
    });

    it('错误信息应该包含警告图标', () => {
      vi.mocked(useTreatmentPlanStore).mockReturnValue({
        currentContent: '',
        isGenerating: false,
        error: '错误信息',
        generatePlan: mockGeneratePlan,
        clearContent: mockClearContent,
      });

      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      // 检查错误容器是否有正确的样式类
      const errorElement = screen.getByText('错误信息');
      expect(errorElement.parentElement).toHaveClass('bg-red-100');
    });
  });

  describe('props 传递', () => {
    it('应该正确接收 assessmentId 和 patientId', async () => {
      render(<TreatmentPlanViewer assessmentId="assessment_123" patientId="patient_456" />);
      
      const button = screen.getByText('生成治疗计划');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockGeneratePlan).toHaveBeenCalledWith('assessment_123', 'patient_456');
      });
    });

    it('不同的 props 应该触发不同的调用', async () => {
      const { rerender } = render(
        <TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />
      );
      
      let button = screen.getByText('生成治疗计划');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockGeneratePlan).toHaveBeenCalledWith('assessment_001', 'patient_001');
      });

      // 重新渲染并点击
      rerender(<TreatmentPlanViewer assessmentId="assessment_002" patientId="patient_002" />);
      
      button = screen.getByText('生成治疗计划');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(mockGeneratePlan).toHaveBeenCalledWith('assessment_002', 'patient_002');
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理空内容', () => {
      vi.mocked(useTreatmentPlanStore).mockReturnValue({
        currentContent: '',
        isGenerating: false,
        error: null,
        generatePlan: mockGeneratePlan,
        clearContent: mockClearContent,
      });

      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      // 应该显示提示而不是清除按钮
      expect(screen.getByText('点击上方按钮生成治疗计划')).toBeInTheDocument();
      expect(screen.queryByText('清除内容')).not.toBeInTheDocument();
    });

    it('应该处理很长的内容', () => {
      const longContent = 'a'.repeat(10000);
      
      vi.mocked(useTreatmentPlanStore).mockReturnValue({
        currentContent: longContent,
        isGenerating: false,
        error: null,
        generatePlan: mockGeneratePlan,
        clearContent: mockClearContent,
      });

      render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
      
      // 组件应该正常渲染
      expect(screen.getByText('清除内容')).toBeInTheDocument();
    });
  });
});
