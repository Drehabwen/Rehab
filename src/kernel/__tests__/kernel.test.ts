import { describe, expect, it, vi } from 'vitest';
import { createKernel, validateManifest } from '../kernel';
import { SlotRegistry } from '../slots';
import { ServiceContainer } from '../services';
import type { Plugin } from '../types';

const manifest = (id: string, extra: Partial<Plugin['manifest']> = {}) => ({
  id,
  version: '0.1.0',
  apiVersion: 1,
  displayName: id,
  builtin: true,
  ...extra,
});

describe('ServiceContainer', () => {
  it('注册、读取、重复注册报错、可反注册', () => {
    const services = new ServiceContainer();
    const dispose = services.register('audit', { log: () => {} });
    expect(services.has('audit')).toBe(true);
    expect(services.get<{ log: () => void }>('audit').log).toBeTypeOf('function');
    expect(() => services.register('audit', {})).toThrow(/已被/);
    dispose();
    expect(services.has('audit')).toBe(false);
    expect(() => services.get('audit')).toThrow(/尚未注册/);
  });
});

describe('SlotRegistry', () => {
  it('list 插槽按 order 排序，反注册幂等', () => {
    const slots = new SlotRegistry();
    const A = () => null;
    const B = () => null;
    slots.register('today.panels', 'b', B, { order: 20 });
    const disposeA = slots.register('today.panels', 'a', A, { order: 10 });
    expect(slots.list('today.panels').map((entry) => entry.id)).toEqual(['a', 'b']);
    disposeA();
    disposeA();
    expect(slots.list('today.panels').map((entry) => entry.id)).toEqual(['b']);
  });

  it('keyed 插槽必须给 key，并按 key 过滤', () => {
    const slots = new SlotRegistry();
    expect(() => slots.register('timeline.kinds', 'x', () => null)).toThrow(/keyed/);
    slots.register('timeline.kinds', 'note', () => null, { key: 'note' });
    slots.register('timeline.kinds', 'assessment', () => null, { key: 'assessment' });
    expect(slots.forKey('timeline.kinds', 'note').map((entry) => entry.id)).toEqual(['note']);
    expect(slots.forKey('timeline.kinds', 'missing')).toEqual([]);
  });
});

describe('validateManifest', () => {
  it('校验 id / version / apiVersion / displayName', () => {
    expect(validateManifest(manifest('ok'), 1)).toBeNull();
    expect(validateManifest(manifest('Bad_ID'), 1)).toMatch(/id 非法/);
    expect(validateManifest(manifest('ok', { apiVersion: 2 }), 1)).toMatch(/apiVersion/);
    expect(validateManifest({ ...manifest('ok'), displayName: '' }, 1)).toMatch(/displayName/);
  });
});

describe('kernel', () => {
  const makePlugin = (
    id: string,
    options: {
      inject?: string[];
      provides?: string[];
      onApply?: () => void;
      onDispose?: () => void;
      contributes?: boolean;
    } = {},
  ): Plugin => ({
    manifest: manifest(id, { inject: options.inject, provides: options.provides }),
    apply(ctx) {
      options.onApply?.();
      const disposers: (() => void)[] = [];
      if (options.contributes !== false) {
        disposers.push(ctx.slots.register('today.panels', `${id}/panel`, () => null));
      }
      return () => {
        options.onDispose?.();
        for (const dispose of disposers) dispose();
      };
    },
  });

  it('启动后按依赖顺序 apply，卸载时贡献全部回收', async () => {
    const order: string[] = [];
    const kernel = createKernel({
      apiVersion: 1,
      services: { audit: { log: () => {} } },
      plugins: [
        makePlugin('consumer', {
          inject: ['audit', 'thing'],
          onApply: () => order.push('consumer'),
        }),
        makePlugin('provider', {
          provides: ['thing'],
          onApply: () => order.push('provider'),
        }),
      ],
    });
    await kernel.start();
    expect(order).toEqual(['provider', 'consumer']);
    expect(kernel.states().every((state) => state.status === 'active')).toBe(true);
    expect(kernel.slots.list('today.panels')).toHaveLength(2);

    kernel.disable('consumer');
    expect(kernel.slots.list('today.panels').map((entry) => entry.id)).toEqual(['provider/panel']);
    expect(kernel.states().find((state) => state.manifest.id === 'consumer')?.status).toBe('disabled');

    kernel.enable('consumer');
    expect(kernel.slots.list('today.panels')).toHaveLength(2);
  });

  it('缺少依赖的插件停在 pending，不影响其它插件', async () => {
    const kernel = createKernel({
      apiVersion: 1,
      plugins: [makePlugin('needs-missing', { inject: ['missing'] }), makePlugin('fine')],
    });
    await kernel.start();
    const states = kernel.states();
    expect(states.find((state) => state.manifest.id === 'needs-missing')?.status).toBe('pending');
    expect(states.find((state) => state.manifest.id === 'fine')?.status).toBe('active');
  });

  it('apiVersion 不匹配 → error，且不产生贡献', async () => {
    const kernel = createKernel({
      apiVersion: 1,
      plugins: [makePlugin('old', {})].map((plugin) => ({
        ...plugin,
        manifest: { ...plugin.manifest, apiVersion: 99 },
      })),
    });
    await kernel.start();
    const state = kernel.states()[0];
    expect(state.status).toBe('error');
    expect(state.error).toMatch(/apiVersion/);
    expect(kernel.slots.list('today.panels')).toHaveLength(0);
  });

  it('apply 抛错的插件被隔离', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const kernel = createKernel({
      apiVersion: 1,
      plugins: [
        {
          manifest: manifest('boom'),
          apply() {
            throw new Error('boom');
          },
        },
        makePlugin('ok'),
      ],
    });
    await kernel.start();
    const states = kernel.states();
    expect(states.find((state) => state.manifest.id === 'boom')?.status).toBe('error');
    expect(states.find((state) => state.manifest.id === 'ok')?.status).toBe('active');
    spy.mockRestore();
  });
});
