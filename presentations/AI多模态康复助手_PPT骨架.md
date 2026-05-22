const pptxgen = require("/home/claude/.npm-global/lib/node_modules/pptxgenjs");
const React = require("/home/claude/.npm-global/lib/node_modules/react");
const ReactDOMServer = require("/home/claude/.npm-global/lib/node_modules/react-dom/server");
const sharp = require("/home/claude/.npm-global/lib/node_modules/sharp");
const {
  FaHospital, FaBrain, FaMicrophone, FaChartLine, FaUsers,
  FaRobot, FaCheckCircle, FaDatabase, FaFileAlt, FaStethoscope, FaShieldAlt
} = require("/home/claude/.npm-global/lib/node_modules/react-icons/fa");

// ─── 晨雾·呼吸 配色系统 ──────────────────────────────────────────
const C = {
  // 深色层
  deepBg:     "1C2B3A",   // 最深底色
  midBg:      "243548",   // 次深底色
  darkCard:   "1A2D3E",   // 深色卡片

  // 主色蓝
  primary:    "2D4A6B",   // 主色
  primaryMid: "3D5F82",   // 主色中调
  skyBlue:    "7BAFD4",   // 天蓝中调
  iceBlue:    "A8C0D6",   // 冰蓝文字
  fog:        "D4E4F0",   // 雾色浅调

  // 强调金
  gold:       "E8C07A",   // 晨光金 — 核心强调色
  goldDark:   "C49A3A",   // 深金
  goldLight:  "F5DFA0",   // 浅金

  // 浅色层
  lightBg:    "F0F4F8",   // 页面浅底
  white:      "FFFFFF",   // 纯白卡片
  cardBorder: "DDE8F2",   // 卡片边框

  // 功能色
  success:    "4A9B7A",   // 成功绿
  warning:    "E8A020",   // 警示橙
  danger:     "D05050",   // 危险红

  // 文字
  textPrimary:"1C2B3A",   // 深色文字（浅底用）
  textMid:    "4A6B8A",   // 中性文字
  textMuted:  "7A9AB5",   // 次要文字（深底用）
};

const makeShadow = () => ({
  type: "outer", color: "000000", blur: 10, offset: 2, angle: 135, opacity: 0.10
});

