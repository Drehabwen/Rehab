# 项目交接说明

## 1. 当前版本定位
- 当前正式交付快照对应 tag：`最终版-v3.0`
- 当前主要工作分支：`fix/v2.5.1-refinements`
- 最近关键提交：`fb080ca feat: refine workspace architecture and reporting UX`

## 2. 系统当前产品结构
- 工作台已经按五中心重组：
  - `接诊中心`
  - `评估中心`
  - `报告中心`
  - `数据中心`
  - `系统设置`
- 核心流程保持不变：
  - 患者 -> 接诊 -> 评估 -> 报告

## 3. 这轮已经完成的重点
- 重构了主控壳层和侧边栏导航，侧边栏成为一级导航。
- 拆清页面职责：
  - 接诊中心只管理接诊任务。
  - 评估中心只负责完成评估。
  - 报告中心只负责查看和导出报告。
  - 数据中心只负责历史记录和统计浏览。
- 体态评估入口、基础报告呈现、Markdown 渲染、报告中心导出 PDF 已完成一轮系统性优化。
- 新增了报告 PDF 导出能力。
- 补充了相关前端测试，并收敛了 `vitest` 的工作树干扰问题。

## 4. 关键文件说明

### 4.1 工作台主壳层
- [src/hub/NexusHub.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/NexusHub.tsx)
  - 负责主工作台入口、中心切换、患者选择后的评估流切换。
- [src/hub/components/HubSidebar.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/components/HubSidebar.tsx)
  - 负责左侧五中心导航。
- [src/hub/components/WorkspaceToolbar.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/components/WorkspaceToolbar.tsx)
  - 只在评估工作区内出现，负责体态 / ROM / 语音问诊 / 进度对比切换。

### 4.2 中心页面
- [src/hub/views/DashboardView.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/views/DashboardView.tsx)
  - 接诊中心。
- [src/hub/views/AssessmentCenterView.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/views/AssessmentCenterView.tsx)
  - 评估中心落地页。
- [src/hub/components/PatientToolbox.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/components/PatientToolbox.tsx)
  - 选中患者后的评估任务页。
- [src/hub/components/NexusReportCenter.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/components/NexusReportCenter.tsx)
  - 报告中心。
- [src/hub/views/DataCenterView.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/views/DataCenterView.tsx)
  - 数据中心。

### 4.3 报告与渲染
- [src/components/shared/MarkdownReport.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/components/shared/MarkdownReport.tsx)
  - Markdown 清洗与渲染，包含乱码过滤逻辑。
- [src/utils/exportPdf.ts](/c:/Users/DORAT/Desktop/Rehab-main/src/utils/exportPdf.ts)
  - 通用 PDF 导出工具。
- [src/hub/report-center-utils.ts](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/report-center-utils.ts)
  - 报告中心摘要与展示辅助逻辑。

### 4.4 Vision3 评估流
- [src/plugins/vision3/components/Vision3EntryHub.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/components/Vision3EntryHub.tsx)
  - 体态评估模式入口。
- [src/plugins/vision3/components/Vision3AnalysisPanel.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/components/Vision3AnalysisPanel.tsx)
  - 基础报告、完成页阅读区。
- [src/plugins/vision3/components/Vision3Dashboard.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/components/Vision3Dashboard.tsx)
  - 量化指标与结构化展示页。
- [src/plugins/vision3/report-insights.ts](/c:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/report-insights.ts)
  - 基础报告 / 洞察生成辅助。
- [src/plugins/vision3/hooks/useVision3AutoSave.ts](/c:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/hooks/useVision3AutoSave.ts)
  - Vision3 自动保存逻辑。

## 5. 测试与验证
- 本轮至少确认通过：
  - `npm run check`
- 仓库内已有相关测试：
  - [src/components/shared/__tests__/MarkdownReport.test.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/components/shared/__tests__/MarkdownReport.test.tsx)
  - [src/plugins/vision3/__tests__/Vision3EntryHub.test.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/__tests__/Vision3EntryHub.test.tsx)
  - [src/plugins/vision3/__tests__/reportInsights.test.ts](/c:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/__tests__/reportInsights.test.ts)
  - [src/plugins/vision3/__tests__/useVision3AutoSave.test.ts](/c:/Users/DORAT/Desktop/Rehab-main/src/plugins/vision3/__tests__/useVision3AutoSave.test.ts)

## 6. 本地运行方式
- 安装依赖：`npm install`
- 启动前端：`npm run dev`
- 类型检查：`npm run check`
- 前端测试：`npm run test`

## 7. 已知注意点
- 仓库历史里曾出现过编码污染问题，后续改中文文案时要优先保持 UTF-8。
- `.worktrees/` 是本地辅助工作树，不属于正式交付内容，已经加入忽略。
- `temp-utf8-test.txt` 是本地编码测试文件，不属于正式功能文件，已经加入忽略。

## 8. 建议接手顺序
1. 先从 [src/hub/NexusHub.tsx](/c:/Users/DORAT/Desktop/Rehab-main/src/hub/NexusHub.tsx) 理解主工作台导航。
2. 再看接诊中心、评估中心、报告中心、数据中心四个页面的职责拆分。
3. 接着看 Vision3 评估入口、完成页和报告渲染链路。
4. 最后再做视觉精修或新增模块，而不是重新打散当前页面职责。

## 9. 后续最适合继续做的事
- 继续统一四个中心的视觉语言和标题层级。
- 对报告中心和数据中心做更强的信息密度优化。
- 补一轮端到端人工走查：
  - 选择患者
  - 进入接诊
  - 完成三项评估
  - 生成综合报告
  - 导出 PDF
