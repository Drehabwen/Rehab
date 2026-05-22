import fs from "node:fs/promises";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import sharp from "sharp";
import slides from "./slides/index.js";
import designSystem from "./assets/medical_ai_design_system.json" with { type: "json" };

const ROOT = path.resolve(process.cwd());
const OUTPUT_DIR = path.join(ROOT, "presentations", "exports");
const OUTPUT_BASENAME = "AI多模态康复助手";
const OUTPUT_FILE = path.join(OUTPUT_DIR, `${OUTPUT_BASENAME}.pptx`);

const DS = designSystem;
const C = {
  deepBg: toSolid(DS.colors.deep.deepBg),
  midBg: toSolid(DS.colors.deep.midBg),
  darkCard: toSolid(DS.colors.deep.darkCard),
  primary: toSolid(DS.colors.primary.primary),
  primaryMid: toSolid(DS.colors.primary.primaryMid),
  skyBlue: toSolid(DS.colors.primary.skyBlue),
  iceBlue: toSolid(DS.colors.primary.iceBlue),
  fog: toSolid(DS.colors.primary.fog),
  gold: toSolid(DS.colors.accent.gold),
  goldDark: toSolid(DS.colors.accent.goldDark),
  goldLight: toSolid(DS.colors.accent.goldLight),
  lightBg: toSolid(DS.colors.light.lightBg),
  white: toSolid(DS.colors.light.white),
  cardBorder: toSolid(DS.colors.light.cardBorder),
  success: toSolid(DS.colors.semantic.success),
  warning: toSolid(DS.colors.semantic.warning),
  danger: toSolid(DS.colors.semantic.danger),
  textPrimary: toSolid(DS.colors.text.textPrimary),
  textMid: toSolid(DS.colors.text.textMid),
  textMuted: toSolid(DS.colors.text.textMuted),
};
const SP = DS.spacing;
const GRID = DS.grid;
const COMP = DS.components;
const TYPO = DS.typography;
const SCALE = TYPO.scale;
const FONT = TYPO.fontFace;
const TOP_ACCENT_H = DS.slideTemplates.ending.topAccentBar.h;

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function toSolid(hex) {
  return hex.replace("#", "").toUpperCase();
}

function makeShadow() {
  const s = COMP.card.shadow;
  return {
    type: s.type,
    color: toSolid(s.color),
    blur: s.blur,
    offset: s.offset,
    angle: s.angle,
    opacity: s.opacity,
  };
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toCropPx(meta, crop) {
  const w = meta?.width ?? 0;
  const h = meta?.height ?? 0;
  if (!w || !h) return null;
  if (!crop) return null;

  const left = clampNumber(Number(crop.left ?? 0), 0, 0.9);
  const right = clampNumber(Number(crop.right ?? 0), 0, 0.9);
  const top = clampNumber(Number(crop.top ?? 0), 0, 0.9);
  const bottom = clampNumber(Number(crop.bottom ?? 0), 0, 0.9);

  const x = Math.round(w * left);
  const y = Math.round(h * top);
  const width = Math.round(w * (1 - left - right));
  const height = Math.round(h * (1 - top - bottom));

  if (width <= 0 || height <= 0) return null;
  return {
    left: clampNumber(x, 0, w - 1),
    top: clampNumber(y, 0, h - 1),
    width: clampNumber(width, 1, w),
    height: clampNumber(height, 1, h),
  };
}

function bufferToPptxData(mime, buffer) {
  return `${mime};base64,${buffer.toString("base64")}`;
}

async function buildFigureAssets(absPath, crop) {
  const meta = await sharp(absPath).metadata();
  const cropPx = toCropPx(meta, crop);

  const base = cropPx ? sharp(absPath).extract(cropPx) : sharp(absPath);

  const mainBuffer = await base.clone().jpeg({ quality: 84 }).toBuffer();
  const blurBuffer = await base
    .clone()
    .resize({ width: 1400, withoutEnlargement: true })
    .blur(18)
    .jpeg({ quality: 62 })
    .toBuffer();

  return {
    mainData: bufferToPptxData("image/jpeg", mainBuffer),
    blurData: bufferToPptxData("image/jpeg", blurBuffer),
  };
}

async function loadSlideData(entry) {
  const mod = await entry.component();
  const data = mod?.default ?? {};
  const slideId = safeText(data.id ?? entry.id ?? "");
  const figures = Array.isArray(data.figures) ? data.figures : [];
  const resolvedFigures = [];
  for (const fig of figures) {
    const raw =
      typeof fig === "string"
        ? safeText(fig)
        : safeText(fig?.path ?? fig?.src ?? "");
    if (!raw) continue;
    const abs = path.isAbsolute(raw) ? raw : path.join(ROOT, raw);
    try {
      await fs.access(abs);
    } catch {
      continue;
    }
    const crop =
      typeof fig === "object" && fig && typeof fig.crop === "object"
        ? fig.crop
        : null;
    const assets = await buildFigureAssets(abs, crop);
    resolvedFigures.push({
      path: abs,
      caption:
        typeof fig === "object" && fig
          ? safeText(fig.caption ?? fig.title ?? "")
          : "",
      crop,
      mainData: assets.mainData,
      blurData: assets.blurData,
    });
  }
  return {
    id: slideId,
    title: safeText(data.title ?? ""),
    bullets: Array.isArray(data.bullets) ? data.bullets.map(safeText) : [],
    notes: safeText(data.notes ?? ""),
    placeholders: Array.isArray(data.placeholders)
      ? data.placeholders.map(safeText).filter(Boolean)
      : [],
    figures: resolvedFigures,
  };
}

function addHeaderBar(slide, title, sid) {
  slide.addShape(ppt.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SP.slideWidth,
    h: TOP_ACCENT_H,
    fill: { color: C.gold },
    line: { color: C.gold },
  });

  slide.addText(title, {
    x: SP.safeArea.xMin,
    y: SP.layout.titleY,
    w: SP.safeArea.contentWidth - 1.1,
    h: SP.layout.titleH,
    fontFace: FONT.title,
    fontSize: SCALE.pageTitle.fontSize,
    bold: true,
    color: C.textPrimary,
    margin: 0,
  });

  slide.addText(`#${sid}`, {
    x: SP.safeArea.xMax - 1.1,
    y: SP.layout.titleY + 0.04,
    w: 1.1,
    h: 0.3,
    fontFace: FONT.body,
    fontSize: 11,
    bold: true,
    color: C.textMuted,
    align: "right",
    margin: 0,
  });
}

