# 快速评估数据流测试

## 测试目标
验证快速评估模式下，采集完数据后自动分析并显示基础报告的完整流程。

## 数据流追踪点

### 1. 前端采集完成
- 日志：`[usePostureAnalysis] onCapture called`
- 位置：`usePostureAnalysis.ts:58`
- 期望：采集完成后调用，显示视角和关键点数量

### 2. 自动触发分析
- 日志：`[usePostureAnalysis] Quick assessment: auto-triggering analysis after capture`
- 位置：`usePostureAnalysis.ts:73`
- 期望：采集完后 100ms 自动触发

### 3. 调用 handleFinishStepped
- 日志：`[handleFinishStepped] ===== START =====`
- 位置：`useVision3EventHandler.ts:52`
- 期望：显示评估类型和采集结果

### 4. 准备帧数据
- 日志：`[handleFinishStepped] frames length:`
- 位置：`useVision3EventHandler.ts:64`
- 期望：显示帧数量和每个视角的关键点数量

### 5. 发送 WebSocket 消息
- 日志：`[usePostureWS] Sending POSTURE_STEPPED_ANALYSIS message`
- 位置：`usePostureWS.ts:317`
- 期望：显示消息类型和帧数量

### 6. 后端接收请求
- 日志：`[DEBUG] Received POSTURE_STEPPED_ANALYSIS message`
- 位置：`backend/main.py`
- 期望：后端打印接收到的消息

### 7. 后端处理分析
- 日志：`[DEBUG] Number of frames:`
- 位置：`backend/main.py`
- 期望：显示帧数量和评估类型

### 8. 生成基础报告
- 日志：`[DEBUG] Generated auxiliary diagnosis: X chars`
- 位置：`backend/main.py`
- 期望：显示生成的基础报告长度

### 9. 返回前端
- 日志：`[usePostureWS] Received auxiliaryDiagnosis, length:`
- 位置：`usePostureWS.ts:144`
- 期望：显示接收到的基础报告长度

### 10. 切换到报告面板
- 日志：`Auxiliary diagnosis available, switching to report panel`
- 位置：`Vision3Plugin.tsx:201`
- 期望：自动切换到报告面板

### 11. 显示基础报告
- 日志：`[Vision3AnalysisPanel] Props:`
- 位置：`Vision3AnalysisPanel.tsx:65`
- 期望：显示 `activePanel: 'report'`, `auxiliaryDiagnosis` 有值

## 测试步骤

1. 刷新浏览器
2. 选择"快速评估"模式
3. 点击"开始自动拍摄"
4. 等待正面视角采集完成（5 秒）
5. 观察是否自动分析
6. 检查基础报告是否显示

## 预期结果

✅ 采集完成后自动触发分析（无需点击按钮）
✅ 后端返回基础报告
✅ 前端自动切换到报告面板
✅ 基础报告内容正确显示

## 关键检查

- [ ] `onCapture` 被调用
- [ ] `handleFinishStepped` 被自动调用
- [ ] `POSTURE_STEPPED_ANALYSIS` 消息发送
- [ ] 后端返回 `auxiliaryDiagnosis`
- [ ] `activePanel` 切换到 `'report'`
- [ ] 报告区域显示基础报告内容
