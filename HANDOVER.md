# 接手文档（HANDOVER）

> 最后更新：2026-10-27
> 读者：接手的 AI / 工程师。目标：**不改错方向、不重复踩坑、知道从哪继续。**

---

## 1. 项目是什么

**脉冲原野**是公司/团队名，产品线三条：

| 产品 | 形态 | 作用 |
|---|---|---|
| **青跃智衡** | 手机 App（Capacitor）/ 桌面端 | 康复师工作台：**唯一数据采集入口** |
| **Galen** | DSH 基座桌面应用 | 科研加工：队列、选题、统计、论文 |
| 桌面工作台 | Electron/Vite | 复盘、导出批次、科室管理 |

**核心命题**：让每份临床文书积累成下一篇论文。

---

## 2. 仓库与分支

| 仓库 | 路径 | 分支 | 状态 |
|---|---|---|---|
| Rehab-main | `D:\Users\DORAT\Desktop\03_AI康复项目\Rehab-main` | `reform/minimal-loop` | 当前主线，已推送 |
| galen-workspace | `C:\Users\DORAT\Desktop\dsh-plugins\galen-workspace` | `master` | 已推送，86 tests 通过 |
| galen-desktop | `Drehabwen/galen-desktop` (private) | `galen-desktop-snapshot` | DSH 基座打包快照 |
| galen-promo | `C:\Users\DORAT\Desktop\galen-promo` | `master` | Remotion 宣传片工程 |
| 旧 Rust Galen | `Drehabwen/Galen` | — | **历史仓库，不作为基座** |

---

## 3. 关键决策（不要推翻，改了要先讨论）

1. **移动优先**：手机 = 唯一采集入口；桌面端不做高频录入；Galen 不做日常接诊 UI
2. **直接回传**：不做复杂同步/冲突合并；接口留 `SyncTarget` 抽象
3. **PWA → Capacitor**：同一份 React 代码包原生壳（麦克风/离线/安装）
4. **端侧 ASR**：sherpa-onnx WASM，音频不出设备；转写失败降级为"关键要点点选"
5. **分级产出**：1 例→病例报告；3–10 例→病例系列；≥30 例→队列论文（`planArtifact`）
6. **诚实优先**：数据宁可少而真，不生成垃圾论文
7. **做减法**：不做什么比做什么更重要

---

## 4. 已完成

### 移动端（`src/mobile/`）

| 屏 | 文件 | 能力 |
|---|---|---|
| 今日接诊 | `screens/VisitsScreen.tsx` | 真实 store、窗口化渲染、搜索 |
| 新建接诊 | `screens/NewVisitScreen.tsx` | RehabID/档案号自动生成、开接诊 |
| 量表 | `screens/ScaleScreen.tsx` | ODI 10 项、上次值虚线、实时总分、必填校验、落库 |
| 干预记录 | `screens/InterventionScreen.tsx` | 治疗内容/频次/时长/依从性/不良事件/同意/复评，存 `session.notes` |
| 语音问诊 | `screens/VoiceScreen.tsx` | MediaRecorder 录音、要点点选、离线 ASR 骨架、转写可编辑 |
| 报告 | `screens/ReportScreen.tsx` | 总分、改善幅度、语音要点、待同步 |
| 待同步 | `screens/SyncScreen.tsx` | 待回传数、JSON 备份导出 |
| 历史导入 | `screens/ImportScreen.tsx` | CSV 解析、逐行错误、批量建档 |

辅助：`asr/asrWorker.ts`、`asr/useOfflineAsr.ts`、`useMobileVisits.ts`、`App.tsx`（路由 `/m/`）

### 工作台（Rehab-main 主线）

- 聚合 O(P×A)→O(P+A)：1000 患者 90.9ms→**4.3ms**
- 列表渲染 300ms→**25.5ms**（窗口化 + content-visibility）
- 首页「开始接诊」1 次点击
- 必需/可选模块：`report-gate.ts`、`report-readiness.ts`（单一事实来源）
- 性能/不变量测试：`perf-*.test.ts`、`workflow-modules.test.ts`、`report-*.test.ts`

### Galen

- `lib/mobile-sync.js`：配对 token、批次校验、sha256 回执、分级产出
- 测试：`tests/mobile-sync.test.js`（8 项），全量 86 项通过

### 构建产物

- **APK**：`android/app/build/outputs/apk/debug/app-debug.apk`（约 48MB）
- 移动端开发服务器：`npm run dev -- --host 0.0.0.0 --port 5175` → `http://<IP>:5175/m/`