function addFooter(slide, page, total) {
  slide.addShape(ppt.ShapeType.rect, {
    x: 0,
    y: SP.safeArea.yEnd,
    w: SP.slideWidth,
    h: SP.margin.bottom,
    fill: { color: C.lightBg },
    line: { color: C.lightBg },
  });

  slide.addText("AI多模态康复助手", {
    x: SP.safeArea.xMin,
    y: SP.safeArea.yEnd + 0.02,
    w: SP.safeArea.contentWidth,
    h: SP.margin.bottom - 0.02,
    fontFace: FONT.body,
    fontSize: SCALE.label.fontSize,
    color: C.textMid,
    margin: 0,
  });

  slide.addText(`${page}/${total}`, {
    x: SP.safeArea.xMax - 1.0,
    y: SP.safeArea.yEnd + 0.02,
    w: 1.0,
    h: SP.margin.bottom - 0.02,
    fontFace: FONT.body,
    fontSize: SCALE.label.fontSize,
    color: C.textMid,
    align: "right",
    margin: 0,
  });
}

function addCard(slide, { x, y, w, h, accentColor }) {
  slide.addShape(ppt.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: C.white },
    line: { color: C.cardBorder, width: COMP.card.border.width },
    shadow: makeShadow(),
  });

  if (accentColor) {
    slide.addShape(ppt.ShapeType.rect, {
      x,
      y,
      w,
      h: COMP.card.topAccentH,
      fill: { color: toSolid(accentColor) },
      line: { color: toSolid(accentColor), width: 0 },
    });
  }
}

function addBullets(
  slide,
  bullets,
  box,
) {
  const text = bullets.join("\n");
  slide.addText(text, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fontFace: FONT.body,
    fontSize: box.fontSize ?? SCALE.body.fontSize,
    color: C.textMid,
    valign: "top",
    bullet: { indent: 14 },
    lineSpacingMultiple: SCALE.body.lineSpacingMultiple,
    margin: 0,
  });
}

function addPlaceholders(slide, placeholders, box) {
  addCard(slide, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    accentColor: C.gold,
  });

  slide.addText("占位符", {
    x: box.x + COMP.card.padding,
    y: box.y + 0.16,
    w: box.w - COMP.card.padding * 2,
    h: 0.3,
    fontFace: FONT.body,
    fontSize: 12,
    bold: true,
    color: C.textPrimary,
    margin: 0,
  });

  const startY = box.y + 0.56;
  const itemH = 1.08;
  const gap = SP.gap.elementInCard;
  const maxBoxes = Math.min(3, placeholders.length);

  for (let i = 0; i < maxBoxes; i += 1) {
    const y = startY + i * (itemH + gap);
    slide.addShape(ppt.ShapeType.roundRect, {
      x: box.x + COMP.card.padding,
      y,
      w: box.w - COMP.card.padding * 2,
      h: itemH,
      fill: { color: C.lightBg },
      line: { color: C.cardBorder, width: COMP.card.border.width },
    });

    slide.addText(`图 ${i + 1}：${placeholders[i]}`, {
      x: box.x + COMP.card.padding + 0.14,
      y: y + 0.16,
      w: box.w - COMP.card.padding * 2 - 0.28,
      h: itemH - 0.28,
      fontFace: FONT.body,
      fontSize: 11,
      color: C.textMid,
      valign: "top",
      margin: 0,
    });
  }
}

