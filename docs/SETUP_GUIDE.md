# Rehab 项目依赖配置指南

## 一、已安装依赖 ✅

| 依赖 | 版本 | 用途 |
|------|------|------|
| Node.js | v24.13.1 | 前端运行时 |
| Python | 3.14 / 3.9 | 后端运行时 |
| npm | 随 Node.js | 包管理器 |

## 二、待安装依赖

### 1. R 语言 (统计分析/绑图)

**下载地址**: https://cran.r-project.org/bin/windows/base/

**安装后执行**:
```r
# 在 R 控制台运行
install.packages(c(
  'ggplot2',    # 高级绑图
  'ggpubr',     # 出版级图表
  'plotly',     # 交互图表
  'rmarkdown',  # R Markdown
  'knitr',      # 动态报告
  'jsonlite',   # JSON 处理
  'dplyr',      # 数据处理
  'tidyr'       # 数据整理
), repos='https://cran.rstudio.com/')
```

**验证安装**:
```bash
Rscript -e "library(ggplot2); print('R ggplot2 OK')"
```

---

### 2. LaTeX (文档排版)

**推荐方案**: MiKTeX (Windows)

**下载地址**: https://miktex.org/download

**安装后验证**:
```bash
pdflatex --version
```

**常用宏包** (MiKTeX 会自动安装):
- `graphicx` - 图片支持
- `booktabs` - 专业表格
- `ctex` - 中文支持
- `geometry` - 页面设置
- `hyperref` - 超链接

---

## 三、项目依赖安装

### 前端依赖
```bash
npm install
```

**主要依赖**:
| 包名 | 用途 |
|------|------|
| react | UI 框架 |
| mediapipe | 姿态检测 |
| zustand | 状态管理 |
| dexie | IndexedDB |
| recharts | 图表库 |
| jspdf | PDF 生成 |

### 后端依赖
```bash
pip install -r backend/requirements.txt
```

**主要依赖**:
| 包名 | 用途 |
|------|------|
| fastapi | Web 框架 |
| mediapipe | 姿态检测 |
| opencv-python | 图像处理 |
| openai | LLM 接口 |
| reportlab | PDF 生成 |

---

## 四、一键安装

运行项目根目录下的 `setup-all.bat`:

```bash
.\setup-all.bat
```

此脚本会:
1. 检查 Node.js
2. 检查 Python
3. 安装前端依赖
4. 安装后端依赖
5. 检查 R 语言
6. 检查 LaTeX

---

## 五、环境变量配置

如需在任意目录使用 R 和 LaTeX，请添加到 PATH:

**R**:
```
C:\Program Files\R\R-4.x.x\bin
```

**MiKTeX**:
```
C:\Program Files\MiKTeX\miktex\bin\x64
```

---

## 六、验证完整环境

```bash
# 验证所有依赖
node --version      # Node.js
python --version    # Python
Rscript --version   # R
pdflatex --version  # LaTeX
npm run dev         # 启动前端
python backend/main.py  # 启动后端
```

---

*更新日期: 2025-02-15*
