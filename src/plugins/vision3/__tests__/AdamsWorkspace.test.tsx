import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdamsWorkspace } from '../components/AdamsWorkspace';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import type { Assessment } from '@/types/assessment';

// Stub navigator and window functions
beforeEach(() => {
  // Safe mock of mediaDevices without overwriting navigator
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockImplementation(() => {
        return Promise.resolve({
          getTracks: () => [{ stop: vi.fn() }]
        });
      })
    },
    configurable: true,
    writable: true
  });

  // Mock canvas methods for jsdom compatibility
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    bezierCurveTo: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
  });

  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mock_data');

  // Safe mock of window.print
  vi.spyOn(window, 'print').mockImplementation(() => {});
});

// Setup Zustand stores before each test
beforeEach(() => {
  usePatientStore.setState({
    currentPatient: {
      id: 'SUC-123456789-9',
      name: '王测试',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    patients: []
  });

  useSessionStore.setState({
    currentSession: {
      id: 'session-123',
      patientId: 'SUC-123456789-9',
      status: 'active',
      sequence: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      assessments: [],
    },
    sessions: []
  });

  useAssessmentStore.setState({
    assessments: [],
    currentAssessment: null
  });
});

describe('AdamsWorkspace Component', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    mockOnBack.mockClear();
  });

  it('should render Workspace Title, Patient Details, and Mock Camera View', async () => {
    render(<AdamsWorkspace onBack={mockOnBack} />);

    expect(screen.getByText(/亚当斯前屈评估工作台/)).toBeInTheDocument();
    expect(screen.getByText(/王测试/)).toBeInTheDocument();
    expect(screen.getByText(/SUC-123456789-9/)).toBeInTheDocument();
    expect(screen.getByText(/智能虚拟骨架辅助对齐/)).toBeInTheDocument();
  });

  it('should display the correct risk rating under different ATR Degrees', async () => {
    render(<AdamsWorkspace onBack={mockOnBack} />);

    const slider = screen.getByLabelText(/1. 躯干旋转角/);

    // Initial state: 0 degrees, normal risk
    expect(screen.getByText('0°')).toBeInTheDocument();
    expect(screen.getByText('水平正常')).toBeInTheDocument();
    expect(screen.getByText(/脊柱轴线对称/)).toBeInTheDocument();

    // 1. Change to 3 degrees (Low risk)
    fireEvent.change(slider, { target: { value: 3 } });
    expect(screen.getByText('3°')).toBeInTheDocument();
    expect(screen.getByText('轻微偏斜 (低危)')).toBeInTheDocument();
    expect(screen.getByText(/保持坐姿端正/)).toBeInTheDocument();

    // 2. Change to 6 degrees (Medium risk)
    fireEvent.change(slider, { target: { value: 6 } });
    expect(screen.getByText('6°')).toBeInTheDocument();
    expect(screen.getByText('中度旋转 (中危)')).toBeInTheDocument();
    expect(screen.getByText(/Schroth/)).toBeInTheDocument();

    // 3. Change to 8 degrees (High risk)
    fireEvent.change(slider, { target: { value: 8 } });
    expect(screen.getByText('8°')).toBeInTheDocument();
    expect(screen.getByText('重度旋转 (高危)')).toBeInTheDocument();
    expect(screen.getByText(/评估 Cobb 角/)).toBeInTheDocument();
  });

  it('should update clinical symmetry assessment selections correctly', async () => {
    render(<AdamsWorkspace onBack={mockOnBack} />);

    // Click "左肩高"
    const leftHigherBtn = screen.getByRole('button', { name: '左肩高' });
    fireEvent.click(leftHigherBtn);
    expect(leftHigherBtn).toHaveClass('bg-slate-900');

    // Click "右侧腰折痕深"
    const rightCreaseBtn = screen.getByRole('button', { name: '右侧折痕深' });
    fireEvent.click(rightCreaseBtn);
    expect(rightCreaseBtn).toHaveClass('bg-slate-900');

    // Click "左C形侧弯"
    const leftCurveBtn = screen.getByRole('button', { name: '左 C 形侧弯' });
    fireEvent.click(leftCurveBtn);
    expect(leftCurveBtn).toHaveClass('bg-slate-900');
  });

  it('should take a snapshot when the capture button is clicked', async () => {
    render(<AdamsWorkspace onBack={mockOnBack} />);

    const captureButton = screen.getByRole('button', { name: '拍摄评估快照' });
    fireEvent.click(captureButton);

    // After snapshot is captured, the button should change to "重新拍摄"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重新拍摄' })).toBeInTheDocument();
    });
  });

  it('should save the assessment and display the final clinical report', async () => {
    const addAssessmentSpy = vi.spyOn(useAssessmentStore.getState(), 'addAssessment').mockImplementation(async (input) => {
      const assessment: Assessment = {
        id: 'mock-assessment-id',
        sessionId: input.sessionId || 'session-123',
        patientId: input.patientId,
        type: input.type,
        mode: input.mode,
        createdAt: Date.now(),
        data: input.data,
        notes: input.notes,
        status: 'completed' as const
      };
      useAssessmentStore.setState(state => ({
        assessments: [assessment, ...state.assessments],
        currentAssessment: assessment,
      }));
      return assessment;
    });

    render(<AdamsWorkspace onBack={mockOnBack} />);

    // 1. Take a snapshot
    const captureButton = screen.getByRole('button', { name: '拍摄评估快照' });
    fireEvent.click(captureButton);

    // 2. Select asymmetric shoulder and spine shape
    fireEvent.click(screen.getByRole('button', { name: '右肩高' }));
    fireEvent.click(screen.getByRole('button', { name: '左 C 形侧弯' }));

    // Set Cobb angle estimate
    const cobbInput = screen.getByLabelText(/6. 估计 Cobb 角/);
    fireEvent.change(cobbInput, { target: { value: 12 } });

    // Set Remarks
    const remarksInput = screen.getByLabelText(/7. 康复师临床备注/);
    fireEvent.change(remarksInput, { target: { value: '建议加强呼吸训练与核心训练' } });

    // 3. Save assessment
    const saveButton = screen.getByRole('button', { name: '生成并保存亚当斯报告' });
    fireEvent.click(saveButton);

    // Should call addAssessment
    await waitFor(() => {
      expect(addAssessmentSpy).toHaveBeenCalled();
    });

    // 4. Verify completed report view
    await waitFor(() => {
      expect(screen.getByText('🎉 亚当斯前屈评估报告生成成功！')).toBeInTheDocument();
      expect(screen.getByText('⚠️ 右肩偏高')).toBeInTheDocument();
      expect(screen.getByText('⚠️ 左C形侧弯')).toBeInTheDocument();
      expect(screen.getByText('12°')).toBeInTheDocument();
      expect(screen.getByText('建议加强呼吸训练与核心训练')).toBeInTheDocument();
    });

    // 5. Test print and back buttons
    const printButton = screen.getByRole('button', { name: '打印 / 导出 PDF' });
    fireEvent.click(printButton);
    expect(window.print).toHaveBeenCalled();

    const backBtn = screen.getByRole('button', { name: '返回体态主页 ➔' });
    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalled();
  });
});
