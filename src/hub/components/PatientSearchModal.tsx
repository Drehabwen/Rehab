import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Clock, Search, Stethoscope, User, X } from 'lucide-react';
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
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-[0_20px_40px_rgba(15,23,42,0.18)] w-full max-w-3xl max-h-[86vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-antey-primary/10 text-antey-primary flex items-center justify-center">
              <Search size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">查找患者</h2>
              <p className="text-xs text-slate-500 mt-1">按姓名或编号搜索，并快速开启接诊</p>
            </div>
          </div>

          <button onClick={onClose} className="btn-icon" aria-label="close">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入患者姓名或编号"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-sm"
              autoFocus
            />
          </label>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
          {!selectedPatient ? (
            <div className="space-y-2">
              {filteredPatients.length === 0 ? (
                <div className="state-panel">
                  <h3 className="text-lg">未找到匹配患者</h3>
                  <p>请检查输入内容，或先新建患者。</p>
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm font-semibold', getPatientColor(patient))}>
                        {getPatientAvatar(patient)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{getPatientDisplayName(patient)}</div>
                        <div className="text-xs text-slate-500 truncate">{patient.id}</div>
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
                  <div className={cn('w-11 h-11 rounded-xl text-white flex items-center justify-center font-semibold', getPatientColor(selectedPatient))}>
                    {getPatientAvatar(selectedPatient)}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-slate-900">{getPatientDisplayName(selectedPatient)}</div>
                    <div className="text-sm text-slate-500">{selectedPatient.id}</div>
                  </div>
                </div>
              </section>

              <section className="bento-card p-4">
                <div className="text-sm font-semibold text-slate-900 mb-2">历史接诊</div>
                {selectedSessions.length === 0 ? (
                  <p className="text-sm text-slate-500">暂无历史接诊记录。</p>
                ) : (
                  <div className="space-y-2">
                    {selectedSessions.slice(0, 6).map((session) => (
                      <div key={session.id} className="px-3 py-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm text-slate-900 font-medium truncate">{session.id}</div>
                          <div className="text-xs text-slate-500 inline-flex items-center gap-1">
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
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">取消</button>
            <button onClick={handleContinueSession} disabled={isCreatingSession} className={cn('btn-primary', isCreatingSession && 'opacity-50 cursor-not-allowed')}>
              <Stethoscope size={14} />
              {isCreatingSession ? '创建中...' : '新增接诊记录'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