async function iconPng(IC, color = "#FFFFFF", size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(IC, { color, size: String(size) })
  );
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.title = "Medical AI Workspace — 晨雾版";

  const ic = {
    brain:    await iconPng(FaBrain,       "#FFFFFF"),
    mic:      await iconPng(FaMicrophone,  "#FFFFFF"),
    chart:    await iconPng(FaChartLine,   "#FFFFFF"),
    users:    await iconPng(FaUsers,       "#FFFFFF"),
    robot:    await iconPng(FaRobot,       "#FFFFFF"),
    hospital: await iconPng(FaHospital,    "#FFFFFF"),
    db:       await iconPng(FaDatabase,    "#FFFFFF"),
    file:     await iconPng(FaFileAlt,     "#FFFFFF"),
    steth:    await iconPng(FaStethoscope, "#FFFFFF"),
    shield:   await iconPng(FaShieldAlt,   "#FFFFFF"),
    check:    await iconPng(FaCheckCircle, "#4A9B7A"),
    checkGold:await iconPng(FaCheckCircle, "#E8C07A"),
  };

  // ─── SLIDE 1: 封面 ─────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.deepBg };

    // 右上角光晕圆 — 晨雾感核心
    s.addShape(pres.shapes.OVAL, {
      x: 6.2, y: -1.5, w: 5.5, h: 5.5,
      fill: { color: C.skyBlue, transparency: 88 }, line: { color: C.skyBlue, transparency: 82, width: 0.5 }
    });
    s.addShape(pres.shapes.OVAL, {
      x: 7.5, y: -0.5, w: 3.2, h: 3.2,
      fill: { color: C.gold, transparency: 92 }, line: { color: C.gold, transparency: 85, width: 0.5 }
    });

    // 左侧金色竖条
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 0.1, h: 5.625,
      fill: { color: C.gold }
    });

    // 项目标签胶囊
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 0.78, w: 2.0, h: 0.3,
      fill: { color: C.primary }, line: { color: C.skyBlue, transparency: 70, width: 0.5 }
    });
    s.addText("医疗 AI · 大创项目", {
      x: 0.5, y: 0.78, w: 2.0, h: 0.3,
      fontSize: 9.5, color: C.iceBlue, bold: true, align: "center", valign: "middle"
    });

    // 主标题
    s.addText("Medical AI", {
      x: 0.48, y: 1.32, w: 8, h: 0.85,
      fontSize: 52, color: C.white, bold: true, fontFace: "Arial Black", margin: 0
    });
    s.addText("Workspace", {
      x: 0.48, y: 2.1, w: 8, h: 0.85,
      fontSize: 52, color: C.gold, bold: true, fontFace: "Arial Black", margin: 0
    });

    // 副标题
    s.addText("AI 驱动的智能医疗评估平台", {
      x: 0.48, y: 3.1, w: 7, h: 0.35,
      fontSize: 13, color: C.skyBlue, margin: 0
    });
    s.addText("面向康复科 / 骨科 / 运动医学的接诊全流程解决方案", {
      x: 0.48, y: 3.46, w: 7.5, h: 0.3,
      fontSize: 11, color: C.textMuted, margin: 0
    });

    // 底部三个stat
    const stats = [
      { v: "3 大模块", l: "体态 · ROM · 语音问诊" },
      { v: "全流程", l: "接诊→评估→报告→数据" },
      { v: "已落地", l: "真实医院合作验证" },
    ];
    stats.forEach((st, i) => {
      const bx = 0.48 + i * 3.1;
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 4.32, w: 2.82, h: 0.92,
        fill: { color: C.primary, transparency: 75 },
        line: { color: C.skyBlue, transparency: 72, width: 0.5 }
      });
      s.addText(st.v, {
        x: bx, y: 4.36, w: 2.82, h: 0.38,
        fontSize: 16, color: C.gold, bold: true, align: "center", margin: 0
      });
      s.addText(st.l, {
        x: bx, y: 4.76, w: 2.82, h: 0.28,
        fontSize: 9, color: C.iceBlue, align: "center", margin: 0
      });
    });
  }

  // ─── SLIDE 2: 痛点 ─────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.lightBg };

    s.addText("我们在解决什么问题？", {
      x: 0.48, y: 0.28, w: 9.0, h: 0.58,
      fontSize: 30, color: C.textPrimary, bold: true, margin: 0
    });
    s.addText("当前康复 / 骨科门诊面临的三大核心痛点", {
      x: 0.48, y: 0.9, w: 9.0, h: 0.28,
      fontSize: 12, color: C.textMid, margin: 0
    });

    const pains = [
      {
        icon: ic.steth, color: C.warning,
        title: "评估效率低",
        desc: "传统体态与关节活动度评估依赖医师肉眼判断，耗时长，主观差异大，难以标准化记录",
        stat: "平均耗时 15–25 min / 人"
      },
      {
        icon: ic.file, color: C.primary,
        title: "病历质量差",
        desc: "口述记录信息丢失严重，语言不规范，结构化程度低，后续复诊难以有效复用",
        stat: "约 40% 信息在转录中流失"
      },
      {
        icon: ic.db, color: C.success,
        title: "数据无法沉淀",
        desc: "评估结果分散在纸质记录或多个系统，无法跨接诊形成患者历史趋势分析",
        stat: "90% 诊所缺乏结构化数据"
      },
    ];

    const cW = (9.2 - 0.36) / 3;
    pains.forEach((p, i) => {
      const bx = 0.48 + i * (cW + 0.18);
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 1.32, w: cW, h: 3.98,
        fill: { color: C.white }, shadow: makeShadow(), line: { color: C.cardBorder, width: 0.5 }
      });
      // 顶部色条
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 1.32, w: cW, h: 0.07, fill: { color: p.color }
      });
      // 图标圆
      s.addShape(pres.shapes.OVAL, {
        x: bx + 0.26, y: 1.52, w: 0.65, h: 0.65, fill: { color: p.color }
      });
      s.addImage({ data: p.icon, x: bx + 0.33, y: 1.59, w: 0.51, h: 0.51 });
      // 标题
      s.addText(p.title, {
        x: bx + 0.14, y: 2.3, w: cW - 0.28, h: 0.4,
        fontSize: 17, color: C.textPrimary, bold: true, margin: 0
      });
      // 描述
      s.addText(p.desc, {
        x: bx + 0.14, y: 2.78, w: cW - 0.28, h: 1.0,
        fontSize: 10.5, color: C.textMid, lineSpacingMultiple: 1.55, margin: 0
      });
      // stat框
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx + 0.14, y: 4.0, w: cW - 0.28, h: 0.72,
        fill: { color: C.lightBg }, line: { color: C.cardBorder, width: 0.5 }
      });
      s.addText(p.stat, {
        x: bx + 0.14, y: 4.0, w: cW - 0.28, h: 0.72,
        fontSize: 10.5, color: p.color, bold: true, align: "center", valign: "middle"
      });
    });
  }

  // ─── SLIDE 3: 解决方案 ─────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.deepBg };

    // 右下角装饰
    s.addShape(pres.shapes.OVAL, {
      x: 7.0, y: 3.0, w: 4.0, h: 4.0,
      fill: { color: C.primary, transparency: 82 }, line: { color: C.skyBlue, transparency: 78, width: 0.5 }
    });

    s.addText("我们的解决方案", {
      x: 0.48, y: 0.28, w: 9.0, h: 0.58,
      fontSize: 30, color: C.white, bold: true, margin: 0
    });
    s.addText("一体化 AI 医疗评估工作台，覆盖接诊全链路", {
      x: 0.48, y: 0.88, w: 9.0, h: 0.28,
      fontSize: 12, color: C.textMuted, margin: 0
    });

    const steps = [
      { icon: ic.users,   label: "接诊中心", sub: "患者任务看板\n状态实时追踪",    color: C.gold },
      { icon: ic.brain,   label: "评估中心", sub: "体态 + ROM + 语音\n三模块 AI 评估", color: C.skyBlue },
      { icon: ic.chart,   label: "报告中心", sub: "AI 整合报告生成\nPDF / JSON 导出", color: C.success },
      { icon: ic.db,      label: "数据中心", sub: "历史数据沉淀\n趋势分析",         color: C.primaryMid },
    ];

    const cW = (9.2 - 0.54) / 4;
    steps.forEach((st, i) => {
      const bx = 0.48 + i * (cW + 0.18);
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 1.38, w: cW, h: 3.62,
        fill: { color: C.midBg }, line: { color: C.primary, transparency: 60, width: 0.5 }
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 1.38, w: cW, h: 0.07, fill: { color: st.color }
      });
      s.addShape(pres.shapes.OVAL, {
        x: bx + cW / 2 - 0.34, y: 1.6, w: 0.68, h: 0.68,
        fill: { color: st.color, transparency: 15 }
      });
      s.addImage({ data: st.icon, x: bx + cW / 2 - 0.27, y: 1.67, w: 0.54, h: 0.54 });
      s.addText(st.label, {
        x: bx, y: 2.42, w: cW, h: 0.36,
        fontSize: 14, color: C.white, bold: true, align: "center", margin: 0
      });
      s.addText(st.sub, {
        x: bx + 0.1, y: 2.86, w: cW - 0.2, h: 0.82,
        fontSize: 10, color: C.textMuted, align: "center", lineSpacingMultiple: 1.55, margin: 0
      });
      // 步骤编号
      s.addShape(pres.shapes.OVAL, {
        x: bx + cW / 2 - 0.28, y: 4.48, w: 0.56, h: 0.32,
        fill: { color: st.color, transparency: 68 }
      });
      s.addText(`0${i + 1}`, {
        x: bx + cW / 2 - 0.28, y: 4.48, w: 0.56, h: 0.32,
        fontSize: 10, color: C.white, bold: true, align: "center", valign: "middle", margin: 0
      });
      // 箭头
      if (i < 3) {
        s.addShape(pres.shapes.LINE, {
          x: bx + cW + 0.04, y: 3.24, w: 0.1, h: 0,
          line: { color: C.gold, width: 1.5 }
        });
      }
    });

    // 底部技术标签
    const tags = ["计算机视觉体态分析", "关节角度 AI 检测", "语音实时转写 + NLP 结构化"];
    tags.forEach((t, i) => {
      const tx = 0.9 + i * 2.88;
      s.addShape(pres.shapes.RECTANGLE, {
        x: tx, y: 5.1, w: 2.6, h: 0.3,
        fill: { color: C.primary, transparency: 72 },
        line: { color: C.skyBlue, transparency: 60, width: 0.5 }
      });
      s.addText(t, {
        x: tx, y: 5.1, w: 2.6, h: 0.3,
        fontSize: 9.5, color: C.skyBlue, align: "center", valign: "middle", bold: true
      });
    });
  }

  // ─── SLIDE 4: 三大模块 ─────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.lightBg };

    s.addText("三大核心评估模块", {
      x: 0.48, y: 0.28, w: 9.0, h: 0.58,
      fontSize: 30, color: C.textPrimary, bold: true, margin: 0
    });
    s.addText("每个模块独立完整，协同形成综合报告", {
      x: 0.48, y: 0.9, w: 9.0, h: 0.28,
      fontSize: 12, color: C.textMid, margin: 0
    });

    const mods = [
      {
        icon: ic.brain, color: C.primary, badgeColor: C.skyBlue,
        title: "体态评估",
        points: ["计算机视觉实时检测关键骨骼点", "识别肩 / 头 / 骨盆偏移与倾斜", "稳定性风险量化评分", "自动生成正面 / 侧面分析报告"],
        badge: "已完成 30 条记录", done: true
      },
      {
        icon: ic.steth, color: C.gold, badgeColor: C.warning,
        title: "ROM 关节评估",
        points: ["5 大关节 × 左右双侧测量", "屈曲 / 伸展 / 外展 / 内收 / 旋转", "单项 30–50 秒快速完成", "受限方向与左右差异对比"],
        badge: "已完成 5 条记录", done: true
      },
      {
        icon: ic.mic, color: C.success, badgeColor: C.success,
        title: "语音问诊",
        points: ["实时转写 + AI 结构化解析", "主诉 / 现病史 / 既往史自动填充", "支持标准 SOAP 格式输出", "可导出文本，减少手动录入"],
        badge: "已完成 1 条记录", done: true
      },
    ];

    const cW = (9.2 - 0.36) / 3;
    mods.forEach((m, i) => {
      const bx = 0.48 + i * (cW + 0.18);
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 1.32, w: cW, h: 4.0,
        fill: { color: C.white }, shadow: makeShadow(), line: { color: C.cardBorder, width: 0.5 }
      });
      // 顶色栏
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 1.32, w: cW, h: 0.62, fill: { color: m.color }
      });
      s.addShape(pres.shapes.OVAL, {
        x: bx + 0.14, y: 1.4, w: 0.46, h: 0.46,
        fill: { color: C.white, transparency: 75 }
      });
      s.addImage({ data: m.icon, x: bx + 0.16, y: 1.42, w: 0.42, h: 0.42 });
      s.addText(m.title, {
        x: bx + 0.7, y: 1.4, w: cW - 0.82, h: 0.46,
        fontSize: 16, color: C.white, bold: true, valign: "middle", margin: 0
      });

      // 要点
      m.points.forEach((pt, j) => {
        const py = 2.1 + j * 0.52;
        s.addImage({ data: ic.check, x: bx + 0.16, y: py + 0.05, w: 0.22, h: 0.22 });
        s.addText(pt, {
          x: bx + 0.44, y: py, w: cW - 0.58, h: 0.36,
          fontSize: 10.5, color: C.textMid, valign: "middle", margin: 0
        });
      });

      // 底部badge
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx + 0.14, y: 4.82, w: cW - 0.28, h: 0.3,
        fill: { color: C.lightBg }, line: { color: C.cardBorder, width: 0.5 }
      });
      s.addText(m.badge, {
        x: bx + 0.14, y: 4.82, w: cW - 0.28, h: 0.3,
        fontSize: 9.5, color: m.badgeColor, bold: true, align: "center", valign: "middle"
      });
    });
  }

  // ─── SLIDE 5: 市场分析 ─────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.lightBg };

    s.addText("市场规模与机遇", {
      x: 0.48, y: 0.28, w: 9.0, h: 0.58,
      fontSize: 30, color: C.textPrimary, bold: true, margin: 0
    });
    s.addText("中国康复医疗市场正处于快速扩张期", {
      x: 0.48, y: 0.9, w: 9.0, h: 0.28,
      fontSize: 12, color: C.textMid, margin: 0
    });

    const stats = [
      { n: "千亿级", l: "中国康复医疗市场规模（2025E）", c: C.primary },
      { n: "80%+",  l: "门诊评估流程仍依赖人工操作",   c: C.warning },
      { n: "3–5×",  l: "AI 辅助评估效率提升倍数",      c: C.success },
    ];
    stats.forEach((st, i) => {
      const by = 1.38 + i * 1.28;
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.48, y: by, w: 4.5, h: 1.08,
        fill: { color: C.white }, shadow: makeShadow(), line: { color: C.cardBorder, width: 0.5 }
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.48, y: by, w: 0.1, h: 1.08, fill: { color: st.c }
      });
      s.addText(st.n, {
        x: 0.76, y: by + 0.1, w: 1.8, h: 0.52,
        fontSize: 28, color: st.c, bold: true, fontFace: "Arial Black", margin: 0
      });
      s.addText(st.l, {
        x: 0.76, y: by + 0.64, w: 4.0, h: 0.3,
        fontSize: 11, color: C.textMid, margin: 0
      });
    });

    s.addText("调研数据来源", {
      x: 5.3, y: 1.32, w: 4.2, h: 0.3,
      fontSize: 11, color: C.textMid, bold: true, margin: 0
    });
    s.addChart(pres.charts.PIE,
      [{ name: "需求", labels: ["非常需要", "比较需要", "一般", "不需要"], values: [58, 28, 10, 4] }],
      {
        x: 5.3, y: 1.65, w: 4.2, h: 3.1,
        chartColors: [C.primary, C.skyBlue, C.cardBorder, "CBD5E1"],
        showPercent: true, showLegend: true, legendPos: "b",
        legendFontSize: 10, dataLabelColor: C.white, dataLabelFontBold: true,
        chartArea: { fill: { color: C.lightBg } },
      }
    );

    s.addText("来源：团队一手市场调研（n=200+，覆盖三甲医院、专科诊所）", {
      x: 0.48, y: 5.25, w: 9.0, h: 0.22,
      fontSize: 9, color: C.textMid, italic: true
    });
  }

  // ─── SLIDE 6: 竞争对比 ─────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.lightBg };

    s.addText("竞争优势对比", {
      x: 0.48, y: 0.28, w: 9.0, h: 0.58,
      fontSize: 30, color: C.textPrimary, bold: true, margin: 0
    });
    s.addText("我们在哪里做得更好？", {
      x: 0.48, y: 0.9, w: 9.0, h: 0.28,
      fontSize: 12, color: C.textMid, margin: 0
    });

    const cols  = ["能力维度", "传统人工", "单一 AI 工具", "Medical AI Workspace"];
    const colX  = [0.38, 2.78, 4.78, 6.78];
    const colW  = [2.3, 1.9, 1.9, 3.0];

    cols.forEach((c, i) => {
      const isCur = i === 3;
      s.addShape(pres.shapes.RECTANGLE, {
        x: colX[i], y: 1.32, w: colW[i], h: 0.48,
        fill: { color: isCur ? C.primary : C.deepBg }, line: { color: C.white, width: 0.5 }
      });
      s.addText(c, {
        x: colX[i], y: 1.32, w: colW[i], h: 0.48,
        fontSize: isCur ? 11 : 10, color: isCur ? C.gold : C.white,
        bold: true, align: "center", valign: "middle"
      });
    });

    const rows = [
      ["体态评估准确性", "★★☆", "★★★", "★★★"],
      ["ROM 评估速度",   "慢（15min+）", "快（单项）", "快（全流程）"],
      ["语音结构化病历", "✗", "部分", "✓ 完整 SOAP"],
      ["流程一体化",     "✗", "✗", "✓ 全链路"],
      ["数据历史追踪",   "纸质记录", "有限", "✓ 自动沉淀"],
      ["报告导出",       "手写", "有限", "PDF / MD / JSON"],
    ];

    rows.forEach((row, ri) => {
      const by = 1.8 + ri * 0.56;
      const bg = ri % 2 === 0 ? C.white : C.lightBg;
      row.forEach((cell, ci) => {
        const isCur = ci === 3;
        const isLabel = ci === 0;
        s.addShape(pres.shapes.RECTANGLE, {
          x: colX[ci], y: by, w: colW[ci], h: 0.5,
          fill: { color: isCur ? "EAF2F8" : bg }, line: { color: C.cardBorder, width: 0.5 }
        });
        s.addText(cell, {
          x: colX[ci], y: by, w: colW[ci], h: 0.5,
          fontSize: 11, color: isCur ? C.primary : (isLabel ? C.textPrimary : C.textMid),
          bold: isCur || isLabel, align: "center", valign: "middle"
        });
      });
    });
  }

  // ─── SLIDE 7: 商业模式 ─────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.deepBg };

    s.addShape(pres.shapes.OVAL, {
      x: -1.2, y: 3.0, w: 5.0, h: 5.0,
      fill: { color: C.primary, transparency: 85 }, line: { color: C.skyBlue, transparency: 80, width: 0.5 }
    });

    s.addText("商业模式", {
      x: 0.48, y: 0.28, w: 9.0, h: 0.58,
      fontSize: 30, color: C.white, bold: true, margin: 0
    });
    s.addText("聚焦 To B，以数据服务构建长期壁垒", {
      x: 0.48, y: 0.88, w: 9.0, h: 0.28,
      fontSize: 12, color: C.textMuted, margin: 0
    });

    const models = [
      { icon: ic.hospital, color: C.gold,       tag: "主要收入", title: "SaaS 订阅",   sub: "面向医院 / 诊所\n按科室或坐席收费" },
      { icon: ic.file,     color: C.skyBlue,    tag: "快速变现", title: "报告增值服务", sub: "AI 综合报告生成\n按次或按量计费" },
      { icon: ic.db,       color: C.success,    tag: "长期壁垒", title: "数据服务",    sub: "匿名化数据分析\n科研合作与授权" },
      { icon: ic.shield,   color: C.primaryMid, tag: "高价值",   title: "定制部署",    sub: "私有化 + 深度集成\n大型三甲医院" },
    ];

    const cW = (9.2 - 0.54) / 4;
    models.forEach((m, i) => {
      const bx = 0.48 + i * (cW + 0.18);
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 1.38, w: cW, h: 3.62,
        fill: { color: C.midBg }, line: { color: C.primary, transparency: 65, width: 0.5 }
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 1.38, w: cW, h: 0.07, fill: { color: m.color }
      });
      s.addShape(pres.shapes.OVAL, {
        x: bx + cW / 2 - 0.34, y: 1.6, w: 0.68, h: 0.68,
        fill: { color: m.color }
      });
      s.addImage({ data: m.icon, x: bx + cW / 2 - 0.27, y: 1.67, w: 0.54, h: 0.54 });
      s.addText(m.title, {
        x: bx + 0.06, y: 2.42, w: cW - 0.12, h: 0.36,
        fontSize: 13, color: C.white, bold: true, align: "center", margin: 0
      });
      s.addText(m.sub, {
        x: bx + 0.1, y: 2.86, w: cW - 0.2, h: 0.72,
        fontSize: 10, color: C.textMuted, align: "center", lineSpacingMultiple: 1.55, margin: 0
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx + 0.22, y: 3.78, w: cW - 0.44, h: 0.3,
        fill: { color: m.color, transparency: 72 }, line: { color: m.color, transparency: 55, width: 0.5 }
      });
      s.addText(m.tag, {
        x: bx + 0.22, y: 3.78, w: cW - 0.44, h: 0.3,
        fontSize: 9.5, color: C.white, bold: true, align: "center", valign: "middle"
      });
    });

    s.addText("目标客户：康复科 · 骨科 · 运动医学科 · 专科康复诊所", {
      x: 0.48, y: 5.18, w: 9.0, h: 0.24,
      fontSize: 10, color: C.textMuted, align: "center"
    });
  }

  // ─── SLIDE 8: 团队与验证 ───────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.lightBg };

    s.addText("团队与已有验证", {
      x: 0.48, y: 0.28, w: 9.0, h: 0.58,
      fontSize: 30, color: C.textPrimary, bold: true, margin: 0
    });
    s.addText("医工交叉背景 + 真实用户验证，降低落地风险", {
      x: 0.48, y: 0.9, w: 9.0, h: 0.28,
      fontSize: 12, color: C.textMid, margin: 0
    });

    // 左：团队
    s.addText("团队优势", {
      x: 0.48, y: 1.3, w: 4.2, h: 0.32,
      fontSize: 13, color: C.primary, bold: true, margin: 0
    });

    const team = [
      { icon: ic.brain,   text: "核心成员具备医学临床背景，深度理解真实诊疗场景" },
      { icon: ic.robot,   text: "技术团队掌握计算机视觉 / NLP / 全栈开发能力" },
      { icon: ic.chart,   text: "已完成 200+ 份市场调研问卷，需求有数据支撑" },
      { icon: ic.hospital,text: "与真实医院 / 康复诊所建立合作，产品已有真实用户" },
    ];
    team.forEach((t, i) => {
      const by = 1.74 + i * 0.82;
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.48, y: by, w: 4.2, h: 0.68,
        fill: { color: C.white }, shadow: makeShadow(), line: { color: C.cardBorder, width: 0.5 }
      });
      s.addShape(pres.shapes.OVAL, {
        x: 0.62, y: by + 0.11, w: 0.46, h: 0.46, fill: { color: C.primary }
      });
      s.addImage({ data: t.icon, x: 0.65, y: by + 0.14, w: 0.4, h: 0.4 });
      s.addText(t.text, {
        x: 1.2, y: by + 0.1, w: 3.36, h: 0.48,
        fontSize: 10.5, color: C.textMid, valign: "middle", lineSpacingMultiple: 1.4, margin: 0
      });
    });

    // 右：里程碑
    s.addText("里程碑", {
      x: 5.28, y: 1.3, w: 4.2, h: 0.32,
      fontSize: 13, color: C.primary, bold: true, margin: 0
    });

    const miles = [
      { t: "2025 Q3", d: "立项，完成需求调研与原型设计",        done: true },
      { t: "2025 Q4", d: "体态评估模块上线，首批用户测试",       done: true },
      { t: "2026 Q1", d: "ROM + 语音问诊模块发布，医院合作启动", done: true },
      { t: "2026 Q2", d: "SaaS 正式商业化，扩展更多合作机构",   done: false },
    ];
    miles.forEach((m, i) => {
      const by = 1.72 + i * 0.82;
      s.addShape(pres.shapes.OVAL, {
        x: 5.3, y: by + 0.14, w: 0.38, h: 0.38,
        fill: { color: m.done ? C.gold : C.cardBorder }
      });
      if (i < 3) {
        s.addShape(pres.shapes.LINE, {
          x: 5.49, y: by + 0.52, w: 0, h: 0.48,
          line: { color: C.cardBorder, width: 1.5, dashType: "dash" }
        });
      }
      s.addText(m.t, {
        x: 5.8, y: by + 0.08, w: 1.1, h: 0.24,
        fontSize: 10, color: m.done ? C.gold : C.textMid, bold: true, margin: 0
      });
      s.addText(m.d, {
        x: 5.8, y: by + 0.32, w: 3.6, h: 0.3,
        fontSize: 10, color: C.textMid, margin: 0
      });
    });
  }

  // ─── SLIDE 9: 结尾 ─────────────────────────────────────────────
  {
    const s = pres.addSlide();
    s.background = { color: C.deepBg };

    // 装饰光晕
    s.addShape(pres.shapes.OVAL, {
      x: -0.5, y: -0.5, w: 4.5, h: 4.5,
      fill: { color: C.primary, transparency: 82 }, line: { color: C.skyBlue, transparency: 78, width: 0.5 }
    });
    s.addShape(pres.shapes.OVAL, {
      x: 7.5, y: 2.8, w: 3.5, h: 3.5,
      fill: { color: C.gold, transparency: 90 }, line: { color: C.gold, transparency: 85, width: 0.5 }
    });

    // 金色顶线
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.gold }
    });

    s.addText("让每一次接诊，都有数据撑腰。", {
      x: 0.6, y: 1.35, w: 8.8, h: 0.88,
      fontSize: 34, color: C.white, bold: true, align: "center", margin: 0
    });
    s.addText("Medical AI Workspace", {
      x: 0.6, y: 2.38, w: 8.8, h: 0.5,
      fontSize: 18, color: C.gold, align: "center", italic: true
    });

    const items = ["已有真实医院合作 ✓", "市场调研 200+ 份 ✓", "三模块全流程产品 ✓"];
    items.forEach((item, i) => {
      const bx = 1.1 + i * 2.8;
      s.addShape(pres.shapes.RECTANGLE, {
        x: bx, y: 3.32, w: 2.5, h: 0.68,
        fill: { color: C.primary, transparency: 70 },
        line: { color: C.skyBlue, transparency: 65, width: 0.5 }
      });
      s.addText(item, {
        x: bx, y: 3.32, w: 2.5, h: 0.68,
        fontSize: 11, color: C.iceBlue, bold: true, align: "center", valign: "middle"
      });
    });

    s.addText("期待与您深入交流 →", {
      x: 0.6, y: 4.3, w: 8.8, h: 0.5,
      fontSize: 14, color: C.textMuted, align: "center", italic: true
    });
  }

  await pres.writeFile({ fileName: "/home/claude/ppt/MedicalAI_晨雾版.pptx" });
  console.log("Done!");
}

main().catch(console.error);