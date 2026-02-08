---
name: "nexus-skill-orchestrator"
description: "解析执行计划并自动调度相关技能（如测试生成、API 同步等）协同工作。在获得多步骤计划并需要端到端自动化执行时调用。"
---

# Nexus Skill Orchestrator

该技能是项目的“执行大脑”，负责将复杂的文本计划转化为一系列技能调用序列，确保任务按部就班且符合项目规范。

## 核心任务
1. **计划解析**：从 `nexus-modular-reviewer` 或 `nexus-evolution-architect` 等技能生成的文本计划中提取具体动作。
2. **技能匹配**：根据动作类型自动选择最合适的技能（如修改代码调用 `nexus-evolution-executor`，生成测试调用 `nexus-test-generator`）。
3. **流程监控**：跟踪每个步骤的执行状态，处理技能间的上下文传递。
4. **异常处理**：当某个步骤失败时，自动调用 `nexus-log-debugger-pro` 或请求人工干预。

## 调用时机
- 当已生成详细执行计划，且用户指令为“执行”、“开始”或“按计划操作”时。
- 需要跨多个专业领域（UI、后端、算法、测试）进行联动操作时。

## 运行逻辑
- **Step-by-Step**：一次只执行一个原子步骤，验证通过后再继续。
- **Strict Context**：确保每个被调用的技能都获得了最新的代码上下文。
- **Status Reporting**：每完成一个阶段，如实汇报进度和结果。
