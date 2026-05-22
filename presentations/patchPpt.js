import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import slides from "./slides/index.js";

const ROOT = path.resolve(process.cwd());
const EXPORTS_DIR = path.join(ROOT, "presentations", "exports");
const DEFAULT_PPT = path.join(EXPORTS_DIR, "AI多模态康复助手.pptx");

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function buildAssets(absPath, crop, outDir, slideId) {
  const meta = await sharp(absPath).metadata();
  const w = meta?.width ?? 0;
  const h = meta?.height ?? 0;

  const left = clampNumber(Number(crop?.left ?? 0), 0, 0.9);
  const right = clampNumber(Number(crop?.right ?? 0), 0, 0.9);
  const top = clampNumber(Number(crop?.top ?? 0), 0, 0.9);
  const bottom = clampNumber(Number(crop?.bottom ?? 0), 0, 0.9);

  const x = Math.round(w * left);
  const y = Math.round(h * top);
  const width = Math.round(w * (1 - left - right));
  const height = Math.round(h * (1 - top - bottom));

  const base =
    w && h && width > 0 && height > 0
      ? sharp(absPath).extract({
          left: clampNumber(x, 0, Math.max(0, w - 1)),
          top: clampNumber(y, 0, Math.max(0, h - 1)),
          width: clampNumber(width, 1, w),
          height: clampNumber(height, 1, h),
        })
      : sharp(absPath);

  const mainPath = path.join(outDir, `slide_${slideId}_main.jpg`);
  const blurPath = path.join(outDir, `slide_${slideId}_blur.jpg`);

  await base.clone().jpeg({ quality: 84 }).toFile(mainPath);
  await base
    .clone()
    .resize({ width: 1400, withoutEnlargement: true })
    .blur(18)
    .jpeg({ quality: 62 })
    .toFile(blurPath);

  return { mainPath, blurPath };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const [k, inlineV] = a.slice(2).split("=");
    const v = inlineV ?? argv[i + 1];
    out[k] = v;
    if (!inlineV) i += 1;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slideId = safeText(args.id ?? "03").padStart(2, "0");
  const pptPathRaw = safeText(args.ppt ?? "").trim();
  const pptPath = pptPathRaw
    ? path.isAbsolute(pptPathRaw)
      ? pptPathRaw
      : path.join(ROOT, pptPathRaw)
    : DEFAULT_PPT;

  const entry = slides.find((s) => safeText(s.id).padStart(2, "0") === slideId);
  if (!entry) {
    throw new Error(`找不到 slide id=${slideId}`);
  }

  const mod = await entry.component();
  const data = mod?.default ?? {};
  const figures = Array.isArray(data.figures) ? data.figures : [];
  const fig = figures[0];
  const rawPath =
    typeof fig === "string" ? safeText(fig) : safeText(fig?.path ?? fig?.src ?? "");
  if (!rawPath) throw new Error(`slide ${slideId} 未配置 figures[0].path`);

  const absImage = path.isAbsolute(rawPath) ? rawPath : path.join(ROOT, rawPath);
  await fs.access(absImage);

  const crop =
    typeof fig === "object" && fig && typeof fig.crop === "object" ? fig.crop : null;

  const outDir = path.join(EXPORTS_DIR, ".patch_assets");
  await fs.mkdir(outDir, { recursive: true });

  const { mainPath, blurPath } = await buildAssets(absImage, crop, outDir, slideId);

  const ps1 = path.join(ROOT, "presentations", "patchPpt.ps1");
  const r = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      ps1,
      "-PptPath",
      pptPath,
      "-SlideId",
      slideId,
      "-MainImage",
      mainPath,
      "-BlurImage",
      blurPath,
    ],
    { stdio: "inherit" },
  );

  if (typeof r.status === "number" && r.status !== 0) process.exit(r.status);
}

main().catch((err) => {
  process.stderr.write(`${err?.stack ?? err}\n`);
  process.exit(1);
});
