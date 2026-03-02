# 样式重构进度追踪

## 已完成重构的文件 ✅

### 1. Vision3AnalysisPanel.tsx
- **状态**: ✅ 完成
- **修改内容**:
  - 按钮非激活状态 → `COLORS.neutral.light.buttonInactive`
  - 按钮禁用状态 → `COLORS.neutral.light.buttonDisabled`
  - 指示器激活 → `COLORS.neutral.light.indicatorActive`
  - 指示器非激活 → `COLORS.neutral.light.indicator`
  - 报告容器 → `COLORS.neutral.light.bg` + `COLORS.neutral.light.border`

### 2. MarkdownReport.tsx
- **状态**: ✅ 完成
- **修改内容**:
  - 整个组件使用 `COLORS.neutral.light.*` 系列样式
  - 导入设计规范常量

### 3. Vision3Header.tsx
- **状态**: ✅ 完成
- **修改内容**:
  - 容器背景 → `COLORS.neutral.light.bgSoft/40`
  - 按钮容器 → `COLORS.neutral.light.bgSoft/50`
  - 非激活按钮 → `COLORS.neutral.light.buttonInactive`
  - 返回按钮 → `COLORS.neutral.light.bg` + `COLORS.neutral.light.text`
  - 分隔线 → `COLORS.neutral.light.border.replace('border', 'bg')`
  - 设置按钮 → `COLORS.neutral.light.textLight`

## 待重构文件清单 📋

### 高优先级（直接涉及用户界面）

#### 1. Vision3EntryHub.tsx
- **硬编码样式**:
  - `bg-white/40`, `bg-white/60`
  - `text-slate-900`, `text-slate-600/80`, `text-slate-500`
  - `bg-slate-100/80`, `border-slate-200/50`
  - `bg-white/20`
- **建议替换**:
  ```typescript
  bg-white/40 → COLORS.neutral.light.bgSoft/40
  text-slate-900 → COLORS.neutral.light.text
  text-slate-600 → COLORS.neutral.light.textMuted
  bg-slate-100 → COLORS.neutral.light.bgSoft
  border-slate-200 → COLORS.neutral.light.border
  ```

#### 2. Vision3CameraStage.tsx
- **硬编码样式**:
  - `bg-white/10`, `bg-white/20`, `bg-white/5`
  - `text-white`, `text-white/40`
  - `bg-rose-500/80`
- **特殊说明**: 这是深色主题组件，应使用 `COLORS.neutral.whiteBg` 等深色样式

#### 3. SteppedAssessmentOverlay.tsx
- **硬编码样式**:
  - `text-slate-900`
  - `bg-white/10`, `bg-white/20`
  - `bg-slate-900/50`
- **特殊说明**: 这是深色主题覆盖层，部分白色半透明样式是设计需求

#### 4. MetricsSidebar.tsx
- **硬编码样式**:
  - `bg-white/40`, `border-white/60`
  - `text-slate-900`, `text-slate-400`, `text-slate-500`
  - `bg-slate-200/50`, `border-slate-200/60`
- **建议替换**:
  ```typescript
  bg-white/40 → COLORS.neutral.light.bgSoft/40
  text-slate-900 → COLORS.neutral.light.text
  text-slate-400 → COLORS.neutral.light.textLight
  ```

#### 5. Vision3Dashboard.tsx
- **硬编码样式**: ⚠️ **最多（57 处）**
  - `bg-white/60`, `bg-white/80`, `bg-white`, `bg-slate-50/50`
  - `text-slate-900`, `text-slate-400`, `text-slate-800`, `text-slate-500`, `text-slate-600`
  - `bg-slate-100`, `bg-slate-200`, `bg-slate-900`, `bg-slate-50/80`
  - `border-slate-100`, `border-slate-200`, `border-slate-300`
- **重构复杂度**: 高
- **建议**: 分多个步骤重构，先处理主要容器，再处理细节

#### 6. AssessmentOverlay.tsx
- **硬编码样式**:
  - `bg-white/40`, `border-white/60`
  - `text-slate-900`, `text-slate-400`
  - `bg-slate-100`, `border-slate-200`

## 重构策略 🎯

### 第一步：浅色主题组件（优先级高）
1. ✅ Vision3AnalysisPanel.tsx
2. ✅ MarkdownReport.tsx
3. ✅ Vision3Header.tsx
4. ⏳ Vision3EntryHub.tsx
5. ⏳ MetricsSidebar.tsx
6. ⏳ Vision3Dashboard.tsx（分多个子任务）

### 第二步：深色主题组件（保持原有设计）
1. ⏳ Vision3CameraStage.tsx（使用深色样式常量）
2. ⏳ SteppedAssessmentOverlay.tsx（部分保留半透明白色）
3. ⏳ AssessmentOverlay.tsx

### 第三步：全局审查
- [ ] 运行 grep 搜索剩余硬编码样式
- [ ] 检查所有组件是否统一使用设计规范
- [ ] 测试不同主题下的显示效果

## 样式映射参考表

### 浅色背景
| 硬编码类 | 替换为 |
|---------|--------|
| `bg-white` | `COLORS.neutral.light.bg` |
| `bg-slate-50` | `COLORS.neutral.light.bgSoft` |
| `bg-white/40` | `COLORS.neutral.light.bgSoft/40` |

### 深色背景
| 硬编码类 | 替换为 |
|---------|--------|
| `bg-slate-900` | `COLORS.neutral.slate` |
| `bg-slate-900/40` | `COLORS.neutral.slateBg` |
| `bg-white/5` | `COLORS.neutral.whiteBg` |

### 文本颜色
| 硬编码类 | 替换为 |
|---------|--------|
| `text-slate-900` | `COLORS.neutral.light.text` |
| `text-slate-800` | `COLORS.neutral.light.textSoft` |
| `text-slate-600` | `COLORS.neutral.light.textMuted` |
| `text-slate-500` | `COLORS.neutral.slate500` |
| `text-slate-400` | `COLORS.neutral.light.textLight` |
| `text-white` | `COLORS.neutral.whiteText` |

### 边框颜色
| 硬编码类 | 替换为 |
|---------|--------|
| `border-slate-200` | `COLORS.neutral.light.border` |
| `border-slate-100` | `COLORS.neutral.light.borderSoft` |
| `border-white/60` | `border-white/60`（保留，特殊效果） |

### 分隔线
| 硬编码类 | 替换为 |
|---------|--------|
| `bg-slate-200` | `COLORS.neutral.light.border.replace('border', 'bg')` |
| `bg-white/10` | `bg-white/10`（保留，深色主题半透明效果） |

## 下一步行动

### 立即执行
1. 重构 `Vision3EntryHub.tsx` - 入口中心页面
2. 重构 `MetricsSidebar.tsx` - 侧边栏指标显示

### 稍后执行
3. 分步骤重构 `Vision3Dashboard.tsx` - 主仪表板（文件较大，建议分 3-4 次重构）
4. 重构深色主题组件

### 最终检查
5. 全局搜索剩余硬编码样式
6. 视觉测试所有组件
7. 更新设计规范文档

## 命令参考

搜索剩余硬编码样式：
```bash
# 搜索所有硬编码的 slate 颜色
grep -rn "bg-slate-\|text-slate-\|border-slate-" src/plugins/vision3/components/

# 搜索硬编码的白色背景
grep -rn "bg-white" src/plugins/vision3/components/
```
