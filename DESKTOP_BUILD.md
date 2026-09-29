# Windows 内测桌面版

桌面版采用 Electron + PyInstaller：保留现有 React 界面，启动时自动拉起本地 FastAPI 服务，患者数据默认留在本机。

## 构建环境

- Windows 10/11
- Node.js 20+
- Python 3.12（构建脚本会自动创建独立的 `.venv-desktop` 环境）

## 构建

```powershell
npm install
npm run desktop:build
```

桌面构建使用 `backend/requirements-desktop.txt`，不复用全局 Python 环境。姿态关键点推理位于现有前端，因此桌面后端不重复打包 Python MediaPipe；OpenCV 使用无 GUI 版本以减少体积。

安装产物位于 `release-lean/`。当前内测版生成一键安装程序；`win-unpacked/` 可用于无需安装的技术验证。

## 内测隐私边界

- 默认不上传患者数据。
- LLM/联网能力仍取决于本地 `.env` 配置；内测分发前不要把真实 API 密钥写入安装包。
- 本地数据库、报告和媒体文件应纳入备份与清理制度。
- 反馈收集应优先使用匿名错误日志和问卷，不自动上传原始视频、姓名或报告正文。
