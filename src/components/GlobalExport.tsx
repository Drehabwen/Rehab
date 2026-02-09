import React, { useState } from 'react';
import { Download, FileText, FileCode, FileType, ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCaseStore } from '@/store/useCaseStore';

interface ExportOption {
  id: 'pdf' | 'word' | 'html';
  label: string;
  icon: React.ElementType;
  color: string;
}

export const GlobalExport: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { structuredCase, patientInfo } = useCaseStore();

  const options: ExportOption[] = [
    { id: 'pdf', label: '导出 PDF 报告', icon: FileType, color: 'text-rose-500' },
    { id: 'word', label: '导出 Word 文档', icon: FileText, color: 'text-blue-500' },
    { id: 'html', label: '导出 HTML 网页', icon: FileCode, color: 'text-emerald-500' },
  ];

  const handleExport = async (format: 'pdf' | 'word' | 'html') => {
    if (!structuredCase) {
      alert('请先生成病历内容后再导出');
      return;
    }

    setIsExporting(format);
    try {
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const response = await fetch(`${window.location.protocol}//${host}/medvoice/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientInfo.name,
          gender: patientInfo.gender,
          age: patientInfo.age,
          case_id: patientInfo.case_id,
          chief_complaint: structuredCase['主诉'] || structuredCase['S'] || '',
          present_illness: structuredCase['现病史'] || structuredCase['O'] || '',
          past_history: structuredCase['既往史'] || '',
          allergies: structuredCase['过敏史'] || '',
          physical_exam: structuredCase['体格检查'] || '',
          diagnosis: structuredCase['诊断'] || structuredCase['A'] || '',
          treatment_plan: structuredCase['处理意见'] || structuredCase['P'] || '',
          ai_suggestions: structuredCase['ai_suggestions'] || '',
          export_format: format
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = format === 'word' ? 'docx' : format;
        a.download = `${patientInfo.case_id}_${patientInfo.name}_病历.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await response.json();
        throw new Error(error.detail || '导出失败');
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert(`导出失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!structuredCase}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
          structuredCase 
            ? "bg-white text-slate-900 hover:bg-slate-50 hover:shadow-lg border border-slate-200" 
            : "bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100"
        )}
      >
        <Download size={16} className={cn(structuredCase ? "text-antey-primary" : "text-slate-300")} />
        导出报告
        <ChevronDown size={14} className={cn("transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleExport(option.id)}
                disabled={isExporting !== null}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-slate-50 group-hover:bg-white transition-colors", option.color)}>
                    <option.icon size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900">{option.label}</span>
                </div>
                {isExporting === option.id ? (
                  <Loader2 size={14} className="text-slate-400 animate-spin" />
                ) : (
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-400 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
