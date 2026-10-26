import React, { useMemo, useRef, useState } from 'react';
import { generateCanonicalPatientId, generateShortCode, usePatientStore } from '@/store/usePatientStore';

interface ParsedRow {
  name: string;
  raw: string;
  error?: string;
}

const REQUIRED_HEADERS = ['姓名'];

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(/[,\t]/).map((cell) => cell.trim().replace(/^"|"$/g, ''));
  const nameIndex = headers.findIndex((header) => REQUIRED_HEADERS.some((item) => header.includes(item)));
  if (nameIndex < 0) return [{ name: '', raw: lines[0], error: '缺少「姓名」列' }];

  return lines.slice(1).map((line) => {
    const cells = line.split(/[,\t]/).map((cell) => cell.trim().replace(/^"|"$/g, ''));
    const name = cells[nameIndex] ?? '';
    return { name, raw: line, error: name ? undefined : '姓名为空' };
  });
}

interface ImportScreenProps {
  onDone: () => void;
  onCancel: () => void;
}

/** 历史名单导入（CSV）：解析 → 预览 → 批量建档（RehabID 自动生成） */
export const ImportScreen: React.FC<ImportScreenProps> = ({ onDone, onCancel }) => {
  const addPatient = usePatientStore((state) => state.addPatient);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const validRows = useMemo(() => rows.filter((row) => !row.error), [rows]);
  const errorRows = useMemo(() => rows.filter((row) => row.error), [rows]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setRows(parseCsv(text));
    setMessage(null);
  };

  const handleImport = async () => {
    setImporting(true);
    let success = 0;
    for (const row of validRows) {
      try {
        await addPatient(row.name, generateCanonicalPatientId(), generateShortCode());
        success += 1;
      } catch {
        // 单行失败不阻断整批
      }
    }
    setImporting(false);
    setMessage(`已导入 ${success} 位患者${errorRows.length > 0 ? `，跳过 ${errorRows.length} 行` : ''}`);
    if (success > 0) setTimeout(onDone, 600);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="text-[13.5px] font-bold text-slate-900">导入历史名单</div>
        <div className="mt-1 text-[11px] text-slate-500">支持 CSV（逗号或制表符分隔），必须包含「姓名」列；RehabID 自动生成</div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }}
        />
        <button onClick={() => fileRef.current?.click()} className="mt-3 h-10 w-full rounded-xl border border-[#0f9b8e] text-[13px] font-semibold text-[#0f9b8e]">
          选择 CSV 文件
        </button>
      </section>

      {rows.length > 0 ? (
        <section className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 p-3 text-[11.5px]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-slate-500">可导入 {validRows.length} 行</span>
            <span className="text-rose-600">异常 {errorRows.length} 行</span>
          </div>
          {rows.slice(0, 50).map((row, index) => (
            <div key={`${row.raw}-${index}`} className={`flex items-center justify-between border-b border-slate-100 py-1.5 ${row.error ? 'text-rose-600' : 'text-slate-700'}`}>
              <span>{row.name || '—'}</span>
              <span className="text-[10.5px]">{row.error ?? '可导入'}</span>
            </div>
          ))}
          {rows.length > 50 ? <div className="pt-2 text-[10.5px] text-slate-400">仅预览前 50 行</div> : null}
        </section>
      ) : null}

      {message ? <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11.5px] text-slate-700">{message}</div> : null}

      <div className="mt-auto space-y-2">
        <button
          onClick={handleImport}
          disabled={validRows.length === 0 || importing}
          className="h-12 w-full rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white disabled:bg-slate-300"
        >
          {importing ? '导入中…' : `导入 ${validRows.length} 位患者`}
        </button>
        <button onClick={onCancel} className="h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">取消</button>
      </div>
    </div>
  );
};
