import { describe, expect, it } from 'vitest';
import { createKernel } from '../kernel';
import { loadBuiltinPlugins } from '../loader';

describe('内置插件装配', () => {
  it('加载 hello / vision3 / rom / medvoice 四个插件', () => {
    const plugins = loadBuiltinPlugins();
    const ids = plugins.map((plugin) => plugin.manifest.id).sort();
    expect(ids).toEqual(['hello', 'medvoice', 'rom', 'vision3']);
  });

  it('三个评估插件向 assessment.tools 与 assessment.workspace 贡献', async () => {
    const kernel = createKernel({
      apiVersion: 1,
      plugins: loadBuiltinPlugins(),
      services: { audit: { log: () => {} } },
    });
    await kernel.start();

    const states = kernel.states();
    for (const id of ['vision3', 'rom', 'medvoice', 'hello']) {
      expect(states.find((state) => state.manifest.id === id)?.status).toBe('active');
    }

    // 评估模块入口：三个工具各一条
    const tools = kernel.slots.list('assessment.tools').map((entry) => entry.id);
    expect(tools).toEqual(['vision3/tool', 'rom/tool', 'medvoice/tool']);

    // 工作区：keyed 分发，每个工具唯一
    expect(kernel.slots.forKey('assessment.workspace', 'vision3').map((entry) => entry.id)).toEqual([
      'vision3/workspace',
    ]);
    expect(kernel.slots.forKey('assessment.workspace', 'rom')).toHaveLength(1);
    expect(kernel.slots.forKey('assessment.workspace', 'medvoice')).toHaveLength(1);
    expect(kernel.slots.forKey('assessment.workspace', 'unknown')).toHaveLength(0);
  });

  it('停用 vision3 后其工具入口与工作区一起消失', async () => {
    const kernel = createKernel({
      apiVersion: 1,
      plugins: loadBuiltinPlugins(),
      services: { audit: { log: () => {} } },
    });
    await kernel.start();
    kernel.disable('vision3');
    expect(kernel.slots.list('assessment.tools').map((entry) => entry.id)).toEqual([
      'rom/tool',
      'medvoice/tool',
    ]);
    expect(kernel.slots.forKey('assessment.workspace', 'vision3')).toHaveLength(0);
    kernel.enable('vision3');
    expect(kernel.slots.forKey('assessment.workspace', 'vision3')).toHaveLength(1);
  });

  it('报告中心：按评估类型注册结果渲染器与报告段落', async () => {
    const kernel = createKernel({
      apiVersion: 1,
      plugins: loadBuiltinPlugins(),
      services: { audit: { log: () => {} } },
    });
    await kernel.start();

    expect(
      kernel.slots.forKey('assessment.result.renderers', 'posture').map((entry) => entry.id),
    ).toEqual(['vision3/result-posture']);
    expect(
      kernel.slots.forKey('assessment.result.renderers', 'adams').map((entry) => entry.id),
    ).toEqual(['vision3/result-adams']);
    expect(
      kernel.slots.forKey('assessment.result.renderers', 'rom').map((entry) => entry.id),
    ).toEqual(['rom/result']);
    expect(
      kernel.slots.forKey('assessment.result.renderers', 'medvoice').map((entry) => entry.id),
    ).toEqual(['medvoice/result']);
    // scale 没有插件贡献 → 由网格回退默认卡片
    expect(kernel.slots.forKey('assessment.result.renderers', 'scale')).toHaveLength(0);

    expect(kernel.slots.list('report.sections').map((entry) => entry.id)).toEqual([
      'vision3/report-section',
      'rom/report-section',
      'medvoice/report-section',
    ]);
  });
});
