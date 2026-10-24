import React from 'react';
import { describe, expect, it } from 'vitest';
import { Activity, Layers } from 'lucide-react';
import { render, screen, waitFor } from '@testing-library/react';
import { ModuleResultsGrid } from '@/hub/components/report-center/ModuleResultsGrid';
import { KernelProvider } from '../react';
import { createKernel } from '../kernel';
import { loadBuiltinPlugins } from '../loader';

const postureItem = {
  type: 'posture' as const,
  output: { status: 'ready' as const, sourceAssessment: { id: 'a1' } },
  presentation: {
    title: '体态评估',
    description: 'MediaPipe 体态分析',
    icon: Activity,
    accentClassName: 'text-blue-600',
  },
  summaryText: '头前伸 12°',
  evidenceText: '2026-10-19',
};

const scaleItem = {
  type: 'scale' as const,
  output: { status: 'ready' as const, sourceAssessment: { id: 'a2' } },
  presentation: {
    title: '量表评定',
    description: '量表结果',
    icon: Layers,
    accentClassName: 'text-slate-600',
  },
  summaryText: 'VAS 3 分',
  evidenceText: '2026-10-19',
};

describe('报告中心模块结果的插槽接线', () => {
  it('有插件的类型走插件渲染器，无插件的类型回落默认卡片', async () => {
    const kernel = createKernel({
      apiVersion: 1,
      plugins: loadBuiltinPlugins(),
      services: { audit: { log: () => {} } },
    });
    render(
      <KernelProvider kernel={kernel}>
        <ModuleResultsGrid
          assessmentOutputs={[postureItem, scaleItem]}
          onViewDetails={() => {}}
          readyCount={2}
        />
      </KernelProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('体态评估')).toBeTruthy();
    });
    // scale 没有插件渲染器 → 回退默认卡片仍然渲染
    expect(screen.getByText('量表评定')).toBeTruthy();
    expect(screen.getByText('头前伸 12°')).toBeTruthy();
    expect(screen.getByText('VAS 3 分')).toBeTruthy();
  });
});