function addFigures(slide, figures, box, slideId) {
  const pad = COMP.card.padding;
  addCard(slide, {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    accentColor: C.primaryMid,
  });

  const heading = figures[0]?.caption || "真实产品界面 → 架构抽象";
  slide.addText(heading, {
    x: box.x + pad,
    y: box.y + 0.16,
    w: box.w - pad * 2,
    h: 0.3,
    fontFace: FONT.body,
    fontSize: 12,
    bold: true,
    color: C.textPrimary,
    margin: 0,
  });

  const captionH = 0.3;
  const gap = SP.gap.elementInCard;
  const frameX = box.x + pad;
  const frameY = box.y + 0.56;
  const frameW = box.w - pad * 2;
  const frameH = box.h - (frameY - box.y) - pad - captionH - gap;

  const img = figures[0];
  slide.addImage({
    data: img.blurData,
    objectName: `AUTO_FIG_BLUR_${slideId}`,
    x: frameX,
    y: frameY,
    w: frameW,
    h: frameH,
    sizing: { type: "cover" },
    transparency: 88,
  });

  slide.addShape(ppt.ShapeType.roundRect, {
    x: frameX,
    y: frameY,
    w: frameW,
    h: frameH,
    fill: { color: C.lightBg, transparency: 18 },
    line: { color: C.cardBorder, width: COMP.card.border.width },
  });

  const inset = 0.08;
  slide.addImage({
    data: img.mainData,
    objectName: `AUTO_FIG_MAIN_${slideId}`,
    x: frameX + inset,
    y: frameY + inset,
    w: frameW - inset * 2,
    h: frameH - inset * 2,
    sizing: { type: "cover" },
    shadow: makeShadow(),
  });

  if (img.caption) {
    slide.addText(img.caption, {
      x: frameX,
      y: frameY + frameH + gap,
      w: frameW,
      h: captionH,
      fontFace: FONT.body,
      fontSize: SCALE.caption.fontSize,
      italic: true,
      color: C.textMuted,
      align: "center",
      margin: 0,
    });
  }
}

function addCover(slide, data) {
  slide.background = { color: C.deepBg };

  slide.addShape(ppt.ShapeType.ellipse, {
    x: DS.slideTemplates.cover.elements[0].x,
    y: DS.slideTemplates.cover.elements[0].y,
    w: DS.slideTemplates.cover.elements[0].w,
    h: DS.slideTemplates.cover.elements[0].h,
    fill: { color: DS.slideTemplates.cover.elements[0].color, transparency: DS.slideTemplates.cover.elements[0].transparency },
    line: { color: DS.slideTemplates.cover.elements[0].color, transparency: 82, width: 0.5 },
  });

  slide.addShape(ppt.ShapeType.ellipse, {
    x: DS.slideTemplates.cover.elements[1].x,
    y: DS.slideTemplates.cover.elements[1].y,
    w: DS.slideTemplates.cover.elements[1].w,
    h: DS.slideTemplates.cover.elements[1].h,
    fill: { color: DS.slideTemplates.cover.elements[1].color, transparency: DS.slideTemplates.cover.elements[1].transparency },
    line: { color: DS.slideTemplates.cover.elements[1].color, transparency: 85, width: 0.5 },
  });

  slide.addShape(ppt.ShapeType.rect, {
    x: DS.slideTemplates.cover.elements[2].x,
    y: DS.slideTemplates.cover.elements[2].y,
    w: DS.slideTemplates.cover.elements[2].w,
    h: SP.slideHeight,
    fill: { color: C.gold },
    line: { color: C.gold },
  });

  const tag = DS.slideTemplates.cover.elements[3];
  slide.addShape(ppt.ShapeType.roundRect, {
    x: tag.x,
    y: tag.y,
    w: tag.w,
    h: tag.h,
    fill: { color: C.primary },
    line: { color: C.skyBlue, transparency: 70, width: 0.5 },
  });

  slide.addText("医疗 AI · 大创项目", {
    x: tag.x,
    y: tag.y,
    w: tag.w,
    h: tag.h,
    fontFace: FONT.body,
    fontSize: SCALE.label.fontSize,
    color: C.iceBlue,
    bold: true,
    align: "center",
    valign: "middle",
    margin: 0,
  });

  slide.addText("AI多模态", {
    x: DS.slideTemplates.cover.elements[4].x,
    y: DS.slideTemplates.cover.elements[4].y,
    w: 8.0,
    h: 0.85,
    fontFace: SCALE.coverTitle.fontFace,
    fontSize: SCALE.coverTitle.fontSize,
    bold: true,
    color: C.white,
    margin: 0,
  });

  slide.addText("康复助手", {
    x: DS.slideTemplates.cover.elements[5].x,
    y: DS.slideTemplates.cover.elements[5].y,
    w: 8.0,
    h: 0.85,
    fontFace: SCALE.coverTitle.fontFace,
    fontSize: SCALE.coverTitle.fontSize,
    bold: true,
    color: C.gold,
    margin: 0,
  });

  if (data.bullets[0]) {
    slide.addText(data.bullets[0], {
      x: DS.slideTemplates.cover.elements[6].x,
      y: DS.slideTemplates.cover.elements[6].y,
      w: 7.6,
      h: 0.35,
      fontFace: FONT.body,
      fontSize: DS.slideTemplates.cover.elements[6].fontSize,
      color: C.skyBlue,
      margin: 0,
    });
  }
  if (data.bullets[1]) {
    slide.addText(data.bullets[1], {
      x: DS.slideTemplates.cover.elements[6].x,
      y: DS.slideTemplates.cover.elements[6].y + 0.36,
      w: 7.8,
      h: 0.3,
      fontFace: FONT.body,
      fontSize: 11,
      color: C.textMuted,
      margin: 0,
    });
  }

  slide.addText("团队 / 指导老师 / 日期", {
    x: SP.safeArea.xMin,
    y: 5.25,
    w: SP.safeArea.contentWidth,
    h: 0.3,
    fontFace: FONT.body,
    fontSize: 12,
    color: C.textMuted,
    margin: 0,
  });
}

