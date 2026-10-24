import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AssessmentCenterView } from '@/hub/views/AssessmentCenterView';
import { KernelProvider } from '../react';
import { createKernel } from '../kernel';
import { loadBuiltinPlugins } from '../loader';

describe('评估中心的插件插槽接线', () => {
  it('三个评估工具由插件渲染（不再硬编码）', async () => {
    const kernel = createKernel({
      apiVersion: 1,
      plugins: loadBuiltinPlugins(),
      services: { audit: { log: () => {} } },
    });
    render(
      <KernelProvider kernel={kernel}>
        <AssessmentCenterView visitTasks={[]} onSelectPatient={() => {}} />
      </KernelProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('体态评估')).toBeTruthy();
    });
    expect(screen.getByText('ROM 评估')).toBeTruthy();
    expect(screen.getByText('语音问诊')).toBeTruthy();

    // 停用 rom 后，该模块入口消失
    kernel.disable('rom');
    await waitFor(() => {
      expect(screen.queryByText('ROM 评估')).toBeNull();
    });
    expect(screen.getByText('体态评估')).toBeTruthy();
  });
});
