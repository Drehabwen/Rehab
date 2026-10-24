/**
 * 服务容器。
 *
 * - register(name, impl)：注册一个服务实现，返回反注册函数
 * - get(name)：取服务，缺失时抛错（插件应在 manifest.inject 里声明依赖）
 * - has(name)：依赖解析用
 *
 * 内核对插件暴露的只有 get/has；注册只在内核初始化阶段（或 core 插件）使用。
 */
export class ServiceContainer {
  private readonly impls = new Map<string, unknown>();
  private readonly owners = new Map<string, string>();

  register(name: string, impl: unknown, owner = 'kernel'): () => void {
    if (this.impls.has(name)) {
      throw new Error(`服务 "${name}" 已被 ${this.owners.get(name) ?? 'kernel'} 注册`);
    }
    this.impls.set(name, impl);
    this.owners.set(name, owner);
    return () => {
      this.impls.delete(name);
      this.owners.delete(name);
    };
  }

  has(name: string): boolean {
    return this.impls.has(name);
  }

  /** 取服务；缺失直接抛错，让问题在插件 apply 时暴露。 */
  get<T = unknown>(name: string): T {
    if (!this.impls.has(name)) {
      throw new Error(`服务 "${name}" 尚未注册（请检查插件 manifest.inject）`);
    }
    return this.impls.get(name) as T;
  }

  /** 只读快照，设置页展示用。 */
  names(): string[] {
    return [...this.impls.keys()].sort();
  }
}
