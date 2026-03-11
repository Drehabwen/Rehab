import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { marked } from 'marked';

interface ExportElementToPdfOptions {
  element: HTMLElement;
  fileName: string;
  marginMm?: number;
}

interface ExportMarkdownToPdfOptions {
  markdown: string;
  fileName: string;
  title: string;
  subtitle?: string;
}

const addCanvasToPdf = (pdf: jsPDF, canvas: HTMLCanvasElement, marginMm: number) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - marginMm * 2;
  const availableHeight = pageHeight - marginMm * 2;
  const imageWidth = availableWidth;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const imageData = canvas.toDataURL('image/png');

  let remainingHeight = imageHeight;
  let positionY = marginMm;

  pdf.addImage(imageData, 'PNG', marginMm, positionY, imageWidth, imageHeight);
  remainingHeight -= availableHeight;

  while (remainingHeight > 0) {
    positionY = marginMm - (imageHeight - remainingHeight);
    pdf.addPage();
    pdf.addImage(imageData, 'PNG', marginMm, positionY, imageWidth, imageHeight);
    remainingHeight -= availableHeight;
  }
};

export const exportElementToPdf = async ({
  element,
  fileName,
  marginMm = 10,
}: ExportElementToPdfOptions) => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  addCanvasToPdf(pdf, canvas, marginMm);
  pdf.save(fileName);
};

export const exportMarkdownToPdf = async ({
  markdown,
  fileName,
  title,
  subtitle,
}: ExportMarkdownToPdfOptions) => {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = '794px';
  host.style.background = '#ffffff';
  host.style.padding = '40px 48px';
  host.style.color = '#0f172a';
  host.style.fontFamily = '"Microsoft YaHei", "PingFang SC", sans-serif';
  host.style.zIndex = '-1';

  const renderedMarkdown = await Promise.resolve(marked.parse(markdown));
  host.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:24px;">
      <header style="border-bottom:1px solid #e2e8f0;padding-bottom:16px;">
        <div style="font-size:28px;font-weight:700;line-height:1.3;">${title}</div>
        ${subtitle ? `<div style="margin-top:8px;font-size:14px;color:#64748b;">${subtitle}</div>` : ''}
      </header>
      <article
        style="
          font-size:15px;
          line-height:1.85;
          color:#334155;
          word-break:break-word;
        "
      >
        ${renderedMarkdown}
      </article>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    article h1, article h2, article h3, article h4 {
      color: #0f172a;
      margin: 24px 0 12px;
      line-height: 1.4;
    }
    article h1 { font-size: 28px; }
    article h2 { font-size: 22px; }
    article h3 { font-size: 18px; }
    article p { margin: 0 0 12px; }
    article ul, article ol { margin: 0 0 12px 20px; padding: 0; }
    article li { margin-bottom: 6px; }
    article blockquote {
      margin: 16px 0;
      padding: 12px 16px;
      border-left: 4px solid #cbd5e1;
      background: #f8fafc;
      color: #475569;
    }
    article table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 14px;
    }
    article th, article td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
    }
    article th {
      background: #f8fafc;
      color: #0f172a;
    }
  `;

  host.appendChild(style);
  document.body.appendChild(host);

  try {
    await exportElementToPdf({ element: host, fileName, marginMm: 8 });
  } finally {
    document.body.removeChild(host);
  }
};
