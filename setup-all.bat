@echo off
chcp 65001 >nul
echo ========================================
echo    Rehab 项目依赖一键安装脚本
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [警告] 建议以管理员身份运行此脚本
    echo.
)

:: 1. Node.js 检查
echo [1/6] 检查 Node.js...
node --version >nul 2>&1
if %errorLevel% equ 0 (
    echo     ✓ Node.js 已安装
    node --version
) else (
    echo     ✗ Node.js 未安装
    echo     请访问 https://nodejs.org/ 下载安装
)

:: 2. Python 检查
echo.
echo [2/6] 检查 Python...
python --version >nul 2>&1
if %errorLevel% equ 0 (
    echo     ✓ Python 已安装
    python --version
) else (
    echo     ✗ Python 未安装
    echo     请访问 https://www.python.org/ 下载安装
)

:: 3. 前端依赖安装
echo.
echo [3/6] 安装前端依赖...
if exist package.json (
    call npm install
    echo     ✓ 前端依赖安装完成
) else (
    echo     ✗ 未找到 package.json
)

:: 4. 后端依赖安装
echo.
echo [4/6] 安装后端依赖...
if exist backend\requirements.txt (
    pip install -r backend\requirements.txt
    echo     ✓ 后端依赖安装完成
) else (
    echo     ✗ 未找到 backend\requirements.txt
)

:: 5. R 语言检查
echo.
echo [5/6] 检查 R 语言...
where Rscript >nul 2>&1
if %errorLevel% equ 0 (
    echo     ✓ R 已安装
    Rscript --version
) else (
    echo     ✗ R 未安装
    echo.
    echo     正在下载 R 安装程序...
    echo     请访问 https://cran.r-project.org/bin/windows/base/ 下载
    echo.
    echo     安装 R 后，请运行以下命令安装常用包：
    echo     Rscript -e "install.packages(c('ggplot2', 'ggpubr', 'plotly', 'rmarkdown', 'knitr', 'jsonlite'), repos='https://cran.rstudio.com/')"
)

:: 6. LaTeX 检查
echo.
echo [6/6] 检查 LaTeX...
where pdflatex >nul 2>&1
if %errorLevel% equ 0 (
    echo     ✓ LaTeX 已安装
) else (
    echo     ✗ LaTeX 未安装
    echo.
    echo     请选择安装方案：
    echo     - MiKTeX: https://miktex.org/download (推荐 Windows)
    echo     - TeX Live: https://tug.org/texlive/
    echo.
    echo     安装后请重启命令行窗口
)

echo.
echo ========================================
echo    安装检查完成
echo ========================================
echo.
echo 如需安装 R 或 LaTeX，请手动下载安装后重新运行此脚本。
echo.
pause