const ppt = new PptxGenJS();
ppt.layout = "LAYOUT_16x9";
ppt.author = "Rehab";
ppt.subject = "AI多模态康复助手";
ppt.company = "Rehab";
ppt.title = "AI多模态康复助手";
ppt.theme = {
  headFontFace: FONT.title,
  bodyFontFace: FONT.body,
  lang: "zh-CN",
};

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const total = slides.length;
for (let i = 0; i < slides.length; i += 1) {
  const entry = slides[i];
  const data = await loadSlideData(entry);
  const slide = ppt.addSlide();

  slide.background = { color: C.lightBg };

  if (i === 0) {
    addCover(slide, data);
    slide.addNotes(`slide:${data.id}\n${data.notes || ""}`.trim());
    continue;
  }

  addHeaderBar(slide, data.title, data.id || safeText(i + 1));
  const contentY = SP.layout.contentStartY;
  const contentH = SP.safeArea.yEnd - SP.layout.contentStartY;
  const pad = COMP.card.padding;
  const accentH = COMP.card.topAccentH;

  if (data.placeholders.length > 0 || data.figures.length > 0) {
    const left = { x: GRID.leftRight.leftX, y: contentY, w: GRID.leftRight.leftW, h: contentH };
    const right = { x: GRID.leftRight.rightX, y: contentY, w: GRID.leftRight.rightW, h: contentH };

    addCard(slide, { ...left, accentColor: C.primary });
    addBullets(slide, data.bullets, {
      x: left.x + pad,
      y: left.y + accentH + pad,
      w: left.w - pad * 2,
      h: left.h - accentH - pad * 2,
    });
    if (data.figures.length > 0) addFigures(slide, data.figures, right, data.id);
    else addPlaceholders(slide, data.placeholders, right);
  } else {
    const full = { x: SP.safeArea.xMin, y: contentY, w: SP.safeArea.contentWidth, h: contentH };
    addCard(slide, { ...full, accentColor: C.primary });
    addBullets(slide, data.bullets, {
      x: full.x + pad,
      y: full.y + accentH + pad,
      w: full.w - pad * 2,
      h: full.h - accentH - pad * 2,
    });
  }
  addFooter(slide, i + 1, total);
  slide.addNotes(`slide:${data.id}\n${data.notes || ""}`.trim());
}

async function writePptxWithFallback(pptx) {
  for (let i = 0; i < 10; i += 1) {
    const fileName =
      i === 0
        ? OUTPUT_FILE
        : path.join(OUTPUT_DIR, `${OUTPUT_BASENAME}_${i}.pptx`);
    try {
      await pptx.writeFile({ fileName });
      return fileName;
    } catch (e) {
      const code = e?.code ?? "";
      if (code === "EBUSY") continue;
      throw e;
    }
  }
  throw new Error(`输出文件被占用：${OUTPUT_FILE}`);
}

const writtenFile = await writePptxWithFallback(ppt);
process.stdout.write(`OK ${writtenFile}\n`);
