import React, { useState, useRef } from 'react';
import { X, Download, Upload, Trash2, Shield, Database, AlertTriangle, CheckCircle, RefreshCw, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportAllData, downloadBackup, importData, readBackupFile, clearAllData, getDatabaseStats } from '@/lib/backup';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';

type SettingsTab = 'backup' | 'restore' | 'privacy';

interface DataSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSettingsModal: React.FC<DataSettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('backup');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [stats, setStats] = useState<{ patients: number; sessions: number; assessments: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    const s = await getDatabaseStats();
    setStats(s);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      downloadBackup(data);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const data = await readBackupFile(file);
      await importData(data);
      await usePatientStore.getState().loadPatients();
      await useSessionStore.getState().loadRecentSessions();
      await loadStats();
      setImportResult({ success: true, message: `成功导入 ${data.patients.length} 条患者记录` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '导入失败';
      setImportResult({ success: false, message });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      await usePatientStore.getState().loadPatients();
      await useSessionStore.getState().loadRecentSessions();
      await loadStats();
      setShowConfirmClear(false);
    } catch (err) {
      console.error('Clear failed:', err);
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center">
              <Shield className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">数据管理</h2>
              <p className="text-slate-400 font-medium text-sm">备份、恢复与隐私设置</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all group"
          >
            <X size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        <div className="flex border-b border-slate-100">
          {[
            { id: 'backup', label: '数据备份', icon: Download },
            { id: 'restore', label: '数据恢复', icon: Upload },
            { id: 'privacy', label: '隐私清理', icon: Trash2 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 text-[11px] font-black uppercase tracking-wider transition-all relative",
                activeTab === tab.id ? "text-antey-primary" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-antey-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-[2rem]">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                  <Database size={28} className="text-antey-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-slate-900">本地数据统计</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span>患者: <strong className="text-slate-900">{stats?.patients || 0}</strong></span>
                    <span>接诊: <strong className="text-slate-900">{stats?.sessions || 0}</strong></span>
                    <span>评估: <strong className="text-slate-900">{stats?.assessments || 0}</strong></span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <h4 className="text-sm font-black text-blue-900 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  备份说明
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  数据将导出为 JSON 格式文件，包含所有患者信息、接诊记录和评估数据。
                  建议定期备份以防止数据丢失。备份文件可在任何时候导入恢复。
                </p>
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-antey-primary to-teal-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all hover:shadow-lg hover:shadow-antey-primary/20",
                  isExporting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isExporting ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Download size={20} />
                )}
                {isExporting ? '导出中...' : '导出全部数据'}
              </button>
            </div>
          )}

          {activeTab === 'restore' && (
            <div className="space-y-6">
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                <h4 className="text-sm font-black text-amber-900 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  恢复注意事项
                </h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  导入数据将合并到现有数据中，不会覆盖已有的记录。
                  请确保导入的文件是正确的备份文件。
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />

              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className={cn(
                  "w-full flex items-center justify-center gap-3 py-5 bg-white border-2 border-dashed border-slate-300 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all hover:border-antey-primary hover:text-antey-primary",
                  isImporting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isImporting ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Upload size={20} />
                )}
                {isImporting ? '导入中...' : '选择备份文件导入'}
              </button>

              {importResult && (
                <div className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl",
                  importResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                )}>
                  {importResult.success ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  <span className="text-sm font-medium">{importResult.message}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                <h4 className="text-sm font-black text-red-900 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  危险操作
                </h4>
                <p className="text-xs text-red-700 leading-relaxed">
                  删除数据是不可逆的操作。所有患者信息、接诊记录和评估数据将被永久删除。
                  请在执行此操作前确保已备份重要数据。
                </p>
              </div>

              <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl">
                <HardDrive size={24} className="text-slate-400" />
                <div className="flex-1">
                  <h3 className="text-base font-black text-slate-900">清空所有数据</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    将删除所有本地存储的数据（{stats?.total || 0} 条记录）
                  </p>
                </div>
              </div>

              {!showConfirmClear ? (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 size={20} />
                  清空所有数据
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-red-100 rounded-2xl text-center">
                    <p className="text-sm font-black text-red-700">确定要清空所有数据吗？</p>
                    <p className="text-xs text-red-600 mt-1">此操作无法撤销</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-wider"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleClearData}
                      disabled={isClearing}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-wider hover:bg-red-700 transition-all"
                    >
                      {isClearing ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      确认删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
