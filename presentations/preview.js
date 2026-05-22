import slides from "./slides/index.js";

const elMeta = document.getElementById("meta");
const elTitle = document.getElementById("title");
const elSid = document.getElementById("sid");
const elBullets = document.getElementById("bullets");
const elNotes = document.getElementById("notes");
const elBody = elBullets?.closest(".slide__body");
const btnPrev = document.getElementById("prev");
const btnNext = document.getElementById("next");

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStartIndex() {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get("i");
  const i = raw ? Number(raw) : 0;
  if (!Number.isFinite(i)) return 0;
  return Math.max(0, Math.min(slides.length - 1, Math.floor(i)));
}

let index = getStartIndex();
let currentLoadToken = 0;

function setIndex(nextIndex) {
  index = Math.max(0, Math.min(slides.length - 1, nextIndex));
  const url = new URL(window.location.href);
  url.searchParams.set("i", String(index));
  window.history.replaceState({}, "", url.toString());
}

function renderLoading() {
  elTitle.textContent = "加载中…";
  elSid.textContent = "";
  elBullets.innerHTML = "";
  elBody?.classList.remove("with-placeholders");
  elNotes.style.display = "none";
  elNotes.textContent = "";
}

function renderSlideData(slideData) {
  elTitle.textContent = slideData.title ?? "";
  elSid.textContent = `#${slideData.id ?? ""}`;

  const bullets = Array.isArray(slideData.bullets) ? slideData.bullets : [];
  elBullets.innerHTML = bullets
    .map((t) => `<li>${String(t)}</li>`)
    .join("");

  const figures = Array.isArray(slideData.figures) ? slideData.figures : [];
  const figureItems = figures
    .map((f) => {
      if (!f) return "";
      const caption = String(f.caption || "").trim();
      if (caption) return caption;
      const rawPath = String(f.path || f.src || "").trim();
      if (!rawPath) return "";
      const parts = rawPath.split(/[/\\]/);
      return parts[parts.length - 1] || rawPath;
    })
    .filter(Boolean);

  const placeholders = Array.isArray(slideData.placeholders)
    ? slideData.placeholders.map((p) => String(p).trim()).filter(Boolean)
    : [];

  if (placeholders.length > 0 || figureItems.length > 0) {
    elBody?.classList.add("with-placeholders");
    elNotes.style.display = "grid";
    const blocks = [
      ...figureItems.map((t, idx) => ({ label: `素材 ${idx + 1}`, text: t })),
      ...placeholders.map((t, idx) => ({ label: `占位 ${idx + 1}`, text: t })),
    ];
    elNotes.innerHTML =
      `<div class="ph-title">${figureItems.length > 0 ? "素材" : "占位符"}</div>` +
      blocks
        .map(
          (b) =>
            `<div class="ph-box"><strong>${escapeHtml(b.label)}</strong>：${escapeHtml(
              b.text,
            )}</div>`,
        )
        .join("");
  } else {
    elBody?.classList.remove("with-placeholders");
    elNotes.style.display = "none";
    elNotes.textContent = "";
  }

  elMeta.textContent = `${index + 1} / ${slides.length}`;
  btnPrev.disabled = index <= 0;
  btnNext.disabled = index >= slides.length - 1;
}

async function loadAndRender(i) {
  setIndex(i);
  const token = (currentLoadToken += 1);
  renderLoading();

  const entry = slides[index];
  if (!entry || typeof entry.component !== "function") {
    renderSlideData({ id: "?", title: "无法加载该页", bullets: [] });
    return;
  }

  try {
    const mod = await entry.component();
    if (token !== currentLoadToken) return;
    renderSlideData(mod?.default ?? { id: "?", title: "空页面", bullets: [] });
  } catch (e) {
    if (token !== currentLoadToken) return;
    renderSlideData({
      id: String(entry.id ?? "?"),
      title: "加载失败",
      bullets: [String(e?.message ?? e ?? "Unknown error")],
    });
  }
}

btnPrev.addEventListener("click", () => loadAndRender(index - 1));
btnNext.addEventListener("click", () => loadAndRender(index + 1));

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") loadAndRender(index - 1);
  if (e.key === "ArrowRight") loadAndRender(index + 1);
  if (e.key === "r" || e.key === "R") loadAndRender(index);
});

loadAndRender(index);
