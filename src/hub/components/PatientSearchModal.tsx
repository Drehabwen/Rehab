import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Clock, Search, Stethoscope, X } from 'lucide-react';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { getRelativeTime } from '@/lib/session-utils';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types/patient';
import {
  getPatientAvatar,
  getPatientColor,
  getPatientDisplayName,
} from '@/lib/patient-utils';

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: Patient) => void;
}

export const PatientSearchModal: React.FC<PatientSearchModalProps> = ({ isOpen, onClose, onSelectPatient }) => {
  const [query, setQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const { searchPatients, loadPatients } = usePatientStore();
  const { loadSessions, startSession, getPatientSessions } = useSessionStore();

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedPatient(null);
    loadPatients();
    loadSessions();
  }, [isOpen, loadPatients, loadSessions]);

  const filteredPatients = searchPatients(query);

  const selectedSessions = useMemo(() => {
    if (!selectedPatient) return [];
    return getPatientSessions(selectedPatient.id).sort((a, b) => b.createdAt - a.createdAt);
  }, [selectedPatient, getPatientSessions]);

  const handleContinueSession = async () => {
    if (!selectedPatient) return;
    setIsCreatingSession(true);
    try {
      await startSession(selectedPatient.id);
      onSelectPatient(selectedPatient);
      onClose();
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="dialog-backdrop" onClick={onClose} />

      <div className="dialog-shell flex max-h-[86vh] max-w-3xl flex-col">
        <div className="dialog-header">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-antey-primary/10 text-antey-primary">
              <Search size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">查找患者</h2>
              <p className="mt-1 text-xs text-slate-500">按姓名或编号搜索，并快速开启接诊。</p>
            </div>
          </div>

          <button onClick={onClose} className="btn-icon" aria-label="close">
            <X size={14} />
          </button>
        </div>

        <div className="border-b border-slate-200 p-4">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入患者姓名或编号"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm"
              autoFocus
            />
          </label>
        </div>

        <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto p-4">
          {!selectedPatient ? (
            <div className="space-y-2">
              {filteredPatients.length === 0 ? (
                <div className="state-panel">
                  <h3 className="text-lg">未找到匹配患者</h3>
                  <p>请检查搜索内容，或先新建患者。</p>
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white', getPatientColor(patient))}>
                        {getPatientAvatar(patient)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{getPatientDisplayName(patient)}</div>
                        <div className="truncate text-xs text-slate-500">{patient.id}</div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{getRelativeTime(patient.createdAt)}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => setSelectedPatient(null)} className="btn-tertiary h-8 px-2 text-sm">
                <ChevronLeft size={14} />
                返回搜索结果
              </button>

              <section className="bento-card p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl font-semibold text-white', getPatientColor(selectedPatient))}>
                    {getPatientAvatar(selectedPatient)}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-900">{getPatientDisplayName(selectedPatient)}</div>
                    <div className="text-sm text-slate-500">{selectedPatient.id}</div>
                  </div>
                </div>
              </section>

              <section className="bento-card p-4">
                <div className="mb-2 text-sm font-semibold text-slate-900">历史接诊</div>
                {selectedSessions.length === 0 ? (
                  <p className="text-sm text-slate-500">暂无历史接诊记录。</p>
                ) : (
                  <div className="space-y-2">
                    {selectedSessions.slice(0, 6).map((session) => (
                      <div key={session.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">{session.id}</div>
                          <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={12} />
                            第 {session.sequence} 次接诊 · {getRelativeTime(session.createdAt)}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onSelectPatient(selectedPatient);
                            onClose();
                          }}
                          className="btn-secondary h-8 px-3 text-xs"
                        >
                          进入
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>

        {selectedPatient ? (
          <div className="dialog-footer">
            <button onClick={onClose} className="btn-secondary">取消</button>
            <button onClick={handleContinueSession} disabled={isCreatingSession} className={cn('btn-primary', isCreatingSession && 'cursor-not-allowed opacity-50')}>
              <Stethoscope size={14} />
              {isCreatingSession ? '创建中...' : '新增接诊记录'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
