import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KernelDemoPage } from '../demo/KernelDemoPage';

describe('KernelDemoPage', () => {
  it('装配 hello 插件，插槽渲染出贡献，停用后可逆卸载', async () => {
    render(<KernelDemoPage />);

    // 内核标题与插件表
    expect(screen.getByText(/内核 · 插件装配自检/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('hello')).toBeTruthy();
    });

    // hello 插件贡献的今日面板出现在插槽探查区
    expect(screen.getByText(/来自 hello 插件的今日面板/)).toBeTruthy();
    expect(screen.getByText(/示例事件渲染（kind = note）/)).toBeTruthy();

    // 找到 hello 所在行（页面上还有 vision3/rom/medvoice 插件，需限定范围）
    const row = screen.getByText('hello').closest('tr');
    expect(row).not.toBeNull();
    const user = userEvent.setup();

    // 停用 → 贡献消失
    await user.click(within(row as HTMLElement).getByRole('button', { name: '停用' }));
    await waitFor(() => {
      expect(screen.queryByText(/来自 hello 插件的今日面板/)).toBeNull();
    });
    expect(within(row as HTMLElement).getByRole('button', { name: '启用' })).toBeTruthy();

    // 重新启用 → 贡献回来
    await user.click(within(row as HTMLElement).getByRole('button', { name: '启用' }));
    await waitFor(() => {
      expect(screen.getByText(/来自 hello 插件的今日面板/)).toBeTruthy();
    });
  });
});
