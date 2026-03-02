import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
      
      expect(screen.getByText('标准评估')).toBeInTheDocument();
      expect(screen.getByText(/前-侧-后三视角完整评估/)).toBeInTheDocument();
    });

    it('should call onSelectMode with standard mode and front view when clicked', async () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);
      
      const standardCard = screen.getByText('标准评估').closest('div');
      fireEvent.click(standardCard!);
      
      await waitFor(() => {
        expect(mockOnSelectMode).toHaveBeenCalledWith('standard', 'front');
      });
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
      
      expect(screen.getByText('快速评估')).toBeInTheDocument();
      expect(screen.getByText(/单视角快速筛查/)).toBeInTheDocument();
    });

    it('should display view selector buttons', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);
      
      expect(screen.getByText('正面')).toBeInTheDocument();
      expect(screen.getByText('侧面')).toBeInTheDocument();
      expect(screen.getByText('背面')).toBeInTheDocument();
    });

    it('should call onSelectMode with quick mode and selected view when front is clicked', async () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);
      
      const frontButton = screen.getByText('正面');
      fireEvent.click(frontButton);
      
      await waitFor(() => {
        expect(mockOnSelectMode).toHaveBeenCalledWith('quick', 'front');
      });
    });

    it('should call onSelectMode with quick mode and selected view when side is clicked', async () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);
      
      const sideButton = screen.getByText('侧面');
      fireEvent.click(sideButton);
      
      await waitFor(() => {
        expect(mockOnSelectMode).toHaveBeenCalledWith('quick', 'side');
      });
    });

    it('should call onSelectMode with quick mode and selected view when back is clicked', async () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);
      
      const backButton = screen.getByText('背面');
      fireEvent.click(backButton);
      
      await waitFor(() => {
        expect(mockOnSelectMode).toHaveBeenCalledWith('quick', 'back');
      });
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
    it('should have proper ARIA labels for mode cards', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);
      
      const cards = screen.getAllByRole('button');
      cards.forEach(card => {
        expect(card).toHaveAttribute('type', 'button');
      });
    });

    it('should be keyboard navigable', () => {
      render(<Vision3EntryHub onSelectMode={mockOnSelectMode} />);
      
      const frontButton = screen.getByText('正面');
      frontButton.focus();
      
      expect(document.activeElement).toBe(frontButton);
    });
  });
});
