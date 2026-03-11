import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Vision3EntryHub } from '../components/Vision3EntryHub';

describe('Vision3EntryHub - Assessment Mode Selection', () => {
  const mockOnSelectMode = vi.fn();

  beforeEach(() => {
    mockOnSelectMode.mockClear();
  });

  describe('Standard Assessment Mode', () => {
    it('should display standard assessment card', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      expect(screen.getByRole('heading', { name: '标准评估' })).toBeInTheDocument();
      expect(screen.getByText('三视角完整评估')).toBeInTheDocument();
      expect(screen.getByText('首诊、复评、报告生成')).toBeInTheDocument();
    });

    it('should call onSelectMode with standard assessment defaults', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      fireEvent.click(screen.getByRole('button', { name: '开始标准评估' }));

      expect(mockOnSelectMode).toHaveBeenCalledWith('stepped', 'front', 'standard');
    });

    it('should display standard assessment features', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      expect(screen.getByText('数据完整')).toBeInTheDocument();
      expect(screen.getByText('诊断准确')).toBeInTheDocument();
      expect(screen.getByText('全面分析')).toBeInTheDocument();
      expect(screen.getByText('3-5 分钟')).toBeInTheDocument();
    });
  });

  describe('Quick Assessment Mode', () => {
    it('should display quick assessment card', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      expect(screen.getByRole('heading', { name: '快速评估' })).toBeInTheDocument();
      expect(screen.getByText('单视角快速筛查')).toBeInTheDocument();
      expect(screen.getByText('默认正面视角，进入后可立即拍摄')).toBeInTheDocument();
    });

    it('should display a clear primary quick-start button', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      expect(screen.getByRole('button', { name: '开始快速评估' })).toBeInTheDocument();
    });

    it('should start quick mode with front view from the primary button', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      fireEvent.click(screen.getByRole('button', { name: '开始快速评估' }));

      expect(mockOnSelectMode).toHaveBeenCalledWith('stepped', 'front', 'quick');
    });

    it('should display clear quick-start view buttons', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      expect(screen.getByRole('button', { name: '快速评估：正面' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '快速评估：侧面' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '快速评估：背面' })).toBeInTheDocument();
      expect(screen.getByText('正面开始')).toBeInTheDocument();
      expect(screen.getByText('侧面开始')).toBeInTheDocument();
      expect(screen.getByText('背面开始')).toBeInTheDocument();
    });

    it('should call onSelectMode with quick mode and front view when front is clicked', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      fireEvent.click(screen.getByRole('button', { name: '快速评估：正面' }));

      expect(mockOnSelectMode).toHaveBeenCalledWith('stepped', 'front', 'quick');
    });

    it('should call onSelectMode with quick mode and side view when side is clicked', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      fireEvent.click(screen.getByRole('button', { name: '快速评估：侧面' }));

      expect(mockOnSelectMode).toHaveBeenCalledWith('stepped', 'side', 'quick');
    });

    it('should call onSelectMode with quick mode and back view when back is clicked', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      fireEvent.click(screen.getByRole('button', { name: '快速评估：背面' }));

      expect(mockOnSelectMode).toHaveBeenCalledWith('stepped', 'back', 'quick');
    });

    it('should display quick assessment features', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      expect(screen.getByText('即时反馈')).toBeInTheDocument();
      expect(screen.getByText('快速筛查')).toBeInTheDocument();
      expect(screen.getByText('初步检查')).toBeInTheDocument();
      expect(screen.getByText('1-2 分钟')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should keep both start buttons visible on the entry page', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      expect(screen.getByRole('button', { name: '开始标准评估' })).toBeVisible();
      expect(screen.getByRole('button', { name: '开始快速评估' })).toBeVisible();
    });

    it('should have proper button types for all actions', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      screen.getAllByRole('button').forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should be keyboard navigable', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);

      const frontButton = screen.getByRole('button', { name: '快速评估：正面' });
      frontButton.focus();

      expect(document.activeElement).toBe(frontButton);
    });
  });
});