---

## 5. 待办（按优先级）

| # | 任务 | 说明 |
|---|---|---|
| 1 | **Galen 端点接线** | 在 `lib/index.js` 注册 `mobile/pair`、`mobile/upload`、`mobile/inbox`，调用 `mobile-sync.js` |
| 2 | 上传后自动生成 | 复用 `research/analyze` + `report`/`manuscript`，按 `planArtifact` 分级 |
| 3 | 手机端「发送到 Galen」 | 扫码配对 + 上传 + 显示 sha256 回执 |
| 4 | 真机验证 | 装 APK，走完整流程（录音可用，无 HTTPS 限制） |
| 5 | Galen 做减法 | 移除接诊列表/患者管理/评估入口，只保留研究链路 |
| 6 | 报告中心门禁干净重做 | 上次直接改大文件改坏了，已回退到 `b55c1d4` 的健康版本，需用小组件方式重做 |
| 7 | 语音模型接入 | 把 sherpa-onnx WASM + 中文模型放入 `public/asr/`（说明见该目录 README） |

---

## 6. 环境与构建（Windows）

```
JDK:        C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot  (Java 17，必须)
Android SDK: D:\DEV\toolchains\android-sdk  (platforms 33/34/36, build-tools 35/36)
Gradle:     缓存 8.14.3（wrapper 已改指向它）
Capacitor:  **v6.2.2**（v8 需要 Java 21，会失败）
```

构建 APK：

```bat
cd android
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot
set ANDROID_HOME=D:\DEV\toolchains\android-sdk
gradlew.bat assembleDebug --no-daemon
```

必须先 `npm run build`（生成 `dist/`）再 `npx cap sync android`。

---

## 7. 踩过的坑（省你 2 小时）

| 坑 | 现象 | 解决 |
|---|---|---|
| Capacitor 8 | `无效的源发行版：21` | 降级 Capacitor 6 |
| 中文路径 | Gradle 拒绝构建 | `android.overridePathCheck=true` |
| Gradle 下载 | zip 损坏 / TLS 中断 | 用本机缓存 8.14.3；Maven 走阿里云镜像，**移除 gradle proxy** |
| 非 ASCII 编码 | 文件中文变 `浣撴€?` | 用 write/edit 工具写文件，不要用 PowerShell here-string + Set-Content 混合 |
| PowerShell | `$p: ` / `"""` / `??` 解析失败 | 用 `${p}`、`@' '@` 包裹 Python、避免 `??` |
| **截图** | 页面右侧"被裁切" | **假象**：headless `--window-size` 与 `--force-device-scale-factor` 组合错位。真实测量用 CDP `Emulation.setDeviceMetricsOverride` + `Page.captureScreenshot`：390px 视口下 `scrollWidth === innerWidth` |
| main.tsx | 页面顶部出现 `window.location.pathname.startsWith('/m') ?` 文本 | JSX 三元表达式缺少 `{}` |

---

## 8. 验证方式

```bash
# 工作台
npx tsc --noEmit -p tsconfig.json
npx vitest run src/hub/__tests__

# Galen
cd C:\Users\DORAT\Desktop\dsh-plugins\galen-workspace
node --test tests/*.test.js
```

真机/浏览器验证用 CDP 脚本（`%TEMP%\cdp2.mjs` 模式）：`Emulation.setDeviceMetricsOverride({width:390,height:844,deviceScaleFactor:2,mobile:true})` → 截图 → 读 `innerWidth/scrollWidth`。

---

## 9. 设计资产

- PRD：`docs/PRD_MOBILE_V1.md`（v0.3）
- 产品定义：`docs/MINIMAL_LOOP.md`
- 移动端原型：`docs/prototype-mobile-v1/`（9 屏 HTML + PNG）
- 品牌规范：`galen-desktop/docs/BRAND.md`（脉冲原野 / 青跃智衡 / Galen）
- 品牌色：`#0f9b8e` / `#2dd4bf` / `#0f172a` / `#151517`

---

## 10. 给接手者的三句话

1. **不要急着写代码**：先读 PRD 和 MINIMAL_LOOP，理解"为什么砍功能"。
2. **不要在桌面端加录入**：手机是唯一入口，桌面只做复盘。
3. **验证优先于实现**：性能、布局、数据完整性都要有可量化的测试；看到"截图不对"先用 CDP 量数据，别改样式。
